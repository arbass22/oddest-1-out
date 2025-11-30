import { GameData, WordItem } from '@/types';

const SHEET_ID = '1On5skhllTetpU-ERJkmIWl0lmQzARmMyO4yiQP-637k';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

// Puzzle with associated date from the sheet
export interface PuzzleWithDate {
  puzzle: GameData;
  date: Date;
}

// Parse date string from Google Sheets (format: "M/D/YYYY" or Date serial)
const parseSheetDate = (dateValue: string): Date | null => {
  if (!dateValue) return null;

  // Try parsing as "M/D/YYYY" format
  const parts = dateValue.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10) - 1; // JS months are 0-indexed
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  // Try parsing as a date string
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
};

// Compare two dates ignoring time (just year/month/day)
export const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export const isBeforeDay = (d1: Date, d2: Date): boolean => {
  const d1Start = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const d2Start = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return d1Start < d2Start;
};

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Helper to create WordItems with unique IDs and shuffle them
const createShuffledWords = (texts: string[], rowIndex: number, outlierIdx: number): { words: WordItem[], newOutlierIndex: number } => {
  // Track which word is the outlier during shuffle
  const wordsWithMeta = texts.map((text, idx) => ({
    text,
    isOutlier: idx === outlierIdx
  }));

  const shuffled = shuffleArray(wordsWithMeta);
  const newOutlierIndex = shuffled.findIndex(w => w.isOutlier);

  const words = shuffled.map((w, idx) => ({
    text: w.text,
    id: `row-${rowIndex}-word-${idx}-${Math.random().toString(36).substring(7)}`
  }));

  return { words, newOutlierIndex };
};

interface SheetRow {
  c: Array<{ v: string | number | null } | null>;
}

interface SheetData {
  table: {
    cols: Array<{ label: string }>;
    rows: SheetRow[];
  };
}

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

