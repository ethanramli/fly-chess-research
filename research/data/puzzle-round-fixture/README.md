# Puzzle-round engineering fixture

`puzzles.jsonl` contains one manually composed king-and-queen mate-in-one position. It is used only to verify the puzzle, hypothetical search, move and feedback-recording workflow. No external puzzle collection or pretrained model is used.

The `fixture` split deliberately makes no training/validation/test or generalization claim. The group identifies this composition family; mirrored, color-swapped or otherwise derived examples belong to the same family if they are later used in a dataset.

`plies: 1` means the attacker must checkmate on its next move. The independent verifier checks that the task is solvable before the fly acts. It then computes feedback from the actual chosen move, without supplying the winning moves to the model. Full details and limits are in [the round design](../../../documentation/design/puzzle-learning/record-only-round.md).
