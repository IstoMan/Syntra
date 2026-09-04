import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Upload, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ArrowRight, 
  AlertTriangle,
  Layers,
  Activity,
  ShieldAlert,
  Server
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { RiskBadge } from '../components/common/RiskBadge';
import { FlowDetail } from '../types';

export const TrafficMonitorPage: React.FC = () => {
  const { 
    flows, 
    isPlaying, 
    togglePlay, 
    resetSimulation, 
    selectedFlow, 
    setSelectedFlow, 
    setCurrentPage 
  } = useSimulation();

  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [currentPage, setPage] = useState(1);
  const pageSize = 10;

  // Filter flows
  const filteredFlows = flows.filter(f => {
    const matchesSearch = 
      !searchQuery ||
      f.source_ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.destination_ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.source_asset && f.source_asset.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.destination_asset && f.destination_asset.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesProto = protocolFilter === 'ALL' || f.protocol.toUpperCase().includes(protocolFilter.toUpperCase());
    const matchesRisk = riskFilter === 'ALL' || f.risk_level.toUpperCase() === riskFilter.toUpperCase();

    return matchesSearch && matchesProto && matchesRisk;
  });

  const totalPages = Math.max(1, Math.ceil(filteredFlows.length / pageSize));
  const pagedFlows = filteredFlows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="space-y-5 pb-12 animate-fade-in relative">
      
      {/* Controls Bar */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Playback & Ingest Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={togglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-glow-cyan'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause Live Stream' : 'Start Live Telemetry'}</span>
          </button>

          <button
            onClick={resetSimulation}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            title="Reset Telemetry Buffer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setCurrentPage('datasource')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Upload CSV</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search IP, node, asset..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* Protocol Filter */}
          <select
            value={protocolFilter}
            onChange={(e) => { setProtocolFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer font-mono"
          >
            <option value="ALL">Protocol: ALL</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="TLS">TLS / HTTPS</option>
            <option value="DNS">DNS</option>
            <option value="MQTT">MQTT</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer font-mono"
          >
            <option value="ALL">Risk: ALL</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

      </div>

      {/* Traffic Flows Table */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5">Time (IST)</th>
                <th className="py-3 px-3.5">Source IP / Node</th>
                <th className="py-3 px-3.5">Destination IP / Node</th>
                <th className="py-3 px-3.5">Protocol</th>
                <th className="py-3 px-3.5">Dst Port</th>
                <th className="py-3 px-3.5">Packets</th>
                <th className="py-3 px-3.5">Bytes</th>
                <th className="py-3 px-3.5">Duration</th>
                <th className="py-3 px-3.5">Risk</th>
                <th className="py-3 px-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {pagedFlows.map((flow) => {
                const isSelected = selectedFlow?.id === flow.id;
                return (
                  <tr
                    key={flow.id}
                    onClick={() => setSelectedFlow(flow)}
                    className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-500/10 border-l-2 border-l-sky-400' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3.5 text-slate-400 whitespace-nowrap">{flow.timestamp}</td>
                    
                    <td className="py-2.5 px-3.5">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-bold">{flow.source_ip}</span>
                        {flow.source_asset && (
                          <span className="text-[10px] text-sky-400 font-sans">{flow.source_asset}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-bold">{flow.destination_ip}</span>
                        {flow.destination_asset && (
                          <span className="text-[10px] text-indigo-300 font-sans">{flow.destination_asset}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px]">
                        {flow.protocol}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-300 font-semibold">{flow.destination_port}</td>
                    <td className="py-2.5 px-3.5 text-slate-300">{flow.packets.toLocaleString()}</td>
                    <td className="py-2.5 px-3.5 text-slate-300">{formatBytes(flow.bytes_transferred)}</td>
                    <td className="py-2.5 px-3.5 text-slate-400">{flow.flow_duration_sec}s</td>
                    <td className="py-2.5 px-3.5"><RiskBadge level={flow.risk_level} size="sm" /></td>
                    <td className="py-2.5 px-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${
                        flow.status === 'Normal' ? 'text-emerald-400 bg-emerald-950/30' :
                        flow.status === 'Suspicious' ? 'text-amber-400 bg-amber-950/30' :
                        'text-rose-400 bg-rose-950/30'
                      }`}>
                        {flow.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {pagedFlows.length} of {filteredFlows.length} network flows</span>
          
          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Slide-Over Detail Drawer */}
      {selectedFlow && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto animate-slide-left">
          <div className="space-y-5">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">
                  {selectedFlow.id}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">Flow Telemetry Detail</h3>
              </div>
              <button
                onClick={() => setSelectedFlow(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Source & Destination Matrix */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Source</span>
                <p className="font-bold text-slate-200 mt-0.5">{selectedFlow.source_ip}</p>
                <p className="text-[11px] text-sky-400 font-sans">{selectedFlow.source_asset || 'Unknown Node'}</p>
                <p className="text-[10px] text-slate-500 mt-1">Port: {selectedFlow.source_port}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase">Destination</span>
                <p className="font-bold text-slate-200 mt-0.5">{selectedFlow.destination_ip}</p>
                <p className="text-[11px] text-indigo-300 font-sans">{selectedFlow.destination_asset || 'External Host'}</p>
                <p className="text-[10px] text-slate-500 mt-1">Port: {selectedFlow.destination_port}</p>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Protocol</span>
                <span className="font-mono font-bold text-slate-200">{selectedFlow.protocol}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Packets</span>
                <span className="font-mono font-bold text-slate-200">{selectedFlow.packets.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Data Transferred</span>
                <span className="font-mono font-bold text-slate-200">{formatBytes(selectedFlow.bytes_transferred)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Duration</span>
                <span className="font-mono font-bold text-slate-200">{selectedFlow.flow_duration_sec} seconds</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Current Risk Assessment</span>
                <RiskBadge level={selectedFlow.risk_level} size="md" />
              </div>
            </div>

            {/* Why Suspicious Section */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Why Suspicious / Anomalous?
              </h4>
              
              {selectedFlow.anomalies.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {selectedFlow.anomalies.map((anom, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <span>{anom}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  No statistical feature anomalies detected. Flow conforms to normal baseline distribution.
                </p>
              )}
            </div>

          </div>

          {/* Drawer Actions */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={() => {
                setSelectedFlow(null);
                setCurrentPage('forecast');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-cyan cursor-pointer transition-all"
            >
              <span>View Multi-Step Attack Forecast</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedFlow(null)}
              className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs cursor-pointer"
            >
              Close Drawer
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
