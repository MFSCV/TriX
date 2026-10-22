from pathlib import Path
import re, csv, json

BASE = Path(__file__).resolve().parent
PACK = BASE / 'trix_v0_2'
def read(name): return (BASE/name).read_text()
def between(s, start, end): return s.split(start,1)[1].split(end,1)[0]

language = read('trix_language_additions.md')
language_body = '## Baseline choices for adoption\n' + between(language, '## Proposed baseline decisions\n', '## Acceptance cases for the additions')
language_body = language_body.replace('the serialization format or the implementation language', 'the complete logical-plan encoding or the implementation language')
language_tests = between(language, '## Acceptance cases for the additions\n', '## Bounded decisions requiring experiments')
language_adrs = language.split('## Bounded decisions requiring experiments\n',1)[1]

runtime = read('trix_runtime_additions.md')
runtime_body = '## Runtime records and state transitions\n' + between(runtime, '## Runtime records and state transitions\n', '## Concrete runtime acceptance tests')
runtime_body = runtime_body.replace('according to that revision; they MUST NOT assume', 'according to that revision; they MUST NOT assume')
runtime_body += '\nMCP integration and threat boundaries are revision-specific. [F25] [F26]\n'
runtime_tests = between(runtime, '## Concrete runtime acceptance tests\n', '## Decisions required before operational acceptance').replace('Verify the three status dimensions.', 'Verify all four status dimensions.')

qualification = read('trix_qualification_additions.md')
qualification_body = '## Qualification contract and support profiles\n' + qualification.split('## Qualification contract and support profiles\n',1)[1].split('## Delivery priorities',1)[0]
start = qualification_body.index('### Candidate profile families')
end = qualification_body.index('Each immutable snapshot SHOULD')
qualification_body = qualification_body[:start] + 'The candidate families in Chapter 12 remain planned until concrete configuration and evidence records are registered. The support-matrix template records lifecycle, role, validating party and limitations separately. Qualification dates and evidence may be absent for planned profiles; they are required before a qualified claim.\n\n' + qualification_body[end:]
qa_tests = between(qualification_body, '### Additional qualification tests\n', '## Implementer workflow and evidence')
qualification_body = qualification_body.split('### Additional qualification tests\n')[0] + '## Implementer workflow and evidence' + qualification_body.split('## Implementer workflow and evidence',1)[1]
qualification_body = re.sub(r'Suggested JSON Lines record:\n\n~~~json\n.*?~~~\n\nThe example is illustrative, not a measured event\.', 'The companion test-evidence schema and examples define the initial structural evidence record. Templates are not measured events.', qualification_body, flags=re.S)
qualification_body = re.sub(r'Suggested results and defect CSV columns:\n\n~~~csv\n.*?~~~', 'The implementation pack provides results and defect CSV templates with explicit outcome, evidence, reviewer and closure fields.', qualification_body, flags=re.S)
qualification_body = qualification_body.replace('For the SDK-first MVP, the executable plan schema is the conformance boundary.', 'For the SDK-first MVP, the adopted plan schema and semantic invariants together define the conformance boundary. The companion task-request schema covers a smaller admission record and is not the complete logical-plan schema.')

# Convert test tables into individual, traceable acceptance paragraphs.
qap=[]
qmap={1:['PLT-002','QUA-003'],2:['INT-006','QUA-002','QUA-003'],3:['LSP-018','QUA-006'],4:['CON-001','RUN-005','QUA-006'],5:['CON-004','QUA-006'],6:['CON-008','LNG-008','QUA-006'],7:['QUA-007','QUA-008'],8:['QUA-008','QUA-009'],9:['DAD-004','QUA-004','QUA-005'],10:['QUA-002','QUA-014'],11:['QUA-017','VER-005'],12:['QUA-017','RUN-026'],13:['VER-009','QUA-016'],14:['PLT-007','QUA-017'],15:['QUA-005','QUA-009']}
for line in qa_tests.splitlines():
    if not line.startswith('| QT-'): continue
    ident,stimulus,result=[v.strip() for v in line.strip('|').split('|')]
    if ident=='QT-07': result='Manipulation must not induce a passing verdict for a failing candidate. If the probe demonstrates susceptibility beyond the predefined tolerance, the judge is not qualified; no authority or tool access is gained.'
    qap.append(f'**{ident} Qualification probe.** {stimulus} {result} Requirements: '+', '.join(qmap[int(ident[-2:])])+'.')

