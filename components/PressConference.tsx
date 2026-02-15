import React, { useState, useEffect } from 'react';
import { generatePressConferenceQuestion } from '../services/geminiService';
import { Button } from './Button';

interface PressConferenceProps {
  lastMatchWon: boolean;
  onComplete: () => void;
}

export const PressConference: React.FC<PressConferenceProps> = ({ lastMatchWon, onComplete }) => {
  const [data, setData] = useState<{ question: string; options: string[] } | null>(null);

  useEffect(() => {
    generatePressConferenceQuestion(lastMatchWon).then(setData);
  }, [lastMatchWon]);

  if (!data) return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-2xl font-bold animate-bounce">Reporter is setting up the mic...</div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-8 bg-gray-900 text-white relative overflow-hidden">
        {/* Flash effect background */}
        <div className="absolute inset-0 bg-white opacity-5 animate-pulse pointer-events-none"></div>

        <div className="max-w-2xl mx-auto w-full z-10 flex flex-col gap-8">
            <div className="bg-gray-800 p-6 rounded-lg border-l-4 border-yellow-500 shadow-xl">
                <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">🎤</div>
                     <h3 className="font-bold text-yellow-500 uppercase">Scoop McDangles, The Local Gazette</h3>
                </div>
                <p className="text-xl md:text-2xl font-serif leading-relaxed">"{data.question}"</p>
            </div>

            <div className="grid gap-4">
                {data.options.map((opt, i) => (
                    <button 
                        key={i}
                        onClick={onComplete}
                        className="text-left p-4 bg-gray-950 border border-gray-700 hover:bg-gray-800 hover:border-cyan-500 transition-all rounded group"
                    >
                        <span className="text-cyan-500 font-bold mr-2 group-hover:text-white">{i + 1}.</span>
                        <span className="text-gray-300 group-hover:text-white">{opt}</span>
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};
