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
  Impossible-shape check: `unplayable(frets)` returns `{kind:'stretch', minF, maxF, span}` or `{kind:'fingers', fingers, barre}`
  or null. A shape is impossible if the fretted notes span more than 5 frets (6 from fret 12 up) or need more than 4 fingers
  (a barre at the lowest fret counts as one, and so does a bar at the highest fret, e.g. Cerati's 4-6-6-8-8-8 pinky bar; a thumb
  over the low string adds one). `playabilityWarning(p, nickname)` writes his copy: head "That shape isn't playable, ${nickname}.",
  body for stretch "It needs a stretch from fret X to fret Y, and that's N frets wide, Allan Holdsworth." or for fingers
  "It needs N fingers on the frets, even with a barre. A hand has four (and a thumb for the low string)." `NICKNAMES` is his list;
  a new one is picked (never the same twice in a row) each time a different impossible shape appears. Easter egg: the exact shape
  4-6-6-7-8-8 prefixes the body with "You're not Cerati, lil bro." `#octo` is a fixed-height strip inside the chord readout
  (meme thumbnail left, text right, terracotta edge, slow fade-in); tapping the thumbnail expands it. It stays while the shape is
  impossible (`handCheck()` runs from `refresh()`). Switch in Display (`st.octopus`). He didn't want a popup (it felt like a jumpscare).
- Look (his brief: "a tactile piece of music engineering software built by a human guitarist, Oolimo meets a hardware rack",
  nothing like the generic dark-mode SaaS look). Fonts: Fira Sans (body), Fira Sans Condensed (headings, chord names), IBM Plex Mono
  only for notes, frets, intervals, tunings and tempo. Dark palette: matte charcoal `#16171a`, panels `#1c1d21` with 1px matte borders
  `#2c2f36`, no glows; root/active notes amber `#e5a93c`, other notes cream (`--ink` `#ece4d0`), parchment `--accent` `#cdbb94` for
  selection, terracotta `--warn` `#d9534f` for warnings and dead notes. Light mode is the same idea on parchment. Same tokens in
  songs.html and dsharp-chart.html. He still found that "AI-looking", so it went further toward real gear (shared materials live in
  `src/appbar.html`): panels are rack faceplates (4px corners, sheen at the top edge, two screws via ::before/::after, silkscreened
  uppercase module names), buttons are keys (gradient, 2px darker bottom edge, press travel; primary = cream cap), fields and
  segmented switches are inset. The chord readout is a dark amber screen (`.lcd`, same in both themes) with the other readings
  ("also") inside it, and a big transport key. The neck: rosewood in dark mode, maple with black dots in light, nickel fret wire
  (inset box-shadows), bone nut, wound low strings (`.cell.w`, all but the top three on guitar, all on bass), pearl inlays.
  Help text is short and plain.
- Progression folders and the song arranger: saved progressions have `id` and `folder`; `st.progFolders`, `st.progFolder` ('all',
  '' or a name). "My progressions" is its own panel (`.area-lib`): folder chips, rename/delete folder, a capped scrolling list
  (songs first, tagged "Song"), per-item folder menu, .gp, delete with confirm (warns if a song uses it). Saving goes into the open
  folder. "Song arranger" (`.area-arr`, `st.arr` working copy, `st.arrs` saved: {id, name, folder, parts: [{id, times}], loop}) chains
  saved progressions; each part keeps its own tempo, meter, strum and tuning. Playback reuses the scheduler: `startProg(song)`
  with `pl.song = {parts, idx, rep, loop}`; marks carry the chord, part and repeat. `sectionsToGp` writes a whole song (per-part time
  signature and tempo changes, repeat signs when a part fills whole bars, section names); `progressionToGp` calls it for one.
- Analyzer layout: `.lab` is two columns, the board on the left and `.desk` on the right. On wide screens the board is sticky
  (scrolls inside itself if the screen is short) and the chord readout is sticky at the top of `.desk`, so fretting never moves the
  readout. At ≤ 860px `.desk` is `display: contents` and the grid areas order the panels (readout sticky on top, then the board).
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

## Sandbox (try-outs before they reach the main app)
- `sandbox/` is a separate copy of the app, live at https://irc-finds.github.io/chord-lab/sandbox/ (GitHub doesn't let this
  session create a new repo, so it's a folder; it never touches the main pages). New ideas go here first; when Diego approves,
  port them into `src/`. Build with `python3 sandbox/build.py`; edit only `sandbox/src/`. Pages: `index.html` = home screen
  (power-on screen, two keys: Songs and Chord Finder), `finder.html` = the Analyzer, `songs.html`.
- Its saved data is separate: localStorage `chord-lab-sbx`, `chordlab-songs-sbx`, `chordlab-zoom-sbx`, IndexedDB `chordlab-library-sbx`.
  On first open each one starts from a copy of the main app's (main data is only read, never written).
- Sandbox Chord Finder fits the screen (body height = 100dvh / zoom, nothing scrolls but the neck and the page area): neck left,
  amber screen on top right, a row of page buttons (`PAGES`, `goPage(id)`, `#hash` remembers the page), and one page at a time in
  `#pages` (sections carry `data-page`). Phones: screen on top, neck or page in the middle, buttons along the bottom (with Neck).
- Saved sounds: `st.soundPresets` [{id, name, mode, p, order}] from Sound → "Save this sound"; they're in the Rig menu under
  My sounds (`st.fx.rig = 'u:' + id`). Sandbox Songs reads them from `chord-lab-sbx` and adds them to RIGS as "My sound: …"
  (rigState honours their pedal order), so any track can use them.
- Guitar Pro → progressions (sandbox, My progressions page, "Load a Guitar Pro file…"): `sandbox/src/gpimport.js` (pure, also a Node
  module; build.py inlines it at `/*GPIMPORT*/`). `gpBestTrack` picks the most chordal track (prefers "Rhythm"); `gpToParts` splits by
  Guitar Pro section markers, drops silent bars at section ends, picks the section's meter, the grid (1/2/3/4 steps per count) and the
  bar strum pattern most bars use (brush/pick-stroke marks if present, otherwise on-grid = down, in-between = up; all-dead = X,
  mostly palm-muted = P; partly dead strings are muted strings in the shape). Each count's chord = the shape that rings longest in it;
  lengths become Chord Lab's 4/2/1 bars and 2/1 counts. A section that repeats one phrase becomes one progression × times; sections
  with identical music share one progression ("Intro / Verse / Solo"). Adding creates a folder "title – artist", the progressions, and
  a song in the arranger in section order. Tested with his My Bloody Valentine "who sees you" tab (C F C F G C, 76 bpm, 16th strum).

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
