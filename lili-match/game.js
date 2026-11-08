// 栗栗的森林消消 (lili-match) v3 — rebuilt match-3
(function () {
'use strict';
const { cv, ctx } = FX.init({ landscape: false });
const DEBUG = /[?&]debug(=|&|$)/.test(location.search);
if (window.GameAudio) try { GameAudio.setPauseCheck(() => !FX.running || phase === 'off' || phase === 'end'); } catch (e) {}
cv.style.touchAction = 'none';

// ================= CONFIG =================
const N = 8;
const IMGS = ['m3-acorn', 'm3-mushroom', 'm3-leaf', 'm3-squirrel', 'm3-pine', 'm3-apple'];
const PCOL = ['#d8964f', '#ff5a4a', '#ff9a2e', '#e08a4a', '#4fbf62', '#ff4058'];
const WORDS = ['', '', '不错!', '很好!', '太棒了!', '完美!', '超神!'];
const E8 = '........';
const L = (...rows) => rows.length ? rows : [E8, E8, E8, E8, E8, E8, E8, E8];
// goal: s=score, k=collect{c,n}, j=jelly, i=ice, c=crate, d=drop{n}
const LEVELS = [
  { name: '栗子初芽', moves: 25, colors: 4, bg: 'bg-forest', goals: [{ t: 's', n: 2500 }], st: [11100, 25100], lay: L() },
  { name: '松果小径', moves: 25, colors: 4, bg: 'bg-forest', goals: [{ t: 'k', c: 0, n: 20 }], st: [11300, 27100], lay: L() },
  { name: '蘑菇圈', moves: 25, colors: 5, bg: 'bg-forest', goals: [{ t: 'k', c: 1, n: 15 }, { t: 'k', c: 2, n: 15 }], st: [8700, 12600], lay: L() },
  { name: '果冻草坪', moves: 28, colors: 5, bg: 'bg-forest', goals: [{ t: 'j' }], st: [11100, 13900], lay: L(E8, E8, '..jjjj..', '.jjjjjj.', '.jjjjjj.', '..jjjj..', E8, E8) },
  { name: '林间空地', moves: 26, colors: 5, bg: 'bg-forest', goals: [{ t: 's', n: 4500 }], st: [8200, 12100], lay: L('xx....xx', 'x......x', E8, E8, E8, E8, 'x......x', 'xx....xx') },
  { name: '橡果快递', moves: 30, colors: 5, bg: 'bg-garden', goals: [{ t: 'd', n: 2 }], st: [11200, 15400], lay: L('..d..d..', E8, E8, E8, E8, E8, E8, E8) },
  { name: '薄冰花园', moves: 28, colors: 5, bg: 'bg-garden', goals: [{ t: 'i' }], st: [9600, 11400], lay: L(E8, E8, E8, '..iiii..', '..iiii..', E8, E8, E8) },
  { name: '木箱篱笆', moves: 26, colors: 5, bg: 'bg-garden', goals: [{ t: 'c' }], st: [9600, 13900], lay: L(E8, E8, E8, E8, E8, 'cc....cc', 'cc....cc', 'cc....cc') },
  { name: '双层果冻', moves: 34, colors: 5, bg: 'bg-garden', goals: [{ t: 'j' }], st: [12300, 17700], lay: L(E8, '.jj..jj.', '.JJ..JJ.', '.jj..jj.', E8, '..jjjj..', '..jjjj..', E8) },
  { name: '苹果丰收', moves: 28, colors: 6, bg: 'bg-garden', goals: [{ t: 'k', c: 5, n: 24 }, { t: 's', n: 3500 }], st: [6600, 9600], lay: L() },
  { name: '樱花回廊', moves: 32, colors: 5, bg: 'bg-sakura', goals: [{ t: 'j' }], st: [10900, 14000], lay: L('x.jjjj.x', '.jj..jj.', 'jj.xx.jj', 'jj.xx.jj', 'jj....jj', '.jj..jj.', 'x.jjjj.x', E8) },
  { name: '冰封花苞', moves: 34, colors: 5, bg: 'bg-sakura', goals: [{ t: 'i' }], st: [13200, 17000], lay: L(E8, '.i.ii.i.', E8, E8, E8, '.I....I.', '.I....I.', E8) },
  { name: '花瓣运输', moves: 30, colors: 5, bg: 'bg-sakura', goals: [{ t: 'd', n: 3 }, { t: 's', n: 3000 }], st: [13900, 17700], lay: L('.d..d.d.', E8, E8, E8, 'x......x', E8, E8, E8) },
  { name: '箱中秘宝', moves: 22, colors: 5, bg: 'bg-sakura', goals: [{ t: 'c' }], st: [7300, 10000], lay: L(E8, E8, E8, '..CCCC..', '..cccc..', E8, E8, E8) },
  { name: '樱雨迷阵', moves: 36, colors: 6, bg: 'bg-sakura', goals: [{ t: 'j' }, { t: 'k', c: 4, n: 12 }], st: [7100, 9200], lay: L('.j....j.', 'j......j', '..xxxx..', E8, E8, '..xxxx..', 'j......j', '.j....j.') },
  { name: '初雪松林', moves: 30, colors: 5, bg: 'bg-snow', goals: [{ t: 'i' }, { t: 'k', c: 4, n: 15 }], st: [9700, 13900], lay: L(E8, E8, '.iiiiii.', E8, E8, '..iiii..', E8, E8) },
  { name: '雪地木屋', moves: 30, colors: 5, bg: 'bg-snow', goals: [{ t: 'c' }, { t: 'j' }], st: [13400, 16200], lay: L(E8, E8, E8, 'jjjjjjjj', 'c.c..c.c', 'C.c..c.C', 'jjjjjjjj', E8) },
  { name: '冰湖送礼', moves: 32, colors: 5, bg: 'bg-snow', goals: [{ t: 'd', n: 2 }, { t: 'i' }], st: [12600, 15100], lay: L('..d..d..', E8, E8, '.ii..ii.', E8, E8, E8, E8) },
  { name: '霜叶十字', moves: 34, colors: 6, bg: 'bg-snow', goals: [{ t: 's', n: 5500 }], st: [7100, 8800], lay: L('xx....xx', 'xx....xx', E8, E8, E8, E8, 'xx....xx', 'xx....xx') },
  { name: '冰晶城堡', moves: 38, colors: 6, bg: 'bg-snow', goals: [{ t: 'i' }, { t: 'c' }], st: [10400, 12900], lay: L(E8, '.I.II.I.', E8, '..iiii..', E8, 'c.C..C.c', E8, E8) },
  { name: '萤火之夜', moves: 36, colors: 6, bg: 'bg-neon', goals: [{ t: 'j' }], st: [10600, 13100], lay: L(E8, '.jjjjjj.', '.j....j.', '.j.JJ.j.', '.j.JJ.j.', '.j....j.', '.jjjjjj.', E8) },
  { name: '星光货运', moves: 40, colors: 6, bg: 'bg-neon', goals: [{ t: 'd', n: 2 }, { t: 'k', c: 3, n: 18 }], st: [8600, 10200], lay: L('..d..d..', E8, E8, 'x..xx..x', E8, E8, E8, E8) },
  { name: '魔法木箱', moves: 34, colors: 6, bg: 'bg-neon', goals: [{ t: 'c' }, { t: 'i' }], st: [8900, 10800], lay: L(E8, E8, 'CC.CC.CC', E8, '..iiii..', '.iiiiii.', E8, E8) },
  { name: '森林之心', moves: 46, colors: 6, bg: 'bg-neon', goals: [{ t: 'j' }, { t: 'i' }, { t: 's', n: 5500 }], st: [11200, 14100], lay: L('x.jjjj.x', '.jjjjjj.', 'jiijjiij', 'jjjxxjjj', 'jjjxxjjj', 'jiijjiij', '.jjjjjj.', 'x.jjjj.x') },
];

// ================= STATE =================
let cells = [], tiles = [], lv = null, levelIdx = 0, sel = null;
let phase = 'off', ptimer = 0, moves = 0, maxMoves = 0, score = 0, cascade = 0, maxCombo = 0;
let goals = [], stars3 = [1, 2, 3], won = false, lost = false, bonus = false, reported = false;
let swapA = null, swapB = null, swapIsPlayer = false, idleT = 0, hint = null;
let dropsSpawned = 0, specialsCreated = 0, cascadesMax = 0, invalidSwaps = 0, validSwaps = 0;
let effects = [], popup = null, intro = 0, endCard = null, uid = 1, currentSel = null;
let TS = 60, BX = 0, BY = 150;
const store = FX.store('lili-match', { bestLevel: 0, bestScore: 0 });

// ================= INVITE (GAME-INVITE-CONTRACT v0) =================
const INVITE = GameInviteV0.id();
let inviteResult = null;
// ================= SETTINGS / AUDIO =================
let setCache = null, setT = 0;
function settings() {
  const now = performance.now();
  if (!setCache || now - setT > 500) { try { setCache = (JSON.parse(localStorage['lobby-lili-match'] || '{}').settings) || {}; } catch (e) { setCache = {}; } setT = now; }
  return setCache;
}
const sfxOn = () => settings().sound !== false;
const musicOn = () => settings().music !== false;
const AU = { ctx: null, master: null, sfx: null, bgm: null, noise: null, timer: null, next: 0, step: 0 };
function auInit() {
  if (EXT()) return;
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const a = AU.ctx, comp = a.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 4;
  AU.master = a.createGain(); AU.master.gain.value = 0.9; AU.master.connect(comp); comp.connect(a.destination);
  AU.sfx = a.createGain(); AU.sfx.gain.value = 0.55; AU.sfx.connect(AU.master);
  AU.bgm = a.createGain(); AU.bgm.gain.value = 0; AU.bgm.connect(AU.master);
  const b = a.createBuffer(1, a.sampleRate, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = b;
}
function tone(f, o = {}) {
  const a = AU.ctx; if (!a) return;
  const t0 = a.currentTime + (o.t || 0), dur = o.dur || 0.15, vol = o.vol || 0.2;
  const os = a.createOscillator(), g = a.createGain();
  os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t0);
  if (o.slide) os.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.slide), t0 + dur);
  if (o.detune) os.detune.value = o.detune;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + (o.att || 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = os;
  if (o.lp) { const f2 = a.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; os.connect(f2); node = f2; }
  node.connect(g); g.connect(o.dest || AU.sfx); os.start(t0); os.stop(t0 + dur + 0.05);
}
function noise(o = {}) {
  const a = AU.ctx; if (!a) return;
  const t0 = a.currentTime + (o.t || 0), dur = o.dur || 0.1;
  const s = a.createBufferSource(); s.buffer = AU.noise;
  const f = a.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 1200, t0); f.Q.value = o.q || 1;
  if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t0 + dur);
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(o.vol || 0.15, t0 + (o.att || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(o.dest || AU.sfx); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
}
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5, 1568, 1760];
// Local audio wrapper: if the shared game-audio.js module (window.GameAudio) is loaded, route through it;
// otherwise use the built-in WebAudio synth below. Only these three entry points need remapping.
const EXT = () => (window.GameAudio && typeof window.GameAudio.sfx === 'function') ? window.GameAudio : null;
const SFXMAP = { tap: 'tap', button: 'button', swap: 'swap', invalid: 'invalid', match: 'match', create: 'power', line: 'combo', bomb: 'combo', color: 'power', crunch: 'drop', wood: 'drop', drop: 'levelup', shuffle: 'swap', win: 'win', lose: 'lose', star: 'tap' };
function sfx(type, k) {
  if (!sfxOn()) return;
  const ext = EXT();
  if (ext) { const rate = type === 'match' ? 0.9 + Math.min(8, (k || 1) - 1) * 0.1 : type === 'star' ? 1 + (k || 0) * 0.15 : type === 'bomb' ? 0.7 : 1; try { ext.sfx(SFXMAP[type] || 'tap', { rate }); } catch (e) {} return; }
  if (!AU.ctx) return;
  switch (type) {
    case 'tap': tone(1200, { dur: 0.05, vol: 0.12, type: 'triangle', slide: 0.6 }); break;
    case 'button': tone(900, { dur: 0.06, vol: 0.12, type: 'square', lp: 2500 }); break;
    case 'swap': noise({ dur: 0.16, vol: 0.12, f: 600, sweep: 3000, q: 2 }); tone(420, { dur: 0.1, vol: 0.06, slide: 1.6, type: 'triangle' }); break;
    case 'invalid': tone(330, { dur: 0.12, vol: 0.14, type: 'triangle', lp: 1200 }); tone(247, { t: 0.1, dur: 0.16, vol: 0.14, type: 'triangle', lp: 1000 }); break;
    case 'match': { const f = PENTA[Math.min(k - 1, PENTA.length - 1)]; tone(f, { dur: 0.4, vol: 0.22 }); tone(f * 2, { dur: 0.18, vol: 0.06, type: 'triangle' }); tone(f * 4, { dur: 0.05, vol: 0.05 }); break; }
    case 'create': [0, 4, 7, 12].forEach((s, i) => tone(784 * Math.pow(2, s / 12), { t: i * 0.05, dur: 0.18, vol: 0.1, type: 'triangle' })); break;
    case 'line': noise({ dur: 0.3, vol: 0.16, f: 400, sweep: 6000, q: 3 }); tone(300, { dur: 0.25, vol: 0.1, type: 'sawtooth', slide: 3, lp: 3000 }); break;
    case 'bomb': tone(140, { dur: 0.35, vol: 0.35, slide: 0.3 }); noise({ dur: 0.35, vol: 0.25, ft: 'lowpass', f: 1800, sweep: 200 }); break;
    case 'color': [0, 4, 7, 11, 14, 19].forEach((s, i) => tone(523 * Math.pow(2, s / 12), { t: i * 0.04, dur: 0.5, vol: 0.08, type: 'triangle' })); noise({ dur: 0.6, vol: 0.06, ft: 'highpass', f: 5000 }); break;
    case 'crunch': noise({ dur: 0.12, vol: 0.18, f: 2500, q: 0.8 }); noise({ t: 0.04, dur: 0.08, vol: 0.12, f: 4500 }); break;
    case 'wood': noise({ dur: 0.14, vol: 0.2, f: 700, q: 1.5 }); tone(180, { dur: 0.1, vol: 0.12, type: 'triangle', slide: 0.6 }); break;
    case 'drop': [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, { t: i * 0.06, dur: 0.3, vol: 0.1 })); break;
    case 'shuffle': noise({ dur: 0.45, vol: 0.12, f: 300, sweep: 4000, q: 1 }); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(f, { t: i * 0.11, dur: 0.35, vol: 0.16, type: 'triangle' })); [523, 659, 784].forEach(f => tone(f, { t: 0.5, dur: 1.0, vol: 0.1 })); break;
    case 'lose': [392, 349, 311, 262].forEach((f, i) => tone(f, { t: i * 0.16, dur: 0.4, vol: 0.14, type: 'triangle', lp: 1500 })); break;
    case 'star': tone(1568 * (1 + (k || 0) * 0.125), { dur: 0.3, vol: 0.12, type: 'triangle' }); break;
  }
}
// procedural BGM: F - C - Dm - Bb, 92 bpm, eighth-note grid
const CH = [[349.2, 440, 523.3], [261.6, 329.6, 392], [293.7, 349.2, 440], [233.1, 293.7, 349.2]];
const MEL = [698.5, 784, 880, 1046.5, 1174.7, 1396.9];
function rnd(s) { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function bgmTick() {
  const a = AU.ctx; if (!a) return;
  AU.bgm.gain.setTargetAtTime(musicOn() && phase !== 'off' ? 0.5 : 0, a.currentTime, 0.1);
  const E = 60 / 92 / 2;
  while (AU.next < a.currentTime + 0.15) {
    const t = AU.next - a.currentTime, st = AU.step, bar = Math.floor(st / 8) % 4, e = st % 8, ch = CH[bar];
    if (t > -0.05) {
      const o = { dest: AU.bgm };
      if (e === 0) ch.forEach(f => { tone(f, Object.assign({ t, dur: E * 8, vol: 0.035, type: 'triangle', att: 0.4, lp: 1100 }, o)); tone(f, Object.assign({ t, dur: E * 8, vol: 0.025, type: 'triangle', att: 0.5, lp: 900, detune: 8 }, o)); });
      if (e === 0 || e === 4) { tone(ch[0] / 2, Object.assign({ t, dur: E * 3, vol: 0.09, lp: 400 }, o)); tone(110, Object.assign({ t, dur: 0.16, vol: 0.07, slide: 0.4 }, o)); }
      if (e % 2 === 1) noise(Object.assign({ t, dur: 0.05, vol: 0.012, ft: 'highpass', f: 7000 }, o));
      if (rnd(st * 1.7 + Math.floor(st / 32) * 0.3) > 0.5) tone(MEL[Math.floor(rnd(st * 3.1) * MEL.length)], Object.assign({ t, dur: E * 1.6, vol: 0.045, type: 'triangle' }, o));
    }
    AU.next += E; AU.step++;
  }
}
function bgmStart() { const ext = EXT(); if (ext) { try { if (musicOn()) ext.bgm('lili-match'); else ext.stop(); } catch (e) {} return; } if (!AU.ctx) return; if (!AU.timer) { AU.next = AU.ctx.currentTime + 0.05; AU.timer = setInterval(bgmTick, 25); } }
function bgmStop() { const ext = EXT(); if (ext) { try { ext.stop(); } catch (e) {} return; } if (AU.timer) { clearInterval(AU.timer); AU.timer = null; } if (AU.bgm) AU.bgm.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.05); }
document.addEventListener('visibilitychange', () => { if (!AU.ctx) return; if (document.hidden) AU.ctx.suspend(); else AU.ctx.resume(); });

