import { SUITS, VALUES, VALUE_MAP } from './constants';
import { Card, CardValue, Suit } from './types';

export class CardData implements Card {
    public suit: Suit;
    public value: CardValue;
    public numericValue: number;
    public color: '#dc2626' | '#0f172a';

    constructor(suit: Suit, value: CardValue) {
        this.suit = suit;
        this.value = value;
        this.numericValue = VALUE_MAP[value];
        this.color = (suit === '♥' || suit === '♦') ? '#dc2626' : '#0f172a';
    }
}

export class DeckData {
    public cards: CardData[] = [];

    constructor() {
        this.reset();
    }

    public reset(): void {
        this.cards = [];
        for (const suit of SUITS) {
            for (const value of VALUES) {
                this.cards.push(new CardData(suit, value));
            }
        }
        this.shuffle();
    }

    public shuffle(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = this.cards[i];
            this.cards[i] = this.cards[j];
            this.cards[j] = temp;
        }
    }

    public deal(): CardData {
        const card = this.cards.pop();
        if (!card) {
            throw new Error('Deck is empty!');
        }
        return card;
    }

    public get remaining(): number {
        return this.cards.length;
    }
}
