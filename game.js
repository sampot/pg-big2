/**
 * 大老二 rules (Taiwan-style homage). Original table UX — not a commercial clone.
 * Rank: 3 < … < A < 2. Suit: ♦ < ♣ < ♥ < ♠.
 */

export const SUITS = ["♦", "♣", "♥", "♠"];
export const SUIT_NAMES = ["方塊", "梅花", "紅心", "黑桃"];
export const RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];

/** Five-card category rank (low → high). */
export const FIVE_RANK = {
  straight: 1,
  flush: 2,
  fullhouse: 3,
  four: 4,
  straightflush: 5,
};

/**
 * @typedef {{ id: number, rank: number, suit: number }} Card
 * @typedef {'single'|'pair'|'triple'|'straight'|'flush'|'fullhouse'|'four'|'straightflush'} ComboType
 * @typedef {{ type: ComboType, cards: Card[], power: number }} Combo
 */

/** Absolute single-card strength. */
export function cardPower(c) {
  return c.rank * 4 + c.suit;
}

export function cardLabel(c) {
  return `${SUITS[c.suit]}${RANKS[c.rank]}`;
}

export function isRed(c) {
  return c.suit === 0 || c.suit === 2;
}

/** @returns {Card[]} */
export function makeDeck() {
  /** @type {Card[]} */
  const d = [];
  for (let rank = 0; rank < 13; rank++) {
    for (let suit = 0; suit < 4; suit++) {
      d.push({ id: rank * 4 + suit, rank, suit });
    }
  }
  return d;
}

/** @param {Card[]} deck */
export function shuffle(deck) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** @param {Card[]} cards */
export function sortCards(cards) {
  return cards.slice().sort((a, b) => cardPower(a) - cardPower(b));
}

/**
 * @param {Card[]} cards
 * @returns {Combo | null}
 */
export function classify(cards) {
  const n = cards.length;
  if (n === 0 || n === 4 || n > 5) return null;
  const sorted = sortCards(cards);
  if (n === 1) {
    return { type: "single", cards: sorted, power: cardPower(sorted[0]) };
  }
  if (n === 2) {
    if (sorted[0].rank !== sorted[1].rank) return null;
    return {
      type: "pair",
      cards: sorted,
      power: sorted[0].rank * 4 + Math.max(sorted[0].suit, sorted[1].suit),
    };
  }
  if (n === 3) {
    if (sorted[0].rank !== sorted[1].rank || sorted[1].rank !== sorted[2].rank) {
      return null;
    }
    return {
      type: "triple",
      cards: sorted,
      power: sorted[0].rank * 4 + Math.max(...sorted.map((c) => c.suit)),
    };
  }
  // n === 5
  const ranks = sorted.map((c) => c.rank);
  const suits = sorted.map((c) => c.suit);
  const flush = suits.every((s) => s === suits[0]);
  const straight = isStraightRanks(ranks);
  const counts = rankCounts(sorted);
  const parts = Object.entries(counts)
    .map(([r, k]) => ({ rank: Number(r), n: k }))
    .sort((a, b) => b.n - a.n || a.rank - b.rank);

  if (straight && flush) {
    return {
      type: "straightflush",
      cards: sorted,
      power: FIVE_RANK.straightflush * 1e6 + cardPower(sorted[4]),
    };
  }
  if (parts[0]?.n === 4) {
    return {
      type: "four",
      cards: sorted,
      power: FIVE_RANK.four * 1e6 + parts[0].rank * 4,
    };
  }
  if (parts[0]?.n === 3 && parts[1]?.n === 2) {
    return {
      type: "fullhouse",
      cards: sorted,
      power: FIVE_RANK.fullhouse * 1e6 + parts[0].rank * 4,
    };
  }
  if (flush) {
    return {
      type: "flush",
      cards: sorted,
      power: FIVE_RANK.flush * 1e6 + cardPower(sorted[4]),
    };
  }
  if (straight) {
    return {
      type: "straight",
      cards: sorted,
      power: FIVE_RANK.straight * 1e6 + cardPower(sorted[4]),
    };
  }
  return null;
}

