-- One automatic message per cadence step, even if two page loads race.
create unique index if not exists messages_one_per_step
  on public.messages (subject_type, subject_id, step)
  where direction = 'out' and step is not null;

-- Owner previews of the customer page shouldn't count as the customer opening it.
drop function if exists public.quote_by_token(text);
create or replace function public.quote_by_token(p_token text, p_track boolean default true)
returns json language plpgsql security definer set search_path = public as $$
declare q quotes; r json;
begin
  select * into q from quotes where public_token = p_token;
  if not found or q.status = 'draft' then return null; end if;
  if p_track and q.status in ('sent','viewed') then
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
grant execute on function public.quote_by_token(text, boolean) to anon, authenticated;
