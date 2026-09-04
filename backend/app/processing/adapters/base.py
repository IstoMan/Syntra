"""
Base Dataset Adapter Interface
Standardized abstraction for diverse cybersecurity dataset schemas
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import os
import json

class BaseDatasetAdapter(ABC):
    def __init__(self, dataset_id: str, raw_dir: str, processed_dir: str):
        self.dataset_id = dataset_id
        self.raw_dir = raw_dir
        self.processed_dir = processed_dir

    @abstractmethod
    def validate_raw_files(self) -> Dict[str, Any]:
        """Validate format, schema, column mappings, and file integrity."""
        pass

    @abstractmethod
    def parse_records(self, max_records: Optional[int] = None) -> List[Dict[str, Any]]:
        """Parse raw dataset records into normalized internal dictionary objects."""
        pass

    @abstractmethod
    def generate_time_windows(self, window_size: str = "5min") -> List[Dict[str, Any]]:
        """
        Aggregate flow/telemetry records into temporal lookahead time windows (1m, 5m, 15m)
        Calculates packet count, byte count, flow count, unique src/dst IPs,
        port distribution, protocol distribution, and attack labels.
        """
        pass

    @abstractmethod
    def get_attack_distribution(self) -> List[Dict[str, Any]]:
        """Return counts and percentages of detected attack categories."""
        pass
