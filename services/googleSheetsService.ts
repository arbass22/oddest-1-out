import { GameData, WordItem } from '../types';

const SHEET_ID = '1On5skhllTetpU-ERJkmIWl0lmQzARmMyO4yiQP-637k';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

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
export const fetchPuzzlesFromSheet = async (): Promise<GameData[]> => {
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
  const puzzles: GameData[] = [];

  // Get number of puzzle columns (skip column A which has labels)
  const numColumns = data.table.cols.length;

  // Process each puzzle column (starting from column B = index 1)
  for (let col = 1; col < numColumns; col++) {
    const getCellValue = (rowIndex: number): string => {
      const cell = sheetRows[rowIndex]?.c?.[col];
      return cell?.v?.toString() ?? '';
    };

    // Skip empty columns
    const date = getCellValue(0);
    if (!date) continue;

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

    puzzles.push(gameData);
  }

  return puzzles;
};

/**
 * Fetches puzzles and returns a random one
 */
export const getRandomPuzzleFromSheet = async (): Promise<GameData> => {
  const puzzles = await fetchPuzzlesFromSheet();

  if (puzzles.length === 0) {
    throw new Error('No puzzles found in sheet');
  }

  const index = Math.floor(Math.random() * puzzles.length);
  return puzzles[index];
};
