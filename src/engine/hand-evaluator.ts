import { Card, HandEvaluation } from './types';

export function evaluate5CardHand(cards: Card[]): HandEvaluation {
    const ranks = cards.map((c) => c.numericValue).sort((a, b) => b - a);
    const suits = cards.map((c) => c.suit);

    const isFlush = suits.every((s) => s === suits[0]);
    let isStraight = false;

    const uniqueRanks = Array.from(new Set(ranks));
    if (uniqueRanks.length === 5) {
        if (uniqueRanks[0] - uniqueRanks[4] === 4) {
            isStraight = true;
        }
        if (
            !isStraight &&
            uniqueRanks.includes(14) &&
            uniqueRanks.includes(2) &&
            uniqueRanks.includes(3) &&
            uniqueRanks.includes(4) &&
            uniqueRanks.includes(5)
        ) {
            isStraight = true;
        }
    }

    const counts: Record<number, number> = {};
    ranks.forEach((r) => {
        counts[r] = (counts[r] || 0) + 1;
    });
    const countValues = Object.values(counts).sort((a, b) => b - a);

    let score = 0;
    let handName = '';

    if (isFlush && isStraight) {
        score = 8;
        handName = 'Straight Flush';
    } else if (countValues[0] === 4) {
        score = 7;
        handName = 'Four of a Kind';
    } else if (countValues[0] === 3 && countValues[1] === 2) {
        score = 6;
        handName = 'Full House';
    } else if (isFlush) {
        score = 5;
        handName = 'Flush';
    } else if (isStraight) {
        score = 4;
        handName = 'Straight';
    } else if (countValues[0] === 3) {
        score = 3;
        handName = 'Three of a Kind';
    } else if (countValues[0] === 2 && countValues[1] === 2) {
        score = 2;
        handName = 'Two Pair';
    } else if (countValues[0] === 2) {
        score = 1;
        handName = 'Pair';
    } else {
        score = 0;
        handName = 'High Card';
    }

    return {
        score: score * 1000000 + ranks[0] * 10000 + ranks[1] * 100 + ranks[2],
        name: handName
    };
}

export function getBest7CardHandScore(holeCards: Card[], communityCards: Card[]): HandEvaluation {
    const all7 = [...holeCards, ...communityCards];
    let best: HandEvaluation = { score: -1, name: '' };

    for (let i = 0; i < all7.length; i++) {
        for (let j = i + 1; j < all7.length; j++) {
            const fiveCards = all7.filter((_, idx) => idx !== i && idx !== j);
            const evalResult = evaluate5CardHand(fiveCards);
            if (evalResult.score > best.score) {
                best = evalResult;
            }
        }
    }
    return best;
}
