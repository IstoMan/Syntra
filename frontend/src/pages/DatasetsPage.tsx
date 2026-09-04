import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Sparkles, 
  CheckCircle2, 
  HardDrive, 
  SlidersHorizontal, 
  Plus, 
  Layers, 
  Cpu, 
  Zap,
  Info,
  RefreshCw
} from 'lucide-react';
import { DatasetItem } from '../types';
import { api } from '../services/api';
import { useSimulation } from '../context/SimulationContext';
import { DatasetCard } from '../components/datasets/DatasetCard';
import { DatasetDetailsModal } from '../components/datasets/DatasetDetailsModal';
import { DatasetInstallModal } from '../components/datasets/DatasetInstallModal';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export const DatasetsPage: React.FC = () => {
  const { activeDataset, setActiveDataset } = useSimulation();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'installed' | 'not_installed' | 'network' | 'iot' | 'authentication' | 'botnet'
  >('all');
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'size' | 'records' | 'status'>('default');
  
  const [selectedDetailsDataset, setSelectedDetailsDataset] = useState<DatasetItem | null>(null);
  const [selectedInstallDataset, setSelectedInstallDataset] = useState<DatasetItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const fetchDatasets = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDatasets();
      setDatasets(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Summary counts
  const totalCount = datasets.length;
  const readyCount = datasets.filter(d => d.status === 'READY').length;
  const notInstalledCount = datasets.filter(d => d.status === 'NOT_INSTALLED').length;

  // Filter & Search & Sort
  const filteredDatasets = useMemo(() => {
    let list = [...datasets];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => 
        d.name.toLowerCase().includes(q) || 
        d.description.toLowerCase().includes(q) ||
        d.dataset_type.toLowerCase().includes(q) ||
        d.official_source?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory === 'installed') {
      list = list.filter(d => d.status === 'READY');
    } else if (selectedCategory === 'not_installed') {
      list = list.filter(d => d.status === 'NOT_INSTALLED');
    } else if (selectedCategory !== 'all') {
      list = list.filter(d => d.category === selectedCategory);
    }

    // Sorting
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'records') {
      list.sort((a, b) => (b.record_count || 0) - (a.record_count || 0));
    } else if (sortBy === 'size') {
      list.sort((a, b) => (b.size_bytes || 0) - (a.size_bytes || 0));
    } else if (sortBy === 'status') {
      list.sort((a, b) => (a.status === 'READY' ? -1 : 1));
    } else {
      // Default numbered order
      list.sort((a, b) => (a.number || '00').localeCompare(b.number || '00'));
    }

    return list;
  }, [datasets, searchQuery, selectedCategory, sortBy]);

  // Actions
  const handleInstallClick = (dataset: DatasetItem) => {
    setSelectedInstallDataset(dataset);
  };

  const handleDetailsClick = (dataset: DatasetItem) => {
    setSelectedDetailsDataset(dataset);
  };

  const handleInstallComplete = async (datasetId: string) => {
    await api.installDataset(datasetId);
    await fetchDatasets();
    setStatusNotification(`Dataset ${datasetId} successfully installed and indexed into local storage.`);
  };

  const handleImportFile = async (datasetId: string, filename: string, sizeBytes: number) => {
    await api.importDatasetFile(datasetId, filename, sizeBytes);
    await fetchDatasets();
    setStatusNotification(`Imported ${filename} into ${datasetId}.`);
  };

  const handleRemoveDataset = async (dataset: DatasetItem) => {
    if (!window.confirm(`Are you sure you want to remove local dataset files for ${dataset.name}?`)) return;
    await api.removeDataset(dataset.id);
    await fetchDatasets();
    setStatusNotification(`Removed local files for ${dataset.name}. Status reset to NOT INSTALLED.`);
  };

  const handleActivateDataset = async (dataset: DatasetItem) => {
    await api.activateDataset(dataset.id);
    setActiveDataset(dataset.name);
    await fetchDatasets();
    setStatusNotification(`Active ML Attack Forecasting baseline switched to: ${dataset.name}.`);
  };

  const handlePreprocessDataset = async (datasetId: string, windowSize: string) => {
    await api.preprocessDataset(datasetId, windowSize);
    await fetchDatasets();
    setStatusNotification(`Generated ${windowSize} temporal lookahead time-windows for ${datasetId}.`);
  };

  const handleTrainEvaluate = async (datasetId: string) => {
    await api.trainEvaluateDataset(datasetId);
    await fetchDatasets();
    setStatusNotification(`Model training and validation completed on ${datasetId} temporal windows.`);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* 1. Header & Summary Banner */}
      <Card className="p-5 sm:p-6 border-border/80 shadow-sm bg-card">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="cyber" className="text-[10px] font-mono px-2 py-0.5 uppercase">
                DATASET MANAGER
              </Badge>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-mono text-muted-foreground">
                {totalCount} supported datasets • <strong className="text-emerald-400">{readyCount} Ready</strong> • <strong className="text-muted-foreground">{notInstalledCount} Not Installed</strong>
              </span>
            </div>
            
            <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
              <Database className="w-5 h-5 text-primary" />
              <span>Cybersecurity Dataset Manager</span>
            </h1>

            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              Manage, install, validate, preprocess, and connect real cybersecurity datasets to the SYNTRA multi-step attack forecasting pipeline.
            </p>
          </div>

          {/* Active Dataset Pill */}
          <div className="bg-secondary/70 p-3 rounded-xl border border-border shrink-0 self-stretch lg:self-auto font-mono text-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Active ML Forecasting Baseline</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-foreground truncate max-w-[240px]" title={activeDataset}>
                {activeDataset}
              </span>
            </div>
          </div>

        </div>
      </Card>

      {/* Notification Toast Banner */}
      {statusNotification && (
        <div className="p-3.5 rounded-lg bg-secondary/80 border border-primary/40 text-foreground flex items-center justify-between text-xs font-mono animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusNotification}</span>
          </div>
          <button 
            onClick={() => setStatusNotification(null)}
            className="text-muted-foreground hover:text-foreground text-xs cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Controls Bar: Search, Category Filters, Sorting */}
      <Card className="p-4 border-border/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Search datasets by name, traffic type, or attack scenario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs font-mono h-9 bg-muted/40"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-muted-foreground hidden sm:inline flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-secondary text-foreground text-xs font-mono rounded-md border border-border px-3 py-1.5 h-9 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="default">Default (01 - 05)</option>
              <option value="name">Name (A-Z)</option>
              <option value="records">Records (Largest)</option>
              <option value="size">Size (Largest)</option>
              <option value="status">Status (Ready First)</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchDatasets}
              className="h-9 px-3 text-xs"
              title="Refresh dataset states"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs font-mono">
          {[
            { id: 'all', label: 'All Datasets' },
            { id: 'installed', label: 'Installed (Ready)' },
            { id: 'not_installed', label: 'Not Installed' },
            { id: 'network', label: 'Network Flow' },
            { id: 'botnet', label: 'Botnet' },
            { id: 'iot', label: 'IoT Traffic' },
            { id: 'authentication', label: 'Authentication Telemetry' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </Card>

      {/* 3. Main 5 Numbered Dataset Cards Grid */}
      <div className="space-y-4">
        {filteredDatasets.map((dataset) => {
          const isCurrentActive = activeDataset.includes(dataset.name) || 
            (dataset.id === 'cic_ids2017' && activeDataset.includes('CIC-IDS2017')) ||
            (dataset.id === 'unsw_nb15' && activeDataset.includes('UNSW-NB15')) ||
            (dataset.id === 'ctu13' && activeDataset.includes('CTU-13')) ||
            (dataset.id === 'ciciot2023' && activeDataset.includes('CICIoT2023')) ||
            (dataset.id === 'lanl_auth' && activeDataset.includes('LANL'));

          return (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              isActive={isCurrentActive}
              onInstall={handleInstallClick}
              onDetails={handleDetailsClick}
              onOpen={handleDetailsClick}
              onRemove={handleRemoveDataset}
              onActivate={handleActivateDataset}
            />
          );
        })}

        {filteredDatasets.length === 0 && (
          <Card className="p-12 text-center border-dashed border-border space-y-2">
            <p className="font-bold text-muted-foreground text-sm font-mono">No datasets found matching criteria.</p>
            <p className="text-xs text-muted-foreground font-sans">
              Try changing your search query or switching the category filter to "All Datasets".
            </p>
          </Card>
        )}
      </div>

      {/* 4. Details Drawer / Modal */}
      {selectedDetailsDataset && (
        <DatasetDetailsModal
          dataset={selectedDetailsDataset}
          onClose={() => setSelectedDetailsDataset(null)}
          onInstall={handleInstallClick}
          onRemove={handleRemoveDataset}
          onActivate={handleActivateDataset}
          onPreprocess={handlePreprocessDataset}
          onTrainEvaluate={handleTrainEvaluate}
          isActive={activeDataset.includes(selectedDetailsDataset.name)}
        />
      )}

      {/* 5. Install Modal */}
      {selectedInstallDataset && (
        <DatasetInstallModal
          dataset={selectedInstallDataset}
          onClose={() => setSelectedInstallDataset(null)}
          onInstallComplete={handleInstallComplete}
          onImportFile={handleImportFile}
        />
      )}

    </div>
  );
};
