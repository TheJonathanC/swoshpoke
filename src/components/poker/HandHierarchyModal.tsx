'use client';

import React, { useEffect } from 'react';

interface CardSample {
    val: string;
    suit: '♠' | '♥' | '♦' | '♣';
    color: 'red' | 'black';
}

interface HandRankDefinition {
    rank: number;
    name: string;
    shortMatch: string;
    description: string;
    odds: string;
    cards: CardSample[];
}

const HAND_RANKS: HandRankDefinition[] = [
    {
        rank: 1,
        name: 'Royal Flush',
        shortMatch: 'Royal Flush',
        description: 'A, K, Q, J, 10 of the same suit. The rarest, unbeatable poker hand.',
        odds: '1 in 649,740',
        cards: [
            { val: 'A', suit: '♠', color: 'black' },
            { val: 'K', suit: '♠', color: 'black' },
            { val: 'Q', suit: '♠', color: 'black' },
            { val: 'J', suit: '♠', color: 'black' },
            { val: '10', suit: '♠', color: 'black' }
        ]
    },
    {
        rank: 2,
        name: 'Straight Flush',
        shortMatch: 'Straight Flush',
        description: 'Five consecutive cards of the same suit (not starting with Ace).',
        odds: '1 in 72,193',
        cards: [
            { val: '9', suit: '♥', color: 'red' },
            { val: '8', suit: '♥', color: 'red' },
            { val: '7', suit: '♥', color: 'red' },
            { val: '6', suit: '♥', color: 'red' },
            { val: '5', suit: '♥', color: 'red' }
        ]
    },
    {
        rank: 3,
        name: 'Four of a Kind',
        shortMatch: 'Four of a Kind',
        description: 'Four cards of identical numerical rank (quads).',
        odds: '1 in 4,165',
        cards: [
            { val: 'Q', suit: '♠', color: 'black' },
            { val: 'Q', suit: '♥', color: 'red' },
            { val: 'Q', suit: '♦', color: 'red' },
            { val: 'Q', suit: '♣', color: 'black' },
            { val: '5', suit: '♦', color: 'red' }
        ]
    },
    {
        rank: 4,
        name: 'Full House',
        shortMatch: 'Full House',
        description: 'Three matching cards of one rank plus two matching of another (boat).',
        odds: '1 in 694',
        cards: [
            { val: 'J', suit: '♠', color: 'black' },
            { val: 'J', suit: '♥', color: 'red' },
            { val: 'J', suit: '♦', color: 'red' },
            { val: '8', suit: '♣', color: 'black' },
            { val: '8', suit: '♠', color: 'black' }
        ]
    },
    {
        rank: 5,
        name: 'Flush',
        shortMatch: 'Flush',
        description: 'Any five cards of the same suit, not in numerical sequence.',
        odds: '1 in 508',
        cards: [
            { val: 'K', suit: '♦', color: 'red' },
            { val: '10', suit: '♦', color: 'red' },
            { val: '7', suit: '♦', color: 'red' },
            { val: '6', suit: '♦', color: 'red' },
            { val: '2', suit: '♦', color: 'red' }
        ]
    },
    {
        rank: 6,
        name: 'Straight',
        shortMatch: 'Straight',
        description: 'Five consecutive cards of mixed suits. Ace can count high or low.',
        odds: '1 in 254',
        cards: [
            { val: '8', suit: '♠', color: 'black' },
            { val: '7', suit: '♥', color: 'red' },
            { val: '6', suit: '♦', color: 'red' },
            { val: '5', suit: '♣', color: 'black' },
            { val: '4', suit: '♠', color: 'black' }
        ]
    },
    {
        rank: 7,
        name: 'Three of a Kind',
        shortMatch: 'Three of a Kind',
        description: 'Three cards of the exact same rank (trips / set).',
        odds: '1 in 47',
        cards: [
            { val: '7', suit: '♣', color: 'black' },
            { val: '7', suit: '♥', color: 'red' },
            { val: '7', suit: '♦', color: 'red' },
            { val: 'K', suit: '♠', color: 'black' },
            { val: '2', suit: '♣', color: 'black' }
        ]
    },
    {
        rank: 8,
        name: 'Two Pair',
        shortMatch: 'Two Pair',
        description: 'Two separate pairs of matching rank cards.',
        odds: '1 in 21',
        cards: [
            { val: '10', suit: '♠', color: 'black' },
            { val: '10', suit: '♦', color: 'red' },
            { val: '6', suit: '♥', color: 'red' },
            { val: '6', suit: '♣', color: 'black' },
            { val: 'A', suit: '♠', color: 'black' }
        ]
    },
    {
        rank: 9,
        name: 'One Pair',
        shortMatch: 'Pair',
        description: 'Two cards of identical rank with three kickers.',
        odds: '1 in 2.4',
        cards: [
            { val: '9', suit: '♥', color: 'red' },
            { val: '9', suit: '♣', color: 'black' },
            { val: 'K', suit: '♦', color: 'red' },
            { val: '7', suit: '♠', color: 'black' },
            { val: '3', suit: '♥', color: 'red' }
        ]
    },
    {
        rank: 10,
        name: 'High Card',
        shortMatch: 'High Card',
        description: 'No matching ranks or flush. Highest single card determines strength.',
        odds: '1 in 2',
        cards: [
            { val: 'A', suit: '♠', color: 'black' },
            { val: 'J', suit: '♦', color: 'red' },
            { val: '8', suit: '♥', color: 'red' },
            { val: '6', suit: '♣', color: 'black' },
            { val: '2', suit: '♦', color: 'red' }
        ]
    }
];

