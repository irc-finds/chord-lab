/* ---------- chord finder: name -> notes -> voicings ---------- */
// Case rules: the first letter is the root (any case). After that, lowercase "b" always means flat
// and an uppercase "B" is the note B (Si), e.g. a slash bass "/B". "m" = minor, "M" = major 7th.
// Spanish names work as roots too: Do Re Mi Fa Sol La Si (Sib = B flat).
const INTERVAL_SHORT = ['R', 'b9', '9', 'b3', '3', '11', '#11', '5', 'b6', '6', 'b7', '7'];
const FIND_NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FIND_SOLFEGE = [['sol', 7], ['do', 0], ['re', 2], ['mi', 4], ['fa', 5], ['la', 9], ['si', 11]];

function findReadNote(s, first) {
  // returns [pc, charsUsed] or null. Root (first=true) accepts any case; a later note needs uppercase
  // (so the lowercase "b" in "/b" is never read as the note B... except "/b" alone, handled by caller).
  const low = s.toLowerCase();
  let pc = null, used = 0;
  for (const [w, v] of FIND_SOLFEGE) {
    if (w === 'fa' && /^fadd/.test(low)) continue;   // "Fadd9" is F add9, not Fa + dd9
    if (low.startsWith(w) && (first || /^[A-Z]/.test(s))) { pc = v; used = w.length; break; }
  }
  if (pc === null) {
    const c = s[0];
    if (!c) return null;
    const up = c.toUpperCase();
    if (!(up in FIND_NOTE)) return null;
    if (!first && c !== up) return null;
    pc = FIND_NOTE[up]; used = 1;
  }
  // accidentals
  for (;;) {
    const a = s[used];
    if (a === '#' || a === '♯') { pc++; used++; }
    else if (a === 'b' || a === '♭') {
      // "b" right after the root is a flat unless it starts an alteration like "b5", "b9", "b13", "b6"
      if (/^[b♭]\d/.test(s.slice(used))) break;
      pc--; used++;
    } else break;
  }
  return [((pc % 12) + 12) % 12, used];
}

