# Ubiquitous Language

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
Per-Student, per-Mode progression counter. Level 1 rounds start with 5 Hearts; each Level adds one Heart. Winning a Round raises the Level by one, capped at Level 5 (9 Hearts).