// Server-side cache for puzzles (revalidates every 5 minutes)
let cachedPuzzles: PuzzleWithDate[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches and parses the Google Sheet data
 * Sheet structure:
 * - Row 0: Dates (column headers)
 * - Rows 1-4: Category 1 words
 * - Rows 5-8: Category 2 words
 * - Rows 9-12: Category 3 words
 * - Rows 13-16: Category 4 words
 * - Row 17: Category 1 name
 * - Row 18: Category 2 name
 * - Row 19: Category 3 name
 * - Row 20: Category 4 name
 * - Row 21: Meta category name
 */
export const fetchPuzzlesFromSheet = async (): Promise<PuzzleWithDate[]> => {
  // Return cached if still valid
  if (cachedPuzzles && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedPuzzles;
  }

  const response = await fetch(SHEET_URL);
  const text = await response.text();

  // Google's response is wrapped like: /*O_o*/google.visualization.Query.setResponse({...});
  // Extract just the JSON object
  const match = text.match(/google\.visualization\.Query\.setResponse\((\{[\s\S]*\})\)/);
  if (!match) {
    throw new Error('Invalid response format from Google Sheets');
  }
  const data: SheetData = JSON.parse(match[1]);

  const sheetRows = data.table.rows;
  const puzzles: PuzzleWithDate[] = [];

  // Get number of puzzle columns (skip column A which has labels)
  const numColumns = data.table.cols.length;

  // Process each puzzle column (starting from column B = index 1)
  for (let col = 1; col < numColumns; col++) {
    const getCellValue = (rowIndex: number): string => {
      const cell = sheetRows[rowIndex]?.c?.[col];
      return cell?.v?.toString() ?? '';
    };

    // Skip empty columns
    const dateStr = getCellValue(0);
    if (!dateStr) continue;

    // Parse the date
    const puzzleDate = parseSheetDate(dateStr);
    if (!puzzleDate) continue;

    // Extract category words (rows 1-16 in sheet = indices 1-16)
    // Word 4 of each category (index 3) is always the outlier
    const category1Words = [getCellValue(1), getCellValue(2), getCellValue(3), getCellValue(4)];
    const category2Words = [getCellValue(5), getCellValue(6), getCellValue(7), getCellValue(8)];
    const category3Words = [getCellValue(9), getCellValue(10), getCellValue(11), getCellValue(12)];
    const category4Words = [getCellValue(13), getCellValue(14), getCellValue(15), getCellValue(16)];

    // Extract category names (rows 17-21 in sheet)
    const category1Name = getCellValue(17);
    const category2Name = getCellValue(18);
    const category3Name = getCellValue(19);
    const category4Name = getCellValue(20);
    const metaCategory = getCellValue(21);

    // Skip incomplete puzzles
    if (!category1Words[0] || !category1Name || !metaCategory) continue;

    // Build rows with shuffled words (word 4 / index 3 is the outlier in sheet)
    const rawRows = [
      { category: category1Name, words: category1Words, isUltimate: false },
      { category: category2Name, words: category2Words, isUltimate: false },
      { category: category3Name, words: category3Words, isUltimate: false },
      { category: category4Name, words: category4Words, isUltimate: true }, // Ultimate Oddest1Out
    ];

    // Shuffle the row order and track where the ultimate row ends up
    const shuffledRowIndices = shuffleArray([0, 1, 2, 3]);
    const newUltimateRowIndex = shuffledRowIndices.findIndex(i => i === 3);

    // Build GameData with shuffled rows and shuffled words within each row
    const rows = shuffledRowIndices.map((originalIdx, newIdx) => {
      const raw = rawRows[originalIdx];
      const { words, newOutlierIndex } = createShuffledWords(raw.words, newIdx, 3); // outlier is always at index 3 in sheet

      return {
        id: `puzzle-${col}-row-${newIdx}`,
        category: raw.category,
        words,
        outlierIndex: newOutlierIndex,
        explanation: `${raw.words[3]} doesn't belong with ${raw.category.toLowerCase()}.`
      };
    });

    const gameData: GameData = {
      rows,
      metaCategory,
      ultimateOutlierRowIndex: newUltimateRowIndex,
      ultimateExplanation: `${category1Words[3]}, ${category2Words[3]}, and ${category3Words[3]} are all ${metaCategory.toLowerCase()}. ${category4Words[3]} is the Ultimate Oddest1Out.`
    };

    puzzles.push({ puzzle: gameData, date: puzzleDate });
  }

  // Update cache
  cachedPuzzles = puzzles;
  cacheTimestamp = Date.now();

  return puzzles;
};

/**
 * Get today's puzzle (matching current date)
 * Falls back to most recent past puzzle if no puzzle for today
 * @param clientDate - Optional date string in "YYYY-MM-DD" format from client's timezone
 */
export const getTodaysPuzzle = async (clientDate?: string | null): Promise<{ puzzle: GameData; date: string }> => {
  try {
    const puzzles = await fetchPuzzlesFromSheet();

    if (puzzles.length === 0) {
      console.warn('No puzzles in sheet, using fallback');
      return { puzzle: fallbackPuzzle, date: new Date().toISOString() };
    }

    // Use client date if provided, otherwise fall back to server date
    let today: Date;
    if (clientDate) {
      const [year, month, day] = clientDate.split('-').map(Number);
      today = new Date(year, month - 1, day);
    } else {
      today = new Date();
    }

    // Find puzzle for today
    const todaysPuzzle = puzzles.find(p => isSameDay(p.date, today));
    if (todaysPuzzle) {
      return { puzzle: todaysPuzzle.puzzle, date: todaysPuzzle.date.toISOString() };
    }

    // Fallback: find most recent past puzzle
    const pastPuzzles = puzzles.filter(p => isBeforeDay(p.date, today));
    if (pastPuzzles.length > 0) {
      // Sort by date descending and get the most recent
      pastPuzzles.sort((a, b) => b.date.getTime() - a.date.getTime());
      console.warn('No puzzle for today, using most recent past puzzle');
      return { puzzle: pastPuzzles[0].puzzle, date: pastPuzzles[0].date.toISOString() };
    }

    // No past puzzles either, return any puzzle
    console.warn('No puzzle for today or past, using first available');
    return { puzzle: puzzles[0].puzzle, date: puzzles[0].date.toISOString() };
  } catch (error) {
    console.error('Failed to fetch puzzles from sheet:', error);
    return { puzzle: fallbackPuzzle, date: new Date().toISOString() };
  }
};

/**
 * Get a random puzzle from past dates only (before today)
 * @param clientDate - Optional date string in "YYYY-MM-DD" format from client's timezone
 */
export const getRandomPastPuzzle = async (clientDate?: string | null): Promise<{ puzzle: GameData; date: string }> => {
  try {
    const puzzles = await fetchPuzzlesFromSheet();

    if (puzzles.length === 0) {
      console.warn('No puzzles in sheet, using fallback');
      return { puzzle: fallbackPuzzle, date: new Date().toISOString() };
    }

    // Use client date if provided, otherwise fall back to server date
    let today: Date;
    if (clientDate) {
      const [year, month, day] = clientDate.split('-').map(Number);
      today = new Date(year, month - 1, day);
    } else {
      today = new Date();
    }

    // Filter to only past puzzles
    const pastPuzzles = puzzles.filter(p => isBeforeDay(p.date, today));

    if (pastPuzzles.length === 0) {
      console.warn('No past puzzles available, using fallback');
      return { puzzle: fallbackPuzzle, date: new Date().toISOString() };
    }

    const index = Math.floor(Math.random() * pastPuzzles.length);
    return { puzzle: pastPuzzles[index].puzzle, date: pastPuzzles[index].date.toISOString() };
  } catch (error) {
    console.error('Failed to fetch puzzles from sheet:', error);
    return { puzzle: fallbackPuzzle, date: new Date().toISOString() };
  }
};
