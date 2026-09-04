import React from 'react';
import { 
  Database, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  FileText, 
  Trash2, 
  Layers, 
  Sparkles, 
  HardDrive,
  Cpu,
  Activity,
  Zap,
  Info
} from 'lucide-react';
import { DatasetItem } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface DatasetCardProps {
  dataset: DatasetItem;
  onInstall: (dataset: DatasetItem) => void;
  onDetails: (dataset: DatasetItem) => void;
  onOpen: (dataset: DatasetItem) => void;
  onRemove: (dataset: DatasetItem) => void;
  onActivate: (dataset: DatasetItem) => void;
  isActive: boolean;
}

export const DatasetCard: React.FC<DatasetCardProps> = ({
  dataset,
  onInstall,
  onDetails,
  onOpen,
  onRemove,
  onActivate,
  isActive
}) => {
  const isReady = dataset.status === 'READY';
  const isInstalling = ['DOWNLOADING', 'EXTRACTING', 'INDEXING', 'VALIDATING'].includes(dataset.status);

  // Status badge style mapping
  const getStatusBadge = () => {
    switch (dataset.status) {
      case 'READY':
        return (
          <Badge variant="low" className="text-[10px] font-mono px-2 py-0.5 font-bold uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            READY
          </Badge>
        );
      case 'DOWNLOADING':
      case 'EXTRACTING':
      case 'INDEXING':
      case 'VALIDATING':
        return (
          <Badge variant="cyber" className="text-[10px] font-mono px-2 py-0.5 font-bold uppercase flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            {dataset.status}
          </Badge>
        );
      case 'ERROR':
        return (
          <Badge variant="destructive" className="text-[10px] font-mono px-2 py-0.5 font-bold uppercase">
            ERROR
          </Badge>
        );
      case 'NOT_INSTALLED':
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 font-semibold text-muted-foreground uppercase">
            ● NOT INSTALLED
          </Badge>
        );
    }
  };

  return (
    <Card className={`flex flex-col justify-between border transition-all duration-200 relative overflow-hidden ${
      isActive 
        ? 'border-primary/80 ring-1 ring-primary/40 bg-card/90 shadow-md' 
        : isReady 
        ? 'border-border/80 hover:border-border bg-card' 
        : 'border-border/60 bg-card/50 opacity-95 hover:opacity-100'
    }`}>
      
      {/* Top Banner highlight for active dataset */}
      {isActive && (
        <div className="bg-primary/20 text-primary px-4 py-1 text-[10.5px] font-mono font-bold flex items-center justify-between border-b border-primary/30">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            ACTIVE SYNTRA FORECASTING BASELINE
          </span>
          <span className="text-[9.5px] uppercase">Connected to ML Pipeline</span>
        </div>
      )}

      {/* Main Card Header */}
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          
          {/* Number Circle + Title + Description */}
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-extrabold text-sm shrink-0 border shadow-xs ${
              isReady 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-secondary text-muted-foreground border-border'
            }`}>
              {dataset.number || '01'}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-extrabold text-foreground tracking-tight">
                  {dataset.name}
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground font-sans leading-relaxed">
                {dataset.description}
              </CardDescription>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 pt-0.5">
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>

      {/* Card Content: Metadata metrics grid */}
      <CardContent className="px-5 py-3 space-y-3 font-mono text-xs">
        
        {/* Metric tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-secondary/40 border border-border/60">
          <div>
            <span className="text-[10px] text-muted-foreground block">Files:</span>
            <span className="font-bold text-foreground text-xs">{dataset.file_count || dataset.files?.length || '--'}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Records:</span>
            <span className="font-bold text-foreground text-xs">
              {dataset.record_count ? `${(dataset.record_count / 1000000).toFixed(1)}M` : '--'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Features:</span>
            <span className="font-bold text-foreground text-xs">{dataset.feature_count ? `${dataset.feature_count}+` : '--'}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Type:</span>
            <span className="font-bold text-indigo-300 text-[11px] truncate block" title={dataset.dataset_type}>
              {dataset.dataset_type || 'Network Traffic'}
            </span>
          </div>
        </div>

        {/* Official Source link and summary */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span className="truncate max-w-[240px] text-[10.5px]" title={dataset.official_source}>
            Source: <strong className="text-foreground font-sans">{dataset.official_source?.split('(')[0] || 'Official Portal'}</strong>
          </span>
          {dataset.size_display && (
            <span className="text-[10.5px] font-bold text-sky-400">
              {dataset.size_display}
            </span>
          )}
        </div>

        {/* If Sub-Version exists (e.g., CIC-IDS2018 under CIC-IDS2017) */}
        {dataset.sub_version && (
          <div className="p-2 rounded bg-muted/40 border border-border/60 flex items-center justify-between text-[10.5px]">
            <span className="text-muted-foreground">
              Includes: <strong className="text-foreground">{dataset.sub_version.name}</strong> ({dataset.sub_version.size_display})
            </span>
            <Badge variant="outline" className="text-[9px] py-0">AWS Cloud Traffic</Badge>
          </div>
        )}

      </CardContent>

      {/* Card Footer: Action Buttons */}
      <CardFooter className="p-5 pt-2 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
        
        <div className="flex items-center gap-2">
          {/* DETAILS Button (always present) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDetails(dataset)}
            className="text-xs font-semibold h-8 px-3"
          >
            <Info className="w-3.5 h-3.5 mr-1" />
            <span>DETAILS</span>
          </Button>

          {/* If Installed: OPEN DATASET & USE FOR SYNTRA */}
          {isReady && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpen(dataset)}
                className="text-xs font-semibold h-8 px-3"
              >
                <Database className="w-3.5 h-3.5 mr-1 text-primary" />
                <span>OPEN DATASET</span>
              </Button>

              <Button
                variant={isActive ? 'default' : 'cyber'}
                size="sm"
                onClick={() => onActivate(dataset)}
                disabled={isActive}
                className="text-xs font-bold h-8 px-3 shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                <span>{isActive ? 'ACTIVE IN SYNTRA' : 'USE FOR SYNTRA'}</span>
              </Button>
            </>
          )}

          {/* If Not Installed: INSTALL Button */}
          {!isReady && !isInstalling && (
            <Button
              variant="cyber"
              size="sm"
              onClick={() => onInstall(dataset)}
              className="text-xs font-bold h-8 px-4 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>INSTALL</span>
            </Button>
          )}

          {/* If Currently Installing */}
          {isInstalling && (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-xs font-bold h-8 px-3 font-mono animate-pulse"
            >
              <Activity className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              <span>INSTALLING...</span>
            </Button>
          )}
        </div>

        {/* Remove button if installed */}
        {isReady && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(dataset)}
            className="text-xs text-muted-foreground hover:text-destructive h-8 px-2.5"
            title="Remove local files and reset installation"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            <span>REMOVE</span>
          </Button>
        )}

      </CardFooter>

    </Card>
  );
};
