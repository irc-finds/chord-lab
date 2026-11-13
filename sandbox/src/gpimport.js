// Guitar Pro → Chord Lab progressions.
// Reads one track of a score loaded by alphaTab and turns each section of the song into a progression: the chords
// (one per beat count at most, the shape that rings longest in that count wins), a one-bar strum pattern (the one most
// bars of the section use) and the section's time signature and tempo. A section that is the same phrase played several
// times becomes one progression played that many times. Works without a page, so it can be tested on its own.
//
// opt: { meters: METERS, instFor(n, isBass) -> instrument key or null, model: alphaTab.model }
function gpTrackInfo(score) {
  return score.tracks.map((t, i) => {
    const sf = t.staves[0], tun = sf && sf.stringTuning ? sf.stringTuning.tunings : [];
    let chordBeats = 0, notes = 0;
    if (sf && tun.length) sf.bars.forEach(b => b.voices.forEach(v => v.beats.forEach(bt => { if (bt.notes.length) { notes++; if (bt.notes.length >= 2) chordBeats++; } })));
    return { index: i, name: t.name || 'Track ' + (i + 1), strings: tun.length, percussion: !!(sf && sf.isPercussion), notes, chordBeats,
      program: t.playbackInfo ? t.playbackInfo.program : 0 };
  });
}

function gpBestTrack(info) {
  const ok = info.filter(t => !t.percussion && t.strings >= 4 && t.notes);
  if (!ok.length) return -1;
  const score = t => t.chordBeats * 3 + t.notes + (/rhythm/i.test(t.name) ? 1e6 : 0) - (t.strings <= 5 ? 5e5 : 0);
  return ok.slice().sort((a, b) => score(b) - score(a))[0].index;
}

