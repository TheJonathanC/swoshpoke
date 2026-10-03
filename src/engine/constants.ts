import { CardValue, ChipDenom, Suit } from './types';

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];

export const VALUES: CardValue[] = [
    '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'
];

export const VALUE_MAP: Record<CardValue, number> = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14
};

export const CHIP_DENOMS: ChipDenom[] = [
    { value: 100, color: '#1e293b', label: '100', hex: 0x1e293b },
    { value: 25,  color: '#15803d', label: '25',  hex: 0x15803d },
    { value: 5,   color: '#b91c1c', label: '5',   hex: 0xb91c1c },
    { value: 1,   color: '#e2e8f0', label: '1',   hex: 0xe2e8f0 }
];

export function calculateChipBreakdown(amount: number): { denom: ChipDenom; count: number }[] {
    let rem = Math.max(0, Math.floor(amount));
    const breakdown: { denom: ChipDenom; count: number }[] = [];

    CHIP_DENOMS.forEach((denom) => {
        const count = Math.floor(rem / denom.value);
        if (count > 0) {
            breakdown.push({ denom, count });
            rem %= denom.value;
        }
    });

    return breakdown;
}
