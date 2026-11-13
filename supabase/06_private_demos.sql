-- Every demo visitor gets a private copy of the sample workspace, created on an
-- anonymous session. No shared password, and visitors never see each other's edits.
create or replace function public.start_demo() returns uuid
language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select m.business_id into b from memberships m where m.user_id = auth.uid() order by m.created_at limit 1;
  if b is not null then return b; end if;
  insert into businesses(name, industry, city, owner_name, phone, is_demo)
    values ('Saltbrush Heating & Air', 'Heating and air conditioning', 'Irvine, CA', 'Renata Solis', '(949) 555-0142', true)
    returning id into b;
  insert into memberships(business_id, user_id, role) values (b, auth.uid(), 'owner');
  perform public.seed_demo(b);
  return b;
end $$;
revoke all on function public.start_demo() from public, anon;
grant execute on function public.start_demo() to authenticated;

-- Clean up visitor sandboxes after three days.
create or replace function public.cleanup_demos() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where is_anonymous and created_at < now() - interval '3 days';
  delete from public.businesses b where b.is_demo
    and not exists (select 1 from public.memberships m where m.business_id = b.id);
end $$;
revoke all on function public.cleanup_demos() from public, anon, authenticated;

select cron.unschedule('cleanup-demos') where exists (select 1 from cron.job where jobname = 'cleanup-demos');
select cron.schedule('cleanup-demos', '30 10 * * *', 'select public.cleanup_demos()');
