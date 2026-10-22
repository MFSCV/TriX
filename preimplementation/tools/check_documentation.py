"""Check documentation consistency. This does not test a TriX implementation."""
from pathlib import Path
import csv,json,re,sys
from datetime import datetime,timezone

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'docs/TriX_Design_and_Implementation_Standard_v0_2.md'

def main():
 checks=[]
 def check(name,ok,detail): checks.append({'check':name,'passed':bool(ok),'detail':detail})
 text=SOURCE.read_text(encoding='utf-8')
 ids=re.findall(r'^\*\*([A-Z]{3}-\d{3}) ',text,re.M)
 cases=re.findall(r'^\*\*((?:CA|RT|QT)-\d{2}|(?:LSP|SIF)-AT\d{2}) ',text,re.M)
 previous=json.loads((ROOT/'validation/v0_1_requirement_ids.json').read_text())
 check('requirements_unique',len(ids)==len(set(ids))==228,{'count':len(ids)})
 check('original_ids_preserved',set(previous)<=set(ids),{'original_count':len(previous),'missing':sorted(set(previous)-set(ids))})
 check('acceptance_ids_unique',len(cases)==len(set(cases))==67,{'count':len(cases)})
 definitions=set(re.findall(r'^\*\*(F\d{2}) ',text,re.M))
 cited=set(re.findall(r'\[(F\d{2})\]',text))
 check('source_references_resolve',len(definitions)==30 and cited<=definitions,{'definitions':len(definitions),'unresolved':sorted(cited-definitions)})
 reqrows=list(csv.DictReader((ROOT/'templates/requirements.csv').open()))
 testrows=list(csv.DictReader((ROOT/'templates/test_catalogue.csv').open()))
 check('requirement_register_matches',set(ids)=={r['requirement_id'] for r in reqrows} and len(reqrows)==len(ids),{'rows':len(reqrows)})
 check('test_register_matches',set(cases)=={r['test_id'] for r in testrows} and len(testrows)==len(cases),{'rows':len(testrows)})
 check('future_tests_not_misreported',all(r['execution_status']=='not_run' for r in testrows),{'runtime_tests_executed_by_this_check':0})
 check('verification_obligations_present',all(r['mapped_test_ids'] or r.get('review_obligation') for r in reqrows),{'note':'Review obligations are not runtime passes or complete executable coverage.'})
 unknown=[]
 for r in testrows:
  unknown.extend([x for x in r['requirement_ids'].split(';') if x and x not in ids])
 check('test_requirement_links_resolve',not unknown,{'unknown':sorted(set(unknown))})
 required=['README.md','CHANGELOG.md','docs/IMPLEMENTER_GUIDE.md','docs/GAP_AND_DECISION_REGISTER.md','docs/REFERENCE_WORKFLOWS.md','docs/LANGUAGE_DECISION_EXPERIMENTS.md','templates/ADR_TEMPLATE.md','templates/ACCEPTANCE_PROFILE_TEMPLATE.md']
 missing=[p for p in required if not (ROOT/p).is_file()]
 check('handoff_documents_present',not missing,{'missing':missing})
 stale=[]
 for p in list((ROOT/'docs').glob('*.md'))+[ROOT/'README.md',ROOT/'CHANGELOG.md']:
  body=p.read_text()
  if re.search(r'\b(?:DEVE|DEVEM|NÃO|Versão|conceção|Índice)\b||turn\d+(?:view|search)',body):stale.append(str(p.relative_to(ROOT)))
 check('language_and_citation_hygiene',not stale,{'flagged_files':stale,'scope':'Known old-language markers and tool citation tokens; not a general language detector.'})
 profile_rows=list(csv.DictReader((ROOT/'templates/support_matrix.csv').open()))
 check('support_claims_remain_planned',all(r['lifecycle']=='planned' and not r['qualified_at'] for r in profile_rows),{'rows':len(profile_rows)})
 report={'kind':'documentation_package_validation','specification_revision':'0.2','executed_at_utc':datetime.now(timezone.utc).isoformat(),'scope':'Document identifiers, references, registers and claim hygiene only. No TriX compiler/runtime/hardware/security qualification.','checks':checks,'passed':all(c['passed'] for c in checks)}
 path=ROOT/'validation/documentation_validation_report.json';path.write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({'checks':len(checks),'passed':report['passed'],'report':str(path.relative_to(ROOT))}))
 return 0 if report['passed'] else 1

if __name__=='__main__':sys.exit(main())
