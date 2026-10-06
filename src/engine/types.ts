export type Suit = '♠' | '♥' | '♦' | '♣';
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Stage = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

export interface Card {
    suit: Suit;
    value: CardValue;
    numericValue: number;
    color: '#dc2626' | '#0f172a';
}

export interface Player {
    id: number;
    name: string;
    chips: number;
    hand: Card[];
    currentBet: number;
    totalContribution: number;
    folded: boolean;
    isHuman: boolean;
    isAllIn: boolean;
    actedThisRound: boolean;
    lastAction?: string;
}

export interface HandEvaluation {
    score: number;
    name: string;
}

export interface ChipDenom {
    value: number;
    color: string;
    label: string;
    hex: number;
}

export interface WinPrediction {
    winPercentage: number;
    tiePercentage: number;
    lossPercentage: number;
    currentHandName: string;
    stage: Stage;
    simulationsRun: number;
}

export interface GameStateSnapshot {
    players: Player[];
    communityCards: Card[];
    pot: number;
    dealerIdx: number;
    currentTurnIdx: number;
    highestCurrentBet: number;
    smallBlind: number;
    bigBlind: number;
    stage: Stage;
    handInProgress: boolean;
    winPrediction?: WinPrediction;
    winner?: {
        player: Player;
        reason: string;
        handName?: string;
    };
}

export type PokerEventType =
    | 'log'
    | 'stateChange'
    | 'handStarted'
    | 'cardsDealt'
    | 'communityCardsRevealed'
    | 'playerAction'
    | 'stageChanged'
    | 'showdown'
    | 'potAwarded'
    | 'winPredictionUpdated';

export interface LogEvent {
    message: string;
    highlight?: boolean;
}

export interface CardsDealtEvent {
    players: {
        id: number;
        hand: Card[];
        isHuman: boolean;
    }[];
    communityCards: Card[];
}

export interface CommunityCardsRevealedEvent {
    startIndex: number;
    count: number;
    cards: Card[];
    stage: Stage;
}

export interface PlayerActionEvent {
    player: Player;
    actionType: 'Fold' | 'Check' | 'Call' | 'Raise' | 'All-In';
    amount: number;
    currentBet: number;
}

export interface ShowdownEvent {
    activePlayers: Player[];
    winner: Player;
    bestScore: number;
    bestHandName: string;
}

export interface PotAwardedEvent {
    winner: Player;
    potAmount: number;
    reason: string;
}