// ================= BOARD HELPERS =================
const inB = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
const playable = (r, c) => inB(r, c) && !cells[r][c].hole;
const isTile = (r, c) => playable(r, c) && cells[r][c].crate === 0;
const movable = (r, c) => { if (!isTile(r, c)) return false; const t = tiles[r][c]; return !!t && cells[r][c].ice === 0 && !t.dying; };
function colorAt(r, c) { if (!playable(r, c)) return -1; const t = tiles[r][c]; return t && t.kind === 'n' && t.color >= 0 && !t.dying ? t.color : -1; }
function mkTile(r, c, color, special = null, kind = 'n') {
  return { id: uid++, r, c, x: c, y: r, vy: 0, color, special, kind, dying: false, dieT: 0, sqT: 9, sqA: 0, tw: null, born: FX.time || 0 };
}
function randColor() { return Math.floor(Math.random() * lv.colors); }

function buildLevel(i) {
  lv = LEVELS[i]; cells = []; tiles = []; dropsSpawned = 0;
  for (let r = 0; r < N; r++) {
    cells.push([]); tiles.push([]);
    for (let c = 0; c < N; c++) {
      const ch = lv.lay[r][c];
      cells[r].push({ hole: ch === 'x', jelly: ch === 'j' ? 1 : ch === 'J' ? 2 : 0, ice: ch === 'i' ? 1 : ch === 'I' ? 2 : 0, crate: ch === 'c' ? 1 : ch === 'C' ? 2 : 0 });
      tiles[r].push(null);
    }
  }
  for (let tries = 0; tries < 50; tries++) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      tiles[r][c] = null;
      if (!isTile(r, c)) continue;
      if (lv.lay[r][c] === 'd') { tiles[r][c] = mkTile(r, c, -1, null, 'drop'); continue; }
      let col, g = 0;
      do { col = randColor(); g++; } while (g < 30 && ((colorAt(r, c - 1) === col && colorAt(r, c - 2) === col) || (colorAt(r - 1, c) === col && colorAt(r - 2, c) === col)));
      tiles[r][c] = mkTile(r, c, col);
    }
    if (findMove()) break;
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = tiles[r][c]; if (t) { t.y = r - N - 1 - (N - r) * 0.3; t.vy = 0; } if (t && t.kind === 'drop') dropsSpawned++; }
  goals = lv.goals.map(g => {
    let need = g.n || 0;
    if (g.t === 'j') need = cells.flat().reduce((a, x) => a + x.jelly, 0);
    if (g.t === 'i') need = cells.flat().reduce((a, x) => a + x.ice, 0);
    if (g.t === 'c') need = cells.flat().reduce((a, x) => a + x.crate, 0);
    return { t: g.t, c: g.c, need, left: need };
  });
  const sg = goals.find(g => g.t === 's');
  const base = sg ? sg.need : lv.moves * 260;
  stars3 = lv.st ? [sg ? sg.need : 1, lv.st[0], lv.st[1]] : [sg ? sg.need : 1, Math.round(base * 1.5 / 100) * 100, Math.round(base * 2.2 / 100) * 100];
}

