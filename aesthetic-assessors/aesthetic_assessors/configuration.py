"""Local asset configuration. Status never allocates a model or downloads weights."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).absolute().parents[1]


def read_config(path, required, optional=()):
    path = Path(path).expanduser().absolute()
    if not path.is_file():
        raise FileNotFoundError(f'Configuration missing: {path}. Copy the backend config.example.json to config.local.json and set local asset paths.')
    config = json.loads(path.read_text(encoding='utf-8-sig'))
    if not isinstance(config, dict) or set(config) - set(required) - set(optional):
        raise ValueError('configuration contains unknown fields or is not an object')
    for key in required:
        if not isinstance(config.get(key), str) or not config[key].strip():
            raise ValueError(f'configuration requires non-empty {key}')
    if config.get('device', 'cpu') not in ('cpu', 'cuda'):
        raise ValueError('device must be cpu or cuda')
    for key in set(required) - {'device'}:
        asset = Path(config[key]).expanduser()
        config[key] = str((path.parent / asset).absolute() if not asset.is_absolute() else asset)
    return config


def dependency_status(names):
    result = {}
    for name in names:
        spec = importlib.util.find_spec(name)
        # Our hpsv3/ entry-point directory is a namespace candidate, not the model package.
        result[name] = spec is not None and spec.origin is not None and spec.loader is not None
    return result


def require_dependencies(names):
    missing = [name for name, found in dependency_status(names).items() if not found]
    if missing:
        raise ModuleNotFoundError('Missing model dependencies: ' + ', '.join(missing) + '. Install this backend in its own environment; see README.')


def require_device(torch, device):
    if device == 'cuda' and not torch.cuda.is_available():
        raise RuntimeError('CUDA is not available in this Python environment; install CUDA PyTorch on a suitable GPU host or configure cpu explicitly.')


def matrix_rows(output, count, columns):
    if hasattr(output, 'detach'):
        output = output.detach().float().cpu().tolist()
    elif hasattr(output, 'tolist'):
        output = output.tolist()
    if not isinstance(output, list) or len(output) != count:
        raise ValueError('unexpected model output batch size')
    if any(not isinstance(row, list) or len(row) != columns for row in output):
        raise ValueError(f'expected model output with exactly {columns} columns')
    return output
