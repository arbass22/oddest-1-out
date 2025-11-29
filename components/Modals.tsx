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
    <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
      <h2 className={`text-3xl font-serif font-bold mb-4 ${colorClass}`}>{title}</h2>
      <p className="text-gray-600 mb-8 leading-relaxed whitespace-pre-wrap">{message}</p>
      <button
        onClick={onAction}
        className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors uppercase tracking-widest text-sm"
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
    colorClass="text-red-600"
  />
);