// ================= MATCH FINDING =================
function findGroups() {
  const runs = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N;) {
    const col = colorAt(r, c); let e = c + 1;
    if (col >= 0) while (e < N && colorAt(r, e) === col) e++;
    if (col >= 0 && e - c >= 3) { const cs = []; for (let k = c; k < e; k++) cs.push([r, k]); runs.push({ h: true, cs }); }
    c = col >= 0 ? e : c + 1;
  }
  for (let c = 0; c < N; c++) for (let r = 0; r < N;) {
    const col = colorAt(r, c); let e = r + 1;
    if (col >= 0) while (e < N && colorAt(e, c) === col) e++;
    if (col >= 0 && e - r >= 3) { const cs = []; for (let k = r; k < e; k++) cs.push([k, c]); runs.push({ h: false, cs }); }
    r = col >= 0 ? e : r + 1;
  }
  // union runs sharing a cell
  const par = runs.map((_, i) => i), f = i => par[i] === i ? i : (par[i] = f(par[i]));
  const owner = {};
  runs.forEach((run, i) => run.cs.forEach(([r, c]) => { const k = r * N + c; if (owner[k] !== undefined) par[f(i)] = f(owner[k]); else owner[k] = i; }));
  const gm = {};
  runs.forEach((run, i) => { const g = f(i); (gm[g] = gm[g] || []).push(run); });
  return Object.values(gm).map(rs => {
    const set = new Map(); rs.forEach(run => run.cs.forEach(([r, c]) => set.set(r * N + c, [r, c])));
    return { runs: rs, cells: [...set.values()] };
  });
}
function wouldMatchAt(r, c) {
  const col = colorAt(r, c); if (col < 0) return false;
  let h = 1, k = c - 1; while (colorAt(r, k) === col) { h++; k--; } k = c + 1; while (colorAt(r, k) === col) { h++; k++; }
  let v = 1; k = r - 1; while (colorAt(k, c) === col) { v++; k--; } k = r + 1; while (colorAt(k, c) === col) { v++; k++; }
  return h >= 3 || v >= 3;
}
function rawSwap(r1, c1, r2, c2) { const t = tiles[r1][c1]; tiles[r1][c1] = tiles[r2][c2]; tiles[r2][c2] = t; if (tiles[r1][c1]) { tiles[r1][c1].r = r1; tiles[r1][c1].c = c1; } if (tiles[r2][c2]) { tiles[r2][c2].r = r2; tiles[r2][c2].c = c2; } }
function isComboSwap(a, b) {
  if (!a || !b) return false;
  if (a.special === 'color' || b.special === 'color') return a.kind === 'n' && b.kind === 'n';
  return !!(a.special && b.special);
}
function swapValid(r1, c1, r2, c2) {
  if (!movable(r1, c1) || !movable(r2, c2)) return false;
  if (isComboSwap(tiles[r1][c1], tiles[r2][c2])) return true;
  rawSwap(r1, c1, r2, c2);
  const ok = wouldMatchAt(r1, c1) || wouldMatchAt(r2, c2);
  rawSwap(r1, c1, r2, c2);
  return ok;
}
function findMove(all) {
  const out = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (c + 1 < N && swapValid(r, c, r, c + 1)) { if (!all) return [r, c, r, c + 1]; out.push([r, c, r, c + 1]); }
    if (r + 1 < N && swapValid(r, c, r + 1, c)) { if (!all) return [r, c, r + 1, c]; out.push([r, c, r + 1, c]); }
  }
  return all ? out : null;
}

// ================= RESOLUTION =================
let step = null; // per-resolve scratch
function newStep() { return { clear: [], fire: [], crateHit: new Set(), iceHit: new Set(), gained: 0 }; }
function goalDec(t, c, n = 1) { goals.forEach(g => { if (g.t === t && (c === undefined || g.c === c) && g.left > 0) g.left = Math.max(0, g.left - n); }); }
function addScore(n, x, y, big) { score += n; step && (step.gained += n); if (x !== undefined && n >= 100) FX.text(x, y, '+' + n, { color: big ? '#ffe36b' : '#fff', size: big ? 26 : 18, crit: big }); }
function cpos(r, c) { return { x: BX + (c + 0.5) * TS, y: BY + (r + 0.5) * TS }; }
function damageCrate(r, c) {
  const k = r * N + c; if (step.crateHit.has(k)) return; step.crateHit.add(k);
  const cl = cells[r][c]; cl.crate--; goalDec('c');
  const p = cpos(r, c); FX.burst(p.x, p.y, { n: 12, speed: 160, life: 0.5, size: 4, color: '#b07a3e', gravity: 400 }); sfx('wood'); addScore(50);
}
function hit(r, c, adj) {
  if (!playable(r, c)) return;
  const cl = cells[r][c];
  if (cl.crate > 0) { damageCrate(r, c); return; }
  const t = tiles[r][c]; if (!t || t.dying) return;
  if (cl.ice > 0) {
    const k = r * N + c; if (step.iceHit.has(k)) return; step.iceHit.add(k);
    cl.ice--; goalDec('i'); const p = cpos(r, c);
    FX.burst(p.x, p.y, { n: 14, speed: 180, life: 0.5, size: 4, color: '#cfefff', glow: true, gravity: 300 }); sfx('crunch'); addScore(40);
    return;
  }
  if (t.kind === 'drop') return;
  t.dying = true; t.dieT = 0; step.clear.push(t);
  if (cl.jelly > 0) { cl.jelly--; goalDec('j'); addScore(50); const p = cpos(r, c); FX.burst(p.x, p.y, { n: 8, speed: 120, life: 0.45, size: 5, color: '#ff8fc8', glow: true }); }
  if (t.color >= 0) goalDec('k', t.color);
  addScore(Math.round(30 * Math.min(2.5, 1 + 0.25 * (Math.max(1, cascade) - 1))));
  if (t.special) step.fire.push(t);
  if (adj) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { if (playable(r + dr, c + dc) && cells[r + dr][c + dc].crate > 0) damageCrate(r + dr, c + dc); });
}
function mostColor() { const cnt = Array(6).fill(0); tiles.flat().forEach(t => { if (t && !t.dying && t.kind === 'n' && t.color >= 0) cnt[t.color]++; }); return cnt.indexOf(Math.max(...cnt)); }
function fire(t) {
  const { r, c } = t, p = cpos(r, c);
  if (t.special === 'row') { effects.push({ k: 'beam', h: true, r, life: 0.35, t: 0 }); sfx('line'); FX.shake(4); for (let k = 0; k < N; k++) hit(r, k); }
  else if (t.special === 'col') { effects.push({ k: 'beam', h: false, c, life: 0.35, t: 0 }); sfx('line'); FX.shake(4); for (let k = 0; k < N; k++) hit(k, c); }
  else if (t.special === 'bomb') {
    const R = t.big || 1; sfx('bomb'); FX.shake(6 + R * 3); FX.ring(p.x, p.y, { r: TS * (R + 1) * 1.2, life: 0.45, color: '#ffd36b' });
    effects.push({ k: 'wave', x: p.x, y: p.y, R: TS * (R + 1.2), life: 0.4, t: 0 });
    FX.burst(p.x, p.y, { n: 26, speed: 260, life: 0.6, size: 5, color: '#ffb43c', glow: true });
    for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) hit(r + dr, c + dc);
  } else if (t.special === 'color') {
    const col = t.target !== undefined ? t.target : mostColor(); sfx('color'); FX.shake(8);
    for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) if (colorAt(rr, cc) === col || (tiles[rr][cc] && tiles[rr][cc].color === col && cells[rr][cc].ice > 0)) { effects.push({ k: 'bolt', x0: p.x, y0: p.y, x1: cpos(rr, cc).x, y1: cpos(rr, cc).y, life: 0.4, t: 0, seed: Math.random() * 99 }); hit(rr, cc); }
  }
}
function drainFire() { let guard = 0; while (step.fire.length && guard++ < 200) { const t = step.fire.shift(); if (!t.fired) { t.fired = true; fire(t); } } }
function showPopup(text, color) { popup = { text, t: 0, color: color || '#fff' }; }

