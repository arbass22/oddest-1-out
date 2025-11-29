import React from 'react';

interface CategoryCardProps {
  category: string;
  words: string[];
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, words }) => {
  return (
    <div
      className="col-span-3 h-14 sm:h-16 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 border-2 rounded-md flex flex-col items-center justify-center shadow-sm px-2 text-center select-none"
      style={{ animation: "fadeIn 600ms ease-out" }}
    >
      <span className="font-bold text-stone-900 dark:text-stone-100 uppercase text-xs sm:text-sm tracking-widest leading-tight mb-0.5">
        {category}
      </span>
      <span className="text-stone-600 dark:text-stone-400 uppercase text-[10px] sm:text-xs font-medium truncate w-full px-2">
        {words.join(", ")}
      </span>
    </div>
  );
};

export default CategoryCard;
