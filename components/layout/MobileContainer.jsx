'use client';

import React from 'react';

/**
 * Centering container that simulates a premium mobile screen on desktop
 * while expanding to a native, edge-to-edge layout on real mobile devices.
 */
export default function MobileContainer({ children }) {
  return (
    <div className="relative min-h-dvh w-full bg-slate-950 flex items-center justify-center overflow-hidden">
      {/* Decorative desktop ambient light blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-950/20 blur-[120px] pointer-events-none hidden md:block" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-purple-950/20 blur-[120px] pointer-events-none hidden md:block" />

      {/* Main Container Frame */}
      <div className="relative w-full max-w-md h-dvh bg-[#030712] border-x border-slate-900 shadow-2xl flex flex-col justify-between overflow-hidden md:rounded-3xl md:h-[840px] md:max-h-[90vh] md:border">
        {/* Top iOS-style virtual notch/indicator for desktop frame */}
        <div className="hidden md:flex absolute top-0 inset-x-0 h-6 bg-[#030712] z-50 items-center justify-center">
          <div className="w-24 h-4 bg-slate-950 rounded-b-xl border-x border-b border-slate-900" />
        </div>

        {/* Dynamic content scroll frame */}
        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col md:pt-6 no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
