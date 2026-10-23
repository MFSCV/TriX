-- Application state is written only through the server bridge. No browser service key.
create schema if not exists trix_private;
revoke all on schema trix_private from public, anon, authenticated;
create table public.trix_projects (
 id uuid primary key default gen_random_uuid(), owner_subject text not null unique check(length(owner_subject) between 1 and 256), created_at timestamptz not null default now()
);
create table public.trix_project_members (
 project_id uuid not null references public.trix_projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','reader')), primary key(project_id,user_id)
);
create index trix_members_user_idx on public.trix_project_members(user_id,project_id);
create table public.trix_runs (
 id uuid primary key, project_id uuid not null references public.trix_projects(id),
 document jsonb not null check(octet_length(document::text)<=1400000), state_version bigint not null default 1,
 status text not null, updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index trix_runs_project_updated_idx on public.trix_runs(project_id,updated_at desc,id);
create table public.trix_run_events (
 run_id uuid not null references public.trix_runs(id) on delete cascade, sequence integer not null,
 project_id uuid not null references public.trix_projects(id), data jsonb not null, primary key(run_id,sequence)
);
create table public.trix_delegations (
 id uuid primary key,run_id uuid not null references public.trix_runs(id) on delete cascade,
 project_id uuid not null references public.trix_projects(id),specialist text not null,data jsonb not null
);
create table public.trix_effects (
 id uuid primary key,run_id uuid not null references public.trix_runs(id) on delete cascade,
 project_id uuid not null references public.trix_projects(id),state text not null,data jsonb not null
);
create table public.trix_artifacts (
 run_id uuid not null references public.trix_runs(id) on delete cascade,project_id uuid not null references public.trix_projects(id),
 bucket text not null check(bucket in ('context-files','artifacts','audit-reports')),path text not null,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),bytes integer not null check(bytes between 0 and 1200000),name text not null,
 created_at timestamptz not null default now(),primary key(bucket,path)
);
create table public.trix_connections (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.trix_projects(id),
 server_id text not null,config jsonb not null default '{}',secret_ref uuid,unique(project_id,server_id)
);
create table public.trix_tool_grants (
 connection_id uuid not null references public.trix_connections(id) on delete cascade, project_id uuid not null references public.trix_projects(id),
 tool text not null,specialist text not null,purpose text not null,fixed_arguments jsonb not null default '{}', primary key(connection_id,tool,specialist)
);
create table public.trix_audit_findings (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.trix_projects(id),run_id uuid not null references public.trix_runs(id),
 revision text not null,provider_receipt text,independent boolean not null default false, finding jsonb not null
);
-- Policies are intentionally read-only. Auth identities are linked only by a trusted operator.
do $$ declare t text; begin
 foreach t in array array['trix_projects','trix_project_members','trix_runs','trix_run_events','trix_delegations','trix_effects','trix_artifacts','trix_connections','trix_tool_grants','trix_audit_findings'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
grant select on public.trix_project_members to authenticated;
create policy trix_members_read on public.trix_project_members for select to authenticated using(user_id=(select auth.uid()));
-- Only safe summary columns are available directly; the complete checkpoint is server-only.
grant select(id,project_id,state_version,status,updated_at,created_at) on public.trix_runs to authenticated;
grant select on public.trix_run_events,public.trix_delegations,public.trix_effects,public.trix_artifacts,public.trix_audit_findings to authenticated;
create policy trix_projects_read on public.trix_projects for select to authenticated using(exists(select 1 from public.trix_project_members m where m.project_id=id and m.user_id=(select auth.uid())));
do $$ declare t text; begin
 foreach t in array array['trix_runs','trix_run_events','trix_delegations','trix_effects','trix_artifacts','trix_connections','trix_tool_grants','trix_audit_findings'] loop
  execute format('create policy %I on public.%I for select to authenticated using(exists(select 1 from public.trix_project_members m where m.project_id=%I.project_id and m.user_id=(select auth.uid())))',t||'_read',t,t);
 end loop;
end $$;
-- No connection configurations/grants or owner subjects are readable by browser roles.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('context-files','context-files',false,1200000,array['text/plain','application/json']),
 ('artifacts','artifacts',false,1200000,array['text/plain','application/json']),
 ('audit-reports','audit-reports',false,1200000,array['text/plain','application/json']);
create policy trix_private_objects_read on storage.objects for select to authenticated using(
 bucket_id in ('context-files','artifacts','audit-reports') and exists(
 select 1 from public.trix_runs r join public.trix_project_members m on m.project_id=r.project_id
 where r.id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid()))
);
create function public.trix_authorized(token text) returns boolean language sql security definer set search_path='' as $$
 select length(token)>=32 and exists(select 1 from vault.decrypted_secrets where name='trix_bridge_token' and extensions.digest(decrypted_secret,'sha256')=extensions.digest(token,'sha256'));
