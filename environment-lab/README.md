# TriX Environment Lab

Private implementation-planning configurator based on **TriX Design and Implementation Standard v0.2**, 22 October 2026. This application is a planning tool, not a TriX compiler, runtime, hardware detector or qualification service.

## Use

Choose a preset, edit one or more execution groups, set workload and policy constraints, inspect diagnostics, save alternative scenarios, and generate an English technical configuration. Blocking errors prevent generation. Conditional combinations retain explicit qualification gates. Every exported capability remains **proposed / not qualified**.

The entire user interface uses English under IDN-005. Authoritative code, diagnostic catalogue, exports and implementation documentation use English. TriX uses she/her pronouns.

The project has no runtime dependencies or third-party analytics. Configuration and comparison snapshots live in browser localStorage. JSON exports can be imported in another browser. The hosting platform enforces owner-only access; a client-side privacy badge is not the access-control mechanism.

## Development

- Static assets: `dist/`
- Domain and compatibility engine: `dist/model.mjs`
- UI: `dist/app.js`
- Tests: `tests/configurator.test.mjs`
- Hosting identity and static output: `.openai/hosting.json`
- Run deterministic checks: `npm test`

## Validation model

The engine separates CPU ISA, CPU vendor, OS, ABI, accelerator, model engine, resource manager, workload and data policy. It supports independent heterogeneous workflows and conservative homogeneous CUDA/NCCL or ROCm/RCCL distributed candidates. Separate qualification is required for joint computation, exact reproduction, checkpointing and model/operator/precision coverage.

The memory request is a conservative per-replica/per-worker planning bound. The application does not add device memory across nodes or derive tensor-shard capacity. Real partitioning, model placement, reservations, topology, device SKU and performance remain implementer gates. A group represents identical nodes under one declared profile. WSL2 is a separate Linux execution profile. Native process architecture is assumed in this revision; emulated/guest targets require a separately defined execution group and an extension qualification record.

`trix.environment-planning/v1` is an application-specific export envelope, not the normative TriX IR or a production deployment format. It includes the input scenario, selected components, constraints, unresolved conditions, implementation order and source links. Credentials must remain external references.

## Extension rules

Add new engines through an explicit capability contract in the domain catalogue, with positive and negative tests. Do not infer that a detected GPU supports every model, that a vendor API supplies arbitrary tensor parallelism, or that a container removes host driver requirements. Project, maintainer and physical qualification statuses must not be inferred from successful configurator tests.

## Publication

The user authorized a private deployment only. Preserve the Site project ID and owner-only audience. Do not switch to public access without the user's explicit approval.

## Agent workspace

The Agent workspace provides local deterministic planning commands and an integration-evidence registry. Read `docs/agent-integration.md` for implemented scope, limitations and the proposed server runtime contract. It is not a model-backed autonomous agent runtime.
