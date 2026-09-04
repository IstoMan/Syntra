import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Sliders, 
  Activity, 
  ShieldCheck, 
  Clock, 
  Server,
  Save,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export const SettingsPage: React.FC = () => {
  const { speed, setSpeed, isPlaying, togglePlay } = useSimulation();

  const [forecastHorizon, setForecastHorizon] = useState<number>(5);
  const [riskThreshold, setRiskThreshold] = useState<number>(6.5);
  const [alertSensitivity, setAlertSensitivity] = useState<number>(75);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [showExplanations, setShowExplanations] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-5xl">
      
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700 font-mono">
            Platform Configuration
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-300">Model & Pipeline Controls</span>
        </div>
        <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-sky-400" />
          SYNTRA Forecasting & SOC Engine Settings
        </h2>
        <p className="text-xs text-slate-300 mt-1">
          Adjust temporal prediction horizons, alert sensitivity thresholds, simulation playback, and system parameters.
        </p>
      </div>

      {/* Settings Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Section 1: Forecast Parameters */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-sky-400" />
            1. Temporal Forecast Parameters
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-medium">Forecast Horizon (Lead Time Windows)</label>
                <span className="font-mono text-sky-400 font-bold">{forecastHorizon} Windows</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 5, 10].map((h) => (
                  <button
                    key={h}
                    onClick={() => setForecastHorizon(h)}
                    className={`py-1.5 rounded-lg font-mono font-bold text-xs border transition-colors cursor-pointer ${
                      forecastHorizon === h
                        ? 'bg-sky-500 text-white border-sky-400 shadow-glow-cyan'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {h} {h === 1 ? 'Window' : 'Windows'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Defines the multi-step lookahead horizon for temporal transition inference.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">Risk Alert Threshold Score</label>
                <span className="font-mono text-rose-400 font-bold">{riskThreshold.toFixed(1)} / 10</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="9.5"
                step="0.5"
                value={riskThreshold}
                onChange={(e) => setRiskThreshold(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1.0 (High Sensitivity)</span>
                <span>6.5 (Standard)</span>
                <span>9.5 (Critical Only)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">Attack Probability Trigger</label>
                <span className="font-mono text-amber-400 font-bold">{alertSensitivity}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                step="5"
                value={alertSensitivity}
                onChange={(e) => setAlertSensitivity(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Simulation Controls */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Activity className="w-4 h-4 text-indigo-400" />
            2. Simulation & Playback Engine
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-2">Telemetry Simulation Tick Rate</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSpeed(spd)}
                    className={`py-2 rounded-lg font-mono font-bold text-xs border transition-colors cursor-pointer ${
                      speed === spd
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {spd}x Speed
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium block">Continuous Telemetry Ingestion</span>
                <span className="text-[11px] text-slate-500">Auto-generate sequential network flow vectors</span>
              </div>
              <button
                onClick={togglePlay}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                  isPlaying ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isPlaying ? 'Active' : 'Paused'}
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium block">Natural Language Explanations</span>
                <span className="text-[11px] text-slate-500">Synthesize human-readable SHAP insights</span>
              </div>
              <input
                type="checkbox"
                checked={showExplanations}
                onChange={(e) => setShowExplanations(e.target.checked)}
                className="w-4 h-4 accent-sky-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: System Context & Deployment */}
        <div className="md:col-span-2 bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Server className="w-4 h-4 text-emerald-400" />
            3. Operational System Metadata (Demonstration Context)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Deployment Mode</span>
              <span className="text-slate-200 font-bold mt-0.5 block">Indian CII Demo</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Target Region</span>
              <span className="text-slate-200 font-bold mt-0.5 block">India (Domestic)</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Standard Timezone</span>
              <span className="text-indigo-400 font-bold mt-0.5 block">Asia/Kolkata (IST)</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">System Health</span>
              <span className="text-emerald-400 font-bold mt-0.5 block">● Online (FastAPI)</span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-glow-cyan cursor-pointer transition-colors"
            >
              {saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saveSuccess ? 'Settings Saved Successfully!' : 'Save System Parameters'}</span>
            </button>

            <span className="text-[11px] text-slate-500 font-mono">
              SYNTRA Version 1.0.0-SIH26153
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
