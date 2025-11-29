import { GameData, WordItem } from '../types';
import { fetchPuzzlesFromSheet } from '../services/googleSheetsService';

// Helper to create WordItems with unique IDs
const createWords = (texts: string[], rowIndex: number): WordItem[] =>
  texts.map((text, idx) => ({
    text,
    id: `row-${rowIndex}-word-${idx}`
  }));

// Fallback puzzle in case sheet fetch fails
const fallbackPuzzle: GameData = {
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
};

// Cache for fetched puzzles
let cachedPuzzles: GameData[] | null = null;

export const getRandomPuzzle = async (): Promise<GameData> => {
  try {
    // Use cached puzzles if available
    if (!cachedPuzzles) {
      cachedPuzzles = await fetchPuzzlesFromSheet();
    }

    if (cachedPuzzles.length === 0) {
      console.warn('No puzzles in sheet, using fallback');
      return fallbackPuzzle;
    }

    const index = Math.floor(Math.random() * cachedPuzzles.length);
    return cachedPuzzles[index];
  } catch (error) {
    console.error('Failed to fetch puzzles from sheet:', error);
    return fallbackPuzzle;
  }
};