function resolveGroups(groups, pref) {
  cascade++; cascadesMax = Math.max(cascadesMax, cascade); maxCombo = Math.max(maxCombo, cascade);
  step = newStep();
  sfx('match', cascade);
  const creates = [];
  groups.forEach(g => {
    const maxH = Math.max(0, ...g.runs.filter(x => x.h).map(x => x.cs.length));
    const maxV = Math.max(0, ...g.runs.filter(x => !x.h).map(x => x.cs.length));
    let sp = null;
    if (maxH >= 5 || maxV >= 5) sp = 'color';
    else if (maxH >= 3 && maxV >= 3) sp = 'bomb';
    else if (maxH === 4) sp = 'row';
    else if (maxV === 4) sp = 'col';
    let pos = null;
    if (sp) {
      const ok = ([r, c]) => cells[r][c].ice === 0;
      if (pref) pos = pref.find(([r, c]) => g.cells.some(([a, b]) => a === r && b === c) && ok([r, c]));
      if (!pos && sp === 'bomb') { const hs = new Set(g.runs.filter(x => x.h).flatMap(x => x.cs.map(([r, c]) => r * N + c))); pos = g.runs.filter(x => !x.h).flatMap(x => x.cs).find(([r, c]) => hs.has(r * N + c) && ok([r, c])); }
      if (!pos) { const lr = g.runs.reduce((a, b) => b.cs.length > a.cs.length ? b : a); pos = lr.cs[Math.floor(lr.cs.length / 2)]; if (!ok(pos)) pos = g.cells.find(ok); }
    }
    const col = tiles[g.cells[0][0]][g.cells[0][1]].color;
    g.cells.forEach(([r, c]) => { if (pos && pos[0] === r && pos[1] === c) { const t = tiles[r][c]; if (t.special) step.fire.push(t); return; } hit(r, c, true); });
    if (pos) creates.push({ r: pos[0], c: pos[1], sp, col });
    const p = cpos(g.cells[0][0], g.cells[0][1]);
    g.cells.forEach(([r, c]) => { const q = cpos(r, c); FX.burst(q.x, q.y, { n: 7, speed: 140, life: 0.45, size: 4, color: PCOL[col] || '#fff', glow: true, gravity: 200 }); });
  });
  drainFire();
  creates.forEach(cr => {
    let t = tiles[cr.r][cr.c];
    if (!t) return;
    if (t.dying) { t.dying = false; step.clear = step.clear.filter(x => x !== t); t.fired = false; }
    t.special = cr.sp; if (cr.sp === 'color') t.color = -1; else t.color = cr.col;
    t.sqT = 0; t.sqA = 1.4; specialsCreated++; sfx('create');
    const p = cpos(cr.r, cr.c); FX.ring(p.x, p.y, { r: TS * 0.9, life: 0.4, color: '#fff6c0' }); addScore(cr.sp === 'color' ? 250 : cr.sp === 'bomb' ? 150 : 100, p.x, p.y, true);
  });
  if (cascade >= 2) showPopup(WORDS[Math.min(cascade, 6)], cascade >= 4 ? '#ffd84a' : '#fff');
  if (cascade >= 4) FX.shake(3 + cascade);
  if (step.gained > 0) { const p = cpos(groups[0].cells[0][0], groups[0].cells[0][1]); FX.text(p.x, p.y - 10, '+' + step.gained, { color: cascade >= 3 ? '#ffe36b' : '#fff', size: 20 + Math.min(cascade, 5) * 3, crit: cascade >= 3 }); }
  setPhase('clear');
}
function resolveCombo(a, b) {
  cascade = 1; step = newStep();
  const tgt = b, src = a; // b is at destination
  const r = tgt.r, c = tgt.c, p = cpos(r, c);
  FX.hitstop(0.05); validSwaps++;
  const sp = [a.special, b.special];
  if (sp[0] === 'color' && sp[1] === 'color') {
    showPopup('全屏清除!', '#ffd84a'); sfx('color'); FX.shake(14); FX.flash('#fff', 0.6);
    a.fired = b.fired = true; hit(a.r, a.c); hit(b.r, b.c);
    for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) hit(rr, cc);
  } else if (sp.includes('color')) {
    const cb = a.special === 'color' ? a : b, other = cb === a ? b : a;
    cb.fired = true; hit(cb.r, cb.c);
    const col = other.color;
    if (!other.special) { cb.target = col; cb.fired = false; step.clear = step.clear.filter(x => x !== cb); cb.dying = false; fire(cb); cb.fired = true; cb.dying = true; step.clear.push(cb); hit(other.r, other.c); showPopup('彩虹!', '#c9a6ff'); }
    else {
      showPopup('彩虹连爆!', '#ffd84a'); sfx('color');
      const kind = other.special;
      for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) { const t = tiles[rr][cc]; if (t && t.kind === 'n' && t.color === col && !t.dying) { t.special = kind === 'bomb' ? 'bomb' : (Math.random() < 0.5 ? 'row' : 'col'); effects.push({ k: 'bolt', x0: cpos(cb.r, cb.c).x, y0: cpos(cb.r, cb.c).y, x1: cpos(rr, cc).x, y1: cpos(rr, cc).y, life: 0.45, t: 0, seed: Math.random() * 99 }); } }
      for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) { const t = tiles[rr][cc]; if (t && t.kind === 'n' && t.color === col) hit(rr, cc); }
    }
  } else {
    a.fired = b.fired = true; hit(a.r, a.c); hit(b.r, b.c);
    const lines = s => s === 'row' || s === 'col';
    if (lines(sp[0]) && lines(sp[1])) { showPopup('十字斩!', '#9ff'); fire({ r, c, special: 'row' }); fire({ r, c, special: 'col' }); }
    else if (sp[0] === 'bomb' && sp[1] === 'bomb') { showPopup('超级爆炸!', '#ffb43c'); fire({ r, c, special: 'bomb', big: 2 }); }
    else { showPopup('巨型十字!', '#ffd84a'); for (let d = -1; d <= 1; d++) { fire({ r: r + d, c, special: 'row' }); fire({ r, c: c + d, special: 'col' }); } }
  }
  drainFire();
  if (step.gained > 0) FX.text(p.x, p.y - 10, '+' + step.gained, { color: '#ffe36b', size: 30, crit: true });
  setPhase('clear');
}
function removeDead() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = tiles[r][c]; if (t && t.dying) tiles[r][c] = null; }
}
function spawnTile(r, c, stackY) {
  let t;
  const onBoard = tiles.flat().filter(x => x && x.kind === 'drop').length;
  const dg = goals.find(g => g.t === 'd');
  if (dg && dropsSpawned < dg.need && onBoard < 2 && (onBoard === 0 || Math.random() < 0.12) && (onBoard + (dg.need - dg.left)) < dg.need) { t = mkTile(r, c, -1, null, 'drop'); dropsSpawned++; }
  else t = mkTile(r, c, randColor());
  t.y = stackY; t.vy = 2;
  tiles[r][c] = t;
}
function gravity() {
  const stack = Array(N).fill(0);
  for (let guard = 0; guard < 200; guard++) {
    let moved = false;
    for (let c = 0; c < N; c++) for (let r = N - 1; r >= 0; r--) {
      if (!isTile(r, c) || tiles[r][c]) continue;
      let rr = r - 1, src = -1, blocked = false;
      while (rr >= 0) {
        const cl = cells[rr][c];
        if (cl.hole) { rr--; continue; }
        if (cl.crate > 0) { blocked = true; break; }
        if (tiles[rr][c]) { if (cl.ice > 0) blocked = true; else src = rr; break; }
        rr--;
      }
      if (src >= 0) { const t = tiles[src][c]; tiles[src][c] = null; tiles[r][c] = t; t.r = r; moved = true; }
      else if (!blocked) { let top = 0; while (top < N && cells[top][c].hole) top++; spawnTile(r, c, top - 1 - stack[c]++); moved = true; }
    }
    if (moved) continue;
    // diagonal slide into blocked gaps
    let slid = false;
    for (let r = N - 1; r >= 1 && !slid; r--) for (let c = 0; c < N && !slid; c++) {
      if (!isTile(r, c) || tiles[r][c]) continue;
      for (const dc of [-1, 1]) { const sc = c + dc; if (movable(r - 1, sc)) { const t = tiles[r - 1][sc]; tiles[r - 1][sc] = null; tiles[r][c] = t; t.r = r; t.c = c; slid = true; break; } }
    }
    if (!slid) break;
  }
}
function bottomRow(c) { for (let r = N - 1; r >= 0; r--) if (!cells[r][c].hole) return r; return -1; }
function collectDrops() {
  let any = false;
  for (let c = 0; c < N; c++) { const r = bottomRow(c); const t = r >= 0 && tiles[r][c]; if (t && t.kind === 'drop') { tiles[r][c] = null; goalDec('d'); const p = cpos(r, c); FX.burst(p.x, p.y, { n: 24, speed: 220, life: 0.7, size: 5, color: '#ffd84a', glow: true }); FX.ring(p.x, p.y, { r: TS, life: 0.5, color: '#ffd84a' }); FX.text(p.x, p.y - 20, '+500', { color: '#ffe36b', size: 24, crit: true }); score += 500; sfx('drop'); any = true; } }
  return any;
}
function goalsMet() { if (DEBUG && window.__m3hold) return false; return goals.every(g => g.t === 's' ? score >= g.need : g.left <= 0); }
function settled() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = tiles[r][c]; if (t && (t.tw || t.y !== r || t.x !== c || t.dying)) return false; }
  return true;
}
function shuffle() {
  const pos = [], list = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (movable(r, c) && tiles[r][c].kind === 'n' && !tiles[r][c].special) { pos.push([r, c]); list.push(tiles[r][c]); }
  for (let tries = 0; tries < 300; tries++) {
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    if (tries > 150) list.forEach(t => t.color = randColor());
    pos.forEach(([r, c], i) => { tiles[r][c] = list[i]; });
    if (!findGroups().length && findMove()) break;
  }
  pos.forEach(([r, c], i) => { const t = list[i]; t.tw = { x0: t.x, y0: t.y, d: 0.45, t: 0, ease: 'io' }; t.r = r; t.c = c; });
  sfx('shuffle'); showPopup('洗牌', '#bfe9ff');
  setPhase('shuffle');
}
function setPhase(p) { phase = p; ptimer = 0; }
function onSettled() {
  if (collectDrops()) { gravity(); setPhase('fall'); return; }
  const g = findGroups();
  if (g.length) { resolveGroups(g, null); return; }
  if (bonus) { bonusStep(); return; }
  cascade = 0;
  if (goalsMet()) { won = true; startBonus(); return; }
  if (moves <= 0) { lost = true; endLevel(false); return; }
  if (!findMove()) { shuffle(); return; }
  setPhase('idle'); idleT = 0;
}
let movesLeftAtWin = 0;
function startBonus() { movesLeftAtWin = moves; bonus = true; showPopup('奖励时间!', '#ffd84a'); sfx('win'); setPhase('bonus'); }
function bonusStep() {
  // convert one remaining move into a line special; once moves are spent, fire every special on board
  const cand = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = tiles[r][c]; if (t && movable(r, c) && t.kind === 'n' && !t.special) cand.push(t); }
  if (moves > 0 && cand.length) {
    moves--; const t = cand[Math.floor(Math.random() * cand.length)]; t.special = Math.random() < 0.5 ? 'row' : 'col'; t.sqT = 0; t.sqA = 1.2;
    const p = cpos(t.r, t.c); FX.ring(p.x, p.y, { r: TS * 0.8, life: 0.3, color: '#fff' }); sfx('star', moves % 8); addScore(100, p.x, p.y, true);
    setPhase('bonus'); return;
  }
  const sp = tiles.flat().filter(t => t && t.special && !t.dying);
  if (sp.length) { cascade = 1; step = newStep(); sp.forEach(t => hit(t.r, t.c)); drainFire(); setPhase('clear'); return; }
  bonus = false; endLevel(true);
}
function endLevel(win) {
  setPhase('end'); bgmStop();
  const st = win ? Math.max(1, stars3.filter(s => score >= s).length) : 0;
  endCard = { win, stars: st, t: 0 };
  sfx(win ? 'win' : 'lose');
  if (!GameInviteV0.active()) {
    if (win) { if (levelIdx + 1 > store.bestLevel) store.bestLevel = levelIdx + 1; }
    if (score > store.bestScore) store.bestScore = score;
    store.save();
  }
}
function report() {
  if (reported || !endCard) return; reported = true;
  const win = endCard.win;
  if (GameInviteV0.active()) {
    FX.running=false; GameInviteV0.finish(score); inviteResult=GameInviteV0.preview(); return;
  }
  Lobby.reportResult({ stage: levelIdx, stars: endCard.stars, coins: win ? Math.floor(score / 40) + endCard.stars * 20 : Math.floor(score / 120), gems: win ? endCard.stars * 2 : 0, win, score, combo: maxCombo, level: levelIdx + 1 });
}

