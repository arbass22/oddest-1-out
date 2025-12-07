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
  SELECTED = 'SELECTED', // Light gray (Phase 1 selection)
  SELECTED_PHASE2 = 'SELECTED_PHASE2', // Darker gray (Phase 2 - ready to guess)
  LOCKED_OUTLIER = 'LOCKED_OUTLIER', // Yellow (correct row outlier, awaiting reveal)
  LOCKED_OTHER = 'LOCKED_OTHER', // Grayed out (other cards in locked row)
  ULTIMATE_WINNER = 'ULTIMATE_WINNER', // Purple (the oddest one out)
  CORRECT_ROW_WRONG_GAME = 'CORRECT_ROW_WRONG_GAME', // Blue (revealed partial)
  INACTIVE_ROW = 'INACTIVE_ROW', // Gray (Phase 3 Solved Row)
  WRONG = 'WRONG', // Red (Phase 3 Error)
  WIN = 'WIN', // Green (Phase 3 Win)
}

export type GameStatus = 'loading' | 'playing' | 'won' | 'lost' | 'error';

// Row display states for animation
export type RowDisplayState = 'interactive' | 'locked' | 'sliding' | 'revealed';

// Game phase for animation control
export type GamePhase = 'playing' | 'checking' | 'animating' | 'ended';

// Row check status for tracking which rows have been verified via Check
export type RowCheckStatus = 'pending' | 'revealed';