function parseChordName(input) {
  let s = String(input || '').trim().replace(/\s+/g, '').replace(/[–—]/g, '-');
  if (!s) return { error: 'Type a chord name, e.g. E(addb6), Bbmaj7, F#m7b5, Sibmaj9, D/F#' };
  // slash bass: last "/" followed by a note (not "6/9")
  let bass = null;
  const sl = s.lastIndexOf('/');
  if (sl > 0 && !/^\/9/.test(s.slice(sl))) {
    let tail = s.slice(sl + 1);
    if (/^[b]$/i.test(tail)) tail = 'B';          // "/b" alone can only mean the note B
    const r = findReadNote(tail, true);
    if (!r || r[1] !== tail.length) return { error: 'Could not read the bass note after "/"' };
    bass = r[0]; s = s.slice(0, sl);
  }
  const rr = findReadNote(s, true);
  if (!rr) return { error: 'Start with a root note: C D E F G A B (or Do Re Mi Fa Sol La Si)' };
  const root = rr[0];
  let q = s.slice(rr[1]).replace(/[()]/g, ' ').replace(/,/g, ' ');

  let third = 4, fifth = 7, fifthOpt = true, seventh = null, sus = null, power = false;
  const add = new Set(), opt = new Set(), alters = new Set(), addNames = [];
  let ext = 0;
  let i = 0;
  const rest = () => q.slice(i);
  const eat = re => { const m = rest().match(re); if (m) { i += m[0].length; return m; } return null; };

  eat(/^ +/);
  // triad / family
  if (eat(/^(ø|Ø|m7b5|m7♭5|min7b5|halfdim7?|-7b5)/)) { third = 3; fifth = 6; fifthOpt = false; seventh = 10; }
  else if (eat(/^(dim7|°7|o7)/)) { third = 3; fifth = 6; fifthOpt = false; seventh = 9; }
  else if (eat(/^(dim|°|o(?![a-z]))/)) { third = 3; fifth = 6; fifthOpt = false; }
  else if (eat(/^(aug|\+)(?!\d)/) || eat(/^aug/)) { fifth = 8; fifthOpt = false; }
  else if (eat(/^(maj|Maj|MAJ|ma|Ma|M|Δ|△)(?=\d|$| |\(|add|sus|[#♯b♭])/)) { seventh = 11; if (!/^\d/.test(rest())) ext = 7; }
  else if (eat(/^(min|mi|m|-)(?!aj)/)) {
    third = 3;
    if (eat(/^(maj|Maj|M|Δ|△)/)) { seventh = 11; if (!/^\d/.test(rest())) ext = 7; }
  }
  else if (eat(/^5(?!\d)/)) { power = true; third = null; fifthOpt = false; }

  // tokens
  let guard = 0;
  while (i < q.length && guard++ < 40) {
    if (eat(/^ +/)) continue;
    let m;
    if ((m = eat(/^(maj|Maj|M|Δ|△)(7|9|11|13)/))) { seventh = 11; ext = Math.max(ext, +m[2]); continue; }
    if ((m = eat(/^6\/9|^69(?!\d)/))) { add.add(9); add.add(2); addNames.push([9, '6'], [2, '9']); continue; }
    if ((m = eat(/^(add|ad|\+)([#♯b♭]?)(\d{1,2})/))) { const pc = alt(m[2], +m[3]); add.add(pc); addNames.push([pc, m[2].replace('♯', '#').replace('♭', 'b') + m[3]]); continue; }
    if ((m = eat(/^sus(2|4)?/))) { sus = m[1] ? +m[1] : 4; continue; }
    if ((m = eat(/^(no|omit)(3|5|R|1)/i))) { if (m[2] === '3') third = null; else if (m[2] === '5') { fifth = null; } continue; }
    if ((m = eat(/^([#♯b♭])(\d{1,2})/))) { alters.add({ pc: alt(m[1], +m[2]), n: +m[2], label: m[1].replace('♯', '#').replace('♭', 'b') + m[2] }); continue; }
    if ((m = eat(/^(13|11|9|7|6|2|4)/))) {
      const n = +m[1];
      if (n === 6) { add.add(9); addNames.push([9, '6']); }
      else if (n === 2) { add.add(2); addNames.push([2, '2']); }
      else if (n === 4) { add.add(5); addNames.push([5, '4']); }
      else { if (seventh === null) seventh = 10; ext = Math.max(ext, n); }
      continue;
    }
    if (eat(/^alt/)) { seventh = seventh ?? 10; alters.add({ pc: 1, n: 9, label: 'b9' }); alters.add({ pc: 3, n: 9, label: '#9' }); alters.add({ pc: 8, n: 13, label: 'b13' }); fifth = null; continue; }
    return { error: 'Could not understand "' + q.slice(i).trim() + '"' };
  }
  function alt(sign, n) {
    const base = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 10, 9: 2, 11: 5, 13: 9 }[n];
    if (base === undefined) return null;
    if (sign === '#' || sign === '♯') return (base + 1) % 12;
    if (sign === 'b' || sign === '♭') return (base + 11) % 12;
    if (n === 7) return 10;
    return base;
  }
  if ([...add, ...[...alters].map(a => a.pc)].includes(null)) return { error: 'That alteration number does not exist' };

  const names = { 0: 'R' };
  names[2] = '9'; names[5] = '11'; names[9] = seventh !== null ? '13' : '6';
  const req = new Set([0]);
  if (sus) third = sus === 2 ? 2 : 5;
  if (third !== null && !power) { req.add(third); names[third] = { 2: '2', 3: 'b3', 4: '3', 5: '4' }[third]; }
  if (seventh !== null) { req.add(seventh); names[seventh] = { 9: 'bb7', 10: 'b7', 11: '7' }[seventh]; }
  // extensions: the top one is required, the ones under it are optional (11 is left out of major/dominant 13ths)
  if (ext >= 9) { if (ext === 9) req.add(2); else opt.add(2); }
  if (ext >= 11) { if (ext === 11) req.add(5); else if (third === 3) opt.add(5); }
  if (ext >= 13) req.add(9);
  // alterations: b5/#5 replace the 5th; b9/#9 replace the 9th; #11 replaces the 11th; b13 the 13th; others are added
  for (const a of alters) {
    if (a.n === 5) fifth = null;
    if (a.n === 9) { req.delete(2); opt.delete(2); }
    if (a.n === 11) { req.delete(5); opt.delete(5); }
    if (a.n === 13) req.delete(9);
    req.add(a.pc); names[a.pc] = a.label;
  }
  for (const a of add) req.add(a);
  for (const [pc, l] of addNames) names[pc] = l;
  if (fifth !== null) names[fifth] = { 6: 'b5', 7: '5', 8: '#5' }[fifth];
  if (fifth !== null) { if (fifthOpt && req.size >= 3) opt.add(fifth); else req.add(fifth); }
  if (bass !== null) { const b = ((bass - root) % 12 + 12) % 12; if (!req.has(b) && !opt.has(b)) req.add(b); opt.delete(b); req.add(b); }
  for (const r of req) opt.delete(r);
  if (bass !== null) { const b = ((bass - root) % 12 + 12) % 12; if (!names[b]) names[b] = INTERVAL_SHORT[b]; }
  return { names, root, bass, req: [...req].sort((a, b) => a - b), opt: [...opt].sort((a, b) => a - b), text: String(input).trim() };
}

// Search playable voicings for pitch-class sets over a tuning. Returns best first.
function findVoicings(tuning, maxFret, spec, o = {}) {
  const n = tuning.length, root = spec.root;
  const allowed = new Set([...spec.req, ...spec.opt].map(d => (d + root) % 12));
  const need = spec.req.map(d => (d + root) % 12);
  const bassPc = spec.bass !== null && spec.bass !== undefined ? spec.bass : null;
  const minNotes = Math.min(o.minNotes || 3, Math.max(2, need.length));
  const SPAN = 3;
  const seen = new Map();

  for (let lo = 1; lo <= Math.max(1, maxFret - SPAN); lo++) {
    const hi = Math.min(maxFret, lo + SPAN);
    // per string choices: muted, open, or a fret in [lo, hi] that is a chord tone
    const opts = tuning.map(t => {
      const c = [null];
      if (allowed.has(t % 12)) c.push(0);
      for (let f = lo; f <= hi; f++) if (allowed.has((t + f) % 12)) c.push(f);
      return c;
    });
    const cur = new Array(n);
    (function dfs(s) {
      if (s === n) { consider(cur.slice()); return; }
      for (const f of opts[s]) { cur[s] = f; dfs(s + 1); }
    })(0);
  }

  function consider(fr) {
    const snd = [];
    fr.forEach((f, i) => { if (f !== null) snd.push(i); });
    if (snd.length < minNotes) return;
    const pcs = new Set(snd.map(i => (tuning[i] + fr[i]) % 12));
    for (const p of need) if (!pcs.has(p)) return;
    // lowest sounding pitch (strings may not be in pitch order in odd tunings)
    let low = Infinity; snd.forEach(i => { low = Math.min(low, tuning[i] + fr[i]); });
    const lowPc = low % 12;
    if (bassPc !== null && lowPc !== bassPc) return;
    const fretted = snd.filter(i => fr[i] > 0);
    const fs = fretted.map(i => fr[i]);
    const minF = fs.length ? Math.min(...fs) : 0, maxF = fs.length ? Math.max(...fs) : 0;
    const span = maxF - minF;
    if (span > SPAN) return;
    // muted strings between sounding strings
    let inner = 0;
    for (let i = snd[0]; i <= snd[snd.length - 1]; i++) if (fr[i] === null) inner++;
    if (inner > 1) return;
    // fingers: up to 4; with more fretted notes, the lowest fret must be barred
    let fingers = fretted.length, barre = false;
    if (fingers > 4) {
      const bs = fretted.filter(i => fr[i] === minF);
      const from = bs[0], to = n - 1;
      let ok = true;
      for (let i = from; i <= to; i++) if (fr[i] === 0) ok = false;
      fingers = 1 + fretted.filter(i => fr[i] !== minF).length;
      if (!ok || fingers > 4) return;
      barre = true;
    }
    const key = fr.map(f => f === null ? 'x' : f).join('-');
    if (seen.has(key)) return;
    const opens = snd.length - fretted.length;
    const mutes = n - snd.length;
    let score = span * 0.9 + minF * 0.12 + inner * 2.5 + mutes * 0.7 - snd.length * 0.35 - opens * 0.25 + fingers * 0.25 + (barre ? 0.6 : 0);
    if (bassPc === null && lowPc !== root) score += 3.5;
    // reward the optional tones being present a little, and doubled roots
    score -= [...pcs].filter(p => !need.includes(p)).length * 0.2;
    // two strings on the same pitch is a waste unless it's a ringing open string
    const pitches = snd.map(i => tuning[i] + fr[i]);
    score += (pitches.length - new Set(pitches).size) * 0.6;
    seen.set(key, { frets: fr, score, minF, span, barre, rootBass: lowPc === root });
  }
  return [...seen.values()].sort((a, b) => a.score - b.score);
}
if (typeof module !== 'undefined') module.exports = { parseChordName, findVoicings };
