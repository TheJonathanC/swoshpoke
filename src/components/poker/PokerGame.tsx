'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PokerEngine } from '@/engine/poker-engine';
import { GameStateSnapshot } from '@/engine/types';
import { evaluateBestHand } from '@/engine/hand-evaluator';
import { Poker3DScene } from './poker-3d';
import HandHierarchyModal from './HandHierarchyModal';
import {
    TrophyIcon,
    HistoryIcon,
    CloseIcon,
    ChipIcon,
    SuitSpade,
    SuitHeart,
    SuitDiamond,
    SuitClub
} from './poker-icons';
import './poker.css';

interface LogItem {
    id: number;
    message: string;
    highlight?: boolean;
    timestamp: string;
}

function RenderCardSuit({ suit, color }: { suit: string; color: string }) {
    const isRed = color === '#dc2626' || color === 'red';
    const c = isRed ? '#e11d48' : '#0f172a';
    if (suit === '♠') return <SuitSpade className="w-3.5 h-3.5" color={c} />;
    if (suit === '♥') return <SuitHeart className="w-3.5 h-3.5" color={c} />;
    if (suit === '♦') return <SuitDiamond className="w-3.5 h-3.5" color={c} />;
    return <SuitClub className="w-3.5 h-3.5" color={c} />;
}

