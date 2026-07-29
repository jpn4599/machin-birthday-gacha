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

// ランダム枠（2〜3回目、4種から重複なしで2つピック）
const GACHA_POOL = [
  { id: 'hazure', label: 'しょうもない賞\n「ありがとうの気持ちだけ」', emoji: '💀', rarity: 'hazure',
    sub: '……気持ちは山盛りです😂' },
  { id: 'squat',  label: '罰ゲーム：スクワット5回！', emoji: '🏋️', rarity: 'penalty',
    sub: '※やるのはガチャを引いた人です💪' },
  { id: 'ticket', label: '肩たたき券（10回分）', emoji: '🎫', rarity: 'rare',
    sub: 'いつでも使える永久有効チケット💆' },
  { id: 'ghibli', label: 'ジブリパーク展＠大阪\n1日デート（8/9〜12のどこか）', emoji: '🗺️', rarity: 'super',
    sub: '大阪南港ATCギャラリーで開催中🌳' },
];

// 確定・4回目 / 5回目
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

const TOTAL_DRAWS = 5;

const RARITY_META = {
  hero:    { badge: '👑 主人公',   flash: 'gold' },
  hazure:  { badge: '😂 ハズレ',   flash: null },
  penalty: { badge: '💪 罰ゲーム', flash: null },
  rare:    { badge: '⭐⭐ RARE',    flash: 'pink' },
  super:   { badge: '⭐⭐⭐ SUPER', flash: 'turquoise' },
  secret:  { badge: '📸 SECRET',  flash: 'white' },
  final:   { badge: '🎂 FINAL',   flash: 'gold' },
};

const MSG_ICONS = { thanks: '🙏', like: '💗', message: '💌', final: '💕' };

const ALL_ITEMS = [GACHA_FIXED_FIRST, ...GACHA_POOL, ...GACHA_FIXED_LAST2];
const itemById = (id) => ALL_ITEMS.find((it) => it.id === id);

// ---------- 状態（誤リロード対策で sessionStorage に保存） ----------
const STORE_KEY = 'machin-gacha-v1';

function buildOrder() {
  const pool = [...GACHA_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [GACHA_FIXED_FIRST.id, pool[0].id, pool[1].id, GACHA_FIXED_LAST2[0].id, GACHA_FIXED_LAST2[1].id];
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

  // ハズレ用ずっこけ音
  womp() {
    this._tone(300, 0, 0.35, { type: 'sawtooth', vol: 0.18, slideTo: 150 });
    this._tone(150, 0.4, 0.5, { type: 'sawtooth', vol: 0.15, slideTo: 90 });
  },

  // ビリビリ
  buzz() {
    for (let i = 0; i < 6; i++) this._tone(110, i * 0.09, 0.07, { type: 'sawtooth', vol: 0.2 });
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
  const left = TOTAL_DRAWS - state.drawn;
  dotsEl.innerHTML =
    '●'.repeat(left) + `<span class="used">${'●'.repeat(state.drawn)}</span>`;
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

async function drawGacha() {
  if (busy || state.drawn >= TOTAL_DRAWS) return;
  busy = true;
  btnLever.disabled = true;

  const drawIndex = state.drawn;            // 0-origin
  const item = itemById(state.order[drawIndex]);
  const isSecret = item.rarity === 'secret';
  const isFinal = item.rarity === 'final';

  // レバー回転 0.3s
  SoundFX.click();
  handle.classList.add('turn');
  await sleep(300);

  // ガラガラ（通常0.8s / SECRETは2s + テキスト）
  const rattleSec = isSecret ? 2.0 : 0.8;
  if (isSecret) setBanner('✨ Something special... ✨');
  SoundFX.rattle(rattleSec);
  machine.classList.add('shaking');
  await sleep(rattleSec * 1000);
  machine.classList.remove('shaking');
  handle.classList.remove('turn');
  handle.classList.remove('glow');
  setBanner('');

  // カプセル排出 → タップ待ち
  SoundFX.pop();
  setCapsulePhoto(drawIndex);
  capsule.classList.remove('open');
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

  if (meta.flash) {
    flash.className = 'flash ' + meta.flash;
    void flash.offsetWidth;               // アニメ再発火
    flash.classList.add('go');
    setTimeout(() => flash.classList.remove('go'), 900);
  }

  switch (item.rarity) {
    case 'hero':
      SoundFX.fanfare(true);
      confetti(50);
      sparkles(14);
      break;
    case 'hazure':
      SoundFX.womp();
      break;
    case 'penalty':
      SoundFX.buzz();
      document.body.classList.add('shake-screen');
      setTimeout(() => document.body.classList.remove('shake-screen'), 900);
      break;
    case 'rare':
      SoundFX.fanfare(false);
      break;
    case 'super':
      SoundFX.fanfare(true);
      sparkles(24);
      break;
    case 'secret':
      SoundFX.fanfare(true);
      rainbow.classList.add('go');
      sparkles(28);
      confetti(40);
      setTimeout(() => rainbow.classList.remove('go'), 3500);
      break;
    case 'final':
      SoundFX.fanfare(true);
      confetti(140, 5000);
      sparkles(20);
      break;
  }
}

function buildResultCard(item) {
  const meta = RARITY_META[item.rarity];
  resultCard.className = 'result-card active rarity-' + item.rarity;

  $('resultPre').textContent =
    item.rarity === 'hero' ? '🎽 今日の主役はまーちんだ！' :
    item.rarity === 'final' ? '🎊 全部引いたね！' : '';
  $('resultBadge').textContent = meta.badge;
  $('resultEmoji').textContent = item.emoji;
  $('resultLabel').textContent = item.label;
  $('resultSub').textContent = item.sub || '';

  const btnNext = $('btnNext');
  if (state.drawn + 1 >= TOTAL_DRAWS) {
    // この後 state.drawn が +1 される＝最後の1個
    btnNext.textContent = 'コレクションを見る 🎁';
    btnNext.onclick = () => { SoundFX.click(); closeReveal(); showCollection(); };
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
  btnLever.disabled = false;
  const nextItem = itemById(state.order[state.drawn]);
  if (nextItem && nextItem.rarity === 'final') {
    setBanner('🎊 最後のガチャ！');
    handle.classList.add('glow');
  }
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
    badge.textContent = meta.badge;
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
} else if (state.drawn > 0) {
  showScreen('gacha');
  prepareNextDraw();
} else {
  showScreen('opening');
}
