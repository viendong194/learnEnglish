'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Premium mobile bottom tab navigation bar with smooth glassmorphism,
 * glowing icons, and responsive active state classes.
 */
export default function StickyBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      path: '/',
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={active ? "2.5" : "1.5"}
          stroke="currentColor"
          className={`w-6 h-6 transition-all duration-300 ${active ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'text-slate-400'}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      label: 'Chat',
      path: '/chat',
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={active ? "2.5" : "1.5"}
          stroke="currentColor"
          className={`w-6 h-6 transition-all duration-300 ${active ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]' : 'text-slate-400'}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      ),
    },
    {
      label: 'Notebook',
      path: '/notebook',
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={active ? "2.5" : "1.5"}
          stroke="currentColor"
          className={`w-6 h-6 transition-all duration-300 ${active ? 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.6)]' : 'text-slate-400'}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="absolute bottom-0 inset-x-0 h-20 glassmorphism flex items-center justify-around px-6 pb-safe border-t border-slate-900 rounded-t-2xl z-40">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className="flex flex-col items-center justify-center gap-1 group w-16"
          >
            <div className="relative flex items-center justify-center p-1 rounded-xl transition-all duration-300 group-active:scale-95 group-hover:bg-slate-900/40">
              {item.icon(isActive)}
              {/* Floating micro dot underneath active item */}
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </div>
            <span
              className={`text-[10px] font-semibold tracking-wider uppercase transition-colors duration-300 ${
                isActive ? 'text-slate-100 font-bold' : 'text-slate-500 group-hover:text-slate-400'
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
