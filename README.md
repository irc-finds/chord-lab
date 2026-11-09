# Chord Lab

Two tools for odd and drone tunings, switched with the **Songs / Analyzer** buttons at the top. On a phone you can add it
to the home screen and it opens like an app. The **Size** menu (80% by default on big screens) fits more on screen.

**Open the app:** https://irc-finds.github.io/chord-lab/ (Analyzer) · https://irc-finds.github.io/chord-lab/songs.html (Songs)

## Songs

- Open Guitar Pro files (3 to 8, .gpx, .gp) or MusicXML and play the whole song with its tabs, following along with a chord map.
- Retune any track (keep the sound, or keep the shapes), transpose, and give each guitar track its own rig, with rig changes partway.
- Mute, solo and mix tracks, loop bars, change speed.
- Save the song as MP3 or WAV with your settings, or the tab as a PDF.
- **My songs**: every song you open is kept in your browser with its tunings, rigs and mix. Sort songs into folders, search, rename or delete folders.

## Analyzer (Alt-Tuning Chord Lab)

- Tap frets on a vertical neck (Oolimo style) and the chord gets named, with alternate readings.
- **How do I play…**: type a chord name (`E(addb6)`, `Bbmaj7`, `F#m7b5`, `Sib/Re`) and get playable shapes in the current tuning. Lowercase `b` = flat, capital `B` = the note B (Si).
- 6-string, 7-string, 12-string (octave or unison pairs) and 4/5-string bass, with editable tunings you can name and save.
- Strum up/down or arpeggiate, with a synthesized plucked-string sound.
- **Sound and pedals**: switch between acoustic and electric, and run the sound through a pedal chain (compressor, noise gate, gated sputtery fuzz, overdrive, high-gain distortion, chorus, amp with speaker cabinet, delay, reverb) in any order, or pick a ready-made rig, including djent and open-tuning metal.
- **Progressions**: string chords together, give each a length, pick or draw a strum pattern (quarters, 8ths, triplets or 16ths, with downstrokes, upstrokes, palm mutes, muted chucks and rests) in any time signature from 2/4 to 12/8, and loop it. Download any progression as a Guitar Pro file. Save progressions by name.
- **Octopus check**: if you tap a shape no hand can fret (too many fingers or too wide a stretch), a meme fades in under the chord name telling you to leave a note out, and stays until the shape is playable. You can switch it off under Display.
- Shows notes, intervals or plain dots, in sharps or flats.

Also here: a [chord chart for D# A# D# F# G# D#](https://irc-finds.github.io/chord-lab/dsharp-chart.html).

Saved tunings, voicings, progressions and songs are kept in your browser only.

## Editing

The pages are built from `src/`:

- `src/shell.html` — the Analyzer's layout, styles and interface code
- `src/songs.html` — the Songs page (it reuses the Analyzer's sound engine from `shell.html`)
- `src/appbar.html` — the Songs / Analyzer bar and page size, shared by both
- `src/chord.js` — the chord-naming engine
- `src/finder.js` — reads chord names and searches for voicings
- `src/dsharp-chart.html` — the D# tuning chord chart

After editing, run `python3 build.py` to rebuild `index.html`, `songs.html` and `dsharp-chart.html`.
