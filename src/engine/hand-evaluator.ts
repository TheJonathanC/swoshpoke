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
        if (ranks[0] === 14 && ranks[1] === 13) {
            score = 9;
            handName = 'Royal Flush';
        } else {
            score = 8;
            handName = 'Straight Flush';
        }
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
    return evaluateBestHand([...holeCards, ...communityCards]);
}

export function evaluateBestHand(cards: Card[]): HandEvaluation {
    if (cards.length < 5) {
        if (cards.length === 2) {
            const sorted = [...cards].sort((a, b) => b.numericValue - a.numericValue);
            if (sorted[0].numericValue === sorted[1].numericValue) {
                return {
                    score: 1 * 1000000 + sorted[0].numericValue * 10000 + sorted[1].numericValue * 100,
                    name: `Pocket Pair (${sorted[0].value}s)`
                };
            }
            return {
                score: sorted[0].numericValue * 10000 + sorted[1].numericValue * 100,
                name: `High Card (${sorted[0].value})`
            };
        }
        return { score: 0, name: 'High Card' };
    }

    if (cards.length === 5) {
        return evaluate5CardHand(cards);
    }

    if (cards.length === 6) {
        let best: HandEvaluation = { score: -1, name: '' };
        for (let i = 0; i < cards.length; i++) {
            const fiveCards = cards.filter((_, idx) => idx !== i);
            const res = evaluate5CardHand(fiveCards);
            if (res.score > best.score) {
                best = res;
            }
        }
        return best;
    }

    // 7 or more cards
    let best: HandEvaluation = { score: -1, name: '' };
    for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
            const fiveCards = cards.filter((_, idx) => idx !== i && idx !== j);
            const res = evaluate5CardHand(fiveCards);
            if (res.score > best.score) {
                best = res;
            }
        }
    }
    return best;
}
