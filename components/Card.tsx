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
    return "h-16 w-full flex items-center justify-center font-bold text-sm sm:text-base uppercase tracking-wider rounded-md transition-all duration-300 border-2 select-none";
  };

  const getStateClasses = () => {
    switch (state) {
      case CardState.WIN:
        return "bg-green-600 border-green-700 text-white shadow-lg scale-105 z-10";
      case CardState.CORRECT_ROW_WRONG_GAME:
        return "bg-blue-500 border-blue-600 text-white shadow-md";
      case CardState.INACTIVE_ROW:
        return "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed";
      case CardState.WRONG:
        return "bg-red-500 border-red-600 text-white animate-shake z-10";
      case CardState.SELECTED:
        return "bg-white border-2 border-purple-500 text-gray-800";
      case CardState.SELECTED_PHASE2:
        return "bg-purple-100 border-2 border-purple-500 text-gray-800 cursor-pointer";
      case CardState.LOCKED_OUTLIER:
        return "bg-yellow-300 border-yellow-400 text-yellow-900 shadow-md";
      case CardState.LOCKED_OTHER:
        return "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed";
      case CardState.ULTIMATE_WINNER:
        return "bg-purple-500 border-purple-600 text-white shadow-lg";
      case CardState.IDLE:
      default:
        return "bg-white border-gray-300 text-gray-800 hover:bg-gray-50 cursor-pointer hover:shadow-sm";
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