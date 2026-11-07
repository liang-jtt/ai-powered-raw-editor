"""Adapter for the official ICAA17K DAT model; requires trained color heads."""
import importlib
import os
from pathlib import Path
import sys

from .configuration import ROOT, read_config, dependency_status, require_dependencies, require_device, matrix_rows
from .images import load_preview
from .protocol import finite_number, validate_paths

DEPENDENCIES = ('torch', 'torchvision', 'timm', 'einops', 'yaml', 'PIL', 'numpy')


def decode_output(output, count):
    result = []
    for overall, color in matrix_rows(output, count, 2):
        overall, color = finite_number(overall), finite_number(color)
        if not 0 <= overall <= 1 or not 0 <= color <= 1:
            raise ValueError('ICAA sigmoid heads must be in [0, 1]; check architecture and trained checkpoint')
        result.append({'score': color, 'overall_score': overall})
    return result


class ICAAScorer:
    name = 'icaa'

    def __init__(self, config_path=None):
        self.config_path = Path(config_path or os.environ.get('ICAA_CONFIG') or ROOT / 'icaa/config.local.json')
        self._model = None
        self._config = None
        self._verified = False

    def _assets(self):
        config = read_config(self.config_path, ('source_dir', 'checkpoint_path'), ('device',))
        source = Path(config['source_dir'])
        for asset in [source / 'icaa_upstream/dat.py', source / 'dat_base.yaml', Path(config['checkpoint_path'])]:
            if not asset.is_file():
                raise FileNotFoundError(f'ICAA model asset missing: {asset}. Run prepare_source.py and supply a matching trained ICAA17K checkpoint.')
        return config

    def status(self):
        dependencies = dependency_status(DEPENDENCIES)
        problem = None
        try:
            self._assets()
        except Exception as exc:
            problem = str(exc)
        return {'schema_version': '1.0', 'backend': self.name,
                'config_path': str(self.config_path.absolute()), 'dependencies': dependencies,
                'can_attempt_inference': problem is None and all(dependencies.values()),
                'inference_verified': self._verified, 'asset_problem': problem,
                'note': 'File/dependency presence is not a successful model load or trained-checkpoint validation.'}

    def _load(self):
        if self._model is not None:
            return
        config = self._assets()
        require_dependencies(DEPENDENCIES)
        import torch
        import yaml
        device = config.get('device', 'cpu')
        require_device(torch, device)
        source = str(Path(config['source_dir']))
        existing = sys.modules.get('icaa_upstream')
        if existing is not None and Path(existing.__file__).parent.parent != Path(source):
            raise RuntimeError('A different ICAA source is already loaded; use a separate process per source version')
        sys.path.insert(0, source)
        try:
            dat_module = importlib.import_module('icaa_upstream.dat')
        finally:
            sys.path.remove(source)
        settings = yaml.safe_load((Path(source) / 'dat_base.yaml').read_text(encoding='utf-8'))
        model = dat_module.DAT(**settings['MODEL']['DAT'])
        checkpoint = torch.load(config['checkpoint_path'], map_location='cpu', weights_only=True)
        if not isinstance(checkpoint, dict):
            raise ValueError('ICAA checkpoint must contain a state_dict mapping')
        weights = checkpoint.get('state_dict', checkpoint.get('model', checkpoint))
        if not isinstance(weights, dict):
            raise ValueError('invalid ICAA state_dict')
        weights = {key.removeprefix('module.'): value for key, value in weights.items()}
        model.load_state_dict(weights, strict=True)
        self._model = model.to(device).eval()
        self._config = config

    def score(self, paths, prompt=None):
        validate_paths(paths)
        if prompt is not None:
            raise ValueError('ICAA does not accept a text prompt')
        # Validate preview inputs before allocating a large model.
        for path in paths:
            load_preview(path).close()
        self._load()
        import torch
        from torchvision import transforms
        transform = transforms.Compose([
            transforms.Resize((224, 224)), transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
        results = []
        with torch.inference_mode():
            # The upstream histogram path assumes batch size 1; keep candidates independent.
            for path in paths:
                with load_preview(path) as image:
                    tensor = transform(image).unsqueeze(0).to(self._config.get('device', 'cpu'))
                output = self._model(tensor)
                prediction = output[0] if isinstance(output, tuple) else output
                results.extend(decode_output(prediction, 1))
        self._verified = True
        return results

    def metadata(self):
        return {'score_kind': 'color_aesthetic', 'score_range': [0, 1],
                'secondary_score': 'overall_score is the separate overall-aesthetic head',
                'preprocessing': 'EXIF + ICC to sRGB (untagged assumed sRGB), resize 224x224, ImageNet normalize',
                'checkpoint_path': self._config['checkpoint_path'] if self._config else None}
