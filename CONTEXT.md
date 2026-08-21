# Ubiquitous Language

## Topic
A skill area a Round is played in. Topics in progression order:
1. 2-digit + (`add2`) 2. 3-digit + (`add3`) 3. 2-digit − (`sub2`) 4. 3-digit − (`sub3`)
5. ×-facts (`mulFacts`, the original game) 6. ÷ (`div`) 7. 2-dig×2-dig (`mul2`)
8. 3-dig×3-dig (`mul3`) 9. time (`time`).
Rules per topic: +/− use natural random operands, always big−small, no negatives.
÷ is exact only, generated as the inverse of the ×-fact pool, and keeps its own
Weak Fact pool. Multi-digit × is answered as a single final answer (InkPad as
scratch). Time serves unit conversion, clock reading, and elapsed time, all typed.
The multiplication table overlay exists only in ×-facts and ÷ Topics.
Hard-mode timers per Topic: facts 10s, ÷ 15s, +/− 30s, time 30s, 2-dig× 60s, 3-dig× 120s.

## Progression
A Student's `unlocked` count is how many Topics (in order) are open. Winning a
Round flawlessly (zero wrong answers) in Normal or Hard instantly unlocks the
next Topic; otherwise reaching Level 5 on the Topic does. The Teacher can also
restrict the open Topics to a subset (`allowed`) and unlock ahead by raising
`unlocked`. The Student picks freely among Topics that are unlocked and allowed.

## Penguin HP
Hard mode only: the penguin has 3 HP. Each wrong answer or timeout costs 1 HP
(the Boss still heals to full). At 0 HP the penguin faints and the Round is
lost — free retry at the same Level, Boss revives. Other modes: penguin cannot die.

## Student
A child from the teacher's own class. Identified by picking their name from a pre-made list — no password, no signup. The app tracks each Student's weak multiplication facts individually.

## Heart
A countdown progress meter, not a life — visualized as the Boss's HP. A round starts with 5 Hearts (more at higher Levels); each right answer removes one. Reaching 0 Hearts wins the round. Whether a wrong answer resets Hearts back to full depends on the Mode.

## Mode
A difficulty setting (Minecraft-style) chosen before a round. Modes vary along two axes: whether the multiplication table may be opened during play, and whether a wrong answer resets Hearts.

| Mode | Table can be opened | Wrong answer resets Hearts | Timer |
|----------|---------------------|----------------------------|-------|
| Peaceful | yes | no | none |
| Easy | yes | yes | none |
| Normal | no | no | none |
| Hard | no | yes | ~10s per question; timeout counts as a wrong answer |

## Boss
The round's enemy. Boss HP is the Heart count: each right answer is a penguin attack removing one Heart of Boss HP; a wrong answer is the Boss hitting back (and, in Modes with Heart reset, healing to full). Reaching 0 = Boss defeated = Round won, with a defeat animation. A Round is a Boss fight.

## Mascot
The penguin. The Student's avatar and cheerleader: attacks the Boss on right answers, gets hit on wrong ones, celebrates on wins.

## Fact
A single multiplication question, e.g. 7×8. The full pool spans 2×2 through 12×12. The Teacher may narrow the active range per Student (e.g. only tables 6–8 this week).

## Weak Fact
A Fact the Student has answered wrong and not yet recovered. Weak Facts are served with roughly 3× the chance of normal Facts. A Weak Fact recovers (becomes normal again) after the Student answers it right 3 times in a row, counted across Rounds and days. Weak Facts persist per Student.

## Teacher
The adult who owns the app: maintains the Student name list and picks each Student's active table range. Not a player.

## Round
One play session ending in a win (0 Hearts reached) or continuing until it is. A win means the Student answered the round's Heart count of questions right (in a row, in Modes with Heart reset).

## Level
Per-Student, per-Topic, per-Mode progression counter. Level 1 rounds start with 5 Hearts; each Level adds one Heart. Winning a Round raises the Level by one, capped at Level 5 (9 Hearts).