endmatter = read('trix_endmatter_en.md')
acceptance = endmatter.split('# 21 Glossary',1)[0]
glossary_sources = '# 21 Glossary'+endmatter.split('# 21 Glossary',1)[1]
acceptance += '\n## Language and compiler acceptance\n\n'+language_tests
acceptance += '\n## Runtime and operational acceptance\n\n'+runtime_tests
acceptance += '\n## Qualification acceptance\n\n'+'\n\n'.join(qap)+'\n\n'+read('trix_additional_acceptance.md')

master = '\n\n'.join([
    read('trix_base_en_1.md'), read('trix_base_en_2.md'),
    '# 15 Language and compiler specification\n\n'+language_body,
    '# 16 Runtime and operational specification\n\n'+runtime_body,
    '# 17 Qualification, evaluations and evidence\n\n'+read('trix_acceptance_core_en.md')+'\n\n'+qualification_body,
    read('trix_contracts_and_delivery.md'), acceptance, glossary_sources, read('trix_sources_extra.md')
])
master=master.replace('\u2011','-').replace('\u2013','-').replace('\u2014','-')
master=master.replace('These ADRs do not defer', 'These decision records do not defer')
master=master.replace('### ', '## ')
master=re.sub(r'\n{4,}', '\n\n\n', master)
out=PACK/'docs/TriX_Design_and_Implementation_Standard_v0_2.md'
out.write_text(master)
(PACK/'docs/LANGUAGE_DECISION_EXPERIMENTS.md').write_text('# Language decision experiments\n\nVersion 0.2. Proposed experiments; no results asserted. All decisions require the recorded owner and adoption gate.\n\n'+language_adrs)

reqpattern=r'^\*\*([A-Z]{3}-\d{3}) ([^\n]+?)\.\*\* (.+)$'
reqs=re.findall(reqpattern,master,re.M)
testpattern=r'^\*\*((?:CA|RT|QT)-\d{2}|(?:LSP|SIF)-AT\d{2}) ([^\n]+?)\.\*\* (.+)$'
tests=re.findall(testpattern,master,re.M)
profiles={
 'IDN':'ALL','NOR':'ALL','ESC':'CORE;COORD;SDK','ARQ':'COORD;DIST;EXEC',
 'LNG':'CORE','CON':'CORE;EXEC;DIST;SDK','GOV':'COORD;EXEC;REMOTE;CLIENT;AUDIT',
 'TAR':'COORD;EXEC;DIST;REMOTE','DAD':'COORD;EXEC;DIST;REMOTE','REC':'COORD;EXEC;DIST;REMOTE',
 'PLT':'EXEC;CLIENT;SDK','INT':'EXEC;DIST;REMOTE;SDK','VER':'ALL','BLD':'ALL','DEV':'CORE;CLIENT;SDK',
 'UXD':'CLIENT;COORD','LSP':'CORE;SDK','RUN':'COORD;EXEC;DIST;REMOTE;AUDIT','VAL':'ALL','QUA':'ALL',
 'SIF':'COORD;CLIENT;SDK;REMOTE','EVO':'ALL','DEL':'ALL'
}
owners={'LNG':'Language lead','LSP':'Language lead','CON':'Language/runtime lead','RUN':'Runtime lead','GOV':'Security/audit lead','PLT':'Platform lead','INT':'Integration lead','UXD':'Client lead','QUA':'Validation lead','VAL':'Validation lead','BLD':'Release lead','VER':'Release lead','SIF':'Integration lead','DAD':'Data/runtime lead','REC':'Runtime lead','TAR':'Runtime lead'}
stage={'LSP':'E1/E4 by subset','RUN':'E1/E2 by profile','INT':'E2/E3 by adapter','PLT':'Before target qualification','UXD':'Before client qualification','QUA':'Before qualification','VAL':'Before qualification','EVO':'E0-E5','DEL':'At applicable delivery gate'}

