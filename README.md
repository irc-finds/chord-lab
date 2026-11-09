# Alt-Tuning Chord Lab

A chord finder and namer for any tuning, built around odd and drone tunings.

**Open the app:** https://irc-finds.github.io/chord-lab/

- Tap frets on a vertical neck (Oolimo style) and the chord gets named, with alternate readings.
- **How do I play…**: type a chord name (`E(addb6)`, `Bbmaj7`, `F#m7b5`, `Sib/Re`) and get playable shapes in the current tuning. Lowercase `b` = flat, capital `B` = the note B (Si).
- 6-string, 7-string, 12-string (octave or unison pairs) and 4/5-string bass, with editable tunings you can name and save.
- Strum up/down or arpeggiate, with a synthesized plucked-string sound.
- **Sound and pedals**: switch between acoustic and electric, and run the sound through a pedal chain (compressor, noise gate, gated sputtery fuzz, overdrive, high-gain distortion, chorus, amp with speaker cabinet, delay, reverb) in any order, or pick a ready-made rig, including djent and open-tuning metal.
- **Progressions**: string chords together, give each a length, pick or draw a strum pattern (quarters, 8ths, triplets or 16ths, with downstrokes, upstrokes, palm mutes, muted chucks and rests) in any time signature from 2/4 to 12/8, and loop it. Download any progression as a Guitar Pro file. Save progressions by name.
- **Octopus check**: if you tap a shape no hand can fret (too many fingers or too wide a stretch), a meme fades in under the chord name telling you to leave a note out, and stays until the shape is playable. You can switch it off under Display.
- Shows notes, intervals or plain dots, in sharps or flats.

Also here: a [chord chart for D# A# D# F# G# D#](https://irc-finds.github.io/chord-lab/dsharp-chart.html).

Saved tunings, voicings and progressions are kept in your browser only.

## Editing

The pages are built from `src/`:

- `src/shell.html` — the app's layout, styles and interface code
- `src/chord.js` — the chord-naming engine
- `src/finder.js` — reads chord names and searches for voicings
- `src/dsharp-chart.html` — the D# tuning chord chart

After editing, run `python3 build.py` to rebuild `index.html` and `dsharp-chart.html`.
