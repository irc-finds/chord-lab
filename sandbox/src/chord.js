// ---- chord engine ----
function analyze(root, pcs, bass) {
  const S = new Set([...pcs].map(p => ((p - root) % 12 + 12) % 12));
  const h = x => S.has(x);
  const used = new Set([0]);
  let third = h(4) ? 'M' : (h(3) ? 'm' : null);
  const sharp9 = third === 'M' && h(3);
  if (third === 'M') used.add(4);
  if (third === 'm') used.add(3);
  if (sharp9) used.add(3);
  let tri;
  if (third === 'M') { if (!h(7) && h(8)) { tri = 'aug'; used.add(8); } else tri = 'maj'; }
  else if (third === 'm') { if (!h(7) && h(6)) { tri = 'dim'; used.add(6); } else tri = 'min'; }
  else { if (h(5)) { tri = 'sus4'; used.add(5); } else if (h(2)) { tri = 'sus2'; used.add(2); } else tri = 'no3'; }
  if (h(7)) used.add(7);
  let sev = null;
  if (h(11)) { sev = 'M7'; used.add(11); }
  else if (h(10)) { sev = '7'; used.add(10); }
  else if (tri === 'dim' && h(9)) { sev = 'd7'; used.add(9); }
  let n9 = h(2) && !used.has(2), n11 = h(5) && !used.has(5), n13 = h(9) && !used.has(9);
  if (n9) used.add(2); if (n11) used.add(5); if (n13) used.add(9);
  const q = { maj: '', min: 'm', dim: 'dim', aug: 'aug', sus4: '', sus2: '', no3: '' }[tri];
  let body = '';
  if (sev) {
    let num = 7;
    if (n9 && sev !== 'd7') { num = 9; n9 = false; if (n11) { num = 11; n11 = false; } if (n13) { num = 13; n13 = false; } }
    if (sev === 'M7') body = tri === 'min' ? `m(maj${num})` : tri === 'aug' ? `aug(maj${num})` : tri === 'dim' ? `dim(maj${num})` : `maj${num}`;
    else if (sev === '7') body = tri === 'min' ? `m${num}` : tri === 'dim' ? `m${num}b5` : tri === 'aug' ? `aug${num}` : `${num}`;
    else body = 'dim7';
    if (tri === 'sus4' || tri === 'sus2') body += tri;
  } else {
    if (n13 && (tri === 'maj' || tri === 'min' || tri === 'sus2' || tri === 'sus4')) {
      body = q + (n9 ? '6/9' : '6'); n13 = false; n9 = false;
    } else body = q;
    if (tri === 'sus4' || tri === 'sus2') body += tri;
    if (tri === 'no3' && S.size === 2 && h(7)) body = '5';
  }
  const alts = [], adds = [], omits = [];
  if (h(1)) { alts.push('b9'); used.add(1); }
  if (sharp9) alts.push('#9');
  if (h(6) && !used.has(6)) { alts.push(h(7) || tri === 'aug' || tri === 'maj' ? '#11' : 'b5'); used.add(6); }
  if (h(8) && !used.has(8)) { alts.push(h(7) ? (sev ? 'b13' : 'addb6') : '#5'); used.add(8); }
  if (n9) adds.push('add9');
  if (n11) adds.push('add11');
  if (n13) adds.push('add13');
  let unexplained = 0;
  if (h(10) && !used.has(10)) { adds.push('add b7'); unexplained++; }
  if (tri === 'no3' && body !== '5') omits.push('no3');
  const paren = [...alts, ...adds, ...omits];
  let s = 0;
  if (root === bass) s += 2;
  if (tri === 'no3') s -= (body === '5' ? 0.5 : 2.5);
  if (tri === 'sus4' || tri === 'sus2') s -= 0.8;
  if (!h(7) && !sev && (tri === 'maj' || tri === 'min' || tri === 'sus4' || tri === 'sus2')) s -= 0.7;
  if (tri === 'dim' || tri === 'aug') s -= 0.8;
  if (sev === 'd7') s += 0.6;
  alts.forEach(t => { s -= t === '#11' ? 0.8 : 1.5; if (t === '#5' && tri !== 'aug') s -= 1; });
  s -= adds.length * 0.6 + unexplained * 1.5;
  if (sharp9) s -= 0.5;
  const labels = {
    0: 'R', 1: 'b9', 2: tri === 'sus2' ? '2' : '9', 3: third === 'm' ? 'b3' : '#9', 4: '3',
    5: tri === 'sus4' ? '4' : '11', 6: tri === 'dim' ? 'b5' : (h(7) || tri === 'maj' || tri === 'aug' ? '#11' : 'b5'), 7: '5',
    8: tri === 'aug' ? '#5' : (h(7) && sev ? 'b13' : 'b6'), 9: sev === 'd7' ? 'bb7' : (sev ? '13' : '6'), 10: 'b7', 11: '7'
  };
  return { root, body, paren, score: s, labels };
}
const INTERVAL_NAMES = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th'];
// ---- end chord engine ----
// candidates for a set of sounding midi notes
function candidates(midis) {
  if (!midis.length) return [];
  const pcs = new Set(midis.map(m => ((m % 12) + 12) % 12));
  const lowest = Math.min(...midis), bass = ((lowest % 12) + 12) % 12;
  const out = [...pcs].map(r => Object.assign(analyze(r, pcs, bass), { bass, slash: r !== bass }));
  // bass note that only appears in the bass: read the upper notes as their own chord over it
  const upper = new Set(midis.filter(m => m !== lowest).map(m => ((m % 12) + 12) % 12));
  if (!upper.has(bass) && upper.size >= 3) {
    [...upper].forEach(r => {
      const a = analyze(r, upper, r);
      a.score -= 1.2; a.bass = bass; a.slash = true; a.upper = true;
      const d = ((bass - r) % 12 + 12) % 12;
      a.bassLabel = { 1: 'b9', 2: '9', 3: 'b3', 4: '3', 5: '11', 6: '#11', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7' }[d];
      out.push(a);
    });
  }
  out.sort((a, b) => b.score - a.score);
  const seen = new Set(), res = [];
  for (const a of out) { const k = a.root + '|' + a.body + '|' + a.paren.join(',') + '|' + a.slash; if (!seen.has(k)) { seen.add(k); res.push(a); } }
  return res;
}
function formatName(a, nm) {
  let body = a.body;
  if (a.paren.length) body = body.endsWith(')') ? body.slice(0, -1) + ', ' + a.paren.join(', ') + ')' : body + '(' + a.paren.join(', ') + ')';
  return nm(a.root) + body + (a.slash ? '/' + nm(a.bass) : '');
}