/** @param {number[]} ranks sorted ascending */
function isStraightRanks(ranks) {
  // No wrapping; 2 (rank 12) not allowed in straights — keeps A-high TJQKA clean.
  if (ranks.includes(12)) return false;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

/** @param {Card[]} cards */
function rankCounts(cards) {
  /** @type {Record<number, number>} */
  const m = {};
  for (const c of cards) m[c.rank] = (m[c.rank] || 0) + 1;
  return m;
}

/**
 * @param {Combo} play
 * @param {Combo | null} trick
 */
export function beats(play, trick) {
  if (!trick) return true;
  const five = new Set([
    "straight",
    "flush",
    "fullhouse",
    "four",
    "straightflush",
  ]);
  if (play.cards.length !== trick.cards.length) return false;
  if (play.cards.length < 5) {
    return play.type === trick.type && play.power > trick.power;
  }
  if (!five.has(play.type) || !five.has(trick.type)) return false;
  return play.power > trick.power;
}

/**
 * Enumerate legal combos from hand that beat current trick (or any if leading).
 * @param {Card[]} hand
 * @param {Combo | null} trick
 * @returns {Combo[]}
 */
export function legalMoves(hand, trick) {
  const sorted = sortCards(hand);
  /** @type {Combo[]} */
  const out = [];
  const push = (cards) => {
    const c = classify(cards);
    if (c && beats(c, trick)) out.push(c);
  };

  if (!trick || trick.cards.length === 1) {
    for (const c of sorted) push([c]);
  }
  if (!trick || trick.cards.length === 2) {
    for (let r = 0; r < 13; r++) {
      const g = sorted.filter((c) => c.rank === r);
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) push([g[i], g[j]]);
      }
    }
  }
  if (!trick || trick.cards.length === 3) {
    for (let r = 0; r < 13; r++) {
      const g = sorted.filter((c) => c.rank === r);
      if (g.length >= 3) {
        for (let i = 0; i < g.length; i++) {
          for (let j = i + 1; j < g.length; j++) {
            for (let k = j + 1; k < g.length; k++) push([g[i], g[j], g[k]]);
          }
        }
      }
    }
  }
  if (!trick || trick.cards.length === 5) {
    enumerateFives(sorted, (cards) => push(cards));
  }

  // Deduplicate by card id set
  const seen = new Set();
  return out.filter((c) => {
    const key = c.cards
      .map((x) => x.id)
      .sort((a, b) => a - b)
      .join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * @param {Card[]} hand sorted
 * @param {(cards: Card[]) => void} fn
 */
function enumerateFives(hand, fn) {
  const n = hand.length;
  if (n < 5) return;
  // Straights / flushes / SF via combinations of 5
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let c = b + 1; c < n; c++) {
        for (let d = c + 1; d < n; d++) {
          for (let e = d + 1; e < n; e++) {
            const cards = [hand[a], hand[b], hand[c], hand[d], hand[e]];
            const cl = classify(cards);
            if (cl && cl.cards.length === 5) fn(cards);
          }
        }
      }
    }
  }
}

/**
 * @param {Card[]} hand
 * @param {Card[]} play
 */
export function removeCards(hand, play) {
  const ids = new Set(play.map((c) => c.id));
  return hand.filter((c) => !ids.has(c.id));
}

export function comboTypeLabel(type) {
  switch (type) {
    case "single":
      return "單張";
    case "pair":
      return "對子";
    case "triple":
      return "三條";
    case "straight":
      return "順子";
    case "flush":
      return "同花";
    case "fullhouse":
      return "葫蘆";
    case "four":
      return "鐵支";
    case "straightflush":
      return "同花順";
    default:
      return type;
  }
}

export class Big2Game {
  constructor() {
    /** @type {Card[][]} */
    this.hands = [[], [], [], []];
    /** @type {string[]} */
    this.names = ["你", "小梅", "阿心", "黑哥"];
    /** human seat */
    this.human = 0;
    this.turn = 0;
    /** @type {Combo | null} */
    this.trick = null;
    this.trickLeader = 0;
    this.passes = 0;
    /** @type {'ready'|'playing'|'over'} */
    this.status = "ready";
    /** @type {number | null} */
    this.winner = null;
    /** seats finished order */
    this.finished = [];
    this.message = "點「開局」發牌";
    /** @type {{ seat: number, combo: Combo | null, pass: boolean }[]} */
    this.lastPlays = [];
  }

