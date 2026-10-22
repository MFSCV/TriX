# TriX language and compiler additions for version 0.2

## Status and scope

This insert supplements the existing requirements without renumbering them. It proposes implementable language and compiler decisions for adoption in version 0.2. It does not claim that a compiler, grammar or verified execution environment already exists. TriX retains her official name and feminine identity. All normative documentation, reference examples, specifications and change records must be maintained in English.

MUST, MUST NOT, SHOULD and MAY have the same normative strength as the corresponding terms in the existing document. The requirements below apply to the language specification and its declared implementation profiles. A runtime or adapter remains responsible for the execution guarantees assigned to it.

## Gaps identified in version 0.1

The existing document establishes valuable principles, but several implementation choices remain too broad to serve as acceptance criteria.

- The first subset is named without a closed list of constructs. A team could deliver either a configuration format or an unrestricted programming language and interpret both as compliance.
- Type checking is required, but primitive values, conversion rules, overflow, units, equality and evaluation order are unspecified. These differences can change routing and budgets across platforms.
- Ownership is required without a minimum resource model. A borrowing system for ordinary local memory and a transferable reference to a remote artifact are different contracts.
- Effects and policy propagation are described without rules for composition, imported code, control-dependent outputs or untrusted plan generators.
- The intermediate plan is versioned, but its invariants, canonical identity, validation boundary and relationship to runtime binding are unspecified.
- Dependency inventories and reproducible builds lack an exact resolution and lockfile contract. An apparently unchanged build could select different transitive packages or native artifacts.
- Diagnostics and testing lack a language conformance corpus that connects source meaning, plan meaning and observable execution.

These additions close those gaps while keeping numerical kernels, arbitrary native code and a general-purpose borrow checker outside the first language milestone.

## Proposed baseline decisions

Adopt the following as the version 0.2 planning baseline, subject to the project's normal adoption record.

1. **Initial language scope.** The first executable subset describes typed task graphs, pure data transformations, dependencies, conditions and execution contracts. Existing adapters perform model inference, tools and substantial numerical computation.
2. **Two distinct milestones.** The initial SDK and serialized plan establish the execution contract. The later source frontend establishes the programmer-facing grammar. Delivering the SDK alone does not constitute delivery of the complete source language.
3. **Small value model.** The first evaluator uses immutable values, explicit optional and result values, checked integers, exact finite decimal values and typed quantities. Tensor arithmetic and binary floating-point computation remain engine operations in this baseline.
4. **Opaque resources.** External artifacts are referenced through typed identifiers. Live allocations and access authority use separate scoped handles. The baseline exposes no raw pointers or arbitrary shared mutable memory.
5. **Verified admission.** Every submitted plan crosses the same plan-verification boundary, regardless of its frontend or signature. Target binding and authorization are checked again by the execution system where required.
6. **Explicit build inputs.** Locked dependency resolution is the release default. Planning receives explicit inputs and does not implicitly read clocks, environment variables, credentials or the network.

These decisions specify observable behavior. They do not select final keywords, file extensions, a public package registry, the serialization format or the implementation language of every component.

## Requirements for the first executable subset

**LSP-001 Closed baseline profile.** The specification MUST publish an exhaustive list of supported value types, expressions, graph constructs, built-in operations and effects for the first subset. Unlisted constructs MUST be rejected or identified as extensions requiring a different declared profile. An extension MUST NOT silently alter baseline semantics.

**LSP-002 Bounded composition.** The baseline MUST support acyclic task dependencies, explicit conditional selection and finite collection processing with declared expansion limits. It MUST reject dependency cycles and unbounded plan expansion. General recursion, unrestricted metaprogramming, user-defined kernels and arbitrary native calls are outside this baseline; later support requires an additional specification.

**LSP-003 Frontend boundary.** An SDK builder, declarative input and future TriX source frontend MUST produce plans governed by the same semantics. Host-language builder code MUST NOT be treated as verified TriX code. Executing a Python or other builder requires a separately declared build environment and permissions before the resulting plan can be verified.

**LSP-004 Source specification gate.** Before a source frontend is stable, its lexical rules, grammar, scope, name resolution, evaluation rules and source-to-plan mapping MUST be published together. The final grammar MAY be selected later. Syntax demonstrations MUST remain labelled illustrative until accepted into that specification and its conformance corpus.

