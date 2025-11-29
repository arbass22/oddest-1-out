import React from 'react';

interface ModalProps {
  title: string;
  message: string;
  buttonText: string;
  onAction: () => void;
  colorClass: string;
}

const Modal: React.FC<ModalProps> = ({ title, message, buttonText, onAction, colorClass }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-stone-800 rounded-lg shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
      <h2 className={`text-3xl font-serif font-bold mb-4 ${colorClass}`}>{title}</h2>
      <p className="text-stone-600 dark:text-stone-300 mb-8 leading-relaxed whitespace-pre-wrap">{message}</p>
      <button
        onClick={onAction}
        className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-8 py-3 rounded-full font-bold hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors uppercase tracking-widest text-sm"
      >
        {buttonText}
      </button>
    </div>
  </div>
);

export const LossModal: React.FC<{ onRestart: () => void }> = ({ onRestart }) => (
  <Modal
    title="Game Over"
    message="You've accumulated 3 strikes. The categories proved too elusive this time."
    buttonText="Try Again"
    onAction={onRestart}
    colorClass="text-rose-600"
  />
);