  deal() {
    const deck = shuffle(makeDeck());
    this.hands = [[], [], [], []];
    for (let i = 0; i < 52; i++) this.hands[i % 4].push(deck[i]);
    this.hands = this.hands.map(sortCards);
    this.finished = [];
    this.winner = null;
    this.trick = null;
    this.passes = 0;
    this.lastPlays = [];
    this.status = "playing";

    // ♦3 starts
    const diamond3 = 0 * 4 + 0;
    this.turn = this.hands.findIndex((h) => h.some((c) => c.id === diamond3));
    if (this.turn < 0) this.turn = 0;
    this.trickLeader = this.turn;
    this.message =
      this.turn === this.human
        ? "你有方塊 3，先出牌"
        : `${this.names[this.turn]} 有方塊 3，先出`;
  }

  reset() {
    this.hands = [[], [], [], []];
    this.turn = 0;
    this.trick = null;
    this.trickLeader = 0;
    this.passes = 0;
    this.status = "ready";
    this.winner = null;
    this.finished = [];
    this.lastPlays = [];
    this.message = "點「開局」發牌";
  }

  /** Must include ♦3 when leading the very first trick of a deal. */
  firstTrickConstraint(combo) {
    if (this.trick || this.lastPlays.length) return true;
    const d3 = combo.cards.some((c) => c.id === 0);
    // Only the ♦3 owner leads first; they must include ♦3 in the opening play
    return d3;
  }

  /**
   * @param {number} seat
   * @param {Card[]} cards
   */
  play(seat, cards) {
    if (this.status !== "playing") return { ok: false, reason: "未開局" };
    if (seat !== this.turn) return { ok: false, reason: "還沒輪到" };
    if (this.finished.includes(seat)) return { ok: false, reason: "已出完" };

    const combo = classify(cards);
    if (!combo) return { ok: false, reason: "不是合法牌型" };
    if (!beats(combo, this.trick)) {
      return { ok: false, reason: this.trick ? "壓不住上家" : "無法出牌" };
    }
    // Cards must be in hand
    const ids = new Set(this.hands[seat].map((c) => c.id));
    if (!cards.every((c) => ids.has(c.id))) {
      return { ok: false, reason: "手牌沒有這些" };
    }
    if (!this.firstTrickConstraint(combo)) {
      return { ok: false, reason: "首輪須含方塊 3" };
    }

    this.hands[seat] = removeCards(this.hands[seat], cards);
    this.trick = combo;
    this.trickLeader = seat;
    this.passes = 0;
    this.lastPlays.push({ seat, combo, pass: false });
    this.message = `${this.names[seat]} 出${comboTypeLabel(combo.type)} ${combo.cards.map(cardLabel).join(" ")}`;

    if (this.hands[seat].length === 0) {
      this.finished.push(seat);
      if (this.winner == null) this.winner = seat;
      this.status = "over";
      this.message = `${this.names[seat]} 出完！獲勝`;
      return { ok: true, won: true };
    }

    this.advanceTurn();
    return { ok: true };
  }

  /**
   * @param {number} seat
   */
  pass(seat) {
    if (this.status !== "playing") return { ok: false, reason: "未開局" };
    if (seat !== this.turn) return { ok: false, reason: "還沒輪到" };
    if (!this.trick) return { ok: false, reason: "首家不能 Pass，請出牌" };

    this.passes += 1;
    this.lastPlays.push({ seat, combo: null, pass: true });
    this.message = `${this.names[seat]} Pass`;

    // Everyone else passed → leader wins trick and leads again
    const active = [0, 1, 2, 3].filter((s) => !this.finished.includes(s));
    if (this.passes >= active.length - 1) {
      this.trick = null;
      this.passes = 0;
      this.turn = this.trickLeader;
      // skip finished
      let guard = 0;
      while (this.finished.includes(this.turn) && guard++ < 4) {
        this.turn = (this.turn + 1) % 4;
      }
      this.message = `${this.names[this.turn]} 自由出牌`;
      return { ok: true, free: true };
    }

    this.advanceTurn();
    return { ok: true };
  }

  advanceTurn() {
    let guard = 0;
    do {
      this.turn = (this.turn + 1) % 4;
      guard += 1;
    } while (this.finished.includes(this.turn) && guard < 4);
  }

  humanLegal() {
    return legalMoves(this.hands[this.human], this.trick);
  }
}
