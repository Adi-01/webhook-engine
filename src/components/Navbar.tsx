import { Link } from '@tanstack/react-router';
import { Radio, Database, Layers } from 'lucide-react';

export function Navbar() {
  return (
    <header className="border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between min-w-0">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 group shrink-0 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
          <Radio className="w-4 h-4 animate-pulse" />
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-bold text-sm tracking-tight text-[#f4f4f5] group-hover:text-white transition-colors truncate">
            Webhook Engine
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
            KRaft
          </span>
        </div>
      </Link>

      {/* Status Badges (Responsive) */}
      <nav className="flex items-center gap-2 sm:gap-3 text-xs text-[#a1a1aa] shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#18181b] border border-[#27272a] font-mono text-[11px]">
          <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="hidden sm:inline">Topics:</span>
          <span>5</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#18181b] border border-[#27272a] font-mono text-[11px]">
          <Database className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="hidden sm:inline">Postgres</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        </div>
      </nav>
    </header>
  );
}
