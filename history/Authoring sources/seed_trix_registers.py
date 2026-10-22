from pathlib import Path
import csv,json,re
BASE=Path(__file__).resolve().parent
P=BASE/'trix_v0_2'

with (P/'templates/support_matrix.csv').open() as f: fields=next(csv.reader(f))
families=[
 ('cpu-linux-x86_64','EXEC','CPU operation','Linux x86-64 baseline'),
 ('cpu-linux-aarch64','EXEC','CPU operation','Linux ARM64 baseline'),
 ('apple-reference','EXEC','Selected model operation','Apple device and engine not yet selected'),
 ('nvidia-reference','EXEC','Selected model operation','NVIDIA device, driver and engine not yet selected'),
 ('amd-candidate','EXEC','Selected model operation','Exact AMD stack requires qualification'),
 ('intel-device-candidate','EXEC','Selected model operation','CPU, GPU and NPU require separate final records'),
 ('intel-gaudi-candidate','EXEC','Selected model operation','Separate Gaudi software and communication profile'),
 ('qualcomm-candidate','EXEC','Selected model operation','Exact SoC, OS, provider and lifecycle profile required'),
 ('other-accelerator-candidate','EXEC','Selected model operation','TPU, Neuron and other families require separate final records'),
 ('remote-model-candidate','REMOTE','Selected API operation','Provider, region, revision and data conditions not selected'),
 ('web-client-candidate','CLIENT','Remote task control','Browser/OS and API contract not qualified'),
 ('mobile-client-candidate','CLIENT','Remote task control','Separate iOS, iPadOS and Android records required'),
 ('windows-client-executor','CLIENT;EXEC','Control and optional local execution','Separate x86-64, ARM64, native and WSL profiles required'),
]
with (P/'templates/support_matrix.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
 for ident,role,operation,limitations in families:
  w.writerow(dict(profile_id=ident,profile_revision='proposed-0.2',release_id='not_released',lifecycle='planned',role=role,operation=operation,workload_profile_id='not_selected',snapshot_id='not_registered',application_os_min='not_qualified',executor_os_min='not_qualified',feature_os_min='not_qualified',limitations=limitations,maintainer='Platform/integration owner role to assign',validating_party='not_assigned',evidence_manifest='',qualified_at='',review_trigger='Before any claim and after relevant stack changes',withdrawal_plan='Define before qualification'))

with (P/'templates/decisions.csv').open() as f: fields=next(csv.reader(f))
decisions=[
 ('ADR-001','Identity and feminine pronouns','user_direction','Project authority','Immediate','TriX; she/her','Use the specified identity','User instruction','Documentation identity checks'),
 ('ADR-002','English documentation','user_direction','Project authority','Immediate','English for all authoritative project documentation','English','User instruction','English documentation review'),
 ('ADR-003','Adoption and initial profiles','pending','Project authority/specification steward','E0','','','','Reviewed applicability matrix'),
 ('ADR-004','Complete IR and canonical identity','pending','Language/compiler lead','Before E1 plan conformance','','','','Encoding experiment and semantic corpus'),
 ('ADR-005','Initial CPU target and workload','pending','Platform/runtime leads','E0','','','','Exact snapshot and independent fixtures'),
 ('ADR-006','Durable state and atomicity','pending','Runtime lead','Before E1 effects','','','','Crash/restart and concurrent-update evidence'),
 ('ADR-007','Identity, tenancy and authority','pending','Security lead','Before protected effects','','','','Positive/negative grants and isolation tests'),
 ('ADR-008','Builder containment','pending','Language/security leads','Before SDK distribution','','','','Denied network/filesystem/process probes'),
 ('ADR-009','Artifact and backup lifecycle','pending','Data/operations leads','Before retained real data','','','','Publication/deletion/restore tests'),
 ('ADR-010','Reference Mac and NVIDIA stacks','pending','Platform lead','Before E2 qualification','','','','Physical snapshots and operation evidence'),
 ('ADR-011','API transport and MCP revisions','pending','Integration/security leads','Before E2 integrations','','','','API definition and revision-specific tests'),
 ('ADR-012','Coordination, fencing and clocks','pending','Runtime lead','Before failover/replication claims','','','','Partition, stale writer and clock probes'),
 ('ADR-013','Budget and price accounting','pending','Runtime/provider leads','Before paid effects','','','','Last-budget race and uncertain charge recovery'),
 ('ADR-014','Audit outage and retention policy','pending','Audit/security leads','Before independently audited effects','','','','Audit outage and privileged-boundary tests'),
 ('ADR-015','Acceptance thresholds and datasets','pending','Product/validation leads','Before acceptance campaign','','','','Predeclared metrics, held-out fixtures and oracles'),
 ('ADR-016','Third real backend','pending','Platform lead','Before E3','','','','CA-19 and applicable qualification evidence'),
 ('ADR-017','Grammar and resource ergonomics','pending','Language lead','Before E4 stability','','','','Usability experiments and language corpus'),
 ('ADR-018','Licences and contribution model','pending','Project authority/release lead','Before public distribution','','','','Recorded licence choices and component conditions'),
 ('ADR-019','Compatibility window','pending','Release lead','Before public stability','','','','Named component/version matrix and migration tests'),
 ('ADR-020','Native fast path','deferred','Runtime/security leads','Only after measured bottleneck','','','','End-to-end benefit and changed trust boundary'),
]
with (P/'templates/decisions.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
 for ident,title,status,owner,gate,alternatives,decision,rationale,evidence in decisions:
  w.writerow(dict(decision_id=ident,title=title,status=status,owner_role=owner,decision_gate=gate,alternatives=alternatives,decision=decision,rationale=rationale,evidence_required=evidence,validation_ref='',supersedes=''))

# Review obligations complement, rather than substitute for, runtime tests.
reqs=list(csv.DictReader((P/'templates/requirements.csv').open()))
missing=[r for r in reqs if not r['mapped_test_ids']]
groups={}
for r in missing: groups.setdefault(r['requirement_id'].split('-')[0],[]).append(r)
with (P/'templates/review_obligations.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['review_id','requirement_ids','owner_role','review_scope','completion_condition','runtime_verification_needed','status'])
 for prefix,rows in groups.items():
  w.writerow(['RV-'+prefix,';'.join(r['requirement_id'] for r in rows),rows[0]['owner_role'],'Review the specified clauses individually, relevant ADRs, profile scope and evidence paths','Record one reasoned disposition per requirement; add executable cases for behaviour before qualification','Decide per clause; review alone never proves runtime behaviour','not_run'])
fields=list(reqs[0])+['review_obligation']
with (P/'templates/requirements.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
 for r in reqs:
  r['review_obligation']='RV-'+r['requirement_id'].split('-')[0] if not r['mapped_test_ids'] else ''
  w.writerow(r)

old=re.findall(r'^\*\*([A-Z]{3}-\d{3})',(BASE/'trix_normas.md').read_text(),re.M)
(P/'validation/v0_1_requirement_ids.json').write_text(json.dumps(old,indent=2)+'\n')
print(json.dumps({'planned_profile_families':len(families),'decision_records':len(decisions),'explicit_case_mappings':len(reqs)-len(missing),'requirements_requiring_review_obligations':len(missing),'review_groups':len(groups)}))
