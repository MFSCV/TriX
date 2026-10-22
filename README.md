# TriX

TriX is a proposed vendor-independent language and execution-contract initiative for describing validated work across different hardware architectures, operating systems, model engines and local or remote environments. She is intended to separate task intent and constraints from the adapters that eventually execute them.

This repository combines the English preimplementation baseline with the implemented **TriX Environment Lab**, an interactive planning configurator. It is an early project and does not include a TriX compiler or production execution runtime.

## What is available

- An English design and implementation standard with 228 requirements, 67 future acceptance cases, an implementer guide, gap/decision register and reference workflows.
- Four constrained companion JSON Schemas, positive and negative fixtures, structural validators and traceability templates.
- A dependency-free static configurator for execution groups, platform compatibility, workload constraints, scenario comparisons and technical-plan exports.
- English UI, Light/Dark/System themes, browser-local scenario persistence and a bounded deterministic agent-planning workspace.
- MCP and connection requirements covering proposed inbound and outbound integrations.

The configurable profiles and exported capabilities remain **proposed / not qualified**. The agent workspace does not call a language model, run arbitrary code, install skills, connect an MCP broker or deploy workloads. Runtime authorization, durable orchestration, actual model/skill execution, compiler semantics, physical hardware qualification and operational security require separate implementation and evidence.

## Repository map

| Directory | Contents |
| --- | --- |
| `docs/` | Current English standard in Markdown, DOCX and PDF, plus MCP and connection requirements |
| `preimplementation/` | Preserved v0.2 release: 52 original files, original checksum list, schemas, fixtures, registers, tools and validation records |
| `environment-lab/` | Latest available merged static configurator source, tests and verification notes |
| `examples/` | Exported configurator scenarios in JSON and YAML |
| `history/` | Original v0.1 Portuguese documents and documentation authoring sources; retained as historical material |

Start with [the current English standard](docs/TriX_Design_and_Implementation_Standard_v0_2.md), [implementation guidance](preimplementation/docs/IMPLEMENTER_GUIDE.md), [the gap register](preimplementation/docs/GAP_AND_DECISION_REGISTER.md), and [MCP/connection requirements](docs/TriX_MCP_and_Connection_Requirements_v0.2.md).

The current `docs/` documents were retrieved separately from the preserved release and may contain a later PDF revision. The package under `preimplementation/` is an unchanged historical release snapshot. Its original `SHA256SUMS.txt` applies only to that snapshot.

## Try the configurator

Serve the static files with a local HTTP server, for example:

```sh
python3 -m http.server 8000 --directory environment-lab/dist
```

Then open `http://localhost:8000`. This local preview does not add server authentication. Browser-local configuration is stored in localStorage; exports can be downloaded and imported into another browser.

## Verification

The preserved project evidence records **38 passing Node tests**, four valid companion schemas, 16 fixture expectations met, and 13 passing documentation checks. These records describe earlier verification of their stated scope; they are not a fresh execution during public-repository preparation, a security certification, or proof of compiler/runtime/hardware conformance. See [configurator verification](environment-lab/docs/verification.md) and [package validation](preimplementation/validation/).

To rerun deterministic configurator tests with Node.js:

```sh
npm --prefix environment-lab test
```

For the documentation checks, use Python 3.10+ and the dependencies listed in `preimplementation/tools/requirements.txt`. The commands below operate on a disposable package copy so its generated reports do not change the preserved release:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r preimplementation/tools/requirements.txt
python -c "import shutil; shutil.copytree('preimplementation', '.verification-package', dirs_exist_ok=True)"
python .verification-package/tools/validate_package.py
python .verification-package/tools/check_documentation.py
```

On Windows, activate the environment with `.venv\Scripts\Activate.ps1`. Validation checks the documented records, fixtures and traceability; it does not run TriX programs, call a provider or qualify devices. Review [the package README](preimplementation/README.md) for generation and validation limits.

## Publication preparation

This source export excludes private hosting identifiers and configuration, workstation transfer instructions/paths, repository internals, credential files, transfer helpers/logs, third-party dependency installations, old deployment bundles, duplicate document-rendering images and unrelated projects. Historical references to a previously private deployment describe earlier project evidence; they do not expose or configure that deployment here.

A focused static credential/private-data scan was performed for this export. Fresh target-code tests were not rerun because the required isolated offline test sandbox was unavailable. This scan is not a full security audit.

No project license has been selected in this repository. Do not infer reuse permissions from public availability; a license decision remains open.
