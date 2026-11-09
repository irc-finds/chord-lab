# Chord Lab — notes for Claude

Diego owns this project. He's a guitarist and bassist, not a programmer, and doesn't use Git or GitHub himself.
Explain changes in plain words, never ask him to run commands, and push the changes yourself.

## What it is
- `index.html` — Alt-Tuning Chord Lab. Tap frets to name chords in any tuning; "How do I play…" turns a chord name into
  shapes; strum or arpeggio playback with a Karplus-Strong plucked-string synth; 6-, 7- and 12-string guitar and 4- and 5-string bass;
  named saved tunings and voicings (stored in the browser's localStorage under the key `chord-lab`);
  progressions (`st.prog` working copy, `st.progs` saved): chords with lengths in beats, a one-bar strum pattern
  (`sub` steps per beat, `pat` of D/U/X/-), tempo and loop, played by a look-ahead scheduler on the audio clock.
- `dsharp-chart.html` — chord chart for his D# A# D# F# G# D# tuning (MIDI 39 46 51 54 56 63).
- Live at https://irc-finds.github.io/chord-lab/ (GitHub Pages, served from the `main` branch root).
  Pushing to `main` updates the site within a minute or two.

## Editing
Never edit `index.html` or `dsharp-chart.html` directly: they're generated. Edit the files in `src/`, then run `python3 build.py`.
- `src/shell.html` — layout, styles, interface and audio code. Contains the `/*CHORD_ENGINE*/` and `/*FINDER*/` placeholders.
- `src/chord.js` — chord naming: `analyze(root, pcs, bass)`, `candidates(midis)`, `formatName(a, nm)`.
- `src/finder.js` — `parseChordName(text)` and `findVoicings(tuning, maxFret, spec)`. It also works as a Node module.
- `src/dsharp-chart.html` — the D# chart.

Test before pushing:
- `node tests/finder.test.js` checks chord-name reading and the voicing search.
- For interface changes, load `index.html` with Playwright, using phone and desktop sizes, and check for page errors.

## Rules he asked for
- Chord names: after the root, lowercase `b` always means flat, and capital `B` is the note B (Si). `m` means minor, `M` means major 7th.
  Spanish roots work: Do Re Mi Fa Sol La Si, plus # or b (Sib = B flat). "Fadd9" is F add9, not Fa + "dd9".
- The look is Oolimo-like: a vertical neck with the nut at the top and the low string on the left, with note letters inside the dots.
- 12-string: each pair's octave string must be clearly audible (bright, slightly detuned, hit first on a downstroke).
- iPhone: audio must play with the ringer switch off (`navigator.audioSession.type = 'playback'`, or a silent `<audio>` loop on older iOS),
  and must recover after he leaves the app and comes back (rebuild the AudioContext on the first tap after `visibilitychange`).
- Must work on phone widths: 16px side padding and no sideways scrolling.

## Committing
Commit as `irc-finds` and push to `main`. If a push is refused, the Claude GitHub App needs access to this repo:
send Diego to https://github.com/apps/claude/installations/select_target.
