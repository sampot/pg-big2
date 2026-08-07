import { chooseAiMove } from "./ai.js";
import { Big2Audio } from "./audio.js";
import {
  Big2Game,
  cardLabel,
  comboTypeLabel,
  isRed,
  RANKS,
  SUITS,
} from "./game.js";

const audio = new Big2Audio();
const game = new Big2Game();

const statusEl = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");
const trickLabel = document.getElementById("trick-label");
const handEl = document.getElementById("hand");
const trickCardsEl = document.getElementById("trick-cards");
const trickHint = document.getElementById("trick-hint");
const btnDeal = document.getElementById("btn-deal");
const btnReset = document.getElementById("btn-reset");
const btnPlay = document.getElementById("btn-play");
const btnPass = document.getElementById("btn-pass");
const btnClear = document.getElementById("btn-clear");
const btnMute = document.getElementById("btn-mute");

/** @type {Set<number>} */
const selected = new Set();
let aiTimer = 0;
let busy = false;

function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function renderCardButton(card, opts = {}) {
  const btn = document.createElement(opts.static ? "div" : "button");
  if (!opts.static) btn.type = "button";
  btn.className = `card${isRed(card) ? " red" : ""}${opts.selected ? " selected" : ""}`;
  btn.dataset.id = String(card.id);
  btn.innerHTML = `<span>${RANKS[card.rank]}</span><span class="suit">${SUITS[card.suit]}</span>`;
  btn.setAttribute("aria-label", cardLabel(card));
  if (!opts.static) {
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", opts.selected ? "true" : "false");
  }
  return btn;
}

function renderHand() {
  handEl.innerHTML = "";
  const hand = game.hands[0];
  for (const card of hand) {
    const el = renderCardButton(card, { selected: selected.has(card.id) });
    el.addEventListener("click", async () => {
      await audio.unlock();
      if (game.status !== "playing" || game.turn !== 0 || busy) return;
      if (selected.has(card.id)) selected.delete(card.id);
      else selected.add(card.id);
      audio.select();
      renderHand();
      syncActions();
    });
    handEl.appendChild(el);
  }
  document.getElementById("count-0").textContent = String(hand.length);
}

function renderOpponents() {
  for (const seat of [1, 2, 3]) {
    const wrap = document.getElementById(`op-${seat}`);
    const countEl = document.getElementById(`count-${seat}`);
    const playEl = document.getElementById(`play-${seat}`);
    const n = game.hands[seat].length;
    countEl.textContent = String(n);
    wrap.innerHTML = "";
    const show = Math.min(n, 10);
    for (let i = 0; i < show; i++) {
      const back = document.createElement("span");
      back.className = "card-back";
      wrap.appendChild(back);
    }
    const seatRoot = document.querySelector(`.seat[data-seat="${seat}"]`);
    seatRoot?.classList.toggle("is-turn", game.status === "playing" && game.turn === seat);

    const last = [...game.lastPlays].reverse().find((p) => p.seat === seat);
    if (last?.pass) playEl.textContent = "Pass";
    else if (last?.combo) {
      playEl.textContent = `${comboTypeLabel(last.combo.type)} ${last.combo.cards.map(cardLabel).join(" ")}`;
    } else playEl.textContent = "";
  }
  document.querySelector(`.seat[data-seat="0"]`)?.classList.toggle(
    "is-turn",
    game.status === "playing" && game.turn === 0,
  );
}

function renderTrick() {
  trickCardsEl.innerHTML = "";
  if (game.trick) {
    for (const c of game.trick.cards) {
      trickCardsEl.appendChild(renderCardButton(c, { static: true }));
    }
    trickHint.textContent = `${game.names[game.trickLeader]} · ${comboTypeLabel(game.trick.type)}`;
    trickLabel.textContent = comboTypeLabel(game.trick.type);
  } else {
    trickHint.textContent = game.status === "playing" ? "自由出牌" : "尚未出牌";
    trickLabel.textContent = "自由出牌";
  }
}

