-- Hosted integration regression. Synthetic transaction; leaves no records or queue messages.
begin;
do $$
declare p uuid:=gen_random_uuid();r uuid:=gen_random_uuid();j jsonb;checkpoint jsonb;summary jsonb;
begin
 insert into public.trix_projects(id,owner_subject) values(p,'exhaustion-'||p::text);
 checkpoint:=jsonb_build_object('id',r,'status','RUNNING','background',true,'diagnostic','cpu','effects','[]'::jsonb,'events','[]'::jsonb);
 insert into public.trix_runs(id,project_id,document,status) values(r,p,checkpoint,'RUNNING');
 j:=public.trix_queue('enqueue',jsonb_build_object('owner','exhaustion-'||p::text,'id',r,'kind','cpu'));
 update public.trix_jobs set attempts=5 where id=(j->>'id')::uuid;
 perform public.trix_queue('claim','{}'::jsonb);
 summary:=public.trix_backend('run_get',jsonb_build_object('owner','exhaustion-'||p::text,'id',r));
 if summary#>>'{record,queue,status}' is distinct from 'FAILED' then raise exception 'Retry exhaustion must expose FAILED to the authenticated task reader';end if;
 if summary#>>'{record,queue,reason}' not ilike '%operator review%' then raise exception 'Retry exhaustion must explain operator review';end if;
end $$;
select 'passed' as retry_exhaustion_visibility;
rollback;
