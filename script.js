/* =========================================
   🎰 まーちん誕生日ガチャ  script.js
   ========================================= */

/* =========================================================
   ✏️ ここから編集ゾーン（写真・景品・メッセージはここだけ触ればOK）
   ========================================================= */

// 📷 二人の写真。photos/ に入れてここにパスを追記するだけで反映される。
// 空のままでも動く（かわいい絵文字プレースホルダーになる）
const PHOTOS = [
  // 'photos/photo1.jpg',
  // 'photos/photo2.jpg',
];

// 写真が無いときにカプセル上半分に出す絵文字
const PLACEHOLDER_EMOJIS = ['😆', '🥰', '📸', '💖', '🎈'];

// 確定・1回目
const GACHA_FIXED_FIRST = {
  id: 'tasuki', label: '主人公のタスキ', emoji: '🎽', rarity: 'hero',
  sub: '今日一日これを掛けて過ごすべし👑',
};

// ランダム枠（2〜4回目、6種から重複なしで3つピック）
const GACHA_POOL = [
  { id: 'stone',  label: 'ハズレ賞\n「そのへんの石ころ」', emoji: '🪨', rarity: 'hazure',
    sub: '記念にどうぞ😇' },
  { id: 'akushu', label: '「本人との握手券」\n（無制限・いつでも使用可）', emoji: '🤝', rarity: 'hazure',
    fakeJackpot: true, badge: '👑✨ 大当たり ✨👑',
    sub: '……大当たり？？😂' },
  { id: 'squat',  label: '罰ゲーム：スクワット5回！', emoji: '🏋️', rarity: 'penalty',
    sub: '※やるのはガチャを引いた人です💪' },
  { id: 'thanks', label: 'ありがとうの気持ち\n（無限大）', emoji: '💐', rarity: 'petit',
    sub: '毎日心を込めて進呈します🥰' },
  { id: 'ticket', label: '肩たたき券（3回分）', emoji: '🎫', rarity: 'rare',
    sub: 'いつでも使える有効期限なしチケット💆' },
  { id: 'ghibli', label: 'ジブリパーク展＠大阪\n1日デート（8/9〜12のどこか）', emoji: '🗺️', rarity: 'super',
    sub: '大阪南港ATCギャラリーで開催中🌳' },
];

// 🔁 ハズレの差し替え候補（使うときは上のGACHA_POOLと入れ替える）
// { id: 'air',    label: 'ハズレ賞「おいしい空気」',          emoji: '💨', rarity: 'hazure', sub: '深呼吸してお楽しみください🌬️' }
// { id: 'goen',   label: 'ハズレ賞「5円玉（ご縁がありますように）」', emoji: '🪙', rarity: 'hazure', sub: 'ちゃんと本物をあげます⛩️' }
// { id: 'tissue', label: 'ハズレ賞「ティッシュ1枚（高級気分）」', emoji: '🧻', rarity: 'hazure', sub: 'ふわふわの1枚を厳選しました' }

// 確定・5回目 / 6回目
const GACHA_FIXED_LAST2 = [
  { id: 'cheki', label: 'チェキ instax mini Evo\nGENTLE ROSE', emoji: '📷', rarity: 'secret',
    sub: 'プレゼントを確認してね💝' },
  { id: 'cake',  label: '特製バースデーケーキ\n（シャインマスカット乗せ！）', emoji: '🎂', rarity: 'final',
    sub: '一緒にケーキ食べよ！そしてチェキで写真撮ろう📸' },
];

// 💌 メッセージカード（後から本物の言葉に差し替える）
const MESSAGES = [
  { type: 'thanks',  text: '【ここに「いつもありがとう」の言葉】' },
  { type: 'like',    text: '【好きなポイント①\n例：いつも笑顔でいてくれるところ】' },
  { type: 'like',    text: '【好きなポイント②\n例：一緒にいると安心するところ】' },
  { type: 'like',    text: '【好きなポイント③】' },
  { type: 'message', text: '【まーちんへのメッセージ・想い】' },
  { type: 'final',   text: '【締めの一言\n例：これからもよろしく。大好き💕】' },
];

/* =========================================================
   ここから下はロジック（触らなくてOK）
   ========================================================= */

const TOTAL_DRAWS = 6;      // 実際の総数（6回目はシークレット）
const VISIBLE_DRAWS = 5;    // 本人に見せる回数。ケーキは「復活演出」で出す

