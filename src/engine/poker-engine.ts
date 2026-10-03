import { DeckData } from './deck';
import { getBest7CardHandScore } from './hand-evaluator';
import {
    Card,
    CardsDealtEvent,
    CommunityCardsRevealedEvent,
    GameStateSnapshot,
    LogEvent,
    Player,
    PlayerActionEvent,
    PokerEventType,
    PotAwardedEvent,
    ShowdownEvent,
    Stage
} from './types';

export interface PokerEngineOptions {
    initialChips?: number;
    smallBlind?: number;
    bigBlind?: number;
    botDelayMs?: number; // Delay for bot actions in ms (set to 0 for synchronous headless execution)
    autoStepBots?: boolean; // If true, engine automatically triggers bot actions after botDelayMs
}

type EventListenerMap = {
    log: (event: LogEvent) => void;
    stateChange: (state: GameStateSnapshot) => void;
    handStarted: (state: GameStateSnapshot) => void;
    cardsDealt: (event: CardsDealtEvent) => void;
    communityCardsRevealed: (event: CommunityCardsRevealedEvent) => void;
    playerAction: (event: PlayerActionEvent) => void;
    stageChanged: (stage: Stage) => void;
    showdown: (event: ShowdownEvent) => void;
    potAwarded: (event: PotAwardedEvent) => void;
};

export class PokerEngine {
    public deck: DeckData = new DeckData();
    public players: Player[] = [];
    public communityCards: Card[] = [];
    public pot: number = 0;
    public dealerIdx: number = 0;
    public currentTurnIdx: number = 0;
    public highestCurrentBet: number = 0;
    public smallBlind: number = 10;
    public bigBlind: number = 20;
    public stage: Stage = 'PREFLOP';
    public handInProgress: boolean = false;
    public lastWinner?: { player: Player; reason: string; handName?: string };

    private botDelayMs: number = 800;
    private autoStepBots: boolean = true;
    private botTimer: NodeJS.Timeout | null = null;
    private listeners: { [K in PokerEventType]?: Set<(data: unknown) => void> } = {};

    constructor(options: PokerEngineOptions = {}) {
        this.smallBlind = options.smallBlind ?? 10;
        this.bigBlind = options.bigBlind ?? 20;
        this.botDelayMs = options.botDelayMs ?? 800;
        this.autoStepBots = options.autoStepBots ?? true;

        const startingChips = options.initialChips ?? 1000;
        this.players = [
            {
                id: 0,
                name: 'You',
                chips: startingChips,
                hand: [],
                currentBet: 0,
                totalContribution: 0,
                folded: false,
                isHuman: true,
                isAllIn: false,
                actedThisRound: false,
                lastAction: ''
            },
            {
                id: 1,
                name: 'Bot 1',
                chips: startingChips,
                hand: [],
                currentBet: 0,
                totalContribution: 0,
                folded: false,
                isHuman: false,
                isAllIn: false,
                actedThisRound: false,
                lastAction: ''
            },
            {
                id: 2,
                name: 'Bot 2',
                chips: startingChips,
                hand: [],
                currentBet: 0,
                totalContribution: 0,
                folded: false,
                isHuman: false,
                isAllIn: false,
                actedThisRound: false,
                lastAction: ''
            },
            {
                id: 3,
                name: 'Bot 3',
                chips: startingChips,
                hand: [],
                currentBet: 0,
                totalContribution: 0,
                folded: false,
                isHuman: false,
                isAllIn: false,
                actedThisRound: false,
                lastAction: ''
            }
        ];
    }

    public on<K extends PokerEventType>(event: K, listener: EventListenerMap[K]): () => void {
        let set = this.listeners[event];
        if (!set) {
            set = new Set();
            this.listeners[event] = set;
        }
        const handler = listener as (data: unknown) => void;
        set.add(handler);

        return () => {
            this.listeners[event]?.delete(handler);
        };
    }

    private emit<K extends PokerEventType>(event: K, data: Parameters<EventListenerMap[K]>[0]): void {
        const set = this.listeners[event];
        if (set) {
            set.forEach((fn) => {
                try {
                    fn(data);
                } catch (e) {
                    console.error(`Error in poker engine event listener for '${event}':`, e);
                }
            });
        }
    }

