# Replay diary design review (2026-11-17)

Independent reviews of the [replay diary memory design](../../../documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md), a Volume 3 memory that re-plays the fly's own past lessons into its own learning rule and is removed before every test. Design only: nothing was built or run. Journal: [2026-11-17 entry](../../journal/experiments/2026-11-17-replay-diary-memory-design.md).

**How the reviews were run.** Problem Solving at deep-in-thought, as the researcher asked: three reviewers, each owning a different assumption that could overturn the design. Each is a separate GPT-6.1 Sol session at xhigh effort, read-only, started from the same pinned revision and goal text. Prompts and reviews sit side by side.

| Reviewer | Assumption it owned |
|---|---|
| Peer reviewer | The input, output and removal rules are complete and auditable, and every pass rule gives one verdict |
| Scientific skeptic | The control arms separate the main explanation (interleaved replay) from its rivals, without bias |
| Foundational skeptic | A replay-only memory removed at test helps the fly remember, cannot supply the intelligence, and can still bear on reasoning |

## Round 1 (revision 1, blob `62c72ba4`)

The reviewed text is preserved as [design-revision-1.md](design-revision-1.md). Preserved revisions are byte-for-byte copies, so their relative links still point from the design folder and do not resolve here.

| Reviewer | Prompt | Review | Verdict |
|---|---|---|---|
| Peer | [prompt](design-review-r1-peer.prompt.md) | [review](design-review-r1-peer.md) | Approve with required changes (4 build, 1 launch) |
| Scientific skeptic | [prompt](design-review-r1-skeptic.prompt.md) | [review](design-review-r1-skeptic.md) | Approve with required changes (5 build) |
| Foundational skeptic | [prompt](design-review-r1-foundational.prompt.md) | [review](design-review-r1-foundational.md) | Approve with required changes (4 build, 1 optional) |

All required changes were adopted in revision 2; its section 12 maps each finding to its change.

**Lost attempts, kept as evidence.** The first attempt ran on the researcher's school Codex account, where every local file read was rejected, so the reviewers could not see the design: [blocked-attempt-no-local-reads/](blocked-attempt-no-local-reads/). A second attempt on the same account, with the read problem fixed, was stopped when the researcher asked to use their other account: [stopped-school-rerun/](stopped-school-rerun/). Round 1 above ran on the researcher's main account.

## Round 2 (revisions 2 and 3)

Each reviewer resumes its own session and checks only its own findings and the changed text. The first attempt stopped at the Codex usage limit before any reviewer wrote anything ([logs](round2-usage-limit/)). The lead then ran the checks, disclosed as not independent: [lead-recheck-round2.md](lead-recheck-round2.md). It found one more mistake (the event-shuffled arm changed per-block pulse counts) and three omissions, fixed in revision 3. Revision 2 is preserved byte for byte as [design-revision-2.md](design-revision-2.md) (blob `5e22be79`). Revision 3 is preserved as [design-revision-3.md](design-revision-3.md) (blob `72fcbec9`). Revision 4 ([design-revision-4.md](design-revision-4.md), blob `99df41e4`) adds only a one-page view of the design (picture, module interface, data, practice loop, worked example) after the researcher said they could not see a design. Revision 5 ([design-revision-5.md](design-revision-5.md), blob `0c71bb4d`) fixes six gaps from the lead's second read. Revision 6 (blob `0b57e460`) comes from the lead's solo deep-in-thought pass, which rebuilt the key numbers from raw records. The researcher then asked not to wait and chose the school account (2026-11-17, about 21:55 local). Round 2 on revision 6 runs there at xhigh. Round 1 sessions live on the main account and cannot be resumed from the school account, so each reviewer is a new session given its own round 1 prompt and review: see the `design-review-r2-*.fresh.prompt.md` files. The researcher's instruction: keep going until every reviewer approves.

On the school account the scientific skeptic finished; the peer and foundational reviewers were stopped by that account's weekly limit ("try again at Nov 20th, 2026 7:21 PM") before writing a review ([logs](round2-school-limit/)). The skeptic's review led to revision 7 (blob `8d1fc4f2`; revision 6 preserved as [design-revision-6.md](design-revision-6.md), blob `0b57e460`).