**LSP-005 Baseline data types.** The baseline MUST define Boolean, UTF-8 string, byte sequence, signed 64-bit integer, exact finite decimal, typed quantity, immutable record, ordered list, string-keyed map, tagged union, optional value and result value. Each type MUST define construction, equality and serialization. Model tensors MUST declare an external representation and element type rather than inheriting scalar evaluator rules implicitly.

**LSP-006 Explicit conversions.** The evaluator MUST NOT apply implicit string-to-number conversions, truthiness conversions or lossy numeric narrowing. Invalid input, absent values and failed operations MUST remain distinguishable. Conversions that can fail MUST return a typed failure. Accepted runtime values MUST conform to the same value rules as source literals.

**LSP-007 Numeric behavior.** Integer overflow, division by zero and invalid numeric conversion MUST produce specified errors. Decimal addition and multiplication MUST be exact within declared representation limits; exceeding those limits MUST fail explicitly. Decimal division requiring rounding MUST specify scale and rounding mode. Binary floating-point and tensor operations MUST execute under an explicit engine contract outside the baseline scalar evaluator.

**LSP-008 Units and budgets.** Durations, byte quantities, counts and monetary amounts MUST be distinguishable types. Arithmetic MUST reject incompatible units. A monetary amount MUST retain its currency identifier; conversion requires an explicit conversion input. Encodings MUST define base units and scaling, and reject negative or out-of-range values where the field's contract excludes them.

**LSP-009 Text and ordering.** Baseline strings MUST be compared by their exact Unicode scalar sequences, without implicit normalization or locale-sensitive comparison. Duplicate map keys MUST be rejected. Map iteration MUST use a documented stable ordering; insertion order MUST NOT become an undeclared dependency. Lists preserve order. Identity and ordering rules MUST remain independent of the host filesystem and locale.

**LSP-010 Evaluation order.** The specification MUST define evaluation order and conditional short-circuiting for pure expressions. Task ordering MUST follow explicit dependencies rather than source layout alone. Parallel completion order MUST NOT alter ordered results unless the operation explicitly declares arrival order. Optimizations MUST preserve these observable rules and all required effects.

## Requirements for resources and effects

**LSP-011 Resource reference model.** Immutable artifact references MUST identify an object and its representation without themselves granting access. Live allocation handles MUST have an owner, scope, release operation and expiry or invalidation behavior. Copying a resource identifier MUST NOT duplicate an allocation or authorization. The baseline MUST prohibit raw addresses in portable values.

**LSP-012 Resource consumption.** Operations that transfer or release exclusive handles MUST consume the corresponding authority exactly as defined by the handle contract. Reuse after confirmed release MUST fail. Failure paths MUST trigger documented cleanup or reconciliation. This is a resource-lifecycle rule; it MUST NOT be presented as a guarantee of immediate cleanup after a disconnected worker fails.

**LSP-013 Effect composition.** Each built-in operation and callable module interface MUST expose a machine-readable effect summary. A composed operation MUST conservatively include the effects of its callees and possible branches. A wrapper MUST NOT conceal network access, process creation, model invocation, time access or randomness. Effect declarations describe possible actions and do not grant permission to perform them.

**LSP-014 Pure planning boundary.** Parsing, type checking and evaluation of baseline pure expressions MUST NOT perform task effects. Clock, randomness, environment lookup, filesystem discovery and remote inspection MUST be explicit inputs or separately authorized operations. Package acquisition MUST be a visible preparation step. Plan generation MUST NOT run dependency initialization code merely because a declaration is imported.

**LSP-015 Conservative policy propagation.** Within baseline verified transformations, an output MUST inherit applicable restrictions from all supplied inputs, including predicates controlling that output. A narrower classification requires the existing explicit reclassification contract. Foreign code MUST use a declared information-flow boundary; the system MUST NOT infer unrestricted output from missing provenance. This rule does not claim elimination of all covert channels.

**LSP-016 FFI admission and containment.** Baseline foreign integrations MUST use versioned messages or a documented restricted calling boundary, with validated lengths, representations, ownership and errors. An in-process native extension requires a separately declared trusted profile. Foreign exceptions, panics or equivalent nonlocal exits MUST NOT cross a boundary that does not define them. Native-code access remains subject to the stated trust assumptions.

## Requirements for plans and compiler trust

