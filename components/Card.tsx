import React from 'react';
import { CardState } from '@/types';

interface CardProps {
  text: string;
  state: CardState;
  onClick: () => void;
  disabled: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const Card: React.FC<CardProps> = ({ text, state, onClick, disabled, style, className = '' }) => {
  const getBaseClasses = () => {
    return "h-14 sm:h-16 w-full flex items-center justify-center font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-md transition-all duration-300 border-2 select-none px-1";
  };

  const getStateClasses = () => {
    switch (state) {
      case CardState.WIN:
        return "bg-emerald-500 border-emerald-600 text-white shadow-lg scale-105 z-10";
      case CardState.CORRECT_ROW_WRONG_GAME:
        return "bg-sky-500 border-sky-600 text-white shadow-md";
      case CardState.INACTIVE_ROW:
        return "bg-stone-200 dark:bg-stone-700 border-stone-300 dark:border-stone-600 text-stone-400 cursor-not-allowed";
      case CardState.WRONG:
        return "bg-rose-500 border-rose-600 text-white animate-shake z-10";
      case CardState.SELECTED:
        return "bg-white dark:bg-stone-800 border-2 border-violet-500 text-stone-800 dark:text-stone-100";
      case CardState.SELECTED_PHASE2:
        return "bg-white dark:bg-stone-800 border-2 border-violet-500 text-stone-800 dark:text-stone-100 cursor-pointer animate-pulse-glow";
      case CardState.LOCKED_OUTLIER:
        return "bg-amber-200 dark:bg-amber-400/70 border-amber-300 dark:border-amber-500 text-amber-800 dark:text-amber-100 shadow-md";
      case CardState.LOCKED_OTHER:
        return "bg-stone-200 dark:bg-stone-700 border-stone-300 dark:border-stone-600 text-stone-400 cursor-not-allowed";
      case CardState.ULTIMATE_WINNER:
        return "bg-violet-500 border-violet-600 text-white shadow-lg";
      case CardState.IDLE:
      default:
        return "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-700 cursor-pointer hover:shadow-sm";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`${getBaseClasses()} ${getStateClasses()} ${className}`}
    >
      {text}
    </button>
  );
};

export default Card;