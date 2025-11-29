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
        category: 'Planets',
        words: createWords(['Mars', 'Venus', 'Jupiter', 'Apollo'], 0),
        outlierIndex: 3,
        explanation: 'Apollo is a NASA program, not a planet.'
      },
      {
        id: 'row-1',
        category: 'Greek Gods',
        words: createWords(['Zeus', 'Athena', 'Gemini', 'Poseidon'], 1),
        outlierIndex: 2,
        explanation: 'Gemini is a zodiac constellation, not a Greek god.'
      },
      {
        id: 'row-2',
        category: 'Card Games',
        words: createWords(['Poker', 'Blackjack', 'Solitaire', 'Bridge'], 2),
        outlierIndex: 2,
        explanation: 'Solitaire is a single-player game, not a multiplayer card game.'
      },
      {
        id: 'row-3',
        category: 'Zodiac Signs',
        words: createWords(['Aries', 'Leo', 'Mercury', 'Scorpio'], 3),
        outlierIndex: 2,
        explanation: 'Mercury is a planet, not a zodiac sign.'
      }
    ],
    metaCategory: 'NASA Space Programs',
    ultimateOutlierRowIndex: 2,
    ultimateExplanation: 'Apollo, Gemini, and Mercury are all NASA space programs. Solitaire is a card game with no space connection — it\'s the Ultimate Odd1Out.'
  }
];

export const getRandomPuzzle = (): GameData => {
  const index = Math.floor(Math.random() * puzzles.length);
  return puzzles[index];
};