// ================= SWAP =================
function trySwap(r1, c1, r2, c2, player) {
  if (phase !== 'idle' || Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false;
  if (!movable(r1, c1) || !movable(r2, c2)) { if (isTile(r1, c1) && tiles[r1][c1]) { tiles[r1][c1].sqT = 0; tiles[r1][c1].sqA = 0.6; sfx('invalid'); } return false; }
  sel = null; hint = null; idleT = 0;
  const a = tiles[r1][c1], b = tiles[r2][c2];
  rawSwap(r1, c1, r2, c2);
  a.tw = { x0: c1, y0: r1, d: 0.16, t: 0, ease: 'io' }; b.tw = { x0: c2, y0: r2, d: 0.16, t: 0, ease: 'io' };
  swapA = a; swapB = b; swapIsPlayer = !!player;
  sfx('swap'); setPhase('swap');
  return true;
}
function afterSwap() {
  const a = swapA, b = swapB; // a now at (r2,c2), b at (r1,c1)
  if (isComboSwap(a, b)) { moves--; resolveCombo(b, a); return; }
  const g = findGroups();
  if (!g.length) {
    rawSwap(a.r, a.c, b.r, b.c);
    a.tw = { x0: a.x, y0: a.y, d: 0.24, t: 0, ease: 'back' }; b.tw = { x0: b.x, y0: b.y, d: 0.24, t: 0, ease: 'back' };
    a.sqT = b.sqT = 0; a.sqA = b.sqA = 0.7;
    invalidSwaps++; sfx('invalid'); setPhase('revert'); return;
  }
  moves--; validSwaps++; cascade = 0;
  resolveGroups(g, [[a.r, a.c], [b.r, b.c]]);
  // swapped specials that were part of a match fire via hit(); nothing else to do
}

// ================= UPDATE =================
const ease = { io: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, back: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); } };
function update(dt) {
  if (phase === 'off') return;
  ptimer += dt; if (intro > 0) intro -= dt;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const t = tiles[r][c]; if (!t) continue;
    t.sqT += dt;
    if (t.dying) { t.dieT += dt; continue; }
    if (t.tw) {
      t.tw.t += dt; const k = Math.min(1, t.tw.t / t.tw.d), e = ease[t.tw.ease](k);
      t.x = t.tw.x0 + (c - t.tw.x0) * e; t.y = t.tw.y0 + (r - t.tw.y0) * e;
      if (k >= 1) { t.tw = null; t.x = c; t.y = r; }
      continue;
    }
    if (t.x !== c) { const d = c - t.x, s = 9 * dt; t.x = Math.abs(d) <= s ? c : t.x + Math.sign(d) * s; }
    if (t.y < r) { t.vy = Math.min(t.vy + 70 * dt, 22); t.y += t.vy * dt; if (t.y >= r) { t.y = r; if (t.vy > 4) { t.sqT = 0; t.sqA = Math.min(1, t.vy / 16); } t.vy = 0; } }
    else if (t.y > r) t.y = r;
  }
  switch (phase) {
    case 'swap': if (!swapA.tw && !swapB.tw) afterSwap(); break;
    case 'revert': if (!swapA.tw && !swapB.tw) { setPhase('idle'); } break;
    case 'clear': if (ptimer > 0.26) { removeDead(); gravity(); setPhase('fall'); } break;
    case 'fall': case 'shuffle': if (ptimer > 0.05 && settled()) onSettled(); break;
    case 'bonus': if (ptimer > 0.18 && settled()) onSettled(); break;
    case 'idle': idleT += dt; if (idleT > 5 && !hint) hint = findMove(); break;
    case 'end': endCard.t += dt; if (endCard.win && endCard.t > 0.5) { const s = Math.min(endCard.stars, Math.floor((endCard.t - 0.5) / 0.3) + 1); if (s > (endCard.shown || 0)) { endCard.shown = s; sfx('star', s); } } if (endCard.t > 2.2) report(); break;
  }
  for (let i = effects.length - 1; i >= 0; i--) { effects[i].t += dt; if (effects[i].t >= effects[i].life) effects.splice(i, 1); }
  if (popup) { popup.t += dt; if (popup.t > 1.1) popup = null; }
  updateHUD();
}

