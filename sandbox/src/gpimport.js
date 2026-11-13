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

  // ---- blocks: Guitar Pro's section markers and repeat signs; a repeated stretch is one block played N times ----
  const LENS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.5, 2, 3];   // the chord lengths Chord Lab knows, in counts (plus 1-4 bars)
  const blocks = [];
  let label = '', open = null;
  score.masterBars.forEach((mb, bi) => {
    const b = bars[bi];
    if (b.section !== null) {
      // a marker that's really a note ("*song is in around 452Hz…") at the very start still marks the intro
      const t = b.section.replace(/\s+/g, ' ').trim();
      label = t && t.length <= 28 && !/^\*/.test(t) ? t : (!blocks.length ? 'Intro' : '');
      open = null;
    }
    if (mb.isRepeatStart || !open || b.section !== null) { open = { label, bars: [], times: 1, sectionStart: b.section !== null || !blocks.length }; blocks.push(open); }
    open.bars.push(b);
    if (mb.repeatCount > 1) { open.times = mb.repeatCount; open = null; }
  });

  // ---- per bar: what's struck on each grid step (the shape and the stroke) ----
  const songTempo = bars.find(b => !b.empty) ? bars.find(b => !b.empty).tempo : tempo;
  const stepsOf = (b, sub) => {
    const n0 = b.num * sub, step = b.countTicks / sub, out = new Array(n0).fill(null);
    let prevEnd = 0, prevNotes = false;
    b.beats.forEach(bt => {
      const pos = Math.round(bt.start / step);
      if (pos < 0 || pos >= n0) return;
      if (bt.rest) { if (prevNotes && !out[pos]) out[pos] = { ch: 'S' }; prevNotes = false; return; }
      if (bt.tie) { prevNotes = true; return; }
      let ch;
      if (!bt.live && bt.dead) ch = 'X';
      else if (bt.live && bt.pm >= Math.ceil(bt.live / 2)) ch = 'P';
      else ch = bt.down ? 'D' : bt.up ? 'U' : '?';
      out[pos] = { ch, shape: bt.live ? bt.fr.map(f => f === null ? 'x' : f).join('-') : null, marked: bt.down || bt.up };
      prevNotes = true;
    });
    return out;
  };
  // auto: steady 8ths (or slower) at a brisk tempo with no stroke marks = downpicked; everything else down on the grid, up in between
  const dirMode = opt.direction || 'auto';
  const strokesFor = (sub, anyMarks) => {
    if (dirMode === 'down') return () => 'D';
    if (dirMode === 'alt' || anyMarks) return pos => sub === 1 ? 'D' : (pos % 2 === 0 ? 'D' : 'U');
    return sub <= 2 && songTempo >= 100 ? () => 'D' : pos => sub === 1 ? 'D' : (pos % 2 === 0 ? 'D' : 'U');
  };

  let lastShape = null;
  const units = [];   // every played bar, in order, as { key, pat, shapes[] }
  const progOfBlock = [];
  blocks.forEach(blk => {
    let a = 0, z = blk.bars.length - 1;
    while (a <= z && blk.bars[a].empty) a++;
    while (z >= a && blk.bars[z].empty) z--;
    if (a > z) return;
    const bs = blk.bars.slice(a, z + 1);
    const mc = {}; bs.forEach(b => { mc[b.meter] = (mc[b.meter] || 0) + 1; });
    let meter = Object.keys(mc).sort((x, y) => mc[y] - mc[x])[0];
    if (!meters[meter]) meter = '4/4';
    const [num, den] = meter.split('/').map(Number);
    const countTicks = TPQ * 4 / den;
    const starts = []; bs.forEach(b => b.beats.forEach(bt => { if (!bt.rest && !bt.tie) starts.push(bt.start); }));
    const fits = sub => starts.filter(t => Math.abs(t / (countTicks / sub) - Math.round(t / (countTicks / sub))) < 0.08).length / Math.max(1, starts.length);
    let sub = 4;
    for (const c of den === 8 ? [1, 2] : [1, 2, 3, 4]) { if (fits(c) >= 0.97) { sub = c; break; } }
    if (den === 8 && sub > 2) sub = 2;
    const steps = num * sub;
    const grids = bs.map(b => stepsOf(b, sub));
    const anyMarks = grids.some(g => g.some(x => x && x.marked));
    const dir = strokesFor(sub, anyMarks);
    const us = grids.map((g, i) => {
      const pat = [], shapes = [];
      for (let k = 0; k < steps; k++) {
        const x = g[k];
        if (x && x.shape) lastShape = x.shape;
        shapes.push(lastShape);
        pat.push(!x ? '-' : x.ch === '?' ? dir(k) : x.ch);
      }
      return { pat: pat.join(''), shapes, key: pat.join('') + '|' + shapes.join('|'), counts: bs[i].num };
    });
    // the shortest phrase that repeats through the block (the last time round may stop early)
    let period = us.length;
    for (let k = 1; k <= Math.min(8, us.length - 1); k++) {
      if (us.every((u, i) => i < k || u.key === us[i - k].key) && us.length >= 2 * k) { period = k; break; }
    }
    const pieces = [];
    if (period < us.length) {
      const reps = Math.floor(us.length / period), rest = us.length - reps * period;
      pieces.push({ us: us.slice(0, period), times: reps });
      if (rest) pieces.push({ us: us.slice(reps * period), times: 1 });
    } else if (us.length > 8 && ![1, 2, 4].some(P => us.every((u, i) => u.pat === us[i % P].pat))) {
      // a long stretch whose strum keeps changing: cut it into 4-bar phrases (the same phrase later reuses its progression)
      for (let i = 0; i < us.length; i += 4) pieces.push({ us: us.slice(i, i + 4), times: 1 });
    } else pieces.push({ us, times: 1 });   // one strum cycle fits every bar: keep the whole stretch together
    pieces.forEach(pc => progOfBlock.push({ blk, pc, meter, num, den, sub, steps, tempo: bs[0].tempo }));
  });

  // ---- each piece → a progression: a strum pattern of 1, 2 or 4 bars, and chords as short as the riff needs ----
  const parts = [];
  progOfBlock.forEach(({ blk, pc, meter, num, den, sub, steps, tempo: q }) => {
    const us = pc.us;
    let best = null;
    [1, 2, 4].forEach(P => {
      if (P > us.length && P > 1) return;
      const pat = [];
      for (let j = 0; j < P; j++) {
        const c = {}; us.forEach((u, i) => { if (i % P === j && u.counts === num) c[u.pat] = (c[u.pat] || 0) + 1; });
        pat.push(Object.keys(c).sort((x, y) => c[y] - c[x])[0] || us[j % us.length].pat);
      }
      const hit = us.filter((u, i) => u.pat === pat[i % P]).length;
      if (!best || hit > best.hit) best = { P, pat: pat.join(''), hit };
    });
    // chords: runs of the same shape, step by step
    const runs = [];
    us.forEach(u => u.shapes.forEach(sh => {
      if (!sh) return;
      if (runs.length && runs[runs.length - 1].sh === sh) runs[runs.length - 1].len++;
      else runs.push({ sh, len: 1 });
    }));
    const chords = [];
    runs.forEach(r => {
      let L = r.len / sub;   // counts
      const fr = r.sh.split('-').map(x => x === 'x' ? null : Number(x));
      const add = len => chords.push(Object.assign({ inst, tuning: T.slice(), frets: fr.slice(), rootPick: null }, len));
      for (const bars of [4, 3, 2, 1]) while (L >= bars * num - 1e-6) { add({ bars }); L -= bars * num; }
      for (const v of LENS.slice().reverse()) while (L >= v - 1e-6) { add({ beats: v }); L -= v; }
    });
    if (!chords.length) return;
    const bpm = Math.max(30, Math.min(300, Math.round(den === 8 ? q * 2 : q)));
    parts.push({ name: blk.label, sectionStart: blk.sectionStart, times: pc.times * blk.times, bars: us.length * pc.times * blk.times,
      patBars: best.hit * pc.times * blk.times, prog: { name: '', chords, sub, pat: best.pat, bpm, loop: true, meter } });
  });
  // the same music anywhere in the song shares one progression; next to itself it just plays more times
  const progs = [], order = [];
  parts.forEach(p => {
    const k = JSON.stringify([p.prog.chords.map(c => [c.frets, c.bars || 0, c.beats || 0]), p.prog.sub, p.prog.pat, p.prog.bpm, p.prog.meter]);
    let i = progs.findIndex(x => x.key === k);
    if (i < 0) { progs.push({ key: k, names: [], prog: p.prog, bars: p.bars / p.times, patBars: p.patBars, totalBars: p.bars }); i = progs.length - 1; }
    else { progs[i].patBars += p.patBars; progs[i].totalBars += p.bars; }
    progs[i].names.push(p.name);
    const last = order[order.length - 1];
    if (last && last.ref === i) { last.times += p.times; last.sections.push(p.name); }
    else order.push({ ref: i, times: p.times, sections: [p.name] });
  });
  const clean = t => { const x = (t || '').replace(/\s+/g, ' ').trim(); return x && x.length <= 28 && !/^\*/.test(x) ? x : ''; };
  let letter = 0;
  const base = t => t.replace(/\s*\d+$/, '');
  const labelled = progs.some(x => x.names.some(clean));
  const used = {};
  progs.forEach((x, i) => {
    const names = [...new Set(x.names.map(clean).filter(Boolean).map(base))];
    let nm;
    if (!labelled) nm = 'Riff ' + String.fromCharCode(65 + (letter++ % 26));
    else if (!names.length) nm = i === 0 ? 'Intro' : 'Part ' + (i + 1);
    else { nm = names.join(' / '); if (nm.length > 36) nm = names[0] + ' +' + (names.length - 1); }
    used[nm] = (used[nm] || 0) + 1;
    if (used[nm] > 1) nm += ' ' + String.fromCharCode(96 + used[nm]);   // Verse, Verse b, Verse c…
    x.name = nm; x.prog.name = nm; delete x.key;
  });
  return { progs, order, sections: parts.length, direction: dirMode, inst, tuning: T, title: score.title || '', artist: score.artist || '', track: track.name || '' };
}

if (typeof module !== 'undefined') module.exports = { gpTrackInfo, gpBestTrack, gpToParts };