| Reviewer | Prompt | Review | Verdict |
|---|---|---|---|
| Scientific skeptic (school account, revision 6) | [prompt](design-review-r2-skeptic.fresh.prompt.md) | [review](design-review-r2-skeptic.md) | Approve with required changes (2 build, 1 optional); 4 of 5 round 1 findings resolved |

## Round 2 for peer and foundational, round 3 for the skeptic (revision 7)

Queued for 2026-11-17 23:17 local on the main account, just after its limit resets. Each reviewer resumes its own round 1 session.

| Reviewer | Prompt | Review | Verdict |
|---|---|---|---|
| Peer | [prompt](design-review-r2-peer.prompt.md) | review pending | queued |
| Foundational skeptic | [prompt](design-review-r2-foundational.prompt.md) | review pending | queued |
| Scientific skeptic, round 3 | [prompt](design-review-r3-skeptic.prompt.md) | review pending | queued |

## Outcome: all three reviewers approve revision 10 (2026-11-18)

Final design: [replay diary design](../../../documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md), revision 10, git blob `0f85af7b2d0e093d08dccbe366c7ba331f2bd3b0`. Preserved earlier revisions: [revision 7](design-revision-7.md) (blob `8d1fc4f2`) and [revision 9](design-revision-9.md) (blob `639ebb23`). Revision 8 was not preserved as its own file; the edit scripts record its changes.

All rounds after round 1 ran on the school account at medium effort, because the user asked for medium and asked the main account to stop. The earlier xhigh runs on the main account were stopped before writing any verdict; their logs are kept as `*.rerun.log`.

| Round | Revision | Peer | Foundational skeptic | Scientific skeptic |
|---|---|---|---|---|
| 2 | 7 | approve with required changes ([review](design-review-r2-peer.md)) | approve with required changes ([review](design-review-r2-foundational.md)) | round 3: approve with required changes ([review](design-review-r3-skeptic.md)) |
| 4 | 8 | approve with required changes ([review](design-review-r2-peer.r4.md)) | approve with required changes ([review](design-review-r2-foundational.r4.md)) | approve with required changes ([review](design-review-r3-skeptic.r4.md)) |
| 5 | 9 | approve with required changes ([review](design-review-r2-peer.r5.md)) | approve ([review](design-review-r2-foundational.r5.md)) | approve with required changes ([review](design-review-r3-skeptic.r5.md)) |
| 6 | 10 | **approve** ([review](design-review-r2-peer.r6.md)) | **approve** ([review](design-review-r2-foundational.r6.md)) | **approve** ([review](design-review-r3-skeptic.r6.md)) |

**Open at approval (optional, not applied):** the peer reviewer asks that section 7.5 say each control's tape comes from its paired diary fly, and name the full diary fly for the central comparison. The change is a wording clarification. It was not applied because it would change the approved blob, and the researcher can ask for it at approval.

**Stale sentence to fix when the design is approved:** section 12 of revision 10 still says it "needs one more review round". The reviewers' approval is recorded here, not in the design file.

**Still required before any build:** the researcher's approval of the design and its three decisions (section 11). The stage 2 launch gates G1 to G3 remain open.

## Final design: revision 11, approved by all three reviewers (2026-11-18)

Revision 11 (git blob `c57331a4f96b1ac1c77adbdeef75e41813895116`) is revision 10 with two wording fixes: the stage 3 tape source (the diary fly each control is paired with) and the review status sentence. Confirming round 7 (school account, medium effort): peer approve ([review](design-review-r2-peer.r7.md)), foundational skeptic approve ([review](design-review-r2-foundational.r7.md)), scientific skeptic approve ([review](design-review-r3-skeptic.r7.md)). Revision 10 is preserved as [design-revision-10.md](design-revision-10.md) (blob `0f85af7b`).

Approval covers the design text only. Still awaiting the researcher: approval of the design and its three decisions (design section 11). Stage 2 launch gates G1 to G3 remain open.