function syncActions() {
  const myTurn = game.status === "playing" && game.turn === 0 && !busy;
  btnPlay.disabled = !myTurn || selected.size === 0;
  btnPass.disabled = !myTurn || !game.trick;
  btnClear.disabled = selected.size === 0;
  btnDeal.disabled = busy || game.status === "playing";
  turnLabel.textContent =
    game.status === "ready"
      ? "—"
      : game.status === "over"
        ? "終局"
        : game.names[game.turn];
}

function renderAll() {
  renderHand();
  renderOpponents();
  renderTrick();
  setStatus(
    game.message,
    game.status === "over"
      ? "win"
      : game.turn === 0 && game.status === "playing"
        ? "turn"
        : "",
  );
  syncActions();
}

function selectedCards() {
  return game.hands[0].filter((c) => selected.has(c.id));
}

function scheduleAi() {
  window.clearTimeout(aiTimer);
  if (game.status !== "playing" || game.turn === 0 || busy) return;
  busy = true;
  syncActions();
  aiTimer = window.setTimeout(() => {
    void runAiTurn();
  }, 550 + Math.random() * 450);
}

async function runAiTurn() {
  await audio.unlock();
  if (game.status !== "playing" || game.turn === 0) {
    busy = false;
    syncActions();
    return;
  }
  const seat = game.turn;
  const move = chooseAiMove(game, seat);
  if (move.action === "pass") {
    game.pass(seat);
    audio.pass();
  } else {
    const r = game.play(seat, move.cards);
    if (!r.ok) {
      // Fallback pass if AI miscalc
      if (game.trick) game.pass(seat);
      else {
        busy = false;
        setStatus(r.reason || "AI 出錯", "warn");
        renderAll();
        return;
      }
      audio.pass();
    } else {
      audio.play(move.cards.length);
      if (r.won) audio.win();
    }
  }
  selected.clear();
  busy = false;
  renderAll();
  if (game.status === "playing" && game.turn !== 0) scheduleAi();
  else if (game.turn === 0 && game.status === "playing") audio.turn();
}

btnDeal.addEventListener("click", async () => {
  await audio.unlock();
  selected.clear();
  game.deal();
  audio.deal();
  renderAll();
  if (game.turn !== 0) scheduleAi();
});

btnReset.addEventListener("click", async () => {
  await audio.unlock();
  window.clearTimeout(aiTimer);
  busy = false;
  selected.clear();
  game.reset();
  renderAll();
});

btnPlay.addEventListener("click", async () => {
  await audio.unlock();
  if (busy || game.turn !== 0) return;
  const cards = selectedCards();
  const r = game.play(0, cards);
  if (!r.ok) {
    audio.deny();
    setStatus(r.reason || "無法出牌", "warn");
    return;
  }
  selected.clear();
  audio.play(cards.length);
  if (r.won) audio.win();
  renderAll();
  if (game.status === "playing") scheduleAi();
});

btnPass.addEventListener("click", async () => {
  await audio.unlock();
  if (busy || game.turn !== 0) return;
  const r = game.pass(0);
  if (!r.ok) {
    audio.deny();
    setStatus(r.reason || "不能 Pass", "warn");
    return;
  }
  selected.clear();
  audio.pass();
  renderAll();
  if (game.status === "playing") scheduleAi();
});

btnClear.addEventListener("click", async () => {
  await audio.unlock();
  selected.clear();
  renderHand();
  syncActions();
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  audio.setEnabled(!audio.enabled);
  btnMute.textContent = audio.enabled ? "音效開" : "音效關";
  btnMute.setAttribute("aria-pressed", audio.enabled ? "true" : "false");
});

document.body.addEventListener(
  "pointerdown",
  () => {
    void audio.unlock();
  },
  { once: true },
);

renderAll();
