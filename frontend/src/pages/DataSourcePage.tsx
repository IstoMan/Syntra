import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  CheckCircle2, 
  FileText, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  Server,
  AlertCircle
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { api } from '../services/api';
import { DatasetItem } from '../types';

export const DataSourcePage: React.FC = () => {
  const { activeDataset, setActiveDataset } = useSimulation();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    api.getDatasets().then(setDatasets);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsProcessing(true);
    setUploadStatus(`Parsing and extracting temporal features from ${file.name}...`);

    setTimeout(() => {
      setIsProcessing(false);
      setUploadStatus(`Successfully parsed ${file.name} (4,820 flows ingested into SYNTRA temporal state memory).`);
      setActiveDataset(`Custom Ingest: ${file.name}`);
    }, 1200);
  };

  const handleSelectDataset = (dataset: DatasetItem) => {
    setActiveDataset(dataset.name);
    setUploadStatus(`Active telemetry baseline switched to: ${dataset.name}`);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/20 font-mono">
                Telemetry Ingestion
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300">Benchmarks & Custom PCAP/CSV</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-400" />
              Network Telemetry Data Sources & Feature Ingestion
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Supports benchmark datasets (CIC-IDS2017/2018, UNSW-NB15, CTU-13) and live CSV/PCAP flow feature extraction for real-time temporal attack forecasting.
            </p>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-center">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Active Dataset</span>
            <span className="font-mono font-bold text-sky-400 text-xs truncate max-w-[200px] block">
              {activeDataset}
            </span>
          </div>
        </div>
      </div>

      {/* Upload Zone & Live Feed Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CSV / PCAP Upload Card */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-400" />
              Upload Custom Network Flow Dataset (CSV / PCAP)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload standard flow exports containing timestamp, source/dest IP & ports, protocol, packets, and duration.
            </p>
          </div>

          <label className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-950/40 hover:bg-slate-950/70 transition-all cursor-pointer group">
            <input
              type="file"
              accept=".csv,.pcap"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="p-3.5 rounded-full bg-slate-900 group-hover:bg-sky-500/20 border border-slate-700 group-hover:border-sky-500/40 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-sky-400" />
            </div>
            <div className="text-center">
              <span className="text-sm font-bold text-slate-200 group-hover:text-white block">
                Click to browse or drop CSV/PCAP network capture
              </span>
              <span className="text-xs text-slate-500 mt-1 block font-mono">
                Supported: CICFlowMeter CSV, Zeek Conn Logs, Suricata EVE JSON, Wireshark PCAP
              </span>
            </div>
          </label>

          {uploadStatus && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-3 ${
              isProcessing
                ? 'bg-sky-950/40 border-sky-500/30 text-sky-300'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{uploadStatus}</span>
            </div>
          )}
        </div>

        {/* Telemetry Buffer Metrics */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              Live Ingestion Pipeline
            </h3>
            
            <div className="mt-4 space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-slate-400">Stream Status:</span>
                <span className="text-emerald-400 font-bold">Active & Aggregating</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-slate-400">Time Window:</span>
                <span className="text-sky-400 font-bold">60-second Slices</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-slate-400">Feature Dimensions:</span>
                <span className="text-indigo-300 font-bold">78 Temporal Vectors</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-slate-400">Timezone Context:</span>
                <span className="text-slate-200">Asia/Kolkata (IST)</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Zero persistent storage of unencrypted PII</span>
          </div>
        </div>

      </div>

      {/* Available Pre-Loaded Datasets */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          Pre-Loaded Benchmark & Enterprise Scenario Profiles
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datasets.map((ds) => {
            const isActive = activeDataset.includes(ds.name) || activeDataset === ds.name;
            return (
              <div
                key={ds.id}
                onClick={() => handleSelectDataset(ds)}
                className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                  isActive
                    ? 'bg-sky-950/30 border-sky-500 shadow-glow-cyan'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      {ds.type}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isActive ? 'Active Telemetry' : 'Available'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{ds.name}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{ds.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-slate-400">Total Flows: <strong className="text-slate-200">{ds.flows_count.toLocaleString()}</strong></span>
                  <div className="flex flex-wrap gap-1">
                    {ds.attack_types.slice(0, 3).map((atk, idx) => (
                      <span key={idx} className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                        {atk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