const RARITY_META = {
  hero:    { badge: '👑 主人公',     flash: 'gold' },
  hazure:  { badge: '😂 ハズレ',     flash: 'gray' },
  penalty: { badge: '💪 罰ゲーム',   flash: null },
  petit:   { badge: '⭐ ちょい当たり', flash: 'pink' },
  rare:    { badge: '⭐⭐ RARE',      flash: 'pink' },
  super:   { badge: '⭐⭐⭐ SUPER',   flash: 'turquoise' },
  secret:  { badge: '📸 SECRET',    flash: 'white' },
  final:   { badge: '🎂 FINAL',     flash: 'gold' },
};

const MSG_ICONS = { thanks: '🙏', like: '💗', message: '💌', final: '💕' };

const ALL_ITEMS = [GACHA_FIXED_FIRST, ...GACHA_POOL, ...GACHA_FIXED_LAST2];
const itemById = (id) => ALL_ITEMS.find((it) => it.id === id);

// ---------- 状態（誤リロード対策で sessionStorage に保存） ----------
const STORE_KEY = 'machin-gacha-v2';

function buildOrder() {
  const pool = [...GACHA_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [GACHA_FIXED_FIRST.id, pool[0].id, pool[1].id, pool[2].id,
          GACHA_FIXED_LAST2[0].id, GACHA_FIXED_LAST2[1].id];
}

function buildPhotoPicks() {
  const n = PHOTOS.length > 0 ? PHOTOS.length : PLACEHOLDER_EMOJIS.length;
  return Array.from({ length: TOTAL_DRAWS }, () => Math.floor(Math.random() * n));
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (Array.isArray(s.order) && s.order.length === TOTAL_DRAWS) return s;
    }
  } catch (e) { /* sessionStorage不可でも動かす */ }
  return { order: buildOrder(), photos: buildPhotoPicks(), drawn: 0 };
}

function saveState() {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* noop */ }
}

