'use client';

import React, { useEffect, useState } from 'react';
import { CloseIcon, SuitSpade, SuitHeart, SuitDiamond, SuitClub } from './poker-icons';

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
    tier: 'Monster' | 'Power' | 'Standard';
    cards: CardSample[];
}

const HAND_RANKS: HandRankDefinition[] = [
    {
        rank: 1,
        name: 'Royal Flush',
        shortMatch: 'Royal Flush',
        description: 'Ace through Ten in the same suit. The unbeatable pinnacle of Texas Hold\'em.',
        odds: '1 in 649,740 (0.00015%)',
        tier: 'Monster',
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
        description: 'Five numerical cards in sequential rank of the identical suit.',
        odds: '1 in 72,193 (0.0014%)',
        tier: 'Monster',
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
        description: 'Four cards of identical numerical rank (quads), plus one kicker.',
        odds: '1 in 4,165 (0.024%)',
        tier: 'Monster',
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
        description: 'Three of a kind paired with a two of a kind (boat).',
        odds: '1 in 694 (0.14%)',
        tier: 'Power',
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
        description: 'Any five cards of matching suit, not in numerical sequence.',
        odds: '1 in 508 (0.20%)',
        tier: 'Power',
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
        description: 'Five consecutive cards of mixed suits. Ace may play high or low.',
        odds: '1 in 254 (0.39%)',
        tier: 'Power',
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
        description: 'Three cards of equal rank (trips / set), plus two kickers.',
        odds: '1 in 47 (2.11%)',
        tier: 'Power',
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
        description: 'Two separate pairs of cards of matching rank, plus one kicker.',
        odds: '1 in 21 (4.75%)',
        tier: 'Standard',
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
        description: 'Two cards of identical rank with three unmatched side cards.',
        odds: '1 in 2.4 (42.25%)',
        tier: 'Standard',
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
        description: 'No pair or formed combination. Highest individual card determines ranking.',
        odds: '1 in 2 (50.11%)',
        tier: 'Standard',
        cards: [
            { val: 'A', suit: '♠', color: 'black' },
            { val: 'J', suit: '♦', color: 'red' },
            { val: '8', suit: '♥', color: 'red' },
            { val: '6', suit: '♣', color: 'black' },
            { val: '2', suit: '♦', color: 'red' }
        ]
    }
];

function RenderSuitGlyph({ suit, color }: { suit: '♠' | '♥' | '♦' | '♣'; color: 'red' | 'black' }) {
    const c = color === 'red' ? '#e11d48' : '#0f172a';
    if (suit === '♠') return <SuitSpade className="w-3.5 h-3.5" color={c} />;
    if (suit === '♥') return <SuitHeart className="w-3.5 h-3.5" color={c} />;
    if (suit === '♦') return <SuitDiamond className="w-3.5 h-3.5" color={c} />;
    return <SuitClub className="w-3.5 h-3.5" color={c} />;
}

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
    const [filterTier, setFilterTier] = useState<'All' | 'Monster' | 'Power' | 'Standard'>('All');

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

    const displayedRanks = filterTier === 'All' 
        ? HAND_RANKS 
        : HAND_RANKS.filter((r) => r.tier === filterTier);

    return (
        <div
            className="artisan-modal-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
        >
            <div className="artisan-modal-card hud-element">
                {/* Header */}
                <div className="artisan-modal-header">
                    <div className="artisan-header-title-block">
                        <div className="artisan-modal-eyebrow">REFERENCE GUIDE</div>
                        <h2 className="artisan-modal-title">Hand Rankings</h2>
                    </div>

                    <div className="artisan-header-actions">
                        <div className="artisan-tier-tabs">
                            {(['All', 'Monster', 'Power', 'Standard'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`artisan-tier-tab ${filterTier === t ? 'active' : ''}`}
                                    onClick={() => setFilterTier(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="artisan-close-btn"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Hand Ranks List */}
                <div className="artisan-ranks-list">
                    {displayedRanks.map((item) => {
                        const isMatch = matchesCurrentHand(item);

                        return (
                            <div
                                key={item.rank}
                                className={`artisan-rank-row ${isMatch ? 'match-active' : ''}`}
                            >
                                <div className="artisan-rank-num">
                                    <span className="rank-idx">{String(item.rank).padStart(2, '0')}</span>
                                    <span className="rank-tier-tag">{item.tier}</span>
                                </div>

                                <div className="artisan-rank-details">
                                    <div className="artisan-rank-name-line">
                                        <h3 className="artisan-rank-name">{item.name}</h3>
                                        {isMatch && (
                                            <span className="artisan-current-match-badge">
                                                Active Hand
                                            </span>
                                        )}
                                        <span className="artisan-rank-odds">{item.odds}</span>
                                    </div>
                                    <p className="artisan-rank-desc">{item.description}</p>
                                </div>

                                <div className="artisan-card-cluster">
                                    {item.cards.map((c, i) => (
                                        <div
                                            key={i}
                                            className={`artisan-mini-card ${c.color === 'red' ? 'red-card' : 'black-card'}`}
                                        >
                                            <span className="mini-card-val">{c.val}</span>
                                            <RenderSuitGlyph suit={c.suit} color={c.color} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="artisan-modal-footer">
                    <span className="footer-rule">
                        Hold&apos;em rules evaluate the highest 5-card combination from your 2 hole cards and 5 board cards.
                    </span>
                    <span className="footer-esc-hint">Press [Esc] to return to table</span>
                </div>
            </div>
        </div>
    );
}