    public log(message: string, highlight: boolean = false): void {
        this.emit('log', { message, highlight });
    }

    public getSnapshot(): GameStateSnapshot {
        return {
            players: this.players.map((p) => ({
                ...p,
                hand: [...p.hand]
            })),
            communityCards: [...this.communityCards],
            pot: this.pot,
            dealerIdx: this.dealerIdx,
            currentTurnIdx: this.currentTurnIdx,
            highestCurrentBet: this.highestCurrentBet,
            smallBlind: this.smallBlind,
            bigBlind: this.bigBlind,
            stage: this.stage,
            handInProgress: this.handInProgress,
            winner: this.lastWinner
                ? {
                      ...this.lastWinner,
                      player: { ...this.lastWinner.player }
                  }
                : undefined
        };
    }

    private notifyStateChange(): void {
        this.emit('stateChange', this.getSnapshot());
    }

    public startNewHand(): boolean {
        this.clearBotTimer();

        this.deck.reset();
        this.communityCards = [];
        this.pot = 0;
        this.stage = 'PREFLOP';
        this.lastWinner = undefined;
        this.handInProgress = true;

        this.players.forEach((p) => {
            p.hand = [this.deck.deal(), this.deck.deal()];
            p.currentBet = 0;
            p.totalContribution = 0;
            p.folded = p.chips <= 0;
            p.isAllIn = false;
            p.actedThisRound = false;
            p.lastAction = '';
        });

        const activeCount = this.players.filter((p) => !p.folded).length;
        if (activeCount < 2) {
            this.log('Not enough players with chips!', true);
            this.handInProgress = false;
            this.notifyStateChange();
            return false;
        }

        do {
            this.dealerIdx = (this.dealerIdx + 1) % 4;
        } while (this.players[this.dealerIdx].chips <= 0);

        this.log('--- New Hand Started ---', true);

        // Pre-deal 5 community cards to be revealed later
        for (let i = 0; i < 5; i++) {
            this.communityCards.push(this.deck.deal());
        }

        const sbIdx = this.getNextActivePlayerIdx(this.dealerIdx);
        const bbIdx = this.getNextActivePlayerIdx(sbIdx);

        this.postBlind(this.players[sbIdx], this.smallBlind, 'Small Blind');
        this.postBlind(this.players[bbIdx], this.bigBlind, 'Big Blind');

        this.highestCurrentBet = this.bigBlind;
        this.currentTurnIdx = this.getNextActivePlayerIdx(bbIdx);

        this.emit('handStarted', this.getSnapshot());
        this.emit('cardsDealt', {
            players: this.players.map((p) => ({
                id: p.id,
                hand: [...p.hand],
                isHuman: p.isHuman
            })),
            communityCards: [...this.communityCards]
        });

        this.notifyStateChange();
        this.processTurn();
        return true;
    }

    public getNextActivePlayerIdx(fromIdx: number): number {
        let idx = (fromIdx + 1) % 4;
        let loopCount = 0;
        while ((this.players[idx].folded || this.players[idx].isAllIn) && loopCount < 4) {
            idx = (idx + 1) % 4;
            loopCount++;
            if (idx === fromIdx) break;
        }
        return idx;
    }

    private postBlind(player: Player, amount: number, label: string): void {
        const posted = Math.min(player.chips, amount);
        player.chips -= posted;
        player.currentBet = posted;
        player.totalContribution += posted;
        if (player.chips === 0) {
            player.isAllIn = true;
        }
        this.pot += posted;
        this.log(`${player.name} posts ${label} ($${posted})`);
    }

    public processTurn(): void {
        const activeNonFolded = this.players.filter((p) => !p.folded);

        if (activeNonFolded.length === 1) {
            this.awardPot(activeNonFolded[0], 'Everyone else folded.');
            return;
        }

        if (this.isRoundComplete()) {
            this.nextStage();
            return;
        }

        const p = this.players[this.currentTurnIdx];

        if (p.folded || p.isAllIn) {
            this.currentTurnIdx = (this.currentTurnIdx + 1) % 4;
            this.processTurn();
            return;
        }

        this.notifyStateChange();

        if (!p.isHuman && this.autoStepBots) {
            this.scheduleBotTurn(p);
        }
    }