let state = loadState();
let busy = false;
let revivalStarted = false;   // ケーキ復活演出が始まったか

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const screens = {
  opening: $('screen-opening'),
  gacha: $('screen-gacha'),
  collection: $('screen-collection'),
  message: $('screen-message'),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ---------- 効果音（Web Audio 合成） ----------
const SoundFX = {
  ctx: null,
  master: null,
  enabled: true,

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  },

  _tone(freq, start, dur, { type = 'sine', vol = 0.3, slideTo = null } = {}) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  _noise(start, dur, vol = 0.25) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + start;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900 + Math.random() * 800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
  },

  click() { this._tone(700, 0, 0.08, { type: 'square', vol: 0.12 }); },

  // ガラガラ音: ノイズバースト連打
  rattle(durSec) {
    const step = 0.09;
    for (let t = 0; t < durSec; t += step) {
      this._noise(t + Math.random() * 0.03, 0.07, 0.18);
    }
  },

  // 排出ポン
  pop() { this._tone(300, 0, 0.18, { type: 'sine', vol: 0.35, slideTo: 900 }); },

  // カプセルが割れる
  crack() {
    this._noise(0, 0.1, 0.3);
    this._tone(1200, 0.02, 0.12, { type: 'triangle', vol: 0.2, slideTo: 400 });
  },

  // 当たりファンファーレ（big=true で豪華版）
  fanfare(big = false) {
    const notes = big
      ? [523, 659, 784, 1047, 784, 1047, 1319]   // ド ミ ソ ド ソ ド ミ
      : [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      this._tone(f, i * 0.13, 0.3, { type: 'triangle', vol: 0.3 });
      this._tone(f / 2, i * 0.13, 0.3, { type: 'sine', vol: 0.15 });
    });
    if (big) {
      [523, 659, 784].forEach((f) => this._tone(f, notes.length * 0.13 + 0.1, 0.9, { type: 'triangle', vol: 0.22 }));
    }
  },

  // ハズレ用「ガガーン！」（ジャーン…ジャーン…ズーン）
  gagaan() {
    // 不協和音の重いスタブ×2
    [0, 0.45].forEach((start, i) => {
      const base = i === 0 ? 220 : 196;
      [base, base * 1.06, base / 2].forEach((f) => {
        this._tone(f, start, 0.42, { type: 'sawtooth', vol: 0.22 });
      });
      this._noise(start, 0.12, 0.2);
    });
    // 最後に地の底へ沈む低音
    this._tone(110, 0.95, 1.2, { type: 'sawtooth', vol: 0.2, slideTo: 50 });
  },

  // ちょい当たり用の可愛いピロリン♪
  chime() {
    [784, 1047, 1319].forEach((f, i) => {
      this._tone(f, i * 0.09, 0.28, { type: 'triangle', vol: 0.25 });
    });
  },

  // SECRET / FINAL 用の豪華ファンファーレ
  // （ドラムロール → 駆け上がりアルペジオ → ジャーン和音 + キラキラ）
  grandFanfare() {
    // ドラムロール
    for (let t = 0; t < 0.55; t += 0.045) this._noise(t, 0.04, 0.16);
    this._tone(65, 0, 0.55, { type: 'sine', vol: 0.3 });

    // 2オクターブ駆け上がり
    const run = [523, 659, 784, 1047, 1319, 1568, 2093];
    run.forEach((f, i) => {
      const t = 0.55 + i * 0.09;
      this._tone(f, t, 0.22, { type: 'triangle', vol: 0.3 });
      this._tone(f / 2, t, 0.22, { type: 'square', vol: 0.08 });
    });

    // ジャーン！（Cメジャー和音ロング、2連発）
    const hit = 0.55 + run.length * 0.09 + 0.05;
    [[hit, 0.5], [hit + 0.55, 1.4]].forEach(([t, dur]) => {
      [523, 659, 784, 1047, 1319].forEach((f) => {
        this._tone(f, t, dur, { type: 'triangle', vol: 0.18 });
        this._tone(f / 2, t, dur, { type: 'sine', vol: 0.1 });
      });
      this._noise(t, 0.1, 0.18);
    });

    // キラキラ（高音の煌めきをランダムに散らす）
    for (let i = 0; i < 10; i++) {
      const t = hit + 0.5 + Math.random() * 1.2;
      this._tone(2093 + Math.random() * 1500, t, 0.18, { type: 'sine', vol: 0.09 });
    }
  },

  // ビリビリ
  buzz() {
    for (let i = 0; i < 6; i++) this._tone(110, i * 0.09, 0.07, { type: 'sawtooth', vol: 0.2 });
  },

  // カウントダウンのピッ（最後だけ高い音）
  tick(last = false) {
    this._tone(last ? 1320 : 880, 0, 0.14, { type: 'square', vol: 0.18 });
  },

  // ドキドキの溜め（ドラムロール + せり上がる音）
  suspense(durSec = 1.4) {
    for (let t = 0; t < durSec; t += 0.05) this._noise(t, 0.04, 0.12);
    this._tone(180, 0, durSec, { type: 'sine', vol: 0.2, slideTo: 700 });
  },

  // バーン！！（大当たり炸裂音）
  bang() {
    this._noise(0, 0.35, 0.45);
    this._tone(90, 0, 0.6, { type: 'sine', vol: 0.4, slideTo: 45 });
    [523, 659, 784, 1047].forEach((f) => this._tone(f, 0.05, 0.7, { type: 'sawtooth', vol: 0.12 }));
  },

  // ゴトゴト…（マシンがひとりでに揺れる不穏な音）
  rumble(durSec = 1.3) {
    for (let t = 0; t < durSec; t += 0.16) this._noise(t + Math.random() * 0.05, 0.1, 0.14);
    this._tone(48, 0, durSec, { type: 'sine', vol: 0.28 });
  },
};

// ---------- FX（紙吹雪・キラキラ・ハート） ----------
const fxLayer = $('fxLayer');
const FX_COLORS = ['#FF9BBB', '#C9A7EB', '#FFCC33', '#44CCCC', '#FF7FAE', '#FFFFFF', '#9BE8C0'];

function confetti(count = 80, durationMs = 3200) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.background = FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)];
    el.style.animationDuration = 2 + Math.random() * 2 + 's';
    el.style.animationDelay = Math.random() * (durationMs / 3000) + 's';
    el.style.width = 7 + Math.random() * 7 + 'px';
    el.style.height = 10 + Math.random() * 8 + 'px';
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), durationMs + 2500);
  }
}

