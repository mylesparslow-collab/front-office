-- Create a workspace for the signed-in user (used by onboarding).
create or replace function public.create_business(p_name text, p_industry text default null, p_city text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into businesses(name, industry, city) values (p_name, p_industry, p_city) returning id into b;
  insert into memberships(business_id, user_id, role) values (b, auth.uid(), 'owner');
  perform public.default_cadences(b);
  return b;
end $$;
revoke all on function public.create_business(text,text,text) from public, anon;
grant execute on function public.create_business(text,text,text) to authenticated;

create or replace function public.default_cadences(b uuid) returns void
language sql security definer set search_path = public as $$
  insert into cadences(business_id, kind, steps) values
  (b, 'quote', '[
    {"day":2,"channel":"email","label":"Friendly check-in","subject":"Any questions on your quote, {{first}}?","body":"Hi {{first}},\n\nJust making sure quote {{number}} for {{title}} came through okay. Happy to walk through any line on a quick call.\n\n{{owner}}\n{{business}}"},
    {"day":5,"channel":"sms","label":"Short text nudge","subject":null,"body":"Hi {{first}}, {{owner}} at {{business}}. Any questions on the {{title}} quote? Reply here and I''ll get right back to you."},
    {"day":9,"channel":"email","label":"Hold the price","subject":"Holding your price until {{valid_until}}","body":"Hi {{first}},\n\nYour quote ({{amount}}) is held until {{valid_until}}. If timing or budget changed, tell me and I can adjust the scope.\n\n{{owner}}"},
    {"day":14,"channel":"email","label":"Close the loop","subject":"Should I close out your quote?","body":"Hi {{first}},\n\nI haven''t heard back, so I''ll assume the timing isn''t right and close out quote {{number}}. If you still want it, just reply and it''s yours.\n\n{{owner}}"}
  ]'::jsonb),
  (b, 'invoice', '[
    {"day":-3,"channel":"email","label":"Heads-up before due","subject":"Invoice {{number}} is due {{due}}","body":"Hi {{first}},\n\nA quick heads-up that invoice {{number}} ({{balance}}) is due on {{due}}. Thanks again for choosing {{business}}.\n\n{{owner}}"},
    {"day":1,"channel":"email","label":"Gentle reminder","subject":"Invoice {{number}} was due yesterday","body":"Hi {{first}},\n\nInvoice {{number}} for {{title}} ({{balance}}) was due yesterday. If it''s already on its way, thank you and please ignore this.\n\n{{owner}}"},
    {"day":7,"channel":"sms","label":"Text reminder","subject":null,"body":"Hi {{first}}, {{owner}} from {{business}}. Invoice {{number}} ({{balance}}) is a week past due. Anything I can help with?"},
    {"day":14,"channel":"email","label":"Firm reminder","subject":"Second notice: invoice {{number}}","body":"Hi {{first}},\n\nInvoice {{number}} is now {{days_late}} days past due with {{balance}} outstanding. Please let me know when to expect payment, or reply if something on the invoice needs fixing.\n\n{{owner}}\n{{business}}"},
    {"day":30,"channel":"email","label":"Final notice","subject":"Final notice: invoice {{number}}","body":"Hi {{first}},\n\nThis is a final notice for invoice {{number}} ({{balance}}), now {{days_late}} days past due. Please arrange payment this week so we can keep your account in good standing.\n\n{{owner}}\n{{business}}"}
  ]'::jsonb),
  (b, 'lead', '[
    {"day":0,"channel":"sms","label":"Instant reply","subject":null,"body":"Hi {{first}}, thanks for reaching out to {{business}}! This is {{owner}}. When is a good time for a quick call about {{title}}?"},
    {"day":1,"channel":"email","label":"Next-day follow-up","subject":"Following up on your request","body":"Hi {{first}},\n\nThanks for contacting {{business}} about {{title}}. I have openings this week to take a look. What day works best?\n\n{{owner}}"},
    {"day":4,"channel":"email","label":"Last try","subject":"Still need help with {{title}}?","body":"Hi {{first}},\n\nI wanted to try once more in case my last note got buried. Reply with a good time and I''ll put you on the schedule.\n\n{{owner}}"}
  ]'::jsonb)
  on conflict (business_id, kind) do update set steps = excluded.steps, updated_at = now();
$$;
revoke all on function public.default_cadences(uuid) from public, anon, authenticated;

-- Public quote page: customer reads by unguessable token, marks viewed, accepts or declines.
create or replace function public.quote_by_token(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare q quotes; r json;
begin
  select * into q from quotes where public_token = p_token;
  if not found or q.status = 'draft' then return null; end if;
  if q.status = 'sent' then
    update quotes set status = 'viewed', viewed_at = now() where id = q.id;
    insert into activities(business_id, subject_type, subject_id, kind, body)
      values (q.business_id, 'quote', q.id, 'viewed', 'Customer opened the quote');
    q.status := 'viewed';
  end if;
  select json_build_object(
    'number', q.number, 'title', q.title, 'items', q.items, 'amount', q.amount,
    'status', q.status, 'valid_until', q.valid_until, 'sent_at', q.sent_at,
    'accepted_by', q.accepted_by, 'decided_at', q.decided_at,
    'business', json_build_object('name', b.name, 'city', b.city, 'owner', b.owner_name, 'phone', b.phone),
    'contact', json_build_object('name', c.name, 'address', c.address)
  ) into r
  from businesses b left join contacts c on c.id = q.contact_id
  where b.id = q.business_id;
  return r;
end $$;

create or replace function public.decide_quote(p_token text, p_accept boolean, p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare q quotes;
begin
  select * into q from quotes where public_token = p_token;
  if not found or q.status not in ('sent','viewed') then return 'unavailable'; end if;
  if p_accept and coalesce(trim(p_name),'') = '' then return 'name_required'; end if;
  update quotes set status = case when p_accept then 'accepted' else 'declined' end,
    decided_at = now(), accepted_by = case when p_accept then trim(p_name) end
    where id = q.id;
  if q.lead_id is not null then
    update leads set stage = case when p_accept then 'won' else 'lost' end,
      lost_reason = case when p_accept then null else 'Declined quote online' end,
      last_touch_at = now() where id = q.lead_id;
  end if;
  insert into activities(business_id, subject_type, subject_id, kind, body)
    values (q.business_id, 'quote', q.id, case when p_accept then 'accepted' else 'declined' end,
      case when p_accept then 'Accepted online by ' || trim(p_name) else 'Declined online' end);
  update messages set status = 'skipped' where subject_type = 'quote' and subject_id = q.id and status = 'queued';
  return case when p_accept then 'accepted' else 'declined' end;
end $$;
grant execute on function public.quote_by_token(text) to anon, authenticated;
grant execute on function public.decide_quote(text, boolean, text) to anon, authenticated;
