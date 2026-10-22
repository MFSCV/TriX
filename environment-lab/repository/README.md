# TriX

TriX is a proposed portable language and execution-contract programme for describing work across hardware architectures, operating systems and model/runtime backends. She separates intent and constraints from the adapters that execute them.

The current **TriX application 0.5.0** provides a conversational planning workspace: describe hardware, runtimes and workload constraints, check compatibility, compare alternatives, export a portable configuration and inspect execution evidence. Her experimental orchestrator can delegate implementation, tests, audit and delivery when a model and scoped MCP tools are configured. Live integrations are not configured or qualified in this release.

## Find the right starting point

| Need | Read |
| --- | --- |
| Understand or use the current application | [Application guide](environment-lab/docs/product-guide.md) |
| Develop or operate it | [Application README](environment-lab/README.md) and [current documentation index](environment-lab/docs/README.md) |
| See release evidence and limitations | [Version tracker](environment-lab/version.json), [release audit](environment-lab/docs/release-audit-v0.5.0.md) and [change log](environment-lab/CHANGELOG.md) |
| Study the proposed language | [Design and Implementation Standard 0.2](docs/TriX_Design_and_Implementation_Standard_v0_2.md) |
| Review the broader connection design | [MCP and Connection Requirements 0.2](docs/TriX_MCP_and_Connection_Requirements_v0.2.md) |
| Inspect original fixtures and decisions | [Preserved preimplementation pack](preimplementation/README.md) |

The application, planning engine, schemas and proposed language standard have different versions. A passing planning rule is not hardware qualification; a local CPU result is not model execution; an export is not implementation in a target project. The source repository is public; the existing hosted application keeps its owner-private audience.

## Validate the application

```sh
cd environment-lab
npm run check
npm run benchmark
npm run dev
```

The recorded development runtime is Node 24, with no third-party runtime dependencies. Public source uses a generic hosting template. Register your own Site and configure platform identity, storage and runtime secrets before hosting a copy. The development preview identity is disposable and must not be deployed as production authentication.

`preimplementation/` and `history/` retain their original release scope and hashes. Their historical documentation checks do not constitute current application qualification. The current index explains supersession without silently rewriting the original standard.