**LSP-017 Logical and bound plans.** The system MUST distinguish a portable logical plan from its execution binding. The logical plan records meaning, requirements and authorized alternatives. Binding records chosen artifacts, model variants, adapters, targets and relevant policy decisions. Late-bound choices MUST produce a resolution record before their effects; they MUST NOT silently mutate the original plan's meaning.

**LSP-018 Plan invariants.** Before admission, a separately callable verifier MUST check schema versions, unique node identifiers, reference resolution, graph validity, type compatibility, mandatory fields, declared effects and structural resource bounds. It MUST reject ambiguous encodings, duplicate fields and unsupported mandatory constructs. Validation MUST finish before loading task plugins or starting task effects.

**LSP-019 Canonical identity.** The plan specification MUST define canonical semantic encoding and a content digest. Identical source, declared inputs, resolved language dependencies, compiler version and compilation options MUST produce the same logical plan identity. Comments, timestamps, machine paths and display metadata MUST NOT change that identity unless explicitly semantic. Execution attempts and authorizations MUST retain separate identities; a content digest is not an access credential.

**LSP-020 Verification limits.** Plan verification MUST state what it proves and what remains for runtime enforcement. It cannot certify arbitrary adapter behavior, available memory, current permission or future numerical quality merely from a manifest. A compiler signature or trusted origin MUST NOT bypass verification. Source-to-plan semantic preservation MUST be validated independently of structural plan validity.

**LSP-021 Compiler transformations.** Each optimization MUST preserve data dependencies, errors, effect ordering, policy restrictions and observable results under the declared semantic profile. Transformations that change model, precision, provider or permitted outcomes MUST be explicit planning decisions governed by the task contract, rather than invisible compiler optimizations. An unoptimized reference path MUST remain available for conformance comparisons.

## Requirements for packages and builds

**LSP-022 Module resolution.** Imports MUST resolve through declared namespaces and package roots. Ambiguous names, undeclared dependencies and traversal outside approved roots MUST be rejected. Platform-specific implementations MAY share a module contract but MUST identify their target artifacts. Loading an interface declaration MUST NOT execute module initialization or native code.

**LSP-023 Lockfile contract.** A release lockfile MUST record the resolved transitive dependency graph, immutable content identities, artifact origins, selected target variants and relevant toolchain identities. Locked builds MUST fail on missing or mismatched artifacts rather than silently selecting alternatives. Permission requirements MAY be recorded for inspection; recording them MUST NOT grant them.

**LSP-024 Controlled build inputs.** Release builds MUST declare allowed environment inputs, tool invocations and generated sources. Once declared artifacts are available, verification and construction SHOULD operate without undeclared network access. Required exceptions MUST be recorded in provenance. Native build scripts and SDK builders MUST run with documented authority and MUST NOT be assumed harmless because they run before deployment.

**LSP-025 Separation of caches and trust.** Build and compilation cache keys MUST include all inputs that affect generated semantics or target compatibility. Cache reuse MUST verify artifact integrity and the receiving project's access rights. A hit MUST NOT skip required plan verification or current authorization checks. Secret values MUST NOT become public cache identifiers or diagnostics.

## Requirements for developer tools and acceptance

**LSP-026 Structured diagnostics.** The compiler and verifier MUST emit stable machine-readable error identifiers, severity, phase, relevant plan node and available source locations. Generated code MUST retain a source map to the originating declaration where possible. Human-readable documentation and canonical messages MUST be English; localized presentation MAY coexist without changing error identity or meaning.

**LSP-027 Inspectable compilation.** Developer tools MUST expose the normalized logical plan, dependency resolution, effect summary and diagnostics without submitting work. Formatting or source migration tools MUST preserve meaning, or display an explicit semantic change requiring review. Inspection MUST distinguish unresolved choices from fixed bindings and unmeasured estimates from enforced limits.

**LSP-028 Conformance corpus.** The language release MUST include positive and negative examples covering each baseline construct and normative edge case. The corpus MUST define accepted values, rejected programs, expected diagnostics and permitted observable traces. At least one reference evaluator or unoptimized execution path MUST support comparison with the production implementation for the verified subset.

**LSP-029 Stability gate.** A source-language profile MUST NOT become stable while its grammar, value semantics, source-to-plan mapping or required diagnostics remain unspecified. A plan-only profile MUST define its complete plan encoding, value semantics, semantic invariants and diagnostics before becoming stable; it MUST NOT claim source-language conformance. A release MUST pass its conformance corpus on each claimed implementation target and test malformed or oversized inputs without crashes or unbounded verifier work. Changes to accepted meanings require an identified compatibility decision and updated corpus.

