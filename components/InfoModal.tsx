import React from 'react';

interface InfoModalProps {
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-stone-800 rounded-lg shadow-2xl max-w-md w-full p-4 sm:p-6 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
          How to Play
        </h2>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-2xl leading-none"
        >
          &times;
        </button>
      </div>
      <div className="space-y-3 sm:space-y-4 text-stone-700 dark:text-stone-300 text-xs sm:text-sm">
        <div>
          <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
            Goal
          </h3>
          <p>
            Find the{" "}
            <span className="font-semibold">
              Oddest<span className="text-violet-500">1</span>Out
            </span>{" "}
            — the outlier among outliers.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
            Phase 1: Select the Odd one out
          </h3>
          <p>
            Each row has four words. Three belong to a category, one doesn't.
            Select the Odd one in each row.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
            Phase 2: Find the Oddest<span className="text-violet-500">1</span>
            Out
          </h3>
          <p>
            Once all rows have an Odd word selected, tap your choice for the
            Oddest word. Three of the Odd words share a hidden connection — one
            does not.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
            Strikes
          </h3>
          <p>
            <span className="text-rose-500 font-semibold">Red</span> = Wrong
            guess (not an odd word).
            <br />
            <span className="text-amber-500 font-semibold">Yellow</span> =
            Correct word in row, but not the{" "}
            <span className="font-semibold">
              Oddest<span className="text-violet-500">1</span>Out
            </span>
            <br />3 strikes and you lose!
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default InfoModal;
