import { GameData, WordItem } from '../types';
import { fetchPuzzlesFromSheet, PuzzleWithDate, isSameDay, isBeforeDay } from '../services/googleSheetsService';

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

// Cache for fetched puzzles with dates
let cachedPuzzles: PuzzleWithDate[] | null = null;

const ensurePuzzlesLoaded = async (): Promise<PuzzleWithDate[]> => {
  if (!cachedPuzzles) {
    cachedPuzzles = await fetchPuzzlesFromSheet();
  }
  return cachedPuzzles;
};

/**
 * Get today's puzzle (matching current date)
 * Falls back to most recent past puzzle if no puzzle for today
 */
export const getTodaysPuzzle = async (): Promise<GameData> => {
  try {
    const puzzles = await ensurePuzzlesLoaded();

    if (puzzles.length === 0) {
      console.warn('No puzzles in sheet, using fallback');
      return fallbackPuzzle;
    }

    const today = new Date();

    // Find puzzle for today
    const todaysPuzzle = puzzles.find(p => isSameDay(p.date, today));
    if (todaysPuzzle) {
      return todaysPuzzle.puzzle;
    }

    // Fallback: find most recent past puzzle
    const pastPuzzles = puzzles.filter(p => isBeforeDay(p.date, today));
    if (pastPuzzles.length > 0) {
      // Sort by date descending and get the most recent
      pastPuzzles.sort((a, b) => b.date.getTime() - a.date.getTime());
      console.warn('No puzzle for today, using most recent past puzzle');
      return pastPuzzles[0].puzzle;
    }

    // No past puzzles either, return any puzzle
    console.warn('No puzzle for today or past, using first available');
    return puzzles[0].puzzle;
  } catch (error) {
    console.error('Failed to fetch puzzles from sheet:', error);
    return fallbackPuzzle;
  }
};

/**
 * Get a random puzzle from past dates only (before today)
 */
export const getRandomPastPuzzle = async (): Promise<GameData> => {
  try {
    const puzzles = await ensurePuzzlesLoaded();

    if (puzzles.length === 0) {
      console.warn('No puzzles in sheet, using fallback');
      return fallbackPuzzle;
    }

    const today = new Date();

    // Filter to only past puzzles
    const pastPuzzles = puzzles.filter(p => isBeforeDay(p.date, today));

    if (pastPuzzles.length === 0) {
      console.warn('No past puzzles available, using fallback');
      return fallbackPuzzle;
    }

    const index = Math.floor(Math.random() * pastPuzzles.length);
    return pastPuzzles[index].puzzle;
  } catch (error) {
    console.error('Failed to fetch puzzles from sheet:', error);
    return fallbackPuzzle;
  }
};

/**
 * Legacy function - now calls getTodaysPuzzle
 * @deprecated Use getTodaysPuzzle or getRandomPastPuzzle instead
 */
export const getRandomPuzzle = getTodaysPuzzle;
