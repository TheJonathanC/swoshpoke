'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PokerEngine } from '@/engine/poker-engine';
import { GameStateSnapshot } from '@/engine/types';
import { Poker3DScene } from './poker-3d';
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
                {/* Top Pot Bar */}
                <div id="top-bar" className="hud-element">
                    <div className="pot-display">
                        POT: $<span id="pot-amount">{gameState?.pot ?? 0}</span>
                    </div>
                </div>

                {/* 2D Player HUD Badges */}
                <div id="badges-container">
                    {gameState?.players.map((p, idx) => {
                        const isActive = idx === gameState.currentTurnIdx && gameState.stage !== 'SHOWDOWN';
                        const isHuman = idx === 0;

                        const style: React.CSSProperties = isHuman
                            ? {} // Positioned statically above the log box in CSS
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

                {/* Bottom Left Log Box */}
                <div id="log-box" className="hud-element">
                    {logs.map((entry) => (
                        <div
                            key={entry.id}
                            className={`log-entry ${entry.highlight ? 'highlight' : ''}`}
                        >
                            {entry.message}
                        </div>
                    ))}
                </div>

                {/* Bottom Right Controls */}
                <div id="controls" className="hud-element">
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
                        <span id="raise-val">${raiseValue}</span>
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
                            Raise
                        </button>
                    </div>

                    {showNextHand && (
                        <button
                            id="btn-next-hand"
                            className="poker-btn primary"
                            style={{ width: '100%', marginTop: '5px' }}
                            onClick={handleNextHand}
                        >
                            Next Hand
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
