"""Official HPSv3 inference adapter with explicit local model assets."""
import contextlib
import importlib.util
import os
from pathlib import Path
import tempfile

from .configuration import ROOT, read_config, dependency_status, require_dependencies, require_device, matrix_rows
from .images import load_preview
from .protocol import finite_number, validate_paths

DEPENDENCIES = ('hpsv3', 'torch', 'transformers', 'yaml', 'PIL', 'safetensors')


def decode_output(output, count):
    rows = matrix_rows(output, count, 2)
    result = []
    for mu, auxiliary in rows:
        mu, auxiliary = finite_number(mu), finite_number(auxiliary)
        result.append({'score': mu, 'auxiliary_raw': auxiliary})
    return result


@contextlib.contextmanager
def _offline_environment():
    names = ('HF_HUB_OFFLINE', 'TRANSFORMERS_OFFLINE')
    previous = {name: os.environ.get(name) for name in names}
    try:
        for name in names:
            os.environ[name] = '1'
        yield
    finally:
        for name, value in previous.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value


class HPSv3Scorer:
    name = 'hpsv3'

    def __init__(self, config_path=None):
        self.config_path = Path(config_path or os.environ.get('HPSV3_CONFIG') or ROOT / 'hpsv3/config.local.json')
        self._inferencer = None
        self._config = None
        self._verified = False

    def _assets(self):
        config = read_config(self.config_path, ('checkpoint_path', 'base_model_path'), ('device',))
        checkpoint, base = Path(config['checkpoint_path']), Path(config['base_model_path'])
        if not checkpoint.is_file() or checkpoint.suffix != '.safetensors':
            raise FileNotFoundError('HPSv3 requires a local HPSv3.safetensors checkpoint')
        required = ('config.json', 'preprocessor_config.json', 'tokenizer_config.json')
        if not base.is_dir() or any(not (base / name).is_file() for name in required):
            raise FileNotFoundError('base_model_path must be a complete local Qwen2-VL-7B-Instruct snapshot (model + processor + tokenizer)')
        if not list(base.glob('*.safetensors')):
            raise FileNotFoundError('local Qwen2-VL base model safetensors weights are missing')
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
                'note': 'Qwen2-VL-7B requires substantial memory; status does not allocate it or validate GPU compatibility.'}

    def _load(self):
        if self._inferencer is not None:
            return
        config = self._assets()
        require_dependencies(DEPENDENCIES)
        import torch
        import yaml
        device = config.get('device', 'cuda')
        require_device(torch, device)
        with _offline_environment():
            # Explicit paths prevent the official constructor's automatic checkpoint download.
            from hpsv3 import HPSv3RewardInferencer
            package = Path(importlib.util.find_spec('hpsv3').origin).parent
            template = package / 'config/HPSv3_7B.yaml'
            settings = yaml.safe_load(template.read_text(encoding='utf-8'))
            settings.update(model_name_or_path=config['base_model_path'],
                            disable_flash_attn2=True, report_to='none')
            settings.pop('deepspeed', None)
            if device == 'cpu':
                settings.update(torch_dtype='float32', bf16=False, fp16=False, use_cpu=True)
            with tempfile.TemporaryDirectory(prefix='hpsv3-config-') as directory:
                generated = Path(directory) / 'inference.yaml'
                generated.write_text(yaml.safe_dump(settings), encoding='utf-8')
                inferencer = HPSv3RewardInferencer(config_path=str(generated),
                                                checkpoint_path=config['checkpoint_path'], device=device)
        self._inferencer = inferencer
        self._config = config

    def score(self, paths, prompt=None):
        validate_paths(paths)
        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError('HPSv3 requires one non-empty prompt shared by all candidates')
        for path in paths:
            load_preview(path).close()
        self._load()
        results = []
        with tempfile.TemporaryDirectory(prefix='hpsv3-images-') as directory:
            # One image at a time keeps peak memory lower and preserves identical prompt context.
            for index, path in enumerate(paths):
                prepared = Path(directory) / f'{index}.png'
                with load_preview(path) as image:
                    image.save(prepared, format='PNG', icc_profile=None)
                output = self._inferencer.reward(prompts=[prompt], image_paths=[str(prepared)])
                results.extend(decode_output(output, 1))
        self._verified = True
        return results

    def metadata(self):
        return {'score_kind': 'human_preference_mu', 'score_range': None,
                'secondary_score': 'auxiliary_raw is an uncalibrated second output, not confidence',
                'preprocessing': 'EXIF + ICC to sRGB (untagged assumed sRGB), then official HPSv3 processor',
                'checkpoint_path': self._config['checkpoint_path'] if self._config else None}
