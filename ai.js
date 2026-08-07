/**
 * Simple Big Two AI — prefer smallest legal beat; pass if nothing cheap.
 */

import { legalMoves, cardPower } from "./game.js";

/**
 * @param {import('./game.js').Big2Game} game
 * @param {number} seat
 * @returns {{ action: 'play', cards: import('./game.js').Card[] } | { action: 'pass' }}
 */
export function chooseAiMove(game, seat) {
  let moves = legalMoves(game.hands[seat], game.trick);

  // Opening lead must include ♦3
  if (!game.trick && game.lastPlays.length === 0) {
    moves = moves.filter((m) => m.cards.some((c) => c.id === 0));
  }

  if (!moves.length) {
    if (game.trick) return { action: "pass" };
    // Must lead something — should not happen if hand nonempty
    const hand = game.hands[seat];
    if (hand.length) return { action: "play", cards: [hand[0]] };
    return { action: "pass" };
  }

  // Prefer shorter / weaker plays to shed safely; avoid dumping 2 early when leading
  moves.sort((a, b) => {
    if (a.cards.length !== b.cards.length) {
      // When leading, prefer 1–2 card plays; when following, same length anyway
      return a.cards.length - b.cards.length;
    }
    return a.power - b.power;
  });

  // If following a strong trick with only huge bombs, pass sometimes
  if (game.trick && moves.length) {
    const weakest = moves[0];
    const handLeft = game.hands[seat].length;
    if (
      weakest.power > 40 &&
      handLeft > 5 &&
      game.trick.type === "single" &&
      Math.random() < 0.35
    ) {
      return { action: "pass" };
    }
  }

  // When leading, avoid starting with 2 / spade A if alternatives
  if (!game.trick) {
    const soft = moves.filter((m) => {
      const top = Math.max(...m.cards.map(cardPower));
      return top < 12 * 4; // below rank 2 zone somewhat
    });
    if (soft.length) return { action: "play", cards: soft[0].cards };
  }

  return { action: "play", cards: moves[0].cards };
}
