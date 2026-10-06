'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PokerEngine } from '@/engine/poker-engine';
import { GameStateSnapshot } from '@/engine/types';
import { Poker3DScene } from './poker-3d';
import HandHierarchyModal from './HandHierarchyModal';
import './poker.css';

interface LogItem {
    id: number;
    message: string;
    highlight?: boolean;
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
    const [isLogOpenMobile, setIsLogOpenMobile] = useState<boolean>(false);
    const [showHandHierarchy, setShowHandHierarchy] = useState<boolean>(false);

    const logCounter = useRef(0);

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
            botDelayMs: 800,
            autoStepBots: true
        });
        engineRef.current = engine;

        // Wire Engine Events to 3D Scene & React State
        const unsubLog = engine.on('log', ({ message, highlight }) => {
            setLogs((prev) => [
                { id: ++logCounter.current, message, highlight },
                ...prev.slice(0, 50)
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
            const human = snapshot.players[0];
            const isHumanTurn =
                snapshot.currentTurnIdx === 0 &&
                snapshot.stage !== 'SHOWDOWN' &&
                snapshot.handInProgress &&
                !human.folded &&
                !human.isAllIn;

            setControlsEnabled(isHumanTurn);

            // Compute slider values
            const minRaiseTotal = snapshot.highestCurrentBet + snapshot.bigBlind;
            const maxVal = human.chips + human.currentBet;
            const minVal = Math.min(minRaiseTotal, maxVal);
            setRaiseValue((prev) => {
                if (prev < minVal || prev > maxVal) return minVal;
                return prev;
            });
        });

        const unsubWinPrediction = engine.on('winPredictionUpdated', (prediction) => {
            setGameState((prev) => (prev ? { ...prev, winPrediction: prediction } : null));
        });

        // Start the first hand
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

    const human = gameState?.players[0];
    const callAmt = gameState && human ? gameState.highestCurrentBet - human.currentBet : 0;
    const minRaiseTotal = gameState && human ? gameState.highestCurrentBet + gameState.bigBlind : 0;
    const sliderMax = human ? human.chips + human.currentBet : 100;
    const sliderMin = Math.min(minRaiseTotal, sliderMax);

    let checkCallLabel = 'Check';
    if (human && callAmt > 0) {
        checkCallLabel = callAmt >= human.chips ? 'Call All-In' : `Call $${callAmt}`;
    }

    const handleFold = () => {
        if (!controlsEnabled || !engineRef.current) return;
        setControlsEnabled(false);
        engineRef.current.fold(0);
    };

    const handleCheckCall = () => {
        if (!controlsEnabled || !engineRef.current) return;
        setControlsEnabled(false);
        if (callAmt === 0) {
            engineRef.current.check(0);
        } else {
            engineRef.current.call(0);
        }
    };

    const handleSetRaiseAmount = (val: number) => {
        const clamped = Math.max(sliderMin, Math.min(sliderMax, Math.round(val / 10) * 10));
        setRaiseValue(clamped);
    };

    const handleRaise = () => {
        if (!controlsEnabled || !engineRef.current) return;
        setControlsEnabled(false);
        engineRef.current.raise(raiseValue, 0);
    };

    const handleNextHand = () => {
        setShowNextHand(false);
        if (engineRef.current) {
            engineRef.current.startNewHand();
        }
    };

    return (
        <div className="poker-wrapper">
            <div id="canvas-container" ref={canvasContainerRef} />

            <div id="ui-overlay">
                {/* Hand Hierarchy Toggle Button (Top Left Corner) */}
                <button
                    id="hand-ranks-toggle"
                    className="hand-ranks-btn hud-element"
                    onClick={() => setShowHandHierarchy(true)}
                    aria-label="View Poker Hand Rankings"
                >
                    🏆 Hand Ranks
                </button>

                {/* Mobile Log Toggle Button (Top Right) */}
                <button
                    id="mobile-log-toggle"
                    className="mobile-log-btn hud-element"
                    onClick={() => setIsLogOpenMobile((prev) => !prev)}
                    aria-label="Toggle game history"
                >
                    📜 Log {logs.length > 0 && <span className="log-count">({logs.length})</span>}
                </button>

                {/* Top Pot Bar */}
                <div id="top-bar" className="hud-element">
                    <div className="pot-display">
                        POT: $<span id="pot-amount">{gameState?.pot ?? 0}</span>
                    </div>
                </div>

                {/* Mobile Compact Recent-Action Ticker */}
                {logs.length > 0 && (
                    <div
                        className="mobile-log-ticker hud-element"
                        onClick={() => setIsLogOpenMobile(true)}
                    >
                        <span className="ticker-badge">LATEST</span>
                        <span className="ticker-text">{logs[0].message}</span>
                    </div>
                )}

                {/* 2D Player HUD Badges */}
                <div id="badges-container">
                    {gameState?.players.map((p, idx) => {
                        const isActive = idx === gameState.currentTurnIdx && gameState.stage !== 'SHOWDOWN';
                        const isHuman = idx === 0;

                        const style: React.CSSProperties = isHuman
                            ? {} // Positioned statically via CSS (desktop: bottom-left, mobile: top-left)
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
                                className={`player-badge hud-element ${isActive ? 'active' : ''}`}
                                style={style}
                            >
                                <div className="name">{p.name}</div>
                                <div className="chips">${p.chips}</div>
                                <div className="bet-round">Round Bet: ${p.currentBet}</div>
                                <div className="action">{p.lastAction || ''}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Log Box (Desktop bottom-left, Mobile drawer) */}
                <div
                    id="log-box"
                    className={`hud-element ${isLogOpenMobile ? 'mobile-open' : ''}`}
                >
                    <div className="log-mobile-header">
                        <span className="log-mobile-title">📜 Hand History</span>
                        <button
                            className="log-mobile-close"
                            onClick={() => setIsLogOpenMobile(false)}
                            aria-label="Close log drawer"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="log-entries-scroll">
                        {logs.map((entry) => (
                            <div
                                key={entry.id}
                                className={`log-entry ${entry.highlight ? 'highlight' : ''}`}
                            >
                                {entry.message}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Controls Dock */}
                <div id="controls" className={`hud-element ${controlsEnabled ? 'turn-active' : ''}`}>
                    {/* Status header with Player Info and Turn Indicator */}
                    <div className="controls-header">
                        <div className="player-stat">
                            <span className="stat-label">CHIPS</span>
                            <span className="stat-value chips-gold">${human?.chips ?? 0}</span>
                        </div>
                        <div className={`turn-indicator ${controlsEnabled ? 'my-turn' : ''}`}>
                            {controlsEnabled
                                ? '🟢 YOUR TURN'
                                : gameState?.stage === 'SHOWDOWN'
                                ? '🏆 SHOWDOWN'
                                : !gameState?.handInProgress
                                ? '🏆 HAND FINISHED'
                                : `⏳ ${gameState?.players[gameState.currentTurnIdx]?.name ?? 'Bot'}'s turn`}
                        </div>
                        <div className="player-stat">
                            <span className="stat-label">ROUND BET</span>
                            <span className="stat-value bet-green">${human?.currentBet ?? 0}</span>
                        </div>
                    </div>

                    {/* Win Prediction Card (Displayed post-flop while player is in the hand) */}
                    {gameState?.stage !== 'PREFLOP' && gameState?.winPrediction && !human?.folded && (
                        <div className="win-prediction-card">
                            <div className="win-prediction-header">
                                <div className="hand-name-badge">
                                    <span className="badge-icon">🎯</span>
                                    <span className="hand-name-text">
                                        {gameState.winPrediction.currentHandName}
                                    </span>
                                </div>
                                <div className="win-odds-badge">
                                    <span className="odds-label">Win:</span>
                                    <span className="odds-percent">
                                        {gameState.winPrediction.winPercentage}%
                                    </span>
                                    {gameState.winPrediction.tiePercentage > 0 && (
                                        <span className="odds-tie">
                                            (Tie {gameState.winPrediction.tiePercentage}%)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div
                                className="win-meter-track"
                                title={`Win: ${gameState.winPrediction.winPercentage}% | Tie: ${gameState.winPrediction.tiePercentage}% | Loss: ${gameState.winPrediction.lossPercentage}%`}
                            >
                                <div
                                    className="win-meter-fill win-fill"
                                    style={{ width: `${gameState.winPrediction.winPercentage}%` }}
                                />
                                {gameState.winPrediction.tiePercentage > 0 && (
                                    <div
                                        className="win-meter-fill tie-fill"
                                        style={{ width: `${gameState.winPrediction.tiePercentage}%` }}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quick Bet Presets */}
                    <div className="quick-presets">
                        <button
                            type="button"
                            className="preset-btn"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(sliderMin)}
                        >
                            Min
                        </button>
                        <button
                            type="button"
                            className="preset-btn"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(raiseValue - (gameState?.bigBlind ?? 20))}
                        >
                            -
                        </button>
                        <span id="raise-val">${raiseValue}</span>
                        <button
                            type="button"
                            className="preset-btn"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(raiseValue + (gameState?.bigBlind ?? 20))}
                        >
                            +
                        </button>
                        <button
                            type="button"
                            className="preset-btn"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(Math.max(sliderMin, (gameState?.highestCurrentBet ?? 20) * 2))}
                        >
                            2x
                        </button>
                        <button
                            type="button"
                            className="preset-btn"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(Math.max(sliderMin, (gameState?.pot ?? 0)))}
                        >
                            Pot
                        </button>
                        <button
                            type="button"
                            className="preset-btn"
                            disabled={!controlsEnabled}
                            onClick={() => handleSetRaiseAmount(sliderMax)}
                        >
                            All-In
                        </button>
                    </div>

                    <div className="raise-slider-container">
                        <input
                            type="range"
                            id="raise-slider"
                            min={sliderMin}
                            max={sliderMax}
                            step={10}
                            value={raiseValue}
                            disabled={!controlsEnabled}
                            onChange={(e) => setRaiseValue(parseInt(e.target.value, 10))}
                        />
                    </div>

                    <div className="btn-group">
                        <button
                            id="btn-fold"
                            className="poker-btn danger"
                            disabled={!controlsEnabled}
                            onClick={handleFold}
                        >
                            Fold
                        </button>
                        <button
                            id="btn-check-call"
                            className="poker-btn"
                            disabled={!controlsEnabled}
                            onClick={handleCheckCall}
                        >
                            {checkCallLabel}
                        </button>
                        <button
                            id="btn-raise"
                            className="poker-btn primary"
                            disabled={!controlsEnabled}
                            onClick={handleRaise}
                        >
                            Raise ${raiseValue}
                        </button>
                    </div>

                    {showNextHand && (
                        <button
                            id="btn-next-hand"
                            className="poker-btn primary next-hand-highlight"
                            style={{ width: '100%', marginTop: '6px' }}
                            onClick={handleNextHand}
                        >
                            ✨ Next Hand ✨
                        </button>
                    )}
                </div>
            </div>

            {/* Poker Hand Hierarchy Modal */}
            <HandHierarchyModal
                isOpen={showHandHierarchy}
                onClose={() => setShowHandHierarchy(false)}
                currentHandName={gameState?.winPrediction?.currentHandName}
            />
        </div>
    );
}