    public stepBot(): boolean {
        const p = this.players[this.currentTurnIdx];
        if (!p || p.isHuman || p.folded || p.isAllIn || !this.handInProgress) {
            return false;
        }
        this.executeBotAction(p);
        return true;
    }

    private scheduleBotTurn(bot: Player): void {
        this.clearBotTimer();
        if (this.botDelayMs <= 0) {
            this.executeBotAction(bot);
        } else {
            this.botTimer = setTimeout(() => {
                this.executeBotAction(bot);
            }, this.botDelayMs);
        }
    }

    private clearBotTimer(): void {
        if (this.botTimer) {
            clearTimeout(this.botTimer);
            this.botTimer = null;
        }
    }

    private executeBotAction(bot: Player): void {
        const callAmount = this.highestCurrentBet - bot.currentBet;

        if (callAmount === 0) {
            if (Math.random() > 0.6) {
                this.executeBet(bot, this.bigBlind, 'Raise');
            } else {
                this.executeBet(bot, 0, 'Check');
            }
        } else {
            if (callAmount > bot.chips * 0.4 && Math.random() > 0.3) {
                this.executeFold(bot);
            } else {
                this.executeBet(bot, callAmount, 'Call');
            }
        }

        this.currentTurnIdx = (this.currentTurnIdx + 1) % 4;
        this.processTurn();
    }

    public isRoundComplete(): boolean {
        const activeNonFolded = this.players.filter((p) => !p.folded);
        const activeCanAct = activeNonFolded.filter((p) => !p.isAllIn);

        if (activeCanAct.length <= 1) {
            const allMatched = activeCanAct.every(
                (p) => p.currentBet === this.highestCurrentBet
            );
            if (allMatched) return true;
        }

        return activeCanAct.every(
            (p) => p.actedThisRound && p.currentBet === this.highestCurrentBet
        );
    }

    public fold(playerId: number = 0): void {
        const p = this.players[playerId];
        if (!p || p.folded || this.currentTurnIdx !== playerId || !this.handInProgress) return;

        this.executeFold(p);
        this.currentTurnIdx = (this.currentTurnIdx + 1) % 4;
        this.processTurn();
    }

    public check(playerId: number = 0): void {
        const p = this.players[playerId];
        if (!p || p.folded || this.currentTurnIdx !== playerId || !this.handInProgress) return;

        const callAmt = this.highestCurrentBet - p.currentBet;
        if (callAmt === 0) {
            this.executeBet(p, 0, 'Check');
            this.currentTurnIdx = (this.currentTurnIdx + 1) % 4;
            this.processTurn();
        } else {
            this.call(playerId);
        }
    }

    public call(playerId: number = 0): void {
        const p = this.players[playerId];
        if (!p || p.folded || this.currentTurnIdx !== playerId || !this.handInProgress) return;

        const callAmt = this.highestCurrentBet - p.currentBet;
        this.executeBet(p, callAmt, callAmt === 0 ? 'Check' : 'Call');
        this.currentTurnIdx = (this.currentTurnIdx + 1) % 4;
        this.processTurn();
    }

    public raise(targetTotalBet: number, playerId: number = 0): void {
        const p = this.players[playerId];
        if (!p || p.folded || this.currentTurnIdx !== playerId || !this.handInProgress) return;

        const amountToPost = targetTotalBet - p.currentBet;
        this.executeBet(p, amountToPost, 'Raise');
        this.currentTurnIdx = (this.currentTurnIdx + 1) % 4;
        this.processTurn();
    }

    public executeFold(p: Player): void {
        p.folded = true;
        p.actedThisRound = true;
        p.lastAction = 'Fold';
        this.log(`${p.name} folds.`);

        this.emit('playerAction', {
            player: p,
            actionType: 'Fold',
            amount: 0,
            currentBet: p.currentBet
        });
    }