def refs(text):
    result=set(re.findall(r'\b[A-Z]{3}-\d{3}\b',text))
    for m in re.finditer(r'\b([A-Z]{3})-(\d{3})(?: through | to | a |-|–)(?:\1-)?(\d{3})\b',text):
        prefix,a,b=m.groups()
        if int(b)>=int(a) and int(b)-int(a)<100: result.update(f'{prefix}-{i:03d}' for i in range(int(a),int(b)+1))
    return sorted(result)

with (PACK/'templates/test_catalogue.csv').open('w',newline='') as f:
    w=csv.writer(f);w.writerow(['test_id','title','specification','requirement_ids','profile_assignment','fixture_ref','oracle_ref','implementation_status','execution_status'])
    for ident,title,body in tests:w.writerow([ident,title,body,';'.join(refs(body)),'pending_review','','','not_evidenced','not_run'])

with (PACK/'templates/requirements.csv').open('w',newline='') as f:
    w=csv.writer(f);w.writerow(['requirement_id','title','normative_text','proposed_profiles','applicability_review','owner_role','gate','mapped_test_ids','implementation_ref','evidence_ref','status'])
    for ident,title,body in reqs:
        prefix=ident.split('-')[0]
        mapped=[tid for tid,_,tb in tests if ident in refs(tb)]
        w.writerow([ident,title,body,profiles.get(prefix,'ALL'),'pending_per_capability_review',owners.get(prefix,'Specification/project authority'),stage.get(prefix,'Before offered capability is qualified'),';'.join(mapped),'','','specified_not_evidenced'])

headers={
 'test_results':['run_id','test_id','requirement_id','profile_id','snapshot_id','build_digest','outcome','metric','unit','threshold','observed_value','sample_count','uncertainty','evidence_ref','defect_id','reviewer'],
 'defects':['defect_id','severity','affected_profiles','invariant_violated','reproducer_ref','owner','remediation','fix_revision','regression_tests','residual_limitations','closure_evidence','status'],
 'support_matrix':['profile_id','profile_revision','release_id','lifecycle','role','operation','workload_profile_id','snapshot_id','application_os_min','executor_os_min','feature_os_min','limitations','maintainer','validating_party','evidence_manifest','qualified_at','review_trigger','withdrawal_plan'],
 'decisions':['decision_id','title','status','owner_role','decision_gate','alternatives','decision','rationale','evidence_required','validation_ref','supersedes'],
 'work_items':['work_item_id','requirement_ids','test_ids','contract_revision','dependencies','owner_role','integration_owner','deliverables','exit_gate','status']
}
for name,cols in headers.items():
    with (PACK/f'templates/{name}.csv').open('w',newline='') as f: csv.writer(f).writerow(cols)

oldids=set(re.findall(r'^\*\*([A-Z]{3}-\d{3})',read('trix_normas.md'),re.M))
ids=[r[0] for r in reqs]
assert len(ids)==len(set(ids)), 'Duplicate requirements'
assert oldids<=set(ids), f'Missing original IDs: {oldids-set(ids)}'
assert len(tests)==67, len(tests)
print(json.dumps({'requirements':len(reqs),'original_requirements_preserved':len(oldids),'acceptance_cases':len(tests),'chapters':len(re.findall(r'^# \d+',master,re.M)),'words':len(master.split()),'path':str(out)}))
