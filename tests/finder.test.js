// Run: node tests/finder.test.js
const assert = require('assert');
const { parseChordName, findVoicings } = require('../src/finder.js');
const S = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const notes = t => { const p = parseChordName(t); assert(!p.error, t + ': ' + p.error); return [...p.req, ...p.opt].map(d => S[(d + p.root) % 12]).sort().join(' '); };
const eq = (t, want) => assert.strictEqual(notes(t), want.split(' ').sort().join(' '), t);

eq('E(addb6)', 'E G# B C');
eq('Bbmaj7', 'A# D F A');      // lowercase b = flat
eq('C/B', 'C E G B');           // capital B = the note
eq('C/b', 'C E G B');
eq('Sib', 'A# D F');            // Spanish
eq('Fa#m7', 'F# A C# E');
eq('Fadd9', 'F A C G');         // not "Fa" + "dd9"
eq('F#m7b5', 'F# A C E');
eq('Bdim7', 'B D F G#');
eq('C6/9', 'C E G A D');
eq('E7#9', 'E G# B D G');
assert.strictEqual(parseChordName('D/F#').bass, 6);
assert(parseChordName('Hm').error);

const DSHARP = [39, 46, 51, 54, 56, 63];
const shapes = t => findVoicings(DSHARP, 15, parseChordName(t)).map(v => v.frets.map(f => f === null ? 'x' : f).join('-'));
assert(shapes('Emaj9').includes('1-1-1-0-0-0'), 'Emaj9 should include 1-1-1-0-0-0');
assert(shapes('E(addb6)').includes('1-2-1-2-3-1'));
for (const v of findVoicings(DSHARP, 15, parseChordName('D/F#'))) {
  const low = Math.min(...v.frets.map((f, i) => f === null ? Infinity : DSHARP[i] + f));
  assert.strictEqual(low % 12, 6, 'slash bass must be lowest');
}
console.log('all finder tests passed');
