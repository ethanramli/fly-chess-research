# Bounded input check

[Raw fixtures, cues and source hashes](report.json). No neural inference, training or parameter changes. Six developer-created pairs move one white pawn from file b-g, rank3 to rank4. White Ra1xa4 is legal in each board; black Rh4xa4 is legal in the rank3 cases and blocked in the rank4 cases. Legal replies establish this diagnostic consequence only; they are not passed to the encoder.

All six pairs produce different stimulation patterns: no exact outcome-changing input collision was found in this bounded check. Four semantic tokens change per pair, but only0-2 changed-token assignments survive on either side of the14-cell projection. A stimulus can still change when a new token displaces another selected cell; zero retained changed tokens does not imply an identical input.

Static correction to the design hypothesis: the preprojection token inventory contains piece types, sides and relative coordinates. Those coordinates can preserve which blocker lies on which ray; an unordered token list does not by itself prove that binding is lost. Lossy hashing/budget selection is a specific concern, but these six pairs do not establish that it causes transfer failure or justify replacing the encoder.

The existing encoder accepts only forced-mate tasks. That task token was held constant here to inspect geometry; these are not mate-learning examples or a runnable capture/recapture protocol. New task semantics would need a separately declared interface.

Next design obligation: show that different relevant inputs drive a reusable, consequence-sensitive local response and output, rather than merely different hashes. No new graph probe or training is launched automatically. These inspected fixtures are development-only.
