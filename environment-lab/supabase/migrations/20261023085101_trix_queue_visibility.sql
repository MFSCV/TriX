-- Fence stale queue workers at every runtime checkpoint, not just completion.
create or replace function public.trix_backend(operation text,arguments jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.trix_jobs; v_result jsonb;v_queue jsonb;v_document jsonb:=arguments->'document';
begin
 if operation='health' then return jsonb_build_object('ok',true,'schema',4,'scheduler',exists(select 1 from cron.job where jobname='trix-step-dispatch' and active),'modelReady',exists(select 1 from vault.decrypted_secrets where name='trix_model_key') and exists(select 1 from vault.decrypted_secrets where name='trix_model_name'));end if;
 if operation='run_put' then
  perform pg_advisory_xact_lock(hashtextextended(arguments->>'owner',0));
  if arguments->>'job_id' is not null then
   select * into v_job from public.trix_jobs where id=(arguments->>'job_id')::uuid for update;
   if not found or v_job.run_id is distinct from (arguments->>'id')::uuid or v_job.claim is distinct from (arguments->>'job_claim')::uuid or v_job.status<>'RUNNING' or v_job.claimed_until<=clock_timestamp() then return '{"fenced":true}'::jsonb;end if;
  end if;
 end if;
 v_result:=public.trix_backend_v1(operation,arguments);
 if operation='run_get' and v_result->'record'<>'null'::jsonb then
  select jsonb_build_object('status',status,'attempts',attempts,'kind',kind,'updated_at',updated_at,'reason',case status when 'FAILED' then 'Background delivery failed after repeated attempts. Operator review is required.' when 'BLOCKED' then 'Background processing needs operator review before it can continue.' else null end) into v_queue from public.trix_jobs where run_id=(arguments->>'id')::uuid order by created_at desc limit 1;
  v_result:=jsonb_set(v_result,'{record,queue}',coalesce(v_queue,'null'::jsonb));
 end if;
 -- Save and enqueue atomically. A failed enqueue rolls back its checkpoint.
 if operation='run_put' and v_result->>'conflict' is distinct from 'true' and v_document->>'background'='true' and v_document->>'status'='RUNNING' then
  perform public.trix_queue('enqueue',jsonb_build_object('owner',arguments->>'owner','id',arguments->>'id','kind',case when v_document->>'diagnostic'='cpu' then 'cpu' else 'runtime' end));
 end if;
 return v_result;
end $$;
revoke all on function public.trix_backend(text,jsonb) from public,anon,authenticated;
grant execute on function public.trix_backend(text,jsonb) to service_role;
