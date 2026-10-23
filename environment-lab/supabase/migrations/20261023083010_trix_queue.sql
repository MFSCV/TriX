create extension if not exists pgmq;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select pgmq.create('trix_steps');
revoke all on schema pgmq from public,anon,authenticated;
create table public.trix_jobs (
 id uuid primary key default gen_random_uuid(),run_id uuid not null references public.trix_runs(id),
 project_id uuid not null references public.trix_projects(id),kind text not null check(kind in ('cpu','runtime')),
 status text not null default 'QUEUED',message_id bigint,claim uuid,claimed_until timestamptz,
 attempts integer not null default 0,last_version bigint,result jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(run_id,kind)
);
alter table public.trix_jobs enable row level security;
revoke all on public.trix_jobs from anon,authenticated;
grant select(id,run_id,project_id,kind,status,attempts,result,created_at,updated_at) on public.trix_jobs to authenticated;
create policy trix_jobs_read on public.trix_jobs for select to authenticated using(exists(select 1 from public.trix_project_members m where m.project_id=trix_jobs.project_id and m.user_id=(select auth.uid())));
create index trix_jobs_project_idx on public.trix_jobs(project_id,status);
create index trix_jobs_pending_idx on public.trix_jobs(status,updated_at) where status in ('QUEUED','RUNNING');
-- Cover all application foreign keys reported by the performance advisor.
create index trix_artifacts_project_run_idx on public.trix_artifacts(project_id,run_id);
create index trix_artifacts_run_idx on public.trix_artifacts(run_id);
create index trix_audit_project_run_idx on public.trix_audit_findings(project_id,run_id);
create index trix_audit_run_idx on public.trix_audit_findings(run_id);
create index trix_delegations_project_run_idx on public.trix_delegations(project_id,run_id);
create index trix_delegations_run_idx on public.trix_delegations(run_id);
create index trix_effects_project_run_idx on public.trix_effects(project_id,run_id);
create index trix_effects_run_idx on public.trix_effects(run_id);
create index trix_events_project_run_idx on public.trix_run_events(project_id,run_id);
create index trix_grants_project_idx on public.trix_tool_grants(project_id);
create function public.trix_queue(operation text,arguments jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_run public.trix_runs;v_job public.trix_jobs;v_message record;v_owner text;v_claim uuid;v_result jsonb:=arguments->'result';v_message_id bigint;
begin
 if operation in ('enqueue','status') then
  select r.* into v_run from public.trix_runs r join public.trix_projects p on p.id=r.project_id where r.id=(arguments->>'id')::uuid and p.owner_subject=arguments->>'owner';
  if not found then raise exception 'Run not found';end if;
  if operation='status' then return jsonb_build_object('jobs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'status',status,'attempts',attempts,'result',result)) from public.trix_jobs where run_id=v_run.id),'[]'::jsonb));end if;
  if arguments->>'kind' not in ('cpu','runtime') then raise exception 'Invalid job kind';end if;
  if arguments->>'kind'='cpu' and v_run.document->>'diagnostic' is distinct from 'cpu' then raise exception 'Not a diagnostic';end if;
  if arguments->>'kind'='runtime' and (v_run.document->>'background' is distinct from 'true' or v_run.status<>'RUNNING') then raise exception 'Background task not running';end if;
  insert into public.trix_jobs(run_id,project_id,kind) values(v_run.id,v_run.project_id,arguments->>'kind') on conflict(run_id,kind) do nothing;
  select * into v_job from public.trix_jobs where run_id=v_run.id and kind=arguments->>'kind' for update;
  if v_job.message_id is not null and (v_job.status in ('QUEUED','RUNNING') or v_job.kind='cpu') then return jsonb_build_object('id',v_job.id,'status',v_job.status,'deduplicated',true);end if;
  select pgmq.send('trix_steps',jsonb_build_object('id',v_job.id)) into v_message_id;
  update public.trix_jobs set status='QUEUED',message_id=v_message_id,claim=null,claimed_until=null,attempts=0,updated_at=now() where id=v_job.id;
  return jsonb_build_object('id',v_job.id,'status','QUEUED');
 elsif operation='claim' then
  select * into v_message from pgmq.read('trix_steps',120,1);
  if not found then return '{"job":null}'::jsonb;end if;
  select * into v_job from public.trix_jobs where id=(v_message.message->>'id')::uuid for update;
  if not found or v_job.message_id<>v_message.msg_id or v_job.status not in ('QUEUED','RUNNING') then perform pgmq.archive('trix_steps',v_message.msg_id);return '{"job":null}'::jsonb;end if;
  if v_job.attempts>=5 then
   update public.trix_jobs set status='FAILED',result='{"reason":"Delivery retry limit reached; operator review required."}',updated_at=now() where id=v_job.id;
   perform pgmq.archive('trix_steps',v_message.msg_id);return '{"job":null}'::jsonb;
  end if;
  v_claim:=gen_random_uuid();
  update public.trix_jobs set claim=v_claim,claimed_until=now()+interval '120 seconds',attempts=attempts+1,status='RUNNING',updated_at=now() where id=v_job.id;
  select owner_subject into v_owner from public.trix_projects where id=v_job.project_id;
  return jsonb_build_object('job',jsonb_build_object('id',v_job.id,'run_id',v_job.run_id,'kind',v_job.kind,'owner',v_owner,'claim',v_claim));
 elsif operation='finish' then
  select * into v_job from public.trix_jobs where id=(arguments->>'id')::uuid for update;
  if not found or v_job.claim is distinct from (arguments->>'claim')::uuid or v_job.status<>'RUNNING' or v_job.claimed_until<=now() then return '{"accepted":false}'::jsonb;end if;
  select * into v_run from public.trix_runs where id=v_job.run_id;
  if v_result->>'status'='RETRY' then
   perform pgmq.set_vt('trix_steps',v_job.message_id,least(v_job.attempts*10,60));
   update public.trix_jobs set status='QUEUED',claim=null,claimed_until=null,result=v_result,updated_at=now() where id=v_job.id;
  else
   perform pgmq.archive('trix_steps',v_job.message_id);
   if v_result->>'status'='RUNNING' and v_run.document->>'background'='true' and coalesce(v_run.document->>'stopRequested','false')<>'true' then
    select pgmq.send('trix_steps',jsonb_build_object('id',v_job.id)) into v_message_id;
    update public.trix_jobs set status='QUEUED',message_id=v_message_id,attempts=0,claim=null,claimed_until=null,result=v_result,last_version=v_run.state_version,updated_at=now() where id=v_job.id;
   else
    update public.trix_jobs set status=case when v_result->>'status' in ('BLOCKED','RECONCILING','PAUSED') then 'BLOCKED' else 'DONE' end,claim=null,claimed_until=null,result=v_result,last_version=v_run.state_version,updated_at=now() where id=v_job.id;
   end if;
  end if;
  return '{"accepted":true}'::jsonb;
 end if;
 raise exception 'Invalid queue operation';
end $$;
revoke all on function public.trix_queue(text,jsonb) from public,anon,authenticated;
grant execute on function public.trix_queue(text,jsonb) to service_role;
create function public.trix_runtime_config() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_strip_nulls(jsonb_build_object(
 'OPENAI_API_KEY',(select decrypted_secret from vault.decrypted_secrets where name='trix_model_key'),
 'TRIX_MODEL',(select decrypted_secret from vault.decrypted_secrets where name='trix_model_name'),
 'TRIX_MCP_SERVERS',coalesce((select decrypted_secret from vault.decrypted_secrets where name='trix_mcp_servers'),'[]')));
$$;
revoke all on function public.trix_runtime_config() from public,anon,authenticated;
grant execute on function public.trix_runtime_config() to service_role;
alter function public.trix_backend(text,jsonb) rename to trix_backend_v1;
create function public.trix_backend(operation text,arguments jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if operation='health' then return jsonb_build_object('ok',true,'schema',2,'scheduler',exists(select 1 from cron.job where jobname='trix-step-dispatch' and active),'modelReady',exists(select 1 from vault.decrypted_secrets where name='trix_model_key') and exists(select 1 from vault.decrypted_secrets where name='trix_model_name'));end if;
 return public.trix_backend_v1(operation,arguments);
end $$;
revoke all on function public.trix_backend(text,jsonb) from public,anon,authenticated;
grant execute on function public.trix_backend(text,jsonb) to service_role;
create function trix_private.dispatch() returns bigint language plpgsql security definer set search_path='' as $$
declare v_url text;v_token text;v_request bigint;
begin
 if not exists(select 1 from public.trix_jobs where status in ('QUEUED','RUNNING')) then return null;end if;
 select decrypted_secret into v_url from vault.decrypted_secrets where name='trix_backend_url';
 select decrypted_secret into v_token from vault.decrypted_secrets where name='trix_bridge_token';
 if v_url is null or v_token is null then return null;end if;
 select net.http_post(url:=v_url||'/functions/v1/trix-backend',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_token),body:='{"operation":"process","arguments":{}}'::jsonb,timeout_milliseconds:=70000) into v_request;
 return v_request;
end $$;
revoke all on function trix_private.dispatch() from public,anon,authenticated;
select cron.schedule('trix-step-dispatch','* * * * *','select trix_private.dispatch();');
