import React from 'react';
import { CardState } from '../types';

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
    return "h-14 sm:h-16 w-full flex items-center justify-center font-bold text-xs sm:text-sm uppercase tracking-wider rounded-md transition-all duration-300 border-2 select-none px-1";
  };

  const getStateClasses = () => {
    switch (state) {
      case CardState.WIN:
        return "bg-emerald-500 border-emerald-600 text-white shadow-lg scale-105 z-10";
      case CardState.CORRECT_ROW_WRONG_GAME:
        return "bg-sky-500 border-sky-600 text-white shadow-md";
      case CardState.INACTIVE_ROW:
        return "bg-stone-200 border-stone-300 text-stone-400 cursor-not-allowed";
      case CardState.WRONG:
        return "bg-rose-500 border-rose-600 text-white animate-shake z-10";
      case CardState.SELECTED:
        return "bg-white border-2 border-violet-500 text-stone-800";
      case CardState.SELECTED_PHASE2:
        return "bg-violet-100 border-2 border-violet-500 text-stone-800 cursor-pointer";
      case CardState.LOCKED_OUTLIER:
        return "bg-amber-300 border-amber-400 text-amber-900 shadow-md";
      case CardState.LOCKED_OTHER:
        return "bg-stone-200 border-stone-300 text-stone-400 cursor-not-allowed";
      case CardState.ULTIMATE_WINNER:
        return "bg-violet-500 border-violet-600 text-white shadow-lg";
      case CardState.IDLE:
      default:
        return "bg-white border-stone-300 text-stone-800 hover:bg-stone-50 cursor-pointer hover:shadow-sm";
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