function sparkles(count = 16) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'sparkle';
    el.textContent = Math.random() < 0.5 ? '✨' : '⭐';
    el.style.left = 5 + Math.random() * 90 + 'vw';
    el.style.top = 10 + Math.random() * 75 + 'vh';
    el.style.animationDelay = Math.random() * 0.8 + 's';
    el.style.fontSize = 16 + Math.random() * 18 + 'px';
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
}

function heartRain(count = 40, durationMs = 4000) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'heart';
    el.textContent = ['💕', '💖', '💗', '🩷'][Math.floor(Math.random() * 4)];
    el.style.left = Math.random() * 96 + 'vw';
    el.style.fontSize = 16 + Math.random() * 20 + 'px';
    el.style.animationDuration = 2.5 + Math.random() * 2 + 's';
    el.style.animationDelay = Math.random() * (durationMs / 2500) + 's';
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), durationMs + 3000);
  }
}

// ---------- ガチャ画面 ----------
const dotsEl = $('dots');
const machine = $('machine');
const handle = $('handle');
const btnLever = $('btnLever');
const banner = $('specialBanner');

function renderDots() {
  // 表示上は5回。6回目（ケーキ）は復活演出時に金の●が現れる
  const used = Math.min(state.drawn, VISIBLE_DRAWS);
  let html = '●'.repeat(VISIBLE_DRAWS - used) + `<span class="used">${'●'.repeat(used)}</span>`;
  if (state.drawn === VISIBLE_DRAWS && revivalStarted) html += '<span class="bonus">●</span>';
  dotsEl.innerHTML = html;
}

function setBanner(text) {
  banner.textContent = text || '';
  banner.classList.toggle('show', !!text);
}

// ---------- カプセル & 結果 ----------
const reveal = $('reveal');
const capsuleWrap = $('capsuleWrap');
const capsule = $('capsule');
const capsulePhoto = $('capsulePhoto');
const resultCard = $('resultCard');
const flash = $('flash');
const rainbow = $('rainbow');

function setCapsulePhoto(drawIndex) {
  const pick = state.photos[drawIndex] || 0;
  capsulePhoto.textContent = '';
  capsulePhoto.style.backgroundImage = '';
  capsulePhoto.style.background = '';
  if (PHOTOS.length > 0) {
    const src = PHOTOS[pick % PHOTOS.length];
    capsulePhoto.style.backgroundImage = `url("${src}")`;
    // ロード失敗時は絵文字にフォールバック
    const img = new Image();
    img.onerror = () => {
      capsulePhoto.style.backgroundImage = '';
      applyPlaceholder(pick);
    };
    img.src = src;
  } else {
    applyPlaceholder(pick);
  }
}