    public executeBet(
        p: Player,
        betAmount: number,
        typeLabel: 'Check' | 'Call' | 'Raise' | 'All-In'
    ): void {
        let actualBet = Math.min(p.chips, Math.max(0, betAmount));
        if (actualBet >= p.chips && p.chips > 0) {
            actualBet = p.chips;
            p.isAllIn = true;
            typeLabel = 'All-In';
        }

        p.chips -= actualBet;
        p.currentBet += actualBet;
        p.totalContribution += actualBet;
        this.pot += actualBet;
        p.actedThisRound = true;

        if (p.currentBet > this.highestCurrentBet) {
            this.highestCurrentBet = p.currentBet;
            this.players.forEach((other) => {
                if (other.id !== p.id && !other.folded && !other.isAllIn) {
                    other.actedThisRound = false;
                }
            });
        }

        p.lastAction = `${typeLabel} $${actualBet}`;

        if (typeLabel === 'Raise' || typeLabel === 'All-In') {
            this.log(`${p.name} raises to $${p.currentBet}`);
        } else if (typeLabel === 'Check') {
            this.log(`${p.name} checks.`);
        } else {
            this.log(`${p.name} ${typeLabel.toLowerCase()}s $${actualBet}`);
        }

        this.emit('playerAction', {
            player: p,
            actionType: typeLabel,
            amount: actualBet,
            currentBet: p.currentBet
        });
    }

    public nextStage(): void {
        this.players.forEach((p) => {
            p.currentBet = 0;
            p.actedThisRound = false;
            p.lastAction = '';
        });
        this.highestCurrentBet = 0;

        if (this.stage === 'PREFLOP') {
            this.stage = 'FLOP';
            this.revealCommunityCards(0, 3);
        } else if (this.stage === 'FLOP') {
            this.stage = 'TURN';
            this.revealCommunityCards(3, 1);
        } else if (this.stage === 'TURN') {
            this.stage = 'RIVER';
            this.revealCommunityCards(4, 1);
        } else if (this.stage === 'RIVER') {
            this.stage = 'SHOWDOWN';
            this.emit('stageChanged', this.stage);
            this.handleShowdown();
            return;
        }

        this.emit('stageChanged', this.stage);
        this.currentTurnIdx = this.getNextActivePlayerIdx(this.dealerIdx);

        const canAct = this.players.filter((p) => !p.folded && !p.isAllIn);
        if (canAct.length <= 1) {
            this.notifyStateChange();
            if (this.autoStepBots) {
                setTimeout(() => this.nextStage(), Math.max(500, this.botDelayMs));
            }
        } else {
            this.processTurn();
        }
    }

    public revealCommunityCards(startIndex: number, count: number): void {
        const revealed = this.communityCards.slice(startIndex, startIndex + count);
        this.emit('communityCardsRevealed', {
            startIndex,
            count,
            cards: revealed,
            stage: this.stage
        });
    }

    public handleShowdown(): void {
        const activePlayers = this.players.filter((p) => !p.folded);

        this.log('--- Showdown ---', true);

        let winner = activePlayers[0];
        let bestScore = -1;
        let bestHandName = '';

        activePlayers.forEach((p) => {
            const result = getBest7CardHandScore(p.hand, this.communityCards);
            if (result.score > bestScore) {
                bestScore = result.score;
                winner = p;
                bestHandName = result.name;
            }
        });

        this.emit('showdown', {
            activePlayers,
            winner,
            bestScore,
            bestHandName
        });

        this.awardPot(winner, `Best Hand at Showdown with a ${bestHandName}!`, bestHandName);
    }

    public awardPot(winner: Player, reason: string, handName?: string): void {
        const potAmount = this.pot;
        winner.chips += potAmount;
        this.log(`🏆 ${winner.name} wins $${potAmount}. ${reason}`, true);

        this.lastWinner = {
            player: winner,
            reason,
            handName
        };
        this.handInProgress = false;

        this.emit('potAwarded', {
            winner,
            potAmount,
            reason
        });

        this.notifyStateChange();
    }

    public destroy(): void {
        this.clearBotTimer();
        this.listeners = {};
    }
}
