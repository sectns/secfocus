import React from 'react';
import { Github } from 'lucide-react';
export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#030303] py-4 px-8 mt-auto">
      <div className="flex justify-between items-center text-[10px] text-neutral-600 uppercase tracking-widest font-mono">
        <span>SecFocus v28.0: Final Masterpiece</span>
        <a href="https://github.com/sectns" target="_blank" className="flex items-center gap-2 hover:text-emerald-500 transition-colors"><Github size={12} /> sectns</a>
      </div>
    </footer>
  );
}
