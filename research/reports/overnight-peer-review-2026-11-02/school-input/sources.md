# Sources for the input review

Sources were accessed on 2026-11-02. These notes were rewritten on 2026-11-03.
The code and saved check establish the input example. A paper is not used as a substitute for that code check.
Saved file-comparison values are in [checks.json](checks.json).

## FIDE chess rules

[FIDE Laws of Chess, effective 1 January 2023](https://handbook.fide.com/chapter/E012023).
Approved in 2022. The reviewer read Articles 3.1.1, 3.7.3.1-2, 3.8.2, and 3.9.2; page lines 196-268.
These rules support the en-passant finding. They do not independently check all chess.js behavior.
The page opened. The reviewer searched for `3.7.3.2`.

## Learning on unfamiliar combinations

Brenden M. Lake and Marco Baroni, 2018.
[Generalization without systematicity: On the compositional skills of sequence-to-sequence recurrent networks](https://arxiv.org/abs/1711.00350).
Generalization means using learning on new examples. Systematic composition means applying learned parts in unfamiliar combinations.
The reviewer read the abstract (short summary) and title/author details, lines 8-24. The full methods were not read.
This work motivates a separate combination test. It does not establish a failure or a pass limit for FlyChess.
The page opened. The preprint first appeared in 2017.

## Answers obtained through unintended clues

Robert Geirhos and colleagues, 2020.
[Shortcut Learning in Deep Neural Networks](https://arxiv.org/abs/2004.07780).
Shortcut learning means getting answers from an easier clue instead of the intended relation.
The reviewer read the abstract and title/author details, lines 8-17. The page showed version 5, revised in 2023.
Authors: Geirhos, Jacobsen, Michaelis, Zemel, Brendel, Bethge, and Wichmann.
This is a general discussion. It does not prove a shortcut in this project. No finding relies on it as a local experiment.

## Search limits

We searched local files for the eye-signal test, the en-passant test, and references to the deleted smoke run 15 and 15,000-checkpoint review, among other terms.
File searches included eyes, twin, and restart. Other reviewers' output was excluded.
Only the three related public sources above were checked. No complete literature or novelty search was done.
Novelty means a contribution not already established in earlier work.
[Return to the report](report.md).
