# TriX pre-implementation package

**Version 0.2 - 22 October 2026 - proposed normative baseline**

TriX uses she/her pronouns. All project documentation is maintained in English.

## Start here

1. Read [Design and Implementation Standard](docs/TriX_Design_and_Implementation_Standard_v0_2.md). This is the canonical editable source for the English standard.
2. Read [Gap and Decision Register](docs/GAP_AND_DECISION_REGISTER.md) to distinguish specified behaviour, open decisions and implementation evidence still required.
3. Follow [Implementer Guide](docs/IMPLEMENTER_GUIDE.md) to organise E0-E5, parallel work, tests, corrections and release evidence.
4. Use [Reference Workflows](docs/REFERENCE_WORKFLOWS.md) to turn five end-to-end designs into executable fixtures.
5. Resolve the bounded experiments in [Language Decision Experiments](docs/LANGUAGE_DECISION_EXPERIMENTS.md) before their relevant gates.

The standard contains **228 requirements**, including all **127 original identifiers**, and **67 future acceptance cases**. It is also supplied as an editable Word document and a reading PDF in `docs/`.

## Package contents

| Location | Purpose |
| --- | --- |
| `docs/` | Standard, implementation guidance, gap analysis, design walkthroughs and bounded experiments |
| `schemas/` | Four constrained JSON Schema contracts for task requests, capability manifests, task records and test evidence |
| `examples/` | Illustrative valid records and targeted rejection fixtures |
| `templates/requirements.csv` | Full requirement text, proposed profile mapping, owner roles and test links |
| `templates/review_obligations.csv` | Review obligations for clauses needing documentary assessment or further executable-test mapping |
| `templates/test_catalogue.csv` | All 67 proposed acceptance cases, with execution explicitly marked not run |
| `templates/test_results.csv` | Empty results register; no invented runtime measurements |
| `templates/defects.csv` | Defect, remediation and closure evidence register |
| `templates/support_matrix.csv` | Planned platform/profile families, awaiting concrete snapshots and qualification |
| `templates/decisions.csv` | Initial decisions, owners, gates and evidence needed |
| `templates/work_items.csv` | Work-item and parallel-integration template |
| `templates/ADR_TEMPLATE.md` | Architecture-decision record template |
| `templates/ACCEPTANCE_PROFILE_TEMPLATE.md` | Workload, thresholds, sampling, quality and recovery template |
| `tools/` | Structural-package validation and Word-document generation |
| `validation/` | Results limited to the checks actually performed on this package |

## Authority and scope

The standard's normative clauses govern the adopted revision. JSON Schemas define the structural constraints they express. Examples and generated registers cannot override these contracts. A contradiction must be resolved before claiming conformance.

The task-request schema is a constrained admission record. It is **not** the complete logical-plan IR, a source-language grammar, an authorisation engine or an implementation of TriX. Schema-valid examples are not qualified hardware or successful production tasks. All 67 acceptance cases require a future implementation and appropriate evidence.

The requirement register links 165 requirements directly to the scenario catalogue; 63 carry explicit review obligations requiring a per-clause disposition and, where behavioural, additional executable verification. These figures describe planned traceability, not completed test coverage. Its profile assignments are a starting point. The responsible team must review applicability per exposed capability and complete any unmapped verification before making a conformance claim. A profile cannot exclude mandatory requirements needed by a feature it offers.

## Run the documentation checks

Use an isolated Python environment and install the dependencies listed in `tools/requirements.txt` with your normal dependency-management workflow. Run from this package's root:

```sh
python tools/validate_package.py
python tools/check_documentation.py
```

These commands validate the package and its fixtures. They do not execute TriX programs, authenticate a real node, call a model provider, test a GPU or prove security controls. Read the generated reports and their stated limits.

The Word document can be regenerated using `python tools/build_documents.py` when `python-docx` is installed. The generator uses the Markdown source and `validation/page_map.json`; after text or layout changes, regenerate and verify pagination before publishing. The supplied PDF is the reviewed rendering of this release. Re-export and review it after changing the Word document.

## Next implementation gate

Complete E0: adopt the baseline and profile scope, select the first CPU reference environment, approve the full plan encoding and verifier semantics, select the durable-state and authority mechanisms, and register fixtures plus objective acceptance oracles. Then implement one E1 flow including successful execution, refusal, cancellation and restart recovery.

Hardware minima, exact model revisions, performance thresholds, licences and compatibility windows remain explicit decisions. This package does not certify operational readiness.
