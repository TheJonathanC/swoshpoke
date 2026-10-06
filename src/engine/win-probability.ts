import { DeckData } from './deck';
import { evaluateBestHand, getBest7CardHandScore } from './hand-evaluator';
import { Card, Stage, WinPrediction } from './types';

export function calculateWinPrediction(
    holeCards: Card[],
    communityCards: Card[],
    activeOpponentsCount: number,
    stage: Stage,
    simulations: number = 400
): WinPrediction {
    if (!holeCards || holeCards.length < 2) {
        return {
            winPercentage: 0,
            tiePercentage: 0,
            lossPercentage: 0,
            currentHandName: 'Waiting for cards',
            stage,
            simulationsRun: 0
        };
    }

    // Determine current best hand with visible cards
    const visibleCards = [...holeCards, ...communityCards];
    const currentEval = evaluateBestHand(visibleCards);
    const currentHandName = currentEval.name || 'High Card';

    // If no opponents remain active, player is guaranteed 100%
    if (activeOpponentsCount <= 0) {
        return {
            winPercentage: 100,
            tiePercentage: 0,
            lossPercentage: 0,
            currentHandName,
            stage,
            simulationsRun: 0
        };
    }

    // Remaining unseen cards pool
    const deadCardKeys = new Set(visibleCards.map((c) => `${c.suit}${c.value}`));
    const fullDeck = new DeckData().cards;
    const pool = fullDeck.filter((c) => !deadCardKeys.has(`${c.suit}${c.value}`));

    let wins = 0;
    let ties = 0;
    const boardCardsNeeded = Math.max(0, 5 - communityCards.length);
    const totalCardsNeeded = boardCardsNeeded + activeOpponentsCount * 2;

    if (pool.length < totalCardsNeeded) {
        return {
            winPercentage: 50,
            tiePercentage: 0,
            lossPercentage: 50,
            currentHandName,
            stage,
            simulationsRun: 0
        };
    }

    for (let sim = 0; sim < simulations; sim++) {
        // Fast partial Fisher-Yates shuffle
        const available = [...pool];
        for (let k = available.length - 1; k >= available.length - totalCardsNeeded; k--) {
            const j = Math.floor(Math.random() * (k + 1));
            const tmp = available[k];
            available[k] = available[j];
            available[j] = tmp;
        }

        // Complete the board for this simulation
        const simBoard = [...communityCards];
        for (let b = 0; b < boardCardsNeeded; b++) {
            const card = available.pop();
            if (card) simBoard.push(card);
        }

        const myScore = getBest7CardHandScore(holeCards, simBoard).score;
        let isWin = true;
        let isTie = false;

        for (let opp = 0; opp < activeOpponentsCount; opp++) {
            const oppHole = [available.pop()!, available.pop()!];
            const oppScore = getBest7CardHandScore(oppHole, simBoard).score;

            if (oppScore > myScore) {
                isWin = false;
                isTie = false;
                break;
            } else if (oppScore === myScore) {
                isTie = true;
            }
        }

        if (isWin) {
            if (isTie) {
                ties++;
            } else {
                wins++;
            }
        }
    }

    const winPercentage = Number(((wins / simulations) * 100).toFixed(1));
    const tiePercentage = Number(((ties / simulations) * 100).toFixed(1));
    const lossPercentage = Number(Math.max(0, 100 - winPercentage - tiePercentage).toFixed(1));

    return {
        winPercentage,
        tiePercentage,
        lossPercentage,
        currentHandName,
        stage,
        simulationsRun: simulations
    };
}
