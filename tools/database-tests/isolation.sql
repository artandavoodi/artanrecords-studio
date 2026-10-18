begin;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.studio_profiles(id,display_name) select id,'Private artist' from auth.users;
insert into public.studio_submissions(account_id,title,work_type) select id,'Private recording','recording' from auth.users;
insert into public.studio_contracts(account_id,title,version,document_sha256,status) select id,'Private agreement',1,repeat('a',64),'review' from auth.users;
insert into storage.objects(bucket_id,name) select 'studio-avatars',id::text||'/avatar' from auth.users;
insert into public.studio_billing_addresses(account_id) select id from auth.users;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
begin
  if (select count(*) from public.studio_profiles)<>1 then raise exception 'Profile isolation failed'; end if;
  if (select count(*) from public.studio_submissions)<>1 then raise exception 'Submission isolation failed'; end if;
  if (select count(id) from public.studio_contracts)<>1 then raise exception 'Contract isolation failed'; end if;
  if (select count(*) from storage.objects)<>1 then raise exception 'Avatar isolation failed'; end if;
  if (select count(*) from public.studio_billing_addresses)<>1 then raise exception 'Billing address isolation failed'; end if;
  update public.studio_profiles set display_name='Forbidden' where id='00000000-0000-0000-0000-000000000002';
  if found then raise exception 'Cross-account update permitted'; end if;
  begin
    insert into public.studio_memberships(account_id,artist_id,role) values(auth.uid(),auth.uid(),'manager');
    raise exception 'Self approval permitted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.studio_profiles(id) values('00000000-0000-0000-0000-000000000002');
    raise exception 'Cross-account insert permitted';
  exception when insufficient_privilege then null; end;
  begin
    perform provider_reference from public.studio_contracts;
    raise exception 'Signing provider reference exposed';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values('studio-avatars','00000000-0000-0000-0000-000000000002/avatar');
    raise exception 'Cross-account avatar upload permitted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform id from public.studio_profiles;
    raise exception 'Anonymous profile access permitted';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