// ================= INPUT =================
let down = null;
function toBoard(e) {
  const R = cv.getBoundingClientRect(); const x = (e.clientX - R.left) / R.width * FX.W, y = (e.clientY - R.top) / R.height * FX.H;
  return { x, y, c: Math.floor((x - BX) / TS), r: Math.floor((y - BY) / TS) };
}
cv.addEventListener('pointerdown', e => {
  e.stopPropagation(); auInit(); if (phase !== 'off') bgmStart();
  if (phase !== 'idle') return;
  const p = toBoard(e);
  if (!inB(p.r, p.c) || !isTile(p.r, p.c) || !tiles[p.r][p.c]) { sel = null; return; }
  if (sel && Math.abs(sel.r - p.r) + Math.abs(sel.c - p.c) === 1) { const s = sel; sel = null; trySwap(s.r, s.c, p.r, p.c, true); return; }
  down = { x: p.x, y: p.y, r: p.r, c: p.c, id: e.pointerId };
  if (sel && sel.r === p.r && sel.c === p.c) { down.wasSel = true; }
  sel = { r: p.r, c: p.c }; sfx('tap');
});
window.addEventListener('pointermove', e => {
  if (!down || e.pointerId !== down.id || phase !== 'idle') return;
  const p = toBoard(e), dx = p.x - down.x, dy = p.y - down.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > TS * 0.3) {
    const [dr, dc] = Math.abs(dx) > Math.abs(dy) ? [0, Math.sign(dx)] : [Math.sign(dy), 0];
    const d = down; down = null; sel = null; trySwap(d.r, d.c, d.r + dr, d.c + dc, true);
  }
});
window.addEventListener('pointerup', e => { if (down && e.pointerId === down.id) { if (down.wasSel) sel = null; down = null; } });
window.addEventListener('pointercancel', () => { down = null; });

// ================= HUD (DOM) =================
let hudKey = '';
function goalIcon(g) {
  if (g.t === 'k') return `<img src="../assets/${IMGS[g.c]}.webp" style="width:26px;height:26px;object-fit:contain">`;
  return `<span style="font-size:20px;line-height:26px">${{ s: '⭐', j: '🍮', i: '🧊', c: '📦', d: '🌰' }[g.t]}</span>`;
}
function updateHUD() {
  if (phase === 'off') return;
  const sMax = stars3[2], pct = Math.min(1, score / sMax);
  const key = [levelIdx, moves, score, goals.map(g => g.left).join(',')].join('|');
  if (key === hudKey) return; hudKey = key;
  const chip = g => { const done = g.t === 's' ? score >= g.need : g.left <= 0; const v = g.t === 's' ? Math.max(0, g.need - score) : g.left; return `<div style="display:flex;flex-direction:column;align-items:center;min-width:40px;position:relative">${goalIcon(g)}<b style="font-size:13px;color:${done ? '#7dff9a' : '#fff'};text-shadow:0 1px 2px #000">${done ? '✓' : v}</b></div>`; };
  const ticks = stars3.map((s, i) => `<span style="position:absolute;left:${Math.min(97, s / sMax * 100)}%;top:-7px;transform:translateX(-50%);font-size:12px;filter:${score >= s ? 'none' : 'grayscale(1) brightness(.7)'}">⭐</span>`).join('');
  const card = 'background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,.08));border:1px solid rgba(255,255,255,.35);border-radius:14px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 4px 14px rgba(0,0,0,.25)';
  FX.hud(`<div id="m3hud" style="flex:1;min-width:0;display:flex;gap:6px;align-items:stretch;color:#fff;font-family:system-ui,sans-serif;pointer-events:none">
    <div style="${card};padding:4px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:44px"><span style="font-size:10px;opacity:.85">第</span><b style="font-size:18px;line-height:1">${levelIdx + 1}</b><span style="font-size:10px;opacity:.85">关</span></div>
    <div style="${card};padding:4px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:56px;${moves <= 5 ? 'border-color:#ff8a7a' : ''}"><span style="font-size:14px">👣</span><b style="font-size:24px;line-height:1;color:${moves <= 5 ? '#ffb0a0' : '#fff'}">${moves}</b></div>
    <div style="${card};flex:1;padding:5px 8px;display:flex;flex-direction:column;gap:6px"><div style="display:flex;gap:6px;justify-content:space-around">${goals.map(chip).join('')}</div>
    <div style="position:relative;height:7px;border-radius:4px;background:rgba(0,0,0,.35);margin:2px 4px 0"><div style="height:100%;width:${pct * 100}%;border-radius:4px;background:linear-gradient(90deg,#ffd34d,#ff8a3d)"></div>${ticks}</div>
    <div style="font-size:11px;text-align:right;opacity:.9">${score}</div></div></div>`);
}

