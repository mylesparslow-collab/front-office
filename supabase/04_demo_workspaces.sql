-- Creates the two demo workspaces and their logins.
-- Run after setting the passwords in the same SQL session (they are never committed):
--   select set_config('fo.demo_password', '<demo password>', false);
--   select set_config('fo.second_password', '<second tenant password>', false);
-- Emails use the reserved .example domain, so nothing can ever be delivered to them.

create or replace function pg_temp.make_user(p_email text, p_password text) returns uuid
language plpgsql as $$
declare uid uuid;
begin
  select id into uid from auth.users where email = p_email;
  if uid is not null then
    update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')) where id = uid;
    return uid;
  end if;
  uid := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, json_build_object('sub', uid::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now());
  return uid;
end $$;

do $$
declare u1 uuid; u2 uuid; b1 uuid; b2 uuid;
begin
  u1 := pg_temp.make_user('demo@saltbrush.example', current_setting('fo.demo_password'));
  u2 := pg_temp.make_user('owner@larkspur.example', current_setting('fo.second_password'));

  select id into b1 from public.businesses where name = 'Saltbrush Heating & Air';
  if b1 is null then
    insert into public.businesses(name, industry, city, owner_name, phone, is_demo)
      values ('Saltbrush Heating & Air', 'Heating and air conditioning', 'Irvine, CA', 'Renata Solis', '(949) 555-0142', true)
      returning id into b1;
  end if;
  insert into public.memberships(business_id, user_id, role) values (b1, u1, 'owner') on conflict do nothing;
  perform public.seed_demo(b1);

  select id into b2 from public.businesses where name = 'Larkspur Motor Works';
  if b2 is null then
    insert into public.businesses(name, industry, city, owner_name, phone, is_demo)
      values ('Larkspur Motor Works', 'Auto repair', 'Irvine, CA', 'Theo Marsh', '(949) 555-0177', false)
      returning id into b2;
  end if;
  insert into public.memberships(business_id, user_id, role) values (b2, u2, 'owner') on conflict do nothing;
  perform public.default_cadences(b2);
  delete from public.invoices where business_id = b2;
  delete from public.quotes where business_id = b2;
  delete from public.leads where business_id = b2;
  delete from public.contacts where business_id = b2;
  insert into public.contacts(business_id, name, email, phone) values
    (b2, 'Larkspur Customer One', 'one@larkspur-customers.example', '(949) 555-0170'),
    (b2, 'Larkspur Customer Two', 'two@larkspur-customers.example', '(949) 555-0171');
  insert into public.leads(business_id, title, source, stage, value) values (b2, 'Brake job, 2016 Civic', 'Website', 'new', 640);
  insert into public.quotes(business_id, number, title, amount, status, sent_at) values (b2, 'LMW-Q1', 'Timing belt service', 1180, 'sent', now() - interval '2 days');
  insert into public.invoices(business_id, number, title, amount, issued_on, due_on) values (b2, 'LMW-1', 'Front brakes and rotors', 640, current_date - 20, current_date - 5);
end $$;

-- Nightly reset of demo data (about 2am Pacific).
create extension if not exists pg_cron;
select cron.unschedule('reset-demos') where exists (select 1 from cron.job where jobname = 'reset-demos');
select cron.schedule('reset-demos', '0 10 * * *', 'select public.reset_all_demos()');
