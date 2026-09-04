import React from 'react';
import { 
  Target, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert, 
  Info,
  ExternalLink
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

interface MitreStage {
  id: string;
  name: string;
  techniqueId: string;
  techniqueName: string;
  description: string;
  status: 'OBSERVED' | 'PREDICTED' | 'FUTURE_POTENTIAL' | 'INACTIVE';
  confidence: number;
}

export const MitreAttackPage: React.FC = () => {
  const { currentStage } = useSimulation();

  const getStages = (): MitreStage[] => {
    return [
      {
        id: 'TA0043',
        name: 'Reconnaissance',
        techniqueId: 'T1595',
        techniqueName: 'Active Scanning',
        description: 'Multi-port scanning against DC-01 and WEB-01 to identify open service vectors.',
        status: currentStage >= 2 ? 'OBSERVED' : 'INACTIVE',
        confidence: 0.94
      },
      {
        id: 'TA0001',
        name: 'Initial Access',
        techniqueId: 'T1190',
        techniqueName: 'Exploit Public-Facing Application',
        description: 'Targeted HTTP/Kerberos exploit attempts against Web & Auth gateway.',
        status: currentStage >= 3 ? 'OBSERVED' : currentStage === 2 ? 'PREDICTED' : 'FUTURE_POTENTIAL',
        confidence: 0.88
      },
      {
        id: 'TA0002',
        name: 'Execution',
        techniqueId: 'T1059',
        techniqueName: 'Command & Scripting Interpreter',
        description: 'Simulated payload execution and shell spawning on compromised host.',
        status: currentStage >= 4 ? 'OBSERVED' : currentStage === 3 ? 'PREDICTED' : 'FUTURE_POTENTIAL',
        confidence: 0.82
      },
      {
        id: 'TA0004',
        name: 'Privilege Escalation',
        techniqueId: 'T1068',
        techniqueName: 'Exploitation for PrivEsc',
        description: 'Token impersonation or service abuse to gain domain admin privileges.',
        status: currentStage >= 4 ? 'OBSERVED' : 'FUTURE_POTENTIAL',
        confidence: 0.79
      },
      {
        id: 'TA0011',
        name: 'Command & Control',
        techniqueId: 'T1071',
        techniqueName: 'Application Layer Protocol (C2)',
        description: 'Encrypted periodic beaconing channel established with external host 198.51.100.24.',
        status: currentStage >= 4 ? 'PREDICTED' : 'FUTURE_POTENTIAL',
        confidence: 0.82
      },
      {
        id: 'TA0008',
        name: 'Lateral Movement',
        techniqueId: 'T1021',
        techniqueName: 'Remote Services / SMB',
        description: 'Internal pivoting toward Database Server (DB-01 / 10.10.20.15).',
        status: currentStage >= 4 ? 'FUTURE_POTENTIAL' : 'INACTIVE',
        confidence: 0.68
      },
      {
        id: 'TA0010',
        name: 'Exfiltration',
        techniqueId: 'T1048',
        techniqueName: 'Exfiltration Over Alt Protocol',
        description: 'Bulk data transfer of sensitive Indian enterprise database records.',
        status: currentStage >= 4 ? 'FUTURE_POTENTIAL' : 'INACTIVE',
        confidence: 0.54
      }
    ];
  };

  const stages = getStages();

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20 font-mono">
                MITRE ATT&CK Enterprise
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300">Tactics & Matrix Progression</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <Target className="w-5 h-5 text-rose-400" />
              Predicted Attack Progression Map
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Contextualizes the temporal network state sequence against standardized adversary tactics and techniques.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-emerald-950/40 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Observed Activity</span>
            </div>
            <div className="flex items-center gap-1.5 bg-sky-950/40 text-sky-300 px-2.5 py-1 rounded-lg border border-sky-500/30 shadow-glow-cyan">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="font-bold">AI Predicted Stage</span>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Matrix Progression Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
          <span>Enterprise Kill Chain Sequence</span>
          <span className="text-[10px] text-slate-400 font-mono">7 Key Progression Stages</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {stages.map((stg, idx) => {
            const isObserved = stg.status === 'OBSERVED';
            const isPredicted = stg.status === 'PREDICTED';
            const isFuture = stg.status === 'FUTURE_POTENTIAL';

            return (
              <div
                key={stg.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                  isPredicted
                    ? 'bg-sky-950/30 border-sky-500/50 shadow-glow-cyan ring-1 ring-sky-400/50'
                    : isObserved
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : isFuture
                    ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    : 'bg-slate-950/30 border-slate-850 opacity-50'
                }`}
              >
                <div>
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{stg.id}</span>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                        isPredicted
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse'
                          : isObserved
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : isFuture
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {stg.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white leading-snug">{stg.name}</h4>

                  <div className="mt-2 inline-block text-[10px] font-mono text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/20">
                    {stg.techniqueId}
                  </div>
                  <span className="block text-[11px] text-slate-300 font-semibold mt-1">
                    {stg.techniqueName}
                  </span>

                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    {stg.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Confidence:</span>
                  <span className="font-bold text-slate-200">{(stg.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demonstration Context & Disclaimer */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-200">Demonstration Context & Attribution Disclaimer:</span>
          <p>
            MITRE ATT&CK mapping is used for demonstration and contextualisation of predicted attack stages in accordance with SIH problem statement SIH26153. SYNTRA does not assert verified adversary attribution without secondary host-level telemetry confirmation.
          </p>
        </div>
      </div>

    </div>
  );
};
