"""Fetch pinned official ICAA model code only (no weights or environment changes)."""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request

REVISION = 'e7b2a88e32f3db811ef2b550a66e490869160b4a'
REPOSITORY = 'woshidandan/Image-Color-Aesthetics-and-Quality-Assessment'
FILES = {
    'models/dat.py': 'icaa_upstream/dat.py',
    'models/dat_blocks.py': 'icaa_upstream/dat_blocks.py',
    'models/SoftHistogram.py': 'icaa_upstream/SoftHistogram.py',
    'configs/dat_base.yaml': 'dat_base.yaml',
}


def patch_dat(text):
    old = 'from models.SoftHistogram import SoftHistogram'
    if text.count(old) != 1:
        raise ValueError('unexpected upstream DAT import; review compatibility before preparing source')
    return text.replace(old, 'from .SoftHistogram import SoftHistogram')


def prepare_source(destination):
    destination = Path(destination).absolute()
    if destination.exists():
        raise FileExistsError(f'refusing to overwrite existing source directory: {destination}')
    # Fetch and validate everything before writing the destination.
    pending, provenance = {}, []
    for upstream, local in FILES.items():
        url = f'https://raw.githubusercontent.com/{REPOSITORY}/{REVISION}/ICAA17K_code/{upstream}'
        with urllib.request.urlopen(url, timeout=30) as response:
            original = response.read()
        text = original.decode('utf-8')
        if upstream == 'models/dat.py':
            text = patch_dat(text)
        pending[local] = text
        provenance.append({'source': url, 'local': local,
                           'upstream_sha256': hashlib.sha256(original).hexdigest(),
                           'local_sha256': hashlib.sha256(text.encode('utf-8')).hexdigest()})
    pending['icaa_upstream/__init__.py'] = '# Isolated namespace for official ICAA model source.\n'
    pending['PROVENANCE.json'] = json.dumps({
        'repository': f'https://github.com/{REPOSITORY}', 'revision': REVISION,
        'changes': ['dat.py: replace absolute models.SoftHistogram import with relative import',
                    'generated isolated package __init__.py; no architecture or weight changes'],
        'files': provenance,
        'attribution': 'Shuai He et al., Thinking Image Color Aesthetics Assessment: Models, Datasets and Benchmarks, ICCV 2023. See upstream for licensing and model terms.',
    }, indent=2)
    destination.mkdir(parents=True, exist_ok=False)
    for relative, text in pending.items():
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding='utf-8', newline='\n')
    return {'source_dir': str(destination), 'revision': REVISION, 'weights_downloaded': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', default=str(Path(__file__).absolute().parents[1] / '.runtime/icaa-source'))
    args = parser.parse_args()
    try:
        print(json.dumps({'ok': True, 'data': prepare_source(args.destination)}))
    except Exception as exc:
        print(json.dumps({'ok': False, 'error': {'code': type(exc).__name__, 'message': str(exc)}}))
        raise SystemExit(1)