// ================= DRAW =================
const spr = {}; let sprTS = 0;
function sprite(i) {
  if (sprTS !== TS) { for (const k in spr) delete spr[k]; sprTS = TS; }
  if (spr[i]) return spr[i];
  const img = FX.img(IMGS[i]); if (!img || !img.naturalWidth) return null;
  const s = Math.ceil(TS * 1.1), c = document.createElement('canvas'); c.width = c.height = s * 2;
  const g = c.getContext('2d'); g.scale(2, 2); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = TS * 0.08; g.shadowOffsetY = TS * 0.05;
  const d = TS * 0.9; g.drawImage(img, (s - d) / 2, (s - d) / 2 - TS * 0.02, d, d);
  return (spr[i] = c);
}
function layout() {
  const HUD = 118, BOT = 40, pad = 10;
  const avW = FX.W - pad * 2, avH = Math.max(240, FX.H - HUD - BOT);
  TS = Math.floor(Math.min(avW / N, avH / N));
  BX = (FX.W - TS * N) / 2; BY = HUD + Math.max(0, (avH - TS * N) / 2) * 0.8;
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function drawBG() {
  const img = lv && FX.img(lv.bg);
  ctx.fillStyle = '#1d2a1a'; ctx.fillRect(0, 0, FX.W, FX.H);
  if (img && img.naturalWidth) { const s = Math.max(FX.W / img.naturalWidth, FX.H / img.naturalHeight); const w = img.naturalWidth * s, h = img.naturalHeight * s; ctx.drawImage(img, (FX.W - w) / 2, (FX.H - h) / 2, w, h); }
  const g = ctx.createLinearGradient(0, 0, 0, FX.H); g.addColorStop(0, 'rgba(10,20,30,.45)'); g.addColorStop(0.25, 'rgba(10,20,30,.15)'); g.addColorStop(1, 'rgba(10,20,15,.5)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, FX.W, FX.H);
  FX.motes(ctx, '#fff4c8');
}
function drawBoard() {
  // frame as union of playable cells
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#6b4a2a';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (playable(r, c)) { rr(BX + c * TS - 6, BY + r * TS - 6, TS + 12, TS + 12, 12); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#8a6238';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (playable(r, c)) { rr(BX + c * TS - 3, BY + r * TS - 3, TS + 6, TS + 6, 10); ctx.fill(); }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!playable(r, c)) continue;
    const x = BX + c * TS, y = BY + r * TS, cl = cells[r][c];
    ctx.fillStyle = (r + c) % 2 ? 'rgba(255,240,205,.82)' : 'rgba(244,224,184,.82)'; ctx.fillRect(x, y, TS, TS);
    if (cl.jelly) {
      ctx.fillStyle = cl.jelly > 1 ? 'rgba(236,80,160,.62)' : 'rgba(255,130,190,.45)'; rr(x + 2, y + 2, TS - 4, TS - 4, TS * 0.18); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(x + 6, y + 5, TS * 0.5, TS * 0.16, TS * 0.08); ctx.fill();
      if (cl.jelly > 1) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; rr(x + 5, y + 5, TS - 10, TS - 10, TS * 0.15); ctx.stroke(); }
    }
  }
}
function drawCrate(x, y, hp) {
  const p = TS * 0.06, w = TS - p * 2;
  const g = ctx.createLinearGradient(x, y, x, y + TS); g.addColorStop(0, '#c98d4e'); g.addColorStop(1, '#8a5527');
  ctx.fillStyle = g; rr(x + p, y + p, w, w, TS * 0.1); ctx.fill();
  ctx.strokeStyle = '#5a3415'; ctx.lineWidth = TS * 0.05; ctx.stroke();
  ctx.strokeStyle = 'rgba(90,52,21,.55)'; ctx.lineWidth = TS * 0.03;
  for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + p, y + p + w * k / 3); ctx.lineTo(x + p + w, y + p + w * k / 3); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x + p * 2, y + p * 2); ctx.lineTo(x + TS - p * 2, y + TS - p * 2); ctx.lineWidth = TS * 0.07; ctx.strokeStyle = '#7a4a20'; ctx.stroke();
  if (hp > 1) { ctx.fillStyle = '#9aa7b4'; ctx.fillRect(x + p, y + TS * 0.18, w, TS * 0.08); ctx.fillRect(x + p, y + TS * 0.74, w, TS * 0.08); ctx.fillStyle = '#e8eef4'; [0.25, 0.75].forEach(f => { ctx.beginPath(); ctx.arc(x + TS * f, y + TS * 0.22, TS * 0.03, 0, 7); ctx.arc(x + TS * f, y + TS * 0.78, TS * 0.03, 0, 7); ctx.fill(); }); }
}
function drawIce(x, y, hp) {
  const g = ctx.createLinearGradient(x, y, x + TS, y + TS); g.addColorStop(0, 'rgba(225,248,255,.78)'); g.addColorStop(1, 'rgba(150,210,245,.6)');
  ctx.fillStyle = g; rr(x + 2, y + 2, TS - 4, TS - 4, TS * 0.14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.beginPath(); ctx.moveTo(x + TS * 0.15, y + TS * 0.2); ctx.lineTo(x + TS * 0.45, y + TS * 0.12); ctx.lineTo(x + TS * 0.2, y + TS * 0.4); ctx.fill();
  if (hp < 2) return;
  ctx.strokeStyle = 'rgba(120,180,220,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + TS * 0.5, y + TS * 0.5); ctx.lineTo(x + TS * 0.8, y + TS * 0.3); ctx.moveTo(x + TS * 0.5, y + TS * 0.5); ctx.lineTo(x + TS * 0.35, y + TS * 0.85); ctx.moveTo(x + TS * 0.5, y + TS * 0.5); ctx.lineTo(x + TS * 0.85, y + TS * 0.75); ctx.stroke();
}
function drawColorBomb(s) {
  const R = TS * 0.38, t = FX.time;
  ctx.save(); ctx.shadowColor = 'rgba(200,150,255,.9)'; ctx.shadowBlur = TS * 0.25;
  const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#6a4ab8'); g.addColorStop(1, '#241540');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.restore();
  for (let i = 0; i < 6; i++) { const a = t * 2 + i * Math.PI / 3; ctx.fillStyle = `hsl(${i * 60 + t * 90},95%,62%)`; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, R * 0.2, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(-R * 0.35, -R * 0.4, R * 0.16, 0, 7); ctx.fill();
}
function drawTile(t) {
  const r = t.r, c = t.c; const cx = BX + (t.x + 0.5) * TS, cy = BY + (t.y + 0.5) * TS;
  if (cy < BY - TS * 0.5) return;
  let sx = 1, sy = 1, rot = 0, alpha = 1, flash = 0;
  if (t.sqT < 0.35) { const d = t.sqT / 0.35, s = Math.sin(d * Math.PI * 2) * (1 - d) * 0.22 * t.sqA; sy = 1 - s; sx = 1 + s * 0.8; }
  if (t.dying) { const d = Math.min(1, t.dieT / 0.26); const s = d < 0.3 ? 1 + 0.25 * d / 0.3 : 1.25 * (1 - (d - 0.3) / 0.7); sx *= s; sy *= s; alpha = 1 - Math.max(0, d - 0.4) / 0.6; flash = 1 - d; }
  if (sel && sel.r === r && sel.c === c && phase === 'idle') { const b = 1.08 + Math.sin(FX.time * 10) * 0.04; sx *= b; sy *= b; }
  if (hint && ((hint[0] === r && hint[1] === c) || (hint[2] === r && hint[3] === c))) { rot = Math.sin(FX.time * 14) * 0.12; const b = 1 + Math.abs(Math.sin(FX.time * 4)) * 0.08; sx *= b; sy *= b; }
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy + (1 - sy) * TS * 0.35); ctx.rotate(rot); ctx.scale(sx, sy);
  if (sel && sel.r === r && sel.c === c) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.shadowColor = '#fff6a0'; ctx.shadowBlur = 12; rr(-TS * 0.46, -TS * 0.46, TS * 0.92, TS * 0.92, TS * 0.2); ctx.stroke(); ctx.shadowBlur = 0; }
  if (t.special === 'bomb') { const pr = 0.5 + 0.06 * Math.sin(FX.time * 6); const g = ctx.createRadialGradient(0, 0, TS * 0.1, 0, 0, TS * pr); g.addColorStop(0, 'rgba(255,220,120,.9)'); g.addColorStop(1, 'rgba(255,140,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, TS * pr, 0, 7); ctx.fill(); }
  if (t.kind === 'drop') {
    const R = TS * 0.42, bob = Math.sin(FX.time * 4 + t.c) * TS * 0.03; ctx.translate(0, bob);
    ctx.save(); ctx.shadowColor = 'rgba(255,200,60,.9)'; ctx.shadowBlur = TS * 0.3;
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#ffcf3f'); g.addColorStop(1, '#c47a10');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = TS * 0.05; ctx.beginPath(); ctx.arc(0, 0, R * 0.9, 0, 7); ctx.stroke();
    const s = sprite(0); if (s) ctx.drawImage(s, -s.width / 6, -s.height / 6 - TS * 0.04, s.width / 3, s.height / 3);
    ctx.fillStyle = '#7a3e00'; ctx.beginPath(); ctx.moveTo(0, R * 0.95); ctx.lineTo(-R * 0.25, R * 0.6); ctx.lineTo(R * 0.25, R * 0.6); ctx.fill();
  }
  else if (t.special === 'color') drawColorBomb();
  else { const s = sprite(t.color); if (s) ctx.drawImage(s, -s.width / 4, -s.height / 4, s.width / 2, s.height / 2); }
  if (t.special === 'row' || t.special === 'col') {
    ctx.save(); if (t.special === 'col') ctx.rotate(Math.PI / 2);
    ctx.globalCompositeOperation = 'lighter'; const sh = Math.sin(FX.time * 6) * 0.15 + 0.55;
    ctx.fillStyle = `rgba(255,255,255,${sh})`; for (let k = -1; k <= 1; k++) { rr(-TS * 0.4, k * TS * 0.16 - TS * 0.035, TS * 0.8, TS * 0.07, TS * 0.03); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.95)'; [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(d * TS * 0.5, 0); ctx.lineTo(d * TS * 0.38, -TS * 0.09); ctx.lineTo(d * TS * 0.38, TS * 0.09); ctx.fill(); });
    ctx.restore();
  }
  if (t.special === 'bomb') { ctx.fillStyle = '#fff'; ctx.beginPath(); const a = FX.time * 8; ctx.arc(TS * 0.3, -TS * 0.3, TS * (0.05 + 0.02 * Math.sin(a)), 0, 7); ctx.fill(); }
  if (flash > 0.3) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (flash - 0.3) * 0.9; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, TS * 0.38, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawEffects() {
  for (const e of effects) {
    const k = e.t / e.life, a = 1 - k;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (e.k === 'beam') {
      const th = TS * (0.9 - k * 0.6); ctx.globalAlpha = a;
      const g = e.h ? ctx.createLinearGradient(0, BY + (e.r + 0.5) * TS - th / 2, 0, BY + (e.r + 0.5) * TS + th / 2) : ctx.createLinearGradient(BX + (e.c + 0.5) * TS - th / 2, 0, BX + (e.c + 0.5) * TS + th / 2, 0);
      g.addColorStop(0, 'rgba(120,220,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(120,220,255,0)'); ctx.fillStyle = g;
      if (e.h) ctx.fillRect(BX - TS * 0.3, BY + (e.r + 0.5) * TS - th / 2, TS * (N + 0.6), th); else ctx.fillRect(BX + (e.c + 0.5) * TS - th / 2, BY - TS * 0.3, th, TS * (N + 0.6));
    } else if (e.k === 'wave') { ctx.globalAlpha = a * 0.7; ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = TS * 0.3 * a; ctx.beginPath(); ctx.arc(e.x, e.y, e.R * (0.3 + k * 0.9), 0, 7); ctx.stroke(); }
    else if (e.k === 'bolt') {
      ctx.globalAlpha = a; ctx.strokeStyle = `hsl(${(e.seed * 40) % 360},90%,75%)`; ctx.lineWidth = 3; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(e.x0, e.y0);
      for (let i = 1; i <= 6; i++) { const f = i / 6, j = i < 6 ? (rnd(e.seed + i + Math.floor(e.t * 20)) - 0.5) * TS * 0.6 : 0; ctx.lineTo(e.x0 + (e.x1 - e.x0) * f + j, e.y0 + (e.y1 - e.y0) * f + j); }
      ctx.stroke();
    }
    ctx.restore();
  }
}
function drawText(str, x, y, size, color, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.font = `900 ${size}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = size * 0.18; ctx.strokeStyle = 'rgba(60,30,10,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(str, 0, 0);
  const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2); g.addColorStop(0, '#fff'); g.addColorStop(1, color); ctx.fillStyle = g; ctx.fillText(str, 0, 0); ctx.restore();
}
function draw() {
  layout(); drawBG();
  if (!lv || phase === 'off') return;
  drawBoard();
  ctx.save(); ctx.beginPath(); ctx.rect(BX - 8, BY - 4, TS * N + 16, TS * N + 12); ctx.clip();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = tiles[r][c]; if (t) drawTile(t); }
  ctx.restore();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const cl = cells[r][c]; if (cl.hole) continue; if (cl.crate) drawCrate(BX + c * TS, BY + r * TS, cl.crate); else if (cl.ice) drawIce(BX + c * TS, BY + r * TS, cl.ice); }
  drawEffects();
  FX.drawFX(ctx);
  const midY = BY + TS * N * 0.42;
  if (intro > 0) { const k = 1.4 - intro; const s = k < 0.25 ? ease.back(k / 0.25) : 1; ctx.globalAlpha = Math.min(1, intro / 0.3); drawText('第 ' + (levelIdx + 1) + ' 关', FX.W / 2, midY, 52, '#ffd36b', s); drawText(lv.name, FX.W / 2, midY + 50, 26, '#fff', s); ctx.globalAlpha = 1; }
  if (popup) { const k = popup.t; const s = k < 0.25 ? ease.back(k / 0.25) * 1.0 : 1; ctx.globalAlpha = k > 0.8 ? 1 - (k - 0.8) / 0.3 : 1; drawText(popup.text, FX.W / 2, midY - k * 30, 48, popup.color, Math.max(0.01, s)); ctx.globalAlpha = 1; }
  if (endCard) {
    const k = Math.min(1, endCard.t / 0.4);
    ctx.fillStyle = `rgba(0,0,0,${0.5 * k})`; ctx.fillRect(0, 0, FX.W, FX.H);
    const cy = FX.H * 0.42, s = ease.back(k);
    ctx.save(); ctx.translate(FX.W / 2, cy); ctx.scale(s, s);
    const g = ctx.createLinearGradient(0, -120, 0, 120); g.addColorStop(0, endCard.win ? '#fff3d0' : '#e6ecf5'); g.addColorStop(1, endCard.win ? '#f6c46a' : '#9aa9c0');
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 24; rr(-190, -120, 380, 240, 28); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    drawText(endCard.win ? '过关!' : '步数用完', FX.W / 2, cy - 60, 50, endCard.win ? '#ffb43c' : '#8fb0ff', s);
    if (endCard.win) for (let i = 0; i < 3; i++) { const on = (endCard.shown || 0) > i; const ss = on ? 1 + Math.max(0, 0.4 - (endCard.t - 0.5 - i * 0.3)) : 0.8; ctx.save(); ctx.globalAlpha = on ? 1 : 0.35; ctx.font = `${44 * ss}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⭐', FX.W / 2 + (i - 1) * 74, cy + 10 - (i === 1 ? 12 : 0)); ctx.restore(); }
    drawText(String(score), FX.W / 2, cy + 72, 30, '#fff', s);
  }
}

// ================= START / LOBBY =================
function startRun(s) {
  currentSel = s; levelIdx = Math.max(0, Math.min(LEVELS.length - 1, (s && s.stage) | 0));
  buildLevel(levelIdx);
  moves = maxMoves = lv.moves; score = 0; cascade = 0; maxCombo = 0; won = lost = bonus = reported = false; movesLeftAtWin = 0; endCard = null; popup = null; sel = null; hint = null; effects = [];
  specialsCreated = cascadesMax = invalidSwaps = validSwaps = 0; hudKey = ''; intro = 1.4;
  setPhase('fall');
  auInit(); bgmStart();
  FX.running = true; if (!startRun.looping) { startRun.looping = true; FX.loop(update, draw); }
}
const assets = ['bg-forest', 'bg-garden', 'bg-sakura', 'bg-snow', 'bg-neon', 'prop-flowers', 'lan-chibi', 'mo-chibi', 'li-chibi', 'xing-chibi', 'hu-chibi', 'whale-idle', 'item-weapon', 'item-chest', 'item-star', 'item-shield', 'item-heart', ...IMGS];
FX.load(assets).then(() => {
  window.Lobby.init({
    id: 'lili-match', title: '栗栗的森林消消', orientation: 'portrait',
    bg: ['bg-forest', 'prop-flowers'],
    modes: [{ id: 'story', icon: 'item-star' }],
    stages: LEVELS.map((l, i) => ({ id: `s${i}`, name: l.name, bg: l.bg })),
    chars: [
      { id: 'lan', name: '蓝蓝', img: 'whale-idle', chibi: 'lan-chibi', stats: { atk: 80, def: 70, hp: 100, spd: 90 } },
      { id: 'mo', name: '小模', img: 'mo-chibi', chibi: 'mo-chibi', stats: { atk: 85, def: 75, hp: 95, spd: 95 } },
      { id: 'li', name: '栗栗', img: 'li-chibi', chibi: 'li-chibi', stats: { atk: 75, def: 80, hp: 105, spd: 85 } },
      { id: 'xing', name: '星眠', img: 'xing-chibi', chibi: 'xing-chibi', stats: { atk: 90, def: 65, hp: 90, spd: 100 } },
      { id: 'hu', name: '橙铃', img: 'hu-chibi', chibi: 'hu-chibi', stats: { atk: 80, def: 85, hp: 100, spd: 80 } }
    ],
    skins: [
      { id: 'default', name: '原色', filter: 'none', rarity: 'N' },
      { id: 'sakura', name: '樱糖', filter: 'hue-rotate(330deg) saturate(1.3)', rarity: 'R' },
      { id: 'forest', name: '森林', filter: 'hue-rotate(90deg) saturate(1.2)', rarity: 'R' },
      { id: 'star', name: '星河', filter: 'hue-rotate(240deg) saturate(1.4) brightness(1.1)', rarity: 'SSR', vip: true }
    ],
    currency: [{ id: 'coin', icon: 'item-chest' }, { id: 'gem', icon: 'item-star' }],
    onStart: startRun,
    onQuit: () => { FX.running = false; setPhase('off'); bgmStop(); },
    onSkinChange: (s) => { if (currentSel) currentSel.skin = s.skin; }
  });
  GameInviteV0.launch('lili-match', startRun);
});

window.__game = {
  ...(DEBUG ? {
    setTile: (r, c, color, special) => { if (!isTile(r, c)) return; tiles[r][c] = mkTile(r, c, special === 'color' ? -1 : (color == null ? 0 : color), special || null); },
    setMoves: n => { moves = n; },
    start: i => { document.querySelectorAll('.lobby-root,.lobby-screen').forEach(el => el.style.display = 'none'); startRun({ stage: i }); },
    sim: (n, dt) => { for (let i = 0; i < n; i++) update(dt || 1 / 30); },
    moves: () => findMove(true),
    cells: () => cells.map(r => r.map(c => ({ ...c }))),
    stars: () => stars3.slice(),
    reportOff: v => { reported = !!v; },
  } : {}),
  state: () => ({
    level: levelIdx + 1, score, moves, combo: cascade, maxCombo, phase,
    goals: goals.map(g => ({ type: g.t, color: g.c, need: g.need, left: g.t === 's' ? Math.max(0, g.need - score) : g.left })),
    busy: phase !== 'idle', won, lost, specialsCreated, cascadesMax, invalidSwaps, validSwaps,
    invite: INVITE, inviteResult, movesLeftAtWin,
    board: tiles.map((row, r) => row.map((t, c) => cells[r][c].hole ? null : { color: t ? t.color : null, special: t ? t.special : null, ice: cells[r][c].ice, jelly: cells[r][c].jelly, crate: cells[r][c].crate, drop: !!(t && t.kind === 'drop') }))
  }),
  trySwap: (r1, c1, r2, c2) => trySwap(r1, c1, r2, c2, true),
  findMove: () => findMove(),
  levels: LEVELS.length
};
})();
