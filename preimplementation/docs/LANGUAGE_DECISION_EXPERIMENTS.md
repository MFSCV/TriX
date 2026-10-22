# Language decision experiments

Version 0.2. Proposed experiments; no results asserted. All decisions require the recorded owner and adoption gate.


**LSP-ADR01 Plan encoding.** Compare candidate encodings against a fixed corpus containing exact decimals, large byte counts, Unicode, unknown fields and invalid input. Select the representation before stabilizing E1. Acceptance requires lossless round trips, canonical identity and bounded validation in the reference implementation languages.

**LSP-ADR02 Host builder containment.** Exercise the intended SDK builder with denied network, file and process access, dependency initialization and resource exhaustion. Define the supported build profile and its limits before distributing the SDK. This decision selects a workable containment mechanism rather than claiming universal safety for arbitrary host-language code.

**LSP-ADR03 Source usability.** Compare small syntax prototypes using the same task, branching, error and policy examples. Evaluate comprehensibility, diagnostics and source-to-plan equivalence before stabilizing E4. Adopt one grammar; do not maintain vendor-specific dialects as an escape from the decision.

**LSP-ADR04 Faster native boundaries.** Consider an in-process or zero-copy boundary only after measurements identify an actual bottleneck. Compare it with the isolated baseline using failure injection, ownership checks and end-to-end performance. Document the trust change and permitted targets before advertising the additional profile.

These ADRs do not defer the baseline obligations. Until an alternative passes its stated gate, implementations use the baseline behavior or explicitly report the capability as unavailable.
