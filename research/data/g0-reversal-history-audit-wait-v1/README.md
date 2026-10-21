# G0 history diagnostic audit with resource waiting

2026-10-19. This supplementary read-only audit follows two preserved failures of the frozen auditor: both stopped when the host free-memory sample fell below 256 MiB while the auditor RSS was about 170 MiB. The original runner, result, frozen protocol and frozen auditor remain unchanged.

The audit source is a copy of the frozen auditor with one runtime-only change: at the same 256 MiB free-memory floor it waits in one-second intervals before/after replay steps and during streamed hashes, then continues. RSS remains capped at 768 MiB, Node heap at 256 MiB, CPU duty at 0.5 and replay/presentation/gate logic unchanged. Resource waiting is not learning evidence and cannot make this diagnostic pass G0.

Protocol pins the parent result, diagnostic protocol, original auditor and this source. The exact command, failed attempt paths and outcome rule are in [protocol.json](protocol.json). The original raw diagnostic and audit attempts remain in their existing paths.
