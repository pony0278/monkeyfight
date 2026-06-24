import { Game } from './game.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Poki } from './poki.js';

const $ = (id) => document.getElementById(id);

const ui = {
  hud: $('hud'), touch: $('touch'),
  title: $('title'), roundover: $('roundover'), gameover: $('gameover'),
  score: $('hud-score'), round: $('hud-round'), alive: $('hud-alive'),
  dmgFill: $('dmg-fill'), dmgPct: $('dmg-pct'),
  roTitle: $('ro-title'), roSub: $('ro-sub'), roLoading: $('ro-loading'), btnNext: $('btn-next'),
  goRound: $('go-round'), goScore: $('go-score'), btnRevive: $('btn-revive'),
  toast: $('toast'), mute: $('btn-mute'),
};

const input = new Input();
const canvas = $('game');

let state = 'title';
let round = 1;
let enemies = 3;
let difficulty = 1;
let reviveUsed = false;
let muted = false;

const game = new Game(canvas, {
  onKO: (m, by) => {
    if (by === game.player) showToast(pick(['YEET! 🍌', 'KO! 👊', 'BYE BYE 🐵', 'GOTCHA!', 'SMASH!']));
  },
  onRoundWon: () => onRoundWon(),
  onPlayerDead: () => onPlayerDead(),
});

// ---------- helpers ----------
function pick(a) { return a[Math.floor(Math.random() * a.length) % a.length]; }

let toastTimer = null;
function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.remove('show');
  // force reflow to restart animation
  void ui.toast.offsetWidth;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1100);
}

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function isTouchDevice() {
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

// ---------- round flow ----------
function startRound() {
  state = 'playing';
  hide(ui.title); hide(ui.roundover); hide(ui.gameover);
  show(ui.hud);
  if (isTouchDevice()) show(ui.touch);
  ui.round.textContent = round;
  game.startMatch(enemies, difficulty);
  Poki.gameplayStart();
  Audio.startMusic();
}

async function onRoundWon() {
  state = 'roundover';
  Poki.gameplayStop();
  Audio.stopMusic();
  Audio.win();
  hide(ui.touch);
  ui.roTitle.textContent = pick(['ROUND CLEARED!', 'TOP BANANA! 🍌', 'MONKEY KING! 👑', 'YOU WON!']);
  ui.roSub.textContent = `Round ${round} done — ${game.player.score} total KOs!`;
  show(ui.roundover);
  ui.btnNext.classList.add('hidden');
  ui.roLoading.classList.remove('hidden');

  // Show an interstitial between rounds (resolves instantly if no SDK).
  await Poki.commercialBreak();

  ui.roLoading.classList.add('hidden');
  ui.btnNext.classList.remove('hidden');

  // ramp up difficulty for the next round
  round += 1;
  enemies = Math.min(3 + Math.floor(round / 1.5), 6);
  difficulty = 1 + (round - 1) * 0.14;
}

function onPlayerDead() {
  state = 'gameover';
  Poki.gameplayStop();
  Audio.stopMusic();
  Audio.lose();
  hide(ui.touch);
  ui.goRound.textContent = round;
  ui.goScore.textContent = game.player.score;
  // Offer one rewarded revive per run, only if the SDK can actually serve it.
  if (!reviveUsed && Poki.available) ui.btnRevive.classList.remove('hidden');
  else ui.btnRevive.classList.add('hidden');
  show(ui.gameover);
}

function fullRestart() {
  round = 1; enemies = 3; difficulty = 1; reviveUsed = false;
  startRound();
}

// ---------- buttons ----------
$('btn-play').addEventListener('click', () => {
  Audio.ensure();
  fullRestart();
});

ui.btnNext.addEventListener('click', () => {
  hide(ui.roundover);
  startRound();
});

$('btn-restart').addEventListener('click', () => {
  hide(ui.gameover);
  fullRestart();
});

ui.btnRevive.addEventListener('click', async () => {
  ui.btnRevive.textContent = '📺 loading ad…';
  const rewarded = await Poki.rewardedBreak();
  if (rewarded) {
    reviveUsed = true;
    hide(ui.gameover);
    show(ui.hud);
    if (isTouchDevice()) show(ui.touch);
    state = 'playing';
    game.revivePlayer();
    Poki.gameplayStart();
    Audio.startMusic();
    showToast('REVIVED! 🐵✨');
  } else {
    ui.btnRevive.textContent = '📺 WATCH AD TO REVIVE';
    showToast('ad skipped 😢');
  }
});

ui.mute.addEventListener('click', () => {
  muted = !muted;
  Audio.setMuted(muted);
  ui.mute.textContent = muted ? '🔇' : '🔊';
});

// ---------- input binding ----------
input.bindMouse(canvas);
input.bindTouch({
  zone: $('joy-zone'),
  btnPunch: $('btn-punch'),
  btnThrow: $('btn-throw'),
  btnJump: $('btn-jump'),
});

// Move the joystick knob with the input vector for visual feedback.
const joyKnob = $('joy-knob');
function updateJoyVisual() {
  if (input.move.x === 0 && input.move.y === 0) {
    joyKnob.style.transform = 'translate(-50%,-50%)';
  } else {
    joyKnob.style.transform = `translate(calc(-50% + ${input.move.x * 35}px), calc(-50% + ${input.move.y * 35}px))`;
  }
}

// pause when the tab is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') {
    game.setRunning(false);
    Poki.gameplayStop();
  } else if (!document.hidden && state === 'playing') {
    game.setRunning(true);
    Poki.gameplayStart();
  }
});

// ---------- HUD ----------
function updateHud() {
  if (state !== 'playing') return;
  const s = game.hudState();
  ui.score.textContent = s.score;
  ui.alive.textContent = s.alive;
  ui.dmgPct.textContent = `${s.damage}%`;
  ui.dmgFill.style.width = `${Math.min(s.damage, 100)}%`;
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // clamp big stalls
  game.update(dt, input);
  updateHud();
  updateJoyVisual();
  requestAnimationFrame(frame);
}

// ---------- boot ----------
async function boot() {
  await Poki.init();
  // first frame rendered, assets created
  Poki.loadingFinished();
  requestAnimationFrame(frame);
}
boot();
