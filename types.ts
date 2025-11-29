export interface WordItem {
  text: string;
  id: string; // unique ID for React keys
}

export interface GameRow {
  id: string;
  category: string; // The category for the 3 'normal' words
  words: WordItem[];
  outlierIndex: number; // The index (0-3) of the word that DOES NOT fit the row category
  explanation: string; // Why the outlier is the outlier
}

export interface GameData {
  rows: GameRow[];
  metaCategory: string; // The category shared by 3 of the 4 row-outliers
  ultimateOutlierRowIndex: number; // Which row's outlier is the Ultimate Odd1Out
  ultimateExplanation: string; // Why the ultimate outlier doesn't fit the meta category
}

export enum CardState {
  IDLE = 'IDLE',
  SELECTED = 'SELECTED', // Yellow (Phase 1 selection)
  CORRECT_ROW_WRONG_GAME = 'CORRECT_ROW_WRONG_GAME', // Blue (Phase 3 Partial)
  INACTIVE_ROW = 'INACTIVE_ROW', // Gray (Phase 3 Solved Row)
  WRONG = 'WRONG', // Red (Phase 3 Error)
  WIN = 'WIN', // Green (Phase 3 Win)
}

export type GameStatus = 'loading' | 'playing' | 'won' | 'lost' | 'error';

// Row display states for animation
export type RowDisplayState = 'interactive' | 'sliding' | 'revealed';

// Game phase for animation control
export type GamePhase = 'playing' | 'animating' | 'ended';
