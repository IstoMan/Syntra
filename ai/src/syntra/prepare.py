from __future__ import annotations

import argparse
import json

from syntra.config import load_config
from syntra.data.prepare import prepare_dataset


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build windowed network states and future-label sequences."
    )
    parser.add_argument("--config", default=None)
    args = parser.parse_args()
    cfg = load_config(args.config)
    meta = prepare_dataset(cfg)
    print(json.dumps(meta, indent=2, default=str))


if __name__ == "__main__":
    main()