$$;
revoke all on function public.trix_authorized(text) from public,anon,authenticated;
grant execute on function public.trix_authorized(text) to service_role;
create function public.trix_backend(operation text, arguments jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_owner text:=arguments->>'owner'; v_id uuid; v_project uuid; v_row public.trix_runs; v_doc jsonb:=arguments->'document';v_version bigint;v_limit integer;v_item jsonb;
begin
 if operation='health' then return jsonb_build_object('ok',true,'schema',1); end if;
 if v_owner is null or length(v_owner) not between 1 and 256 then raise exception 'Invalid owner'; end if;
 select id into v_project from public.trix_projects where owner_subject=v_owner;
 if operation='run_list' then
  v_limit:=least(greatest(coalesce((arguments->>'limit')::integer,40),1),40);
  return jsonb_build_object('objects',coalesce((select jsonb_agg(jsonb_build_object('id',id) order by updated_at desc,id) from (select id,updated_at from public.trix_runs where project_id=v_project order by updated_at desc,id limit v_limit) r),'[]'::jsonb),'truncated',(select count(*)>v_limit from public.trix_runs where project_id=v_project));
 end if;
 v_id:=(arguments->>'id')::uuid;
 if operation='run_get' then
  select * into v_row from public.trix_runs where id=v_id and project_id=v_project;
  return jsonb_build_object('record',case when found then jsonb_build_object('document',v_row.document,'etag',v_row.state_version::text) else null end);
 elsif operation='run_put' then
  if v_doc is null or v_doc->>'id' is distinct from v_id::text or jsonb_typeof(v_doc)<>'object' or octet_length(v_doc::text)>1400000 then raise exception 'Invalid checkpoint'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_owner,0));
  insert into public.trix_projects(owner_subject) values(v_owner) on conflict(owner_subject) do update set owner_subject=excluded.owner_subject returning id into v_project;
  select * into v_row from public.trix_runs where id=v_id for update;
  if found then
   if v_row.project_id<>v_project or arguments->>'expected' is distinct from v_row.state_version::text then return '{"conflict":true}'::jsonb; end if;
   update public.trix_runs set document=v_doc,status=v_doc->>'status',state_version=state_version+1,updated_at=now() where id=v_id returning state_version into v_version;
  else
   if arguments->>'expected' is not null then return '{"conflict":true}'::jsonb;end if;
   if (select count(*) from public.trix_runs where project_id=v_project)>=40 then raise exception 'Conversation limit reached';end if;
   insert into public.trix_runs(id,project_id,document,status) values(v_id,v_project,v_doc,v_doc->>'status') returning state_version into v_version;
  end if;
  for v_item in select value from jsonb_array_elements(coalesce(v_doc->'events','[]')) loop
   insert into public.trix_run_events(run_id,project_id,sequence,data) values(v_id,v_project,(v_item->>'sequence')::integer,v_item) on conflict(run_id,sequence) do nothing;
  end loop;
  for v_item in select value from jsonb_array_elements(coalesce(v_doc->'delegations','[]')) loop
   insert into public.trix_delegations(id,run_id,project_id,specialist,data) values((v_item->>'id')::uuid,v_id,v_project,v_item->>'specialist',v_item) on conflict(id) do update set data=excluded.data;
  end loop;
  for v_item in select value from jsonb_array_elements(coalesce(v_doc->'effects','[]')) loop
   insert into public.trix_effects(id,run_id,project_id,state,data) values((v_item->>'id')::uuid,v_id,v_project,v_item->>'state',v_item) on conflict(id) do update set state=excluded.state,data=excluded.data;
  end loop;
  return jsonb_build_object('etag',v_version::text);
 elsif operation='file_receipt' then
  if not exists(select 1 from public.trix_runs where id=v_id and project_id=v_project) then raise exception 'Run not found';end if;
  if arguments->>'path'<>v_id::text||'/'||(arguments->>'sha256') then raise exception 'Invalid artifact path';end if;
  insert into public.trix_artifacts(run_id,project_id,bucket,path,sha256,bytes,name) values(v_id,v_project,arguments->>'bucket',arguments->>'path',arguments->>'sha256',(arguments->>'bytes')::integer,left(arguments->>'name',120)) on conflict(bucket,path) do nothing;
  return '{"stored":true}'::jsonb;
 elsif operation='file_get' then
  select to_jsonb(a) into v_item from public.trix_artifacts a where run_id=v_id and project_id=v_project and bucket=arguments->>'bucket' and sha256=arguments->>'sha256';
  return jsonb_build_object('file',v_item);
 end if;
 raise exception 'Unknown backend operation';
end $$;
revoke all on function public.trix_backend(text,jsonb) from public,anon,authenticated;
grant execute on function public.trix_backend(text,jsonb) to service_role;
