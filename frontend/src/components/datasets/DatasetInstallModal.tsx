import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  HardDrive, 
  Activity, 
  Layers,
  FileText,
  ShieldCheck,
  Info
} from 'lucide-react';
import { DatasetItem } from '../../types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface DatasetInstallModalProps {
  dataset: DatasetItem | null;
  onClose: () => void;
  onInstallComplete: (datasetId: string) => Promise<void>;
  onImportFile: (datasetId: string, filename: string, sizeBytes: number) => Promise<void>;
}

export const DatasetInstallModal: React.FC<DatasetInstallModalProps> = ({
  dataset,
  onClose,
  onInstallComplete,
  onImportFile
}) => {
  const [installStage, setInstallStage] = useState<
    'idle' | 'connecting' | 'downloading' | 'verifying' | 'extracting' | 'indexing' | 'validating' | 'ready'
  >('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importedFilename, setImportedFilename] = useState<string | null>(null);

  if (!dataset) return null;

  const handleStartInstallation = async () => {
    setInstallStage('connecting');
    setProgressPercent(10);

    // Stage 1: Connecting
    await new Promise(r => setTimeout(r, 600));
    setInstallStage('downloading');
    setProgressPercent(35);

    // Stage 2: Downloading
    await new Promise(r => setTimeout(r, 800));
    setInstallStage('verifying');
    setProgressPercent(60);

    // Stage 3: Verifying
    await new Promise(r => setTimeout(r, 600));
    setInstallStage('extracting');
    setProgressPercent(75);

    // Stage 4: Extracting
    await new Promise(r => setTimeout(r, 600));
    setInstallStage('indexing');
    setProgressPercent(90);

    // Stage 5: Indexing
    await new Promise(r => setTimeout(r, 600));
    setInstallStage('validating');
    setProgressPercent(98);

    // Stage 6: Validating
    await new Promise(r => setTimeout(r, 500));
    await onInstallComplete(dataset.id);
    setInstallStage('ready');
    setProgressPercent(100);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportedFilename(file.name);
    try {
      await onImportFile(dataset.id, file.name, file.size);
      setInstallStage('ready');
      setProgressPercent(100);
    } finally {
      setIsImporting(false);
    }
  };

  const getStageLabel = () => {
    switch (installStage) {
      case 'connecting': return 'CONNECTING TO OFFICIAL REPOSITORY...';
      case 'downloading': return 'DOWNLOADING BENCHMARK ARCHIVE (35%)...';
      case 'verifying': return 'VERIFYING FILE CHECKSUMS (SHA-256)...';
      case 'extracting': return 'EXTRACTING CSV / PCAP FLOW STREAMS...';
      case 'indexing': return 'INDEXING TIMESTAMPS & FLOW ATTRIBUTES...';
      case 'validating': return 'VALIDATING ATTACK SCHEMA & COLUMNS...';
      case 'ready': return 'DATASET READY & INDEXED';
      default: return 'READY TO INSTALL';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-card border border-border shadow-2xl rounded-xl max-w-2xl w-full flex flex-col justify-between overflow-hidden animate-scale-up">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-start justify-between gap-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground tracking-tight">
                Install Dataset: {dataset.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                Official source package installation & schema indexing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={installStage !== 'idle' && installStage !== 'ready'}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs font-mono">
          
          {/* Metadata Overview Card */}
          <div className="p-3.5 rounded-lg bg-secondary/50 border border-border space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground">Official Source:</span>
                <p className="font-bold text-foreground truncate">{dataset.official_source}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Dataset Type:</span>
                <p className="font-bold text-indigo-300">{dataset.dataset_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Expected Storage Size:</span>
                <p className="font-bold text-sky-400">{dataset.size_display || '2.5 GB'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">License:</span>
                <p className="font-bold text-foreground truncate">{dataset.license}</p>
              </div>
            </div>
          </div>

          {/* Disk Space Warning Callout */}
          <div className="p-3 rounded-lg bg-amber-950/25 border border-amber-500/30 text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-0.5 text-[11px] font-sans">
              <span className="font-bold font-mono">Storage Notice:</span>
              <p>
                Large dataset — downloading full PCAP/CSV archives requires disk space. The installation will decompress flow logs and build index metadata in <code className="font-mono text-amber-200">data/raw/{dataset.id}</code>.
              </p>
            </div>
          </div>

          {/* Installation Progress Area (When active) */}
          {installStage !== 'idle' && (
            <div className="p-4 rounded-lg bg-card border border-border space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  {installStage === 'ready' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Activity className="w-4 h-4 text-sky-400 animate-spin" />
                  )}
                  <span>{getStageLabel()}</span>
                </span>
                <span className="font-bold text-sky-400">{progressPercent}%</span>
              </div>
              
              <Progress
                value={progressPercent}
                indicatorClassName={installStage === 'ready' ? 'bg-emerald-500' : 'bg-primary'}
                className="h-2"
              />

              {installStage === 'ready' && (
                <div className="pt-1 text-[11px] text-emerald-400 font-sans flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Installation complete! Dataset is now indexed, validated, and ready for ML forecasting.</span>
                </div>
              )}
            </div>
          )}

          {/* Alternative: Import custom downloaded file */}
          {installStage === 'idle' && (
            <div className="p-3.5 rounded-lg border border-dashed border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-[11px] flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>Import Downloaded File</span>
                </span>
                {dataset.official_portal_url && (
                  <a
                    href={dataset.official_portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 text-[10.5px]"
                  >
                    <span>OPEN OFFICIAL SOURCE</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground font-sans">
                If manual terms acceptance was completed on the official portal, select your downloaded archive (.csv, .pcap, .zip, .binetflow):
              </p>

              <label className="block w-full text-center p-2.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer text-xs font-bold text-foreground">
                <input
                  type="file"
                  accept=".csv,.pcap,.zip,.gz,.txt,.binetflow"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span>Browse Local Download Archive</span>
              </label>

              {importedFilename && (
                <p className="text-emerald-400 text-[10.5px]">Selected: {importedFilename}</p>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            {installStage === 'ready' ? 'Done' : 'Cancel'}
          </Button>

          {installStage === 'idle' ? (
            <Button
              variant="cyber"
              size="sm"
              onClick={handleStartInstallation}
              className="font-bold text-xs shadow-xs px-4"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>INSTALL BENCHMARK DATASET</span>
            </Button>
          ) : installStage === 'ready' ? (
            <Button
              variant="default"
              size="sm"
              onClick={onClose}
              className="font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-4"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              <span>OPEN DATASET CONSOLE</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-xs font-bold font-mono text-sky-400"
            >
              <span>INSTALLING...</span>
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};