export default function PokerGame() {
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<Poker3DScene | null>(null);
    const engineRef = useRef<PokerEngine | null>(null);

    const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [hudPositions, setHudPositions] = useState<{ [id: number]: { x: number; y: number } }>({});
    const [raiseValue, setRaiseValue] = useState<number>(0);
    const [controlsEnabled, setControlsEnabled] = useState<boolean>(false);
    const [showNextHand, setShowNextHand] = useState<boolean>(false);
    const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
    const [showHandHierarchy, setShowHandHierarchy] = useState<boolean>(false);

    const logCounter = useRef(0);

    const human = gameState?.players[0];
    const callAmt = gameState && human ? gameState.highestCurrentBet - human.currentBet : 0;
    const minRaiseTotal = gameState && human ? gameState.highestCurrentBet + gameState.bigBlind : 0;
    const sliderMax = human ? human.chips + human.currentBet : 100;
    const sliderMin = Math.min(minRaiseTotal, sliderMax);

    // Handlers
    const handleFold = useCallback(() => {
        if (!controlsEnabled || !engineRef.current) return;
        setControlsEnabled(false);
        engineRef.current.fold(0);
    }, [controlsEnabled]);

    const handleCheckCall = useCallback(() => {
        if (!controlsEnabled || !engineRef.current) return;
        setControlsEnabled(false);
        if (callAmt === 0) {
            engineRef.current.check(0);
        } else {
            engineRef.current.call(0);
        }
    }, [controlsEnabled, callAmt]);

    const handleSetRaiseAmount = useCallback((val: number) => {
        const clamped = Math.max(sliderMin, Math.min(sliderMax, Math.round(val / 10) * 10));
        setRaiseValue(clamped);
    }, [sliderMin, sliderMax]);

    const handleRaise = useCallback(() => {
        if (!controlsEnabled || !engineRef.current) return;
        setControlsEnabled(false);
        engineRef.current.raise(raiseValue, 0);
    }, [controlsEnabled, raiseValue]);

    const handleNextHand = useCallback(() => {
        setShowNextHand(false);
        if (engineRef.current) {
            engineRef.current.startNewHand();
        }
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Avoid triggering shortcuts when inside input fields
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
                return;
            }

            if (e.key === 'Escape') {
                setShowHandHierarchy(false);
                setIsHistoryDrawerOpen(false);
                return;
            }

            if (e.key === 'h' || e.key === 'H') {
                setShowHandHierarchy((prev) => !prev);
                return;
            }

            if (e.key === 'l' || e.key === 'L') {
                setIsHistoryDrawerOpen((prev) => !prev);
                return;
            }

            if (showNextHand && (e.key === ' ' || e.key === 'Enter')) {
                e.preventDefault();
                handleNextHand();
                return;
            }

            if (!controlsEnabled) return;

            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                handleFold();
            } else if (e.key === 'c' || e.key === 'C' || e.key === ' ') {
                e.preventDefault();
                handleCheckCall();
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                handleRaise();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [controlsEnabled, showNextHand, handleFold, handleCheckCall, handleRaise, handleNextHand]);

    // Engine & 3D Initialization
    useEffect(() => {
        if (!canvasContainerRef.current) return;

        // Initialize 3D Scene
        const scene = new Poker3DScene(canvasContainerRef.current, (coords) => {
            const map: { [id: number]: { x: number; y: number } } = {};
            coords.forEach((c) => {
                map[c.id] = { x: c.x, y: c.y };
            });
            setHudPositions(map);
        });
        sceneRef.current = scene;

        // Initialize Independent Poker Engine
        const engine = new PokerEngine({
            initialChips: 1000,
            smallBlind: 10,
            bigBlind: 20,
            botDelayMs: 750,
            autoStepBots: true
        });
        engineRef.current = engine;

        const formatTime = () => {
            const d = new Date();
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
        };

        // Wire Engine Events
        const unsubLog = engine.on('log', ({ message, highlight }) => {
            setLogs((prev) => [
                { id: ++logCounter.current, message, highlight, timestamp: formatTime() },
                ...prev.slice(0, 75)
            ]);
        });

        const unsubCardsDealt = engine.on('cardsDealt', ({ players, communityCards }) => {
            const playerStates = players.map((p) => ({
                id: p.id,
                hand: p.hand,
                folded: false,
                isHuman: p.isHuman
            }));
            scene.dealInitial3DCards(playerStates, communityCards);
        });

        const unsubCommunity = engine.on('communityCardsRevealed', ({ startIndex, count }) => {
            scene.revealCommunityCards(startIndex, count);
        });

        const unsubAction = engine.on('playerAction', ({ player, actionType }) => {
            if (actionType === 'Fold') {
                scene.animateFold(player.id, player.isHuman);
            }
        });

        const unsubShowdown = engine.on('showdown', ({ activePlayers }) => {
            scene.revealBotCardsForShowdown(activePlayers.map((p) => p.id));
        });

        const unsubPotAwarded = engine.on('potAwarded', () => {
            setShowNextHand(true);
            setControlsEnabled(false);
        });

        const unsubStateChange = engine.on('stateChange', (snapshot) => {
            setGameState(snapshot);

            // Update 3D chip stacks & pot
            snapshot.players.forEach((p) => {
                scene.renderPlayer3DChips(p.id, p.chips, p.currentBet);
            });
            scene.renderPot3DChips(snapshot.pot);

            // Human player controls enable/disable
            const humanPlayer = snapshot.players[0];
            const isHumanTurn =
                snapshot.currentTurnIdx === 0 &&
                snapshot.stage !== 'SHOWDOWN' &&
                snapshot.handInProgress &&
                !humanPlayer.folded &&
                !humanPlayer.isAllIn;

            setControlsEnabled(isHumanTurn);

            // Compute slider values
            const minRaise = snapshot.highestCurrentBet + snapshot.bigBlind;
            const maxVal = humanPlayer.chips + humanPlayer.currentBet;
            const minVal = Math.min(minRaise, maxVal);
            setRaiseValue((prev) => {
                if (prev < minVal || prev > maxVal) return minVal;
                return prev;
            });
        });

        const unsubWinPrediction = engine.on('winPredictionUpdated', (prediction) => {
            setGameState((prev) => (prev ? { ...prev, winPrediction: prediction } : null));
        });

        // Start first hand
        engine.startNewHand();

        return () => {
            unsubLog();
            unsubCardsDealt();
            unsubCommunity();
            unsubAction();
            unsubShowdown();
            unsubPotAwarded();
            unsubStateChange();
            unsubWinPrediction();

            engine.destroy();
            scene.destroy();
        };
    }, []);

    // Button label formatting
    let checkCallLabel = 'Check';
    let checkCallSub = 'Free';
    if (human && callAmt > 0) {
        if (callAmt >= human.chips) {
            checkCallLabel = 'All-In';
            checkCallSub = `$${human.chips}`;
        } else {
            checkCallLabel = 'Call';
            checkCallSub = `$${callAmt}`;
        }
    }

    // Folded potential hand evaluation
    const foldedHandEval =
        human?.folded && gameState && gameState.stage !== 'PREFLOP' && gameState.communityCards.length >= 3
            ? evaluateBestHand([
                  ...human.hand,
                  ...gameState.communityCards.slice(
                      0,
                      gameState.stage === 'FLOP' ? 3 : gameState.stage === 'TURN' ? 4 : 5
                  )
              ]).name
            : null;

    return (
        <div className="artisan-poker-wrapper">
            {/* 3D Canvas Container */}
            <div id="canvas-container" ref={canvasContainerRef} />

            {/* UI Overlay */}
            <div id="ui-overlay">
                {/* Top Status Island */}
                <header className="table-top-bar hud-element">
                    {/* Left: Brand & Hand Rankings */}
                    <div className="top-bar-left">
                        <div className="table-brand">
                            <span className="brand-dot" />
                            <span className="brand-text">SWOSHPOKE</span>
                        </div>

                        <button
                            type="button"
                            className="luxury-header-btn"
                            onClick={() => setShowHandHierarchy(true)}
                            aria-label="View Poker Hand Rankings"
                        >
                            <TrophyIcon className="w-4 h-4 text-amber-400" />
                            <span className="btn-label">Hand Ranks</span>
                            <span className="key-hint">H</span>
                        </button>
                    </div>

                    {/* Center: The Pot & Round Centerpiece */}
                    <div className="pot-island">
                        <div className="pot-meta-strip">
                            <span className="stage-pill">{gameState?.stage ?? 'PREFLOP'}</span>
                            <span className="blinds-info">${gameState?.smallBlind ?? 10}/${gameState?.bigBlind ?? 20}</span>
                        </div>
                        <div className="pot-value-row">
                            <ChipIcon className="w-4 h-4 pot-chip-icon" />
                            <span className="pot-label">POT</span>
                            <span className="pot-currency">$</span>
                            <span className="pot-digits">{gameState?.pot?.toLocaleString() ?? 0}</span>
                        </div>
                    </div>

                    {/* Right: History Drawer Toggle */}
                    <div className="top-bar-right">
                        <button
                            type="button"
                            className="luxury-header-btn"
                            onClick={() => setIsHistoryDrawerOpen((prev) => !prev)}
                            aria-label="Toggle Activity Feed"
                        >
                            <HistoryIcon className="w-4 h-4 text-slate-300" />
                            <span className="btn-label">Activity</span>
                            {logs.length > 0 && <span className="counter-pill">{logs.length}</span>}
                            <span className="key-hint">L</span>
                        </button>
                    </div>
                </header>

                {/* Table Nameplates (Player Badges) */}
                <div id="badges-container">
                    {gameState?.players.map((p, idx) => {
                        const isActive = idx === gameState.currentTurnIdx && gameState.stage !== 'SHOWDOWN' && gameState.handInProgress;
                        const isDealer = idx === gameState.dealerIdx;
                        const isHuman = idx === 0;

                        // Desktop: Human badge is lower-left; Bots use 3D projection
                        const style: React.CSSProperties = isHuman
                            ? {}
                            : hudPositions[idx]
                            ? {
                                  left: `${hudPositions[idx].x}px`,
                                  top: `${hudPositions[idx].y}px`
                              }
                            : { display: 'none' };

                        return (
                            <div
                                key={p.id}
                                id={`badge-${p.id}`}
                                className={`player-plaque hud-element ${isActive ? 'is-active' : ''} ${p.folded ? 'is-folded' : ''}`}
                                style={style}
                            >
                                <div className="plaque-avatar-col">
                                    <div className="plaque-avatar">
                                        <span className="avatar-initials">
                                            {isHuman ? 'YOU' : `B${p.id}`}
                                        </span>
                                        {isDealer && <span className="dealer-chip-badge">D</span>}
                                    </div>
                                </div>

                                <div className="plaque-info-col">
                                    <div className="plaque-name-row">
                                        <span className="plaque-player-name">{p.name}</span>
                                        {p.folded && <span className="plaque-folded-tag">Folded</span>}
                                        {p.isAllIn && <span className="plaque-allin-tag">All-In</span>}
                                    </div>

                                    <div className="plaque-chips-row">
                                        <span className="plaque-chips-val">${p.chips.toLocaleString()}</span>
                                        {p.currentBet > 0 && (
                                            <span className="plaque-bet-pill">
                                                Bet ${p.currentBet.toLocaleString()}
                                            </span>
                                        )}
                                    </div>

                                    {p.lastAction && !p.folded && (
                                        <div className="plaque-action-pill">{p.lastAction}</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Action Command Console */}
                <div
                    id="action-console"
                    className={`hud-element ${controlsEnabled ? 'is-your-turn' : ''}`}
                >
                    {/* Console Status Header */}
                    <div className="console-status-header">
                        <div className="console-player-stat">
                            <span className="stat-eyebrow">YOUR CHIPS</span>
                            <span className="stat-number gold-stat">${human?.chips?.toLocaleString() ?? 0}</span>
                        </div>

                        <div className={`console-turn-beacon ${controlsEnabled ? 'beacon-active' : ''}`}>
                            <span className="beacon-dot" />
                            <span className="beacon-text">
                                {controlsEnabled
                                    ? 'YOUR TURN TO ACT'
                                    : gameState?.stage === 'SHOWDOWN'
                                    ? 'SHOWDOWN'
                                    : !gameState?.handInProgress
                                    ? 'HAND FINISHED'
                                    : `${gameState?.players[gameState.currentTurnIdx]?.name ?? 'Bot'}'s turn`}
                            </span>
                        </div>

                        <div className="console-player-stat text-right">
                            <span className="stat-eyebrow">ROUND BET</span>
                            <span className="stat-number emerald-stat">${human?.currentBet?.toLocaleString() ?? 0}</span>
                        </div>
                    </div>

                    {/* Dynamic Intelligence Bar: Live Equity Meter or Mucked Cards Inspector */}
                    {gameState?.stage !== 'PREFLOP' && gameState?.winPrediction && !human?.folded && (
                        <div className="equity-intel-card">
                            <div className="equity-card-header">
                                <div className="made-hand-tag">
                                    <span className="intel-lead">MADE HAND:</span>
                                    <span className="intel-hand-name">{gameState.winPrediction.currentHandName}</span>
                                </div>

                                <div className="equity-percentage-badge">
                                    <span className="equity-val">{gameState.winPrediction.winPercentage}%</span>
                                    <span className="equity-label">WIN EQUITY</span>
                                    {gameState.winPrediction.tiePercentage > 0 && (
                                        <span className="tie-label">({gameState.winPrediction.tiePercentage}% tie)</span>
                                    )}
                                </div>
                            </div>

                            <div className="equity-gauge-track">
                                <div
                                    className="equity-gauge-fill win-gauge"
                                    style={{ width: `${gameState.winPrediction.winPercentage}%` }}
                                />
                                {gameState.winPrediction.tiePercentage > 0 && (
                                    <div
                                        className="equity-gauge-fill tie-gauge"
                                        style={{ width: `${gameState.winPrediction.tiePercentage}%` }}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Mucked Cards Inspector (If user folded but hand is ongoing) */}
                    {human?.folded && gameState?.handInProgress && human.hand.length >= 2 && (
                        <div className="mucked-cards-card">
                            <div className="mucked-header">
                                <span className="mucked-tag">MUCKED</span>
                                <span className="mucked-sub">Your Folded Hole Cards</span>
                            </div>

                            <div className="mucked-body">
                                <div className="mucked-cards-cluster">
                                    {human.hand.map((c, i) => (
                                        <div
                                            key={i}
                                            className={`artisan-mini-card ${c.color === '#dc2626' ? 'red-card' : 'black-card'}`}
                                        >
                                            <span className="mini-card-val">{c.value}</span>
                                            <RenderCardSuit suit={c.suit} color={c.color} />
                                        </div>
                                    ))}
                                </div>

                                {foldedHandEval && (
                                    <div className="mucked-potential-block">
                                        <span className="potential-caption">Board Potential</span>
                                        <span className="potential-highlight">{foldedHandEval}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Bet Sizing Presets */}
                    <div className="bet-presets-strip">
                        <button
                            type="button"
                            className="preset-chip"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(sliderMin)}
                        >
                            Min
                        </button>
                        <button
                            type="button"
                            className="preset-chip"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(Math.max(sliderMin, Math.round((gameState?.pot ?? 0) * 0.5)))}
                        >
                            1/2 Pot
                        </button>
                        <button
                            type="button"
                            className="preset-chip"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(Math.max(sliderMin, Math.round((gameState?.pot ?? 0) * 0.75)))}
                        >
                            3/4 Pot
                        </button>
                        <button
                            type="button"
                            className="preset-chip"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(Math.max(sliderMin, gameState?.pot ?? 0))}
                        >
                            Pot
                        </button>
                        <button
                            type="button"
                            className="preset-chip"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(sliderMax)}
                        >
                            All-In
                        </button>
                    </div>

                    {/* Precision Raise Slider Bar */}
                    <div className="slider-dock-row">
                        <button
                            type="button"
                            className="stepper-btn"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(raiseValue - (gameState?.bigBlind ?? 20))}
                            aria-label="Decrease bet"
                        >
                            −
                        </button>

                        <div className="slider-track-wrap">
                            <input
                                type="range"
                                id="artisan-raise-slider"
                                min={sliderMin}
                                max={sliderMax}
                                step={10}
                                value={raiseValue}
                                disabled={!controlsEnabled}
                                onChange={(e) => setRaiseValue(parseInt(e.target.value, 10))}
                            />
                        </div>

                        <button
                            type="button"
                            className="stepper-btn"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(raiseValue + (gameState?.bigBlind ?? 20))}
                            aria-label="Increase bet"
                        >
                            +
                        </button>

                        <div className="target-raise-pill">
                            <span className="raise-currency">$</span>
                            <span className="raise-digits">{raiseValue.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Tactile Action Buttons */}
                    <div className="action-buttons-grid">
                        <button
                            type="button"
                            id="btn-fold"
                            className="action-btn btn-fold"
                            disabled={!controlsEnabled}
                            onClick={handleFold}
                        >
                            <span className="btn-main-label">Fold</span>
                            <span className="btn-shortcut-key">F</span>
                        </button>

                        <button
                            type="button"
                            id="btn-check-call"
                            className="action-btn btn-call"
                            disabled={!controlsEnabled}
                            onClick={handleCheckCall}
                        >
                            <div className="btn-label-stack">
                                <span className="btn-main-label">{checkCallLabel}</span>
                                <span className="btn-sub-label">{checkCallSub}</span>
                            </div>
                            <span className="btn-shortcut-key">C</span>
                        </button>

                        <button
                            type="button"
                            id="btn-raise"
                            className="action-btn btn-raise"
                            disabled={!controlsEnabled}
                            onClick={handleRaise}
                        >
                            <div className="btn-label-stack">
                                <span className="btn-main-label">Raise</span>
                                <span className="btn-sub-label">To ${raiseValue.toLocaleString()}</span>
                            </div>
                            <span className="btn-shortcut-key">R</span>
                        </button>
                    </div>

                    {/* Hand Finished CTA */}
                    {showNextHand && (
                        <div className="next-hand-cta-wrapper">
                            {gameState?.winner && (
                                <div className="hand-winner-announcement">
                                    <span className="winner-label">🏆 Hand Won by {gameState.winner.player.name}</span>
                                    <span className="winner-amount">+${gameState.pot.toLocaleString()}</span>
                                    {gameState.winner.handName && (
                                        <span className="winner-hand-spec">({gameState.winner.handName})</span>
                                    )}
                                </div>
                            )}
                            <button
                                type="button"
                                id="btn-next-hand"
                                className="action-btn btn-next-hand"
                                onClick={handleNextHand}
                            >
                                <span className="btn-main-label">Deal Next Hand →</span>
                                <span className="btn-shortcut-key">Space</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Slide-out Activity Feed Drawer */}
                <aside className={`activity-feed-drawer hud-element ${isHistoryDrawerOpen ? 'is-open' : ''}`}>
                    <div className="drawer-header">
                        <div className="drawer-title-block">
                            <HistoryIcon className="w-4 h-4 text-amber-400" />
                            <span className="drawer-title">Table Activity</span>
                            <span className="drawer-count">{logs.length}</span>
                        </div>
                        <button
                            type="button"
                            className="drawer-close-btn"
                            onClick={() => setIsHistoryDrawerOpen(false)}
                            aria-label="Close activity feed"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="drawer-logs-stream">
                        {logs.length === 0 ? (
                            <div className="logs-empty-state">No events recorded yet.</div>
                        ) : (
                            logs.map((item) => (
                                <div
                                    key={item.id}
                                    className={`stream-log-row ${item.highlight ? 'is-highlight' : ''}`}
                                >
                                    <span className="log-time">{item.timestamp}</span>
                                    <span className="log-msg">{item.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </div>

            {/* Poker Hand Hierarchy Reference Modal */}
            <HandHierarchyModal
                isOpen={showHandHierarchy}
                onClose={() => setShowHandHierarchy(false)}
                currentHandName={gameState?.winPrediction?.currentHandName}
            />
        </div>
    );
}
