# Chord Lab — notes for Claude

Diego owns this project. He's a guitarist and bassist, not a programmer, and doesn't use Git or GitHub himself.
Explain changes in plain words, never ask him to run commands, and push the changes yourself.

## What it is
- `index.html` — Alt-Tuning Chord Lab. Tap frets to name chords in any tuning; "How do I play…" turns a chord name into
  shapes; strum or arpeggio playback with a Karplus-Strong plucked-string synth; 6-, 7- and 12-string guitar and 4- and 5-string bass;
  named saved tunings and voicings (stored in the browser's localStorage under the key `chord-lab`);
  progressions (`st.prog` working copy, `st.progs` saved): chords with lengths in beats, a one-bar strum pattern
  (`sub` steps per count, `pat` of D/U/P/X/- where P = palm mute), `meter` (2/4…7/4, 5/8…12/8; groups in `METERS`, tempo counts
  the denominator note), tempo and loop, played by a look-ahead scheduler on the audio clock. Chord length is `beats` (counts)
  or `bars` (follows the meter).
  Guitar Pro export (`progressionToGp`): lazily loads alphaTab 1.8.4 from jsDelivr and writes a GP8 `.gp` with the first chord's
  tuning; each strum step is a beat (D brush down, U top-4 strings brush up, P palm mute, X dead notes, `-` ties the last D/U or
  rests), chord diagrams (alphaTab `Chord.strings` is highest string first), tempo in quarter notes (x/8 halves bpm), loop = repeat ×2.
  Chords from another tuning are revoiced by `fitShape` (keeps bass + every pitch class; octave moves / dropping doubled notes allowed).
  Sound: `st.fx` = { mode: acoustic|electric, rig, p: per-pedal settings 0..1 }. Voices feed `fx.input`; `wireFx()` chains the
  pedals that are on in `st.fx.order` (user-reorderable; rigs reset it to the default comp, gate, fuzz, drive, dist, chorus, amp+cab,
  delay, reverb; the noise gate is an AudioWorklet loaded from a Blob, so it only works over http(s), not file://), `applyFx()` maps knobs to node params,
  and a limiter sits before the speakers. Electric mode = longer sustain + pickup-position comb in `pluck()`. Keep rig levels
  close to the acoustic default (measured RMS ≈ 0.15–0.25) so switching rigs doesn't jump in volume.
  Background playback (`st.bgPlay`): while a progression plays, the limiter output goes to a MediaStreamDestination played
  by an <audio> element (`routeOut`) so iOS/Chrome keep it alive when hidden; the scheduler looks 4 s ahead while hidden;
  Media Session gives lock-screen controls; the direct output is restored after stop. Don't rebuild the AudioContext on
  return while a background progression is still running.
  Impossible-shape check (`unplayable`, `handCheck`): after a tap or "Set shape", if the fretted notes span more than 5 frets
  (6 from fret 12 up) or need more than 4 fingers (a barre at the lowest fret counts as one, and so does a bar at the highest fret, e.g. Cerati's 4-6-6-8-8-8 pinky bar; a thumb over the low string adds one),
  `#octo` (inside the chord-name panel) shows `octopus.jpg` (his meme) with the reason, fading in slowly; it stays as long as
  the shape is impossible and hides when it isn't (`handCheck()` runs from `refresh()`). Switch in Display (`st.octopus`).
  Easter egg he asked for: the exact shape 4-6-6-7-8-8 prefixes the reason with "You're not Cerati, lil bro."
  He asked for this placement instead of a popup, which felt like a jumpscare.
- `songs.html` — Songs (the former Guitar Pro trial, approved and ported). Reads GP3–8/GPX/MusicXML with alphaTab 1.8.4 from
  jsDelivr and plays every track through the Analyzer's synth and rigs (build.py copies those code blocks out of shell.html,
  so keep the marker lines it slices on: `const DEFAULT_ORDER`, `function freshProg()`, `const pct = v =>`, `function soundChanged()`,
  `let fx = null;`, `// tone: 0 = bright thin string`, `function voice(`, `function palmAt(v, t) {`, `// 12-string course`).
  Per-track retune (keep sound / keep shapes), transpose, per-track rig + rig changes partway, mixer, loop, speed, pinned chord map
  that keeps the file's chord names when the notes match, MP3 (lamejs 1.2.1)/WAV render in suspended pieces, PDF (jsPDF 2.5.1).
  Downloads are ordinary browser downloads. "My songs": every opened file is kept in IndexedDB `chordlab-library` (store `songs`:
  id = FNV hash + length of the bytes, title, artist, file, folder, bytes, settings = per-track tuning/mode/transpose/vol/mute/solo/
  rig/rigChanges, saved 0.6 s after any change). Folders live in localStorage `chordlab-songs` (`prefs.folders`) plus any folder a
  song uses. On phones `.side` is `display: contents` so My songs sits above the tab.
- App bar (`src/appbar.html`, injected by build.py into both pages): brand, Songs / Analyzer switch (`<body data-page>`), Size menu.
  Size is CSS `zoom` on body from `--z` (localStorage `chordlab-zoom`; default 0.8 at ≥ 900px wide, else 1); widths that should fill
  the screen divide by `var(--z)`. `manifest.webmanifest` + icons make it installable.
- `dsharp-chart.html` — chord chart for his D# A# D# F# G# D# tuning (MIDI 39 46 51 54 56 63).
- Live at https://irc-finds.github.io/chord-lab/ (GitHub Pages, served from the `main` branch root).
  Pushing to `main` updates the site within a minute or two.

## Editing
Never edit `index.html`, `songs.html` or `dsharp-chart.html` directly: they're generated. Edit the files in `src/`, then run `python3 build.py`.
- `src/shell.html` — layout, styles, interface and audio code. Contains the `/*CHORD_ENGINE*/` and `/*FINDER*/` placeholders.
- `src/chord.js` — chord naming: `analyze(root, pcs, bass)`, `candidates(midis)`, `formatName(a, nm)`.
- `src/finder.js` — `parseChordName(text)` and `findVoicings(tuning, maxFret, spec)`. It also works as a Node module.
- `src/songs.html` — the Songs page (`/*CL_SYNTH*/`, `/*CL_CHORD*/`, `/*CL_FINDER*/` placeholders).
- `src/appbar.html` — app bar pieces (`APPBAR_HEAD`, `APPBAR_CSS`, `APPBAR_NAV`).
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