interface HandHierarchyModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentHandName?: string;
}

export default function HandHierarchyModal({
    isOpen,
    onClose,
    currentHandName
}: HandHierarchyModalProps) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const matchesCurrentHand = (def: HandRankDefinition) => {
        if (!currentHandName) return false;
        if (def.shortMatch === 'Straight Flush' && currentHandName.includes('Straight Flush')) return true;
        if (def.shortMatch === 'Royal Flush' && currentHandName.includes('Royal Flush')) return true;
        if (def.shortMatch === 'Straight' && currentHandName === 'Straight') return true;
        if (def.shortMatch === 'Flush' && currentHandName === 'Flush') return true;
        return currentHandName.toLowerCase().includes(def.shortMatch.toLowerCase());
    };

    return (
        <div
            className="hand-hierarchy-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hand-hierarchy-title"
        >
            <div className="hand-hierarchy-content hud-element">
                {/* Header */}
                <div className="hand-hierarchy-header">
                    <div className="hand-hierarchy-title-group">
                        <h2 id="hand-hierarchy-title" className="hand-hierarchy-title">
                            🏆 Hierarchy of Poker Hands
                        </h2>
                        <span className="hand-hierarchy-subtitle">
                            From highest unbeatable rank (#1) to lowest (#10)
                        </span>
                    </div>
                    <button
                        className="hand-hierarchy-close-btn"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

                {/* Hands list */}
                <div className="hand-hierarchy-list">
                    {HAND_RANKS.map((item) => {
                        const isMatch = matchesCurrentHand(item);

                        return (
                            <div
                                key={item.rank}
                                className={`hand-rank-row ${isMatch ? 'current-hand-active' : ''}`}
                            >
                                <div className="hand-rank-badge">#{item.rank}</div>

                                <div className="hand-rank-main">
                                    <div className="hand-rank-name-row">
                                        <span className="hand-rank-name">{item.name}</span>
                                        {isMatch && (
                                            <span className="current-hand-pill">Your Hand</span>
                                        )}
                                        <span className="hand-rank-odds">{item.odds}</span>
                                    </div>

                                    <p className="hand-rank-desc">{item.description}</p>
                                </div>

                                <div className="hand-rank-cards">
                                    {item.cards.map((c, i) => (
                                        <div
                                            key={i}
                                            className={`mini-card ${c.color === 'red' ? 'card-red' : 'card-black'}`}
                                        >
                                            <span className="mini-card-val">{c.val}</span>
                                            <span className="mini-card-suit">{c.suit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer note */}
                <div className="hand-hierarchy-footer">
                    <span>Texas Hold&apos;em uses the best 5-card combination from 7 available cards.</span>
                </div>
            </div>
        </div>
    );
}
