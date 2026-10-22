## Interface and delivery acceptance

**SIF-AT01 Submission replay.** Submit the same request twice under one submission identity, then change its payload while retaining that identity. The first replay refers to the same accepted task; the changed payload is rejected without effects. Apply SIF-005, RUN-011 and RUN-022.

**SIF-AT02 Structural versus semantic validation.** Present a structurally valid task with an unknown mandatory feature, an unregistered operation and an invalid authority reference. Structural parsing alone does not admit it. Production semantic or authority checks reject it before effects. Apply SIF-001 through SIF-004 and LNG-010.

**SIF-AT03 Browser privilege boundary.** A web client attempts to obtain a provider secret and launch a local native process without an enrolled, authorised bridge. Both operations are refused; the legitimate remote control workflow remains usable within its scope. Apply UXD-001, SIF-006 and RUN-024.

**SIF-AT04 Event recovery.** Disconnect an event subscriber, replay duplicates, then reconnect beyond the retained cursor window. The client either resumes according to the cursor contract or obtains an explicit state snapshot; it does not infer completion from missing events or repeat effects. Apply SIF-007, RUN-006 and RUN-022.

**SIF-AT05 Export and import.** Export an authorised project with one inaccessible artifact and a secret reference, then import into a new installation. The export reports the omission, contains no secret value and retains logical identities and provenance. Import revalidates dependencies and authority before execution. Apply SIF-009, DAD-001 and IDN-004.

**SIF-AT06 Evidence honesty.** A candidate release contains a skipped mandatory test, a favourable rerun hiding an earlier failure and a document-only validation report labelled as runtime qualification. Promotion is refused until the records and underlying defects are resolved. Apply NOR-007, DEL-002, DEL-003, QUA-011 and QUA-015.
