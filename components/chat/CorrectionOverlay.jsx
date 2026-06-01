'use client';

import React from 'react';

/**
 * CorrectionOverlay compares original user speech against optimized grammar edits.
 * Leverages high-contrast visual cues for fast self-correction.
 */
export default function CorrectionOverlay({ original, corrected }) {
  // Simple word-level visual highlights
  const originalWords = original.split(' ');
  const correctedWords = corrected.split(' ');

  // Create a simplified difference comparison view
  return (
    <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-900 text-[11px] space-y-2 leading-relaxed">
      <div>
        <span className="text-rose-400 font-semibold">You said: </span>
        <span className="text-slate-400 line-through">{original}</span>
      </div>
      <div>
        <span className="text-emerald-400 font-semibold">Suggested: </span>
        <span className="text-slate-100 font-bold bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
          {corrected}
        </span>
      </div>
    </div>
  );
}
