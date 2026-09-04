import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  Compass,
  Radio
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const DemoController: React.FC = () => {
  const {
    currentStage,
    stageName,
    isPlaying,
    speed,
    togglePlay,
    stepForward,
    resetSimulation,
    setStage,
    setSpeed
  } = useSimulation();

  const stages = [
    { num: 1, label: 'Normal' },
    { num: 2, label: 'Recon' },
    { num: 3, label: 'Exploit' },
    { num: 4, label: 'Forecast C2' },
    { num: 5, label: 'Early Warning' },
    { num: 6, label: 'Lateral Move' },
    { num: 7, label: 'Exfiltration' }
  ];

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-2.5 shadow-2xl transition-all duration-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Active Stage Status */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? 'bg-sky-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPlaying ? 'bg-sky-500' : 'bg-amber-500'}`} />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 font-mono">
                SIMULATION:
              </span>
              <span className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">
                {stageName}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Stage Step Buttons (1 to 7) */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
          {stages.map((stg) => {
            const isActive = currentStage === stg.num;
            const isPassed = currentStage > stg.num;
            return (
              <button
                key={stg.num}
                onClick={() => setStage(stg.num)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-500 text-white font-bold shadow-glow-cyan border border-sky-400'
                    : isPassed
                    ? 'bg-slate-800/90 text-sky-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                  isActive ? 'bg-white text-sky-600 font-bold' : isPassed ? 'bg-sky-500/30 text-sky-300' : 'bg-slate-700 text-slate-400'
                }`}>
                  {stg.num}
                </span>
                <span className="hidden sm:inline whitespace-nowrap">{stg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Playback & Speed Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={togglePlay}
            className={`p-1.5 px-2.5 rounded-md border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-sky-500 hover:bg-sky-400 text-white border-sky-400 shadow-glow-cyan'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Run Live Simulation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{isPlaying ? 'Pause' : 'Simulate'}</span>
          </button>

          <button
            onClick={stepForward}
            disabled={isPlaying}
            className="p-1.5 px-2 rounded-md bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
            title="Step Stage"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[11px]">Step</span>
          </button>

          <button
            onClick={resetSimulation}
            className="p-1.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 text-xs font-medium cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 p-0.5 text-[11px] font-mono">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeed(spd)}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  speed === spd ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
