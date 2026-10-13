# Fly versions and rollback

This policy turns the researcher's 2026-10-12 request into a reproducible version trail. It applies to future learned Fly snapshots; it does not retroactively relabel earlier runs.

## Preserve every experiment

Every evidence-bearing run, including negative, inconclusive, synthetic and engineering results, stays in a unique immutable run directory. Preserve its raw outcomes, frozen protocol, exact command, seeds, source and dependency hashes, graph and neuron identities, memory/parameter state, encoder, readout, policy, resource measurements and independent audit. Do not overwrite results or treat an interrupted/partial publication as an accepted checkpoint.

Before a new experiment, copy the latest accepted snapshot into a new run directory and verify its manifest hashes. The experiment may change only the state explicitly permitted by its frozen protocol. Keep the accepted snapshot untouched. On regression, retain the failed candidate and its evidence, then branch the next experiment from the latest accepted snapshot. Rollback means restoring that copy into a new run, not erasing history or editing the old run in place.

## Promote only on validation evidence

An evidence record is not automatically a new Fly version. Promote `Fly v1.01`, `v1.02`, and so on only after a predeclared, independent validation gate demonstrates reproducible improvement in the relevant criterion, retention, and no material regression in other required criteria. Compare against the pinned prior version under matched exposure and controls. Freeze checkpoint selection before final testing; final-test families never select, tune, or promote a version.

Each promoted version gets a manifest that pins its parent version, graph, physiological and learned memory state, model parameters, encoder, readout, policy, training protocol/data, software/dependency identities, and validation report hashes. Include the reason for promotion and known limits. Record promotions and rollbacks in the decision log, current status, and dated journal, with links to the preserved run and audit.

The first numbered release, `Fly v1.01`, follows establishment of a formally pinned baseline. Current G0 neutral-association evidence is still in progress and is not a chess-trained Fly release. Synthetic, preflight, software, search, or isolated metric evidence must retain its proper label and cannot be presented as chess learning, transfer, reasoning, or a version promotion.

[Current status](../../current-status.md) · [Evaluation and performance](README.md) · [Project instructions](../../../AGENTS.md)