## Acceptance cases for the additions

These cases supplement the existing CA catalog and use distinct identifiers. Each test records inputs, implementation versions, expected observations and the applicable requirements.

**LSP-AT01 Numeric boundaries.** Evaluate the largest supported integer plus one, division by zero, decimal division without a required rounding policy and addition of incompatible quantities. Each produces its specified error; no wrapping, implicit rounding or unit erasure occurs. Applies to LSP-005 through LSP-008.

**LSP-AT02 Stable value interpretation.** Run the same string comparisons and map iteration under different host locales and insertion orders. Preserve exact string distinctions and identical defined ordering. Reject duplicate keys and malformed UTF-8. Applies to LSP-005 and LSP-009.

**LSP-AT03 SDK trust boundary.** Give a host-language builder an undeclared network or filesystem action. The build environment enforces its declared authority. A valid resulting plan does not retrospectively classify the builder's execution as verified TriX. Applies to LSP-003, LSP-014 and LSP-024.

**LSP-AT04 Forged and oversized plans.** Submit a cyclic graph, unresolved reference, duplicate node, hidden mandatory field and excessive nesting. The verifier rejects each before plugin loading or effects, within documented limits. A signature does not change the result. Applies to LSP-018, LSP-020 and LSP-029.

**LSP-AT05 Identity and binding.** Compile identical locked inputs on two hosts. Obtain the same logical plan digest. Choose different authorized targets and record distinct bindings without changing that logical meaning. Comments and temporary paths do not alter the semantic digest. Applies to LSP-017 and LSP-019.

**LSP-AT06 Resource lifecycle.** Release an exclusive allocation and attempt reuse; copy an artifact identifier into another project without authority. Reject both unauthorized uses. A worker failure triggers reconciliation instead of a false statement that remote memory was freed. Applies to LSP-011 and LSP-012.

**LSP-AT07 Effects and restricted predicates.** Wrap a remote operation in a helper and branch on restricted input to produce a constant. Preserve the callee's effect summary and the output's applicable restrictions. Pure planning does not invoke the remote operation. Applies to LSP-013 through LSP-015.

**LSP-AT08 Foreign failures.** Supply malformed lengths, mismatched representations and a crashing foreign adapter. Reject invalid boundary data, preserve diagnostic identity and contain failures according to the declared integration profile. Do not claim guarantees beyond that profile. Applies to LSP-016 and LSP-026.

**LSP-AT09 Locked dependency change.** Replace a transitive package with content having the same human-readable version but a different digest. The locked build refuses it. An existing cache cannot conceal the mismatch or bypass current plan verification. Applies to LSP-022 through LSP-025.

**LSP-AT10 Semantic preservation.** Compare optimized and reference execution across the corpus, including conditionals, failed conversions and parallel tasks with ordered outputs. Verify permitted results, effects and errors. A changed model or precision must appear as an explicit authorized decision. Applies to LSP-010, LSP-021 and LSP-028.

## Bounded decisions requiring experiments

**LSP-ADR01 Plan encoding.** Compare candidate encodings against a fixed corpus containing exact decimals, large byte counts, Unicode, unknown fields and invalid input. Select the representation before stabilizing E1. Acceptance requires lossless round trips, canonical identity and bounded validation in the reference implementation languages.

**LSP-ADR02 Host builder containment.** Exercise the intended SDK builder with denied network, file and process access, dependency initialization and resource exhaustion. Define the supported build profile and its limits before distributing the SDK. This decision selects a workable containment mechanism rather than claiming universal safety for arbitrary host-language code.

**LSP-ADR03 Source usability.** Compare small syntax prototypes using the same task, branching, error and policy examples. Evaluate comprehensibility, diagnostics and source-to-plan equivalence before stabilizing E4. Adopt one grammar; do not maintain vendor-specific dialects as an escape from the decision.

**LSP-ADR04 Faster native boundaries.** Consider an in-process or zero-copy boundary only after measurements identify an actual bottleneck. Compare it with the isolated baseline using failure injection, ownership checks and end-to-end performance. Document the trust change and permitted targets before advertising the additional profile.

These ADRs do not defer the baseline obligations. Until an alternative passes its stated gate, implementations use the baseline behavior or explicitly report the capability as unavailable.
