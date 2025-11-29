import { GameData, WordItem } from '../types';

// Helper to create WordItems with unique IDs
const createWords = (texts: string[], rowIndex: number): WordItem[] =>
  texts.map((text, idx) => ({
    text,
    id: `row-${rowIndex}-word-${idx}`
  }));

export const puzzles: GameData[] = [
  {
    rows: [
      {
        id: 'row-0',
        category: 'Citrus Fruits',
        words: createWords(['Orange', 'Lemon', 'Lime', 'Mango'], 0),
        outlierIndex: 3,
        explanation: 'Mango is a tropical stone fruit, not a citrus fruit.'
      },
      {
        id: 'row-1',
        category: 'Card Games',
        words: createWords(['Poker', 'Blackjack', 'Chess', 'Bridge'], 1),
        outlierIndex: 2,
        explanation: 'Chess is a board game, not a card game.'
      },
      {
        id: 'row-2',
        category: 'Greek Letters',
        words: createWords(['Alpha', 'Beta', 'Delta', 'Omega'], 2),
        outlierIndex: 3,
        explanation: 'Omega is the last Greek letter; the others are among the first four.'
      },
      {
        id: 'row-3',
        category: 'Precious Metals',
        words: createWords(['Gold', 'Silver', 'Platinum', 'Bronze'], 3),
        outlierIndex: 3,
        explanation: 'Bronze is an alloy, not a precious metal.'
      }
    ],
    metaCategory: 'Olympic Medal/Award Tiers',
    ultimateOutlierRowIndex: 2,
    ultimateExplanation: 'Mango, Chess, and Bronze are all associated with Olympic medals or rankings (Gold, Silver, Bronze for medals; Chess is an Olympic-recognized sport). Omega (watches) is a sponsor, but the letter itself has no Olympic connection — it\'s the Ultimate Odd1Out.'
  }
];

export const getRandomPuzzle = (): GameData => {
  const index = Math.floor(Math.random() * puzzles.length);
  return puzzles[index];
};