function applyPlaceholder(pick) {
  capsulePhoto.textContent = PLACEHOLDER_EMOJIS[pick % PLACEHOLDER_EMOJIS.length];
  capsulePhoto.style.background = 'linear-gradient(140deg, #FFE2EE, #E2D2FF)';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// フラッシュ発火ヘルパー
function flashGo(color) {
  flash.className = 'flash ' + color;
  void flash.offsetWidth;
  flash.classList.add('go');
  setTimeout(() => flash.classList.remove('go'), 900);
}

// 3・2・1 カウントダウン表示
async function countdown(from = 3) {
  const el = $('countdown');
  for (let i = from; i >= 1; i--) {
    el.textContent = i;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    SoundFX.tick(i === 1);
    await sleep(720);
  }
  el.textContent = '';
  el.classList.remove('pop');
}

async function drawGacha() {
  if (busy || state.drawn >= VISIBLE_DRAWS) return;   // 6回目は復活演出専用
  busy = true;
  btnLever.disabled = true;

  const drawIndex = state.drawn;            // 0-origin
  const item = itemById(state.order[drawIndex]);
  const n = drawIndex + 1;
  const isSecret = item.rarity === 'secret';
  const isFake = !!item.fakeJackpot;

  // レバー回転 0.3s
  SoundFX.click();
  handle.classList.add('turn');
  await sleep(300);

  if (isSecret) {
    // 5回目（チェキ）: ラスト風の特大溜め演出
    setBanner(`${n}回目！ラストガチャ！`);
    SoundFX.rattle(1.2);
    machine.classList.add('shaking');
    await sleep(1200);
    machine.classList.remove('shaking');
    setBanner('✨ Something special... ✨');
    SoundFX.suspense(1.5);
    machine.classList.add('rumbling');
    await sleep(1500);
    machine.classList.remove('rumbling');
    await countdown(3);
    flashGo('white');
    SoundFX.bang();
    await sleep(350);
  } else if (isFake) {
    // 握手券: フェイク大当たり演出（金ピカ + カウントダウン + バーン！）
    setBanner(`${n}回目！`);
    SoundFX.rattle(0.8);
    machine.classList.add('shaking');
    await sleep(800);
    setBanner('！？ なんか金色に光ってる…！？');
    machine.classList.add('glow-gold');
    SoundFX.suspense(1.5);
    await sleep(1500);
    machine.classList.remove('shaking');
    await countdown(3);
    machine.classList.remove('glow-gold');
    flashGo('gold');
    SoundFX.bang();
    setBanner('バーン！！ 大当たり！！！');
    confetti(40);
    await sleep(900);
  } else {
    // 通常: 「n回目！」＋ガラガラ0.8s
    setBanner(`${n}回目！`);
    SoundFX.rattle(0.8);
    machine.classList.add('shaking');
    await sleep(800);
    machine.classList.remove('shaking');
  }

  handle.classList.remove('turn');
  handle.classList.remove('glow');
  setBanner('');
  await ejectAndWait(drawIndex, item, isFake);
}

// カプセル排出 → タップ待ち（golden=trueで金カプセル）
async function ejectAndWait(drawIndex, item, golden = false) {
  SoundFX.pop();
  setCapsulePhoto(drawIndex);
  capsule.classList.remove('open');
  capsule.classList.toggle('golden', golden);
  resultCard.classList.remove('active');
  capsuleWrap.classList.add('active', 'drop-in');
  reveal.classList.add('active');
  await sleep(560);
  capsuleWrap.classList.remove('drop-in');
  capsuleWrap.classList.add('waiting');   // 小刻み回転で写真チラ見せ

  // タップされたら openCapsule() が続きをやる
  capsule.onclick = () => openCapsule(item);
}

async function openCapsule(item) {
  capsule.onclick = null;
  capsuleWrap.classList.remove('waiting');

  // パカッ
  SoundFX.crack();
  capsule.classList.add('open');
  await sleep(isSlowOpen(item) ? 750 : 450);

  // レアリティ演出
  playRarityFX(item);

  // 結果カード表示
  buildResultCard(item);
  capsuleWrap.classList.remove('active');
  resultCard.classList.add('active');

  // 状態更新
  state.drawn += 1;
  saveState();
  renderDots();
  busy = false;
}

function isSlowOpen(item) {
  return item.rarity === 'secret' || item.rarity === 'final';
}

function playRarityFX(item) {
  const meta = RARITY_META[item.rarity];

  // フェイク大当たり: 中身はハズレでも演出は完全に大当たり
  if (item.fakeJackpot) {
    flashGo('gold');
    SoundFX.fanfare(true);
    confetti(70);
    sparkles(18);
    return;
  }

  if (meta.flash) flashGo(meta.flash);

  switch (item.rarity) {
    case 'hero':
      SoundFX.fanfare(true);
      confetti(50);
      sparkles(14);
      break;
    case 'hazure':
      SoundFX.gagaan();
      document.body.classList.add('shake-screen');
      setTimeout(() => document.body.classList.remove('shake-screen'), 900);
      break;
    case 'penalty':
      SoundFX.buzz();
      document.body.classList.add('shake-screen');
      setTimeout(() => document.body.classList.remove('shake-screen'), 900);
      break;
    case 'petit':
      SoundFX.chime();
      sparkles(8);
      break;
    case 'rare':
      SoundFX.fanfare(false);
      break;
    case 'super':
      SoundFX.fanfare(true);
      sparkles(24);
      break;
    case 'secret':
      SoundFX.grandFanfare();
      rainbow.classList.add('go');
      sparkles(28);
      confetti(40);
      setTimeout(() => rainbow.classList.remove('go'), 3500);
      break;
    case 'final':
      SoundFX.grandFanfare();
      confetti(140, 5000);
      sparkles(20);
      break;
  }
}

function buildResultCard(item) {
  const meta = RARITY_META[item.rarity];
  resultCard.className = 'result-card active rarity-' + item.rarity +
    (item.fakeJackpot ? ' fake-jackpot' : '');

  $('resultPre').textContent =
    item.fakeJackpot ? '🎉 バーン！！大当たり！！！' :
    item.rarity === 'hero' ? '🎽 今日の主役はまーちんだ！' :
    item.rarity === 'hazure' ? 'ガガ〜ン！！😱' :
    item.rarity === 'final' ? '🎂 スペシャルサプライズ！！' : '';
  $('resultBadge').textContent = item.badge || meta.badge;
  $('resultEmoji').textContent = item.emoji;
  $('resultLabel').textContent = item.label;
  $('resultSub').textContent = item.sub || '';

  const btnNext = $('btnNext');
  if (item.rarity === 'final') {
    // 本当の最後（ケーキ）
    btnNext.textContent = 'コレクションを見る 🎁';
    btnNext.onclick = () => { SoundFX.click(); closeReveal(); showCollection(); };
  } else if (item.rarity === 'secret') {
    // チェキ＝表向きのラスト。ここで一旦「おしまい」と思わせる
    btnNext.textContent = 'やった〜！ガチャおしまい！🎉';
    btnNext.onclick = () => { SoundFX.click(); closeReveal(); fakeEnding(); };
  } else {
    btnNext.textContent = 'もう一回引く 🎰';
    btnNext.onclick = () => { SoundFX.click(); closeReveal(); prepareNextDraw(); };
  }
}

function closeReveal() {
  reveal.classList.remove('active');
  resultCard.classList.remove('active');
  rainbow.classList.remove('go');
}

function prepareNextDraw() {
  renderDots();
  btnLever.classList.remove('hidden');
  btnLever.disabled = false;
  const nextItem = itemById(state.order[state.drawn]);
  if (nextItem && nextItem.rarity === 'secret') {
    // 表向きのラスト（チェキ）を煽る
    setBanner('🎊 つぎで最後のガチャ！');
    handle.classList.add('glow');
  }
}

// ---------- ケーキ復活演出（フェイクエンディング → サプライズ6回目） ----------
function fakeEnding() {
  showScreen('gacha');
  btnLever.classList.add('hidden');
  renderDots();
  setBanner('今日のガチャはこれでおしまい！ありがとう💕');
  busy = false;

  // どこをタップしても復活シーケンスへ
  const trigger = () => {
    screens.gacha.removeEventListener('click', trigger);
    revivalSequence();
  };
  screens.gacha.addEventListener('click', trigger);

  // 放置していても不穏な気配で誘導する
  setTimeout(() => {
    if (!revivalStarted) {
      setBanner('……ん？ なんか音がしない…？');
      SoundFX.rumble(0.8);
      machine.classList.add('rumbling');
      setTimeout(() => { if (!revivalStarted) machine.classList.remove('rumbling'); }, 1200);
    }
  }, 3000);
}

async function revivalSequence() {
  if (revivalStarted || busy) return;
  revivalStarted = true;
  busy = true;

  setBanner('…あれ？ おやおや…？');
  machine.classList.add('rumbling');
  SoundFX.rumble(1.4);
  await sleep(1400);

  setBanner('様子がおかしいぞ…！？');
  machine.classList.remove('rumbling');
  machine.classList.add('shaking');
  SoundFX.rumble(1.4);
  await sleep(1400);

  setBanner('！！！！');
  machine.classList.add('glow-gold');
  SoundFX.suspense(1.3);
  await sleep(1300);
  machine.classList.remove('shaking');

  await countdown(3);
  machine.classList.remove('glow-gold');
  flashGo('gold');
  SoundFX.bang();
  setBanner('✨ スペシャルガチャ ふっかつ！！ ✨');
  renderDots();          // 金の6個目●が現れる
  confetti(50);
  await sleep(1100);
  setBanner('');

  // 金カプセルで最後の1個（ケーキ）を排出
  const item = itemById(state.order[TOTAL_DRAWS - 1]);
  await ejectAndWait(TOTAL_DRAWS - 1, item, true);
}

// ---------- コレクション ----------
function showCollection() {
  const list = $('collectionList');
  list.innerHTML = '';
  state.order.forEach((id, i) => {
    const item = itemById(id);
    const meta = RARITY_META[item.rarity];
    const li = document.createElement('li');
    li.className = 'collection-item';
    li.style.animationDelay = i * 0.12 + 's';

    const cap = document.createElement('div');
    cap.className = 'ci-capsule';
    if (PHOTOS.length > 0) {
      cap.style.backgroundImage = `url("${PHOTOS[state.photos[i] % PHOTOS.length]}")`;
    } else {
      cap.textContent = PLACEHOLDER_EMOJIS[state.photos[i] % PLACEHOLDER_EMOJIS.length];
    }

    const emoji = document.createElement('div');
    emoji.className = 'ci-emoji';
    emoji.textContent = item.emoji;

    const text = document.createElement('div');
    text.className = 'ci-text';
    const badge = document.createElement('span');
    badge.className = 'ci-badge';
    badge.textContent = item.badge || meta.badge;
    const label = document.createElement('div');
    label.className = 'ci-label';
    label.textContent = item.label.replace(/\n/g, ' ');
    text.append(badge, label);

    li.append(cap, emoji, text);
    list.appendChild(li);
  });
  showScreen('collection');
  confetti(60);
}

// ---------- メッセージ画面 ----------
let msgIndex = 0;
const cardStage = $('cardStage');
const cardDots = $('cardDots');

function showMessageScreen() {
  msgIndex = 0;
  cardDots.innerHTML = MESSAGES.map(() => '<span></span>').join('');
  renderMsgCard(0, 'in-right');
  showScreen('message');
}

function renderMsgCard(index, inClass) {
  const msg = MESSAGES[index];
  const card = document.createElement('div');
  card.className = `msg-card type-${msg.type} ${inClass}`;

  const icon = document.createElement('div');
  icon.className = 'msg-icon';
  icon.textContent = MSG_ICONS[msg.type] || '💌';
  const text = document.createElement('div');
  text.className = 'msg-text';
  text.textContent = msg.text;
  card.append(icon, text);

  cardStage.innerHTML = '';
  cardStage.appendChild(card);

  [...cardDots.children].forEach((d, i) => d.classList.toggle('on', i === index));
  $('cardHint').textContent =
    index === MESSAGES.length - 1 ? '🎂 Happy Birthday まーちん 🎂' : 'タップ or スワイプで次へ 👉';

  if (msg.type === 'final') {
    heartRain(50, 5000);
    SoundFX.fanfare(true);
  }
}

function nextMsgCard(dir) {
  // dir: +1 次へ / -1 前へ
  const target = msgIndex + dir;
  if (target < 0 || target >= MESSAGES.length) return;
  const current = cardStage.firstElementChild;
  if (!current) return;
  SoundFX.click();
  current.classList.remove('in-right', 'in-left');
  current.classList.add(dir > 0 ? 'out-left' : 'out-right');
  msgIndex = target;
  setTimeout(() => renderMsgCard(msgIndex, dir > 0 ? 'in-right' : 'in-left'), 260);
}

// タップ & スワイプ
let touchStartX = null;
cardStage.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
cardStage.addEventListener('touchend', (e) => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  touchStartX = null;
  if (dx < -40) nextMsgCard(1);
  else if (dx > 40) nextMsgCard(-1);
  else nextMsgCard(1);                     // ただのタップは次へ
});
cardStage.addEventListener('click', (e) => {
  // タッチデバイスでは touchend が処理するので click は PC 用
  if ('ontouchstart' in window) return;
  nextMsgCard(1);
});

// ---------- イベント ----------
$('btnStart').addEventListener('click', () => {
  SoundFX.init();
  SoundFX.click();
  confetti(40);
  showScreen('gacha');
  prepareNextDraw();
});

btnLever.addEventListener('click', () => {
  SoundFX.init();
  drawGacha();
});

$('btnMessage').addEventListener('click', () => {
  SoundFX.click();
  showMessageScreen();
});

$('soundToggle').addEventListener('click', () => {
  const on = SoundFX.toggle();
  $('soundToggle').textContent = on ? '🔊' : '🔇';
  if (on) { SoundFX.init(); SoundFX.click(); }
});

// ---------- 起動（途中リロードでも続きから） ----------
renderDots();
if (state.drawn >= TOTAL_DRAWS) {
  showCollection();
} else if (state.drawn === VISIBLE_DRAWS) {
  fakeEnding();                       // チェキまで引いた状態 → 復活演出待ち
} else if (state.drawn > 0) {
  showScreen('gacha');
  prepareNextDraw();
} else {
  showScreen('opening');
}
