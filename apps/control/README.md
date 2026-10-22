# TriX optional eve conversation facade

This source application calls the existing authenticated TriX RPC API. It does not create a second task/effect controller. Five tools inspect allowlisted projects, create plans, submit apply=false computation bundles with approval and stable identity, observe task/evidence and cancel. Default tools and root delegation are disabled. No binding, file-apply, shell, publication or deployment capability is exposed.

Start the private TriX service first. Configure its exact origin in `TRIX_EVE_API_URL`, token in `TRIX_EVE_TOKEN`, and already bound project IDs in `TRIX_EVE_PROJECTS`. Keep values outside the repository. The preserved `openai/gpt-6-luna-fast` model requires legitimate Vercel AI Gateway entitlement. Production browser access remains blocked by placeholder authentication.

Direct dependencies are pinned. This checkout was reconstructed after workspace loss; the complete original transitive lockfile could not be recovered. Offline npm restoration failed with a missing cached `pathe` dependency. Resolve/install dependencies in an authorized environment, retain the resulting real lockfile, then run `npm run typecheck` and `npm run build` before claiming this reconstructed application is deployable. Prior pre-loss typecheck/build success does not qualify this revision. The source-level API helper uses Node builtins and is tested separately. Do not fabricate a lockfile or infer live model access.

`just-bash@3.6.0` is required by eve's virtual attachment workspace, even when no shell tool is enabled. It is not an OS sandbox. Read [qualification](../../docs/runtime/eve-qualification.md). No public deployment or Marketplace publication is authorized by these examples.
