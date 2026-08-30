import { useState } from 'react'
import { ArrowRight, Code2, Network, ShieldAlert } from 'lucide-react'

export default function Landing({ onLogin }: { onLogin: (username: string) => void }) {
  const [username, setUsername] = useState('')

  return (
    <div className="bg-[#050505] text-white font-sans selection:bg-[#a5f3fc] selection:text-black flex flex-col">

      {/* ── Hero ── cyan background, scroll-trigger anchor */}
      <div className="min-h-screen flex items-center justify-center bg-[#a5f3fc] text-black border-b-8 border-black relative overflow-hidden">
        {/* Grid texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000015_1px,transparent_1px),linear-gradient(to_bottom,#00000015_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="max-w-4xl w-full px-8 flex flex-col gap-8 relative z-10">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] uppercase">
            Build.<br />Deploy.<br />Map.
          </h1>
          <p className="text-2xl font-bold text-black/70 max-w-lg mt-4">
            ContextOS requires a developer identity to map behavioral changes. Enter your handle to begin.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (username.trim()) onLogin(username.trim())
            }}
            className="flex flex-col sm:flex-row gap-4 mt-4"
          >
            <input
              type="text"
              placeholder="Enter username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 bg-white border-4 border-black px-6 py-4 text-xl font-bold text-black placeholder-black/30 outline-none focus:ring-4 focus:ring-black/20 rounded-none transition-all"
              autoFocus
            />
            <button
              type="submit"
              disabled={!username.trim()}
              className="bg-black text-[#a5f3fc] px-8 py-4 text-xl font-black border-4 border-black hover:bg-transparent hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-wider"
            >
              Enter Engine <ArrowRight className="w-6 h-6" />
            </button>
          </form>

          {/* Scroll hint */}
          <div className="absolute bottom-[-100px] left-8 animate-bounce flex items-center gap-2 text-black font-black uppercase tracking-widest text-sm">
            Scroll to explore <ArrowRight className="w-4 h-4 rotate-90" />
          </div>
        </div>
      </div>

      {/* ── Sticky scroll cards section ── */}
      <div className="relative pb-32 bg-[#050505]">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="max-w-4xl mx-auto px-4 relative z-10">

          {/* Card 1 — Static Analysis (cyan) */}
          <div className="h-screen sticky top-0 flex items-center justify-center py-20">
            <div className="w-full bg-[#0a0a0a] border-4 border-[#a5f3fc] rounded-none p-12 shadow-[16px_16px_0px_#a5f3fc] hover:shadow-[24px_24px_0px_#a5f3fc] hover:-translate-y-2 hover:scale-[1.01] transition-all duration-300">
              <div className="w-16 h-16 bg-[#a5f3fc] flex items-center justify-center mb-8 border-4 border-black shadow-[4px_4px_0px_black]">
                <Code2 className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-6 text-white uppercase tracking-tighter">1. Static Analysis</h2>
              <p className="text-xl text-zinc-400 font-bold leading-relaxed">
                We parse your entire repository. ContextOS reads your React frontend and FastAPI backend, extracting symbols, imports, and endpoints with absolute brutalist precision.
              </p>
            </div>
          </div>

          {/* Card 2 — Behavior Graph (purple) */}
          <div className="h-screen sticky top-0 flex items-center justify-center py-20">
            <div className="w-full bg-[#0a0a0a] border-4 border-[#d8b4fe] rounded-none p-12 shadow-[16px_16px_0px_#d8b4fe] hover:shadow-[24px_24px_0px_#d8b4fe] hover:-translate-y-2 hover:scale-[1.01] transition-all duration-300 mt-12">
              <div className="w-16 h-16 bg-[#d8b4fe] flex items-center justify-center mb-8 border-4 border-black shadow-[4px_4px_0px_black]">
                <Network className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-6 text-white uppercase tracking-tighter">2. Behavior Graph</h2>
              <p className="text-xl text-zinc-400 font-bold leading-relaxed">
                Code becomes geometry. We map the exact route from a button click in your UI, through the network, directly to the backend logic and database models.
              </p>
            </div>
          </div>

          {/* Card 3 — Impact Engine (red/salmon) */}
          <div className="h-screen sticky top-0 flex items-center justify-center py-20">
            <div className="w-full bg-[#0a0a0a] border-4 border-[#fca5a5] rounded-none p-12 shadow-[16px_16px_0px_#fca5a5] hover:shadow-[24px_24px_0px_#fca5a5] hover:-translate-y-2 hover:scale-[1.01] transition-all duration-300 mt-24">
              <div className="w-16 h-16 bg-[#fca5a5] flex items-center justify-center mb-8 border-4 border-black shadow-[4px_4px_0px_black]">
                <ShieldAlert className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-6 text-white uppercase tracking-tighter">3. Impact Engine</h2>
              <p className="text-xl text-zinc-400 font-bold leading-relaxed">
                When you make a change, the graph instantly propagates the risk. ContextOS detects broken behaviors and surfaces newly built capabilities in real-time.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer tagline ── */}
      <div className="min-h-screen bg-black flex flex-col justify-end pb-8 px-8 md:px-16 relative z-20">
        <div className="flex-1 flex items-center">
          <h1 className="text-7xl md:text-9xl lg:text-[140px] font-medium tracking-tighter leading-[0.85] text-white max-w-7xl">
            Reliable code for the world's most important decisions.
          </h1>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-end gap-8 pt-12 border-t border-zinc-900 mt-12">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-zinc-900 rounded flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-400 hover:text-white">
              <span className="font-bold text-sm tracking-widest">in</span>
            </div>
            <div className="w-12 h-12 bg-zinc-900 rounded flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-400 hover:text-white">
              <span className="font-black text-lg">X</span>
            </div>
          </div>

          <div className="text-right flex flex-col gap-2 text-[10px] md:text-xs font-mono text-zinc-600">
            <div className="flex gap-4 justify-end">
              <a href="#" className="hover:text-zinc-400 transition-colors uppercase tracking-wider">Manage Your Cookie Preferences</a>
            </div>
            <div className="flex flex-wrap gap-2 justify-end uppercase tracking-wider">
              <span>Copyright © 2026 ContextOS, Inc. All rights reserved.</span>
              <a href="#" className="underline hover:text-zinc-400 transition-colors">Terms of Use</a>
              <span>&</span>
              <a href="#" className="underline hover:text-zinc-400 transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
