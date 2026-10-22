**VAL-001 Evidence.** Every applicable mandatory requirement MUST have implementation and validation evidence. A delivery MUST include results, versions, test configuration and known limitations.

**VAL-002 Correctness.** Tests MUST cover correct results, expected refusals, isolation, errors and recovery. Model quality MUST be evaluated against task-specific criteria.

**VAL-003 Performance.** Comparisons MUST identify model, revision, precision, quantisation, context, concurrency and hardware. Startup and preparation MUST be distinguished from execution with a loaded model. Measurements MUST support assessment of latency, capacity, memory, energy where available and cost per useful completed work.

**VAL-004 Real failures.** Distributed profiles MUST be evaluated under process, node and network interruptions, availability changes and uncertain external outcomes. Tests MUST check that the system neither invents completion nor blindly repeats effects.

**VAL-005 Demonstrated extensibility.** Before claiming operational vendor independence, the project MUST demonstrate a third real integration beyond the two reference configurations through the published extension contracts. Simulations MAY aid development but MUST NOT substitute for that evidence.

**VAL-006 Release gate.** A stable release MUST pass applicable scenarios and resolve defects violating mandatory requirements. Incomplete functionality MUST remain explicitly experimental or unavailable.