function gpToParts(score, ti, opt) {
  const M = opt.model, meters = opt.meters;
  const track = score.tracks[ti], staff = track.staves[0];
  const tuning = staff.stringTuning.tunings.slice().reverse();          // Guitar Pro lists the highest string first
  const n = tuning.length, capo = staff.capo || 0;
  const bass = /bass/i.test(track.name) || (track.playbackInfo && track.playbackInfo.program >= 32 && track.playbackInfo.program <= 39) || n === 4 || (n === 5 && tuning[0] < 30);
  const inst = opt.instFor(n, bass);
  if (!inst) return { error: `That track has ${n} strings; Chord Lab does 4, 5, 6 and 7.` };
  const T = tuning.map(m => m + capo);
  const TPQ = 960;
  const BR = M.BrushType || {}, PK = M.PickStroke || {};
  const isDown = b => b.brushType === BR.BrushDown || b.brushType === BR.ArpeggioDown || b.pickStroke === PK.Down;
  const isUp = b => b.brushType === BR.BrushUp || b.brushType === BR.ArpeggioUp || b.pickStroke === PK.Up;

  // ---- one record per bar ----
  let tempo = score.tempo || 120;
  const bars = score.masterBars.map((mb, bi) => {
    if (mb.tempoAutomations && mb.tempoAutomations.length) tempo = mb.tempoAutomations[0].value;
    const num = mb.timeSignatureNumerator, den = mb.timeSignatureDenominator;
    const meter = num + '/' + den;
    const countTicks = TPQ * 4 / den, barTicks = countTicks * num;
    const beats = [];
    const bar = staff.bars[bi];
    if (bar) bar.voices.forEach((v, vi) => {
      if (vi > 0 && beats.length) return;   // the first voice that has notes is the part
      v.beats.forEach(b => {
        const start = b.playbackStart, dur = b.playbackDuration;
        const sounding = b.notes.filter(x => !x.isTieDestination);
        const fr = new Array(n).fill(null);
        let dead = 0, pm = 0, live = 0;
        b.notes.forEach(x => {
          const si = x.string - 1; if (si < 0 || si >= n) return;
          if (x.isDead) { dead++; return; }
          fr[si] = x.fret; live++; if (x.isPalmMute) pm++;
        });
        beats.push({ start, dur, fr, live, dead, pm, rest: b.isRest || !b.notes.length, tie: b.notes.length > 0 && !sounding.length, down: isDown(b), up: isUp(b) });
      });
    });
    return { bi, meter, num, den, countTicks, barTicks, tempo, beats, empty: !beats.some(b => !b.rest),
      section: mb.section ? (mb.section.text || mb.section.marker || '').trim() : null };
  });

  // ---- sections: Guitar Pro's markers, or the whole song ----
  const secs = [];
  bars.forEach(b => {
    if (b.section !== null || !secs.length) secs.push({ label: b.section || '', bars: [] });
    secs[secs.length - 1].bars.push(b);
  });
  let lastShape = null;
  const parts = [];
  const cleanName = (t, i) => {
    const s = (t || '').replace(/\s+/g, ' ').trim();
    if (s && s.length <= 28 && !/^\*/.test(s)) return s;
    return i === 0 ? 'Intro' : 'Part ' + (i + 1);
  };
  secs.forEach((sec, si) => {
    // drop silent bars at either end of the section
    let a = 0, z = sec.bars.length - 1;
    while (a <= z && sec.bars[a].empty) a++;
    while (z >= a && sec.bars[z].empty) z--;
    if (a > z) return;
    const bs = sec.bars.slice(a, z + 1);
    // the section's time signature = the one most of its bars use
    const mc = {}; bs.forEach(b => { mc[b.meter] = (mc[b.meter] || 0) + 1; });
    let meter = Object.keys(mc).sort((x, y) => mc[y] - mc[x])[0];
    if (!meters[meter]) meter = '4/4';
    const [num, den] = meter.split('/').map(Number);
    const countTicks = TPQ * 4 / den;
    // the finest grid the strums need: quarter, 8th, 16th or triplet steps per count
    const starts = []; bs.forEach(b => b.beats.forEach(bt => { if (!bt.rest && !bt.tie) starts.push(bt.start); }));
    const fits = sub => starts.filter(t => Math.abs(t / (countTicks / sub) - Math.round(t / (countTicks / sub))) < 0.08).length / Math.max(1, starts.length);
    let sub = 4;
    for (const c of den === 8 ? [1, 2] : [1, 2, 3, 4]) { if (fits(c) >= 0.97) { sub = c; break; } }
    if (den === 8 && sub > 2) sub = 2;
    const stepTicks = countTicks / sub, steps = num * sub;

    // ---- per bar: the chord in each count, and the strum pattern ----
    const units = bs.map(b => {
      const counts = b.num;
      const shapes = [];
      for (let c = 0; c < counts; c++) {
        const c0 = c * b.countTicks, c1 = c0 + b.countTicks, w = {};
        b.beats.forEach(bt => {
          if (bt.rest || !bt.live) return;
          const ov = Math.min(c1, bt.start + bt.dur) - Math.max(c0, bt.start);
          if (ov <= 0) return;
          const k = bt.fr.map(f => f === null ? 'x' : f).join('-');
          w[k] = (w[k] || 0) + ov + (bt.start >= c0 && bt.start < c1 ? 1 : 0) * 0.01 * b.countTicks + bt.live;
        });
        const best = Object.keys(w).sort((x, y) => w[y] - w[x])[0];
        if (best) lastShape = best;
        shapes.push(best || lastShape);
      }
      const pat = new Array(steps).fill('-');
      b.beats.forEach(bt => {
        if (bt.rest || bt.tie) return;
        const pos = Math.round(bt.start / (b.countTicks / sub));
        if (pos < 0 || pos >= steps) return;
        let ch;
        if (!bt.live && bt.dead) ch = 'X';
        else if (bt.live && bt.pm >= Math.ceil(bt.live / 2)) ch = 'P';
        else if (bt.down) ch = 'D';
        else if (bt.up) ch = 'U';
        else ch = sub === 1 ? 'D' : (pos % 2 === 0 ? 'D' : 'U');   // hand keeps moving: on the grid down, in between up
        pat[pos] = ch;
      });
      return { shapes, pat: pat.join(''), counts };
    });
    const pc = {}; units.forEach(u => { if (u.counts === num) pc[u.pat] = (pc[u.pat] || 0) + 1; });
    const pat = Object.keys(pc).sort((x, y) => pc[y] - pc[x])[0] || 'D' + '-'.repeat(steps - 1);
    const patBars = pc[pat] || 0;

    // ---- a phrase played several times becomes one progression played that many times ----
    const key = u => u.shapes.join('|');
    let period = units.length;
    for (let k = 1; k < units.length; k++) {
      if (units.length % k) continue;
      if (units.every((u, i) => key(u) === key(units[i % k]))) { period = k; break; }
    }
    const times = units.length / period;
    // chords: merge counts that keep the same shape, then write lengths Chord Lab knows (4, 2 or 1 bars; 2 or 1 counts)
    const runs = [];
    units.slice(0, period).forEach(u => u.shapes.forEach(sh => {
      if (!sh) return;
      if (runs.length && runs[runs.length - 1].sh === sh) runs[runs.length - 1].len++;
      else runs.push({ sh, len: 1 });
    }));
    const chords = [];
    runs.forEach(r => {
      let L = r.len;
      const fr = r.sh.split('-').map(x => x === 'x' ? null : Number(x));
      const add = len => chords.push(Object.assign({ inst, tuning: T.slice(), frets: fr.slice(), rootPick: null }, len));
      while (L >= 4 * num) { add({ bars: 4 }); L -= 4 * num; }
      while (L >= 2 * num) { add({ bars: 2 }); L -= 2 * num; }
      while (L >= num) { add({ bars: 1 }); L -= num; }
      while (L >= 2) { add({ beats: 2 }); L -= 2; }
      while (L >= 1) { add({ beats: 1 }); L -= 1; }
    });
    if (!chords.length) return;
    const q = bs[0].tempo;
    const bpm = Math.max(30, Math.min(300, Math.round(den === 8 ? q * 2 : q)));
    parts.push({ name: cleanName(sec.label, si), times, bars: units.length, patBars,
      prog: { name: '', chords, sub, pat, bpm, loop: true, meter } });
  });
  // sections with exactly the same music share one progression ("Intro / Verse / Solo"); the song order keeps every section
  const progs = [], order = [];
  parts.forEach(p => {
    const k = JSON.stringify([p.prog.chords.map(c => [c.frets, c.bars || 0, c.beats || 0]), p.prog.sub, p.prog.pat, p.prog.bpm, p.prog.meter]);
    let i = progs.findIndex(x => x.key === k);
    if (i < 0) { progs.push({ key: k, names: [], prog: p.prog, bars: p.bars / p.times, patBars: p.patBars, totalBars: p.bars }); i = progs.length - 1; }
    else { progs[i].patBars += p.patBars; progs[i].totalBars += p.bars; }
    progs[i].names.push(p.name);
    // next to the same progression: just play it more times
    const last = order[order.length - 1];
    if (last && last.ref === i) { last.times += p.times; last.sections.push(p.name); }
    else order.push({ ref: i, times: p.times, sections: [p.name] });
  });
  const base = t => t.replace(/\s*\d+$/, '');
  const used = {};
  progs.forEach(x => {
    const names = [...new Set(x.names.map(base))];
    let nm = names.join(' / ');
    if (nm.length > 36) nm = names[0] + ' +' + (names.length - 1);
    if (x.names.length === 1) nm = x.names[0];
    used[nm] = (used[nm] || 0) + 1;
    if (used[nm] > 1) nm += ' (' + used[nm] + ')';
    x.name = nm; x.prog.name = nm; delete x.key;
  });
  return { progs, order, sections: parts.length, inst, tuning: T, title: score.title || '', artist: score.artist || '', track: track.name || '' };
}

if (typeof module !== 'undefined') module.exports = { gpTrackInfo, gpBestTrack, gpToParts };
