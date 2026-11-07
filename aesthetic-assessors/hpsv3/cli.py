"""HPSv3 entry point, independent of AI-PP3."""
import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).absolute().parents[1]))
from aesthetic_assessors import HPSv3Scorer
from aesthetic_assessors.protocol import run_cli

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='HPSv3 JSON stdin/stdout interface')
    parser.add_argument('--config', help='local model config JSON')
    args = parser.parse_args()
    raise SystemExit(run_cli(HPSv3Scorer(args.config)))
