"""Contract tests: injected backends test plumbing, never aesthetic quality."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


class InterfaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=ROOT)
        self.directory = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def api(self):
        from aesthetic_assessors.protocol import handle_request
        return handle_request

    def test_rank_preserves_indices_and_ties(self):
        handle = self.api()
        class Backend:
            name = 'icaa'
            def score(self, paths, prompt):
                return [{'score': s} for s in [0.3, 0.8, 0.8]]
            def metadata(self):
                return {'score_kind': 'color_aesthetic', 'score_range': [0, 1]}
        result = handle({'operation': 'rank', 'image_paths': ['a', 'b', 'c']}, Backend())
        self.assertEqual(result['best_indices'], [1, 2])
        self.assertEqual([row['input_index'] for row in result['ranking']], [1, 2, 0])
        self.assertEqual([row['rank'] for row in result['ranking']], [1, 1, 3])

    def test_rejects_nonfinite_and_wrong_length_model_outputs(self):
        handle = self.api()
        class Backend:
            name = 'icaa'
            def metadata(self): return {}
            def score(self, paths, prompt): return self.rows
        backend = Backend()
        for rows in [[{'score': float('nan')}], [{'score': float('inf')}], [], [{'score': True}]]:
            backend.rows = rows
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                handle({'operation': 'score', 'image_paths': ['a']}, backend)

    def test_invalid_inputs_are_rejected_before_backend(self):
        handle = self.api()
        class Backend:
            name = 'hpsv3'
            def score(self, paths, prompt): raise AssertionError('backend should not run')
        for request in [[], {}, {'operation': 'delete'},
                        {'operation': 'rank', 'image_paths': ['a'], 'prompt': 'photo'},
                        {'operation': 'score', 'image_paths': []},
                        {'operation': 'score', 'image_paths': ['a']},
                        {'operation': 'score', 'image_paths': ['a'], 'prompt': ' '},
                        {'operation': 'score', 'image_paths': [7], 'prompt': 'photo'},
                        {'operation': 'status', 'unexpected': 1}]:
            with self.subTest(request=request), self.assertRaises(ValueError):
                handle(request, Backend())

    def test_prompt_is_shared_for_candidate_comparison(self):
        handle = self.api()
        class Backend:
            name = 'hpsv3'
            def score(self, paths, prompt):
                self.received = (paths, prompt)
                return [{'score': -0.2}, {'score': 0.4}]
            def metadata(self): return {'score_kind': 'human_preference_mu'}
        backend = Backend()
        result = handle({'operation': 'rank', 'image_paths': ['a', 'b'], 'prompt': 'natural photo'}, backend)
        self.assertEqual(backend.received, (['a', 'b'], 'natural photo'))
        self.assertEqual(result['best_indices'], [1])

    def test_icaa_decoder_uses_color_head_not_ten_bin_distribution(self):
        from aesthetic_assessors.icaa import decode_output
        result = decode_output([[0.2, 0.9]], 1)
        self.assertEqual(result, [{'score': 0.9, 'overall_score': 0.2}])
        for output in [[[0.1] * 10], [[0.1, 1.1]], [[0.1, float('nan')]]]:
            with self.assertRaises(ValueError): decode_output(output, 1)

    def test_hps_decoder_selects_mu_without_claiming_confidence(self):
        from aesthetic_assessors.hpsv3 import decode_output
        result = decode_output([[2.5, -0.7], [-1.2, 0.3]], 2)
        self.assertEqual([r['score'] for r in result], [2.5, -1.2])
        self.assertNotIn('confidence', result[0])
        with self.assertRaises(ValueError): decode_output([[1]], 1)

    def test_missing_config_fails_explicitly(self):
        from aesthetic_assessors.icaa import ICAAScorer
        from aesthetic_assessors.hpsv3 import HPSv3Scorer
        for cls in [ICAAScorer, HPSv3Scorer]:
            scorer = cls(config_path=self.directory / 'missing.json')
            status = scorer.status()
            self.assertFalse(status['can_attempt_inference'])
            self.assertFalse(status['inference_verified'])
            with self.assertRaises(Exception): scorer.score(['missing.png'], 'photo')

    def test_cli_status_for_each_backend_needs_no_weights(self):
        for backend in ['icaa', 'hpsv3']:
            result = subprocess.run([sys.executable, str(ROOT / backend / 'cli.py'),
                                     '--config', str(self.directory / 'missing.json')],
                                    input='{"operation":"status"}', text=True,
                                    capture_output=True, cwd=self.directory)
            self.assertEqual(result.returncode, 0, result.stderr)
            response = json.loads(result.stdout)
            self.assertTrue(response['ok'])
            self.assertEqual(response['data']['backend'], backend)
            self.assertFalse(response['data']['can_attempt_inference'])

    def test_cli_errors_are_json(self):
        for backend in ['icaa', 'hpsv3']:
            for request in ['{broken', '[]', '{"operation":"rank","image_paths":[]}']:
                result = subprocess.run([sys.executable, str(ROOT / backend / 'cli.py')],
                                        input=request, text=True, capture_output=True)
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertFalse(json.loads(result.stdout)['ok'])
                self.assertNotIn('Traceback', result.stderr)

    def test_cli_keeps_backend_prints_off_stdout(self):
        from aesthetic_assessors.protocol import run_cli
        class Backend:
            name = 'icaa'
            def status(self):
                print('upstream debug noise')
                return {'backend': 'icaa'}
        output, errors = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            status = run_cli(Backend(), input_stream=io.StringIO('{"operation":"status"}'))
        self.assertEqual(status, 0)
        self.assertTrue(json.loads(output.getvalue())['ok'])
        self.assertIn('upstream debug noise', errors.getvalue())

    def test_node_clients_support_both_backends(self):
        adapter = (ROOT / 'examples/node-client.mjs').as_uri()
        script = (
            f'import {{ assessICAA, assessHPSv3 }} from {json.dumps(adapter)};'
            'const results = await Promise.all([assessICAA({operation:"status"}),'
            'assessHPSv3({operation:"status"})]);'
            'console.log(JSON.stringify(results.map(x=>x.backend)));'
        )
        result = subprocess.run(['node', '--input-type=module', '-e', script],
                                capture_output=True, text=True, cwd=self.directory)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), ['icaa', 'hpsv3'])

    def test_source_patch_only_changes_absolute_local_import(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('prepare_icaa', ROOT / 'icaa/prepare_source.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        source = 'from models.SoftHistogram import SoftHistogram\nclass DAT: pass\n'
        patched = module.patch_dat(source)
        self.assertEqual(patched, 'from .SoftHistogram import SoftHistogram\nclass DAT: pass\n')
        with self.assertRaises(ValueError): module.patch_dat('unexpected upstream revision')

    def test_read_config_resolves_assets_relative_to_config(self):
        from aesthetic_assessors.configuration import read_config
        path = self.directory / 'config.json'
        path.write_text(json.dumps({'checkpoint_path': 'weights/a.pth', 'device': 'cpu'}))
        config = read_config(path, ('checkpoint_path',), ('device',))
        self.assertEqual(config['checkpoint_path'], str(self.directory / 'weights/a.pth'))

    def test_scorer_errors_do_not_generate_fallback_scores(self):
        from PIL import Image
        from aesthetic_assessors import ICAAScorer, HPSv3Scorer
        image = self.directory / '照片.png'
        Image.new('RGB', (16, 16), 'gray').save(image)
        for backend in [ICAAScorer(self.directory / 'missing.json'), HPSv3Scorer(self.directory / 'missing.json')]:
            with self.subTest(backend=backend.name), self.assertRaises(FileNotFoundError):
                backend.score([str(image)], 'natural photo' if backend.name == 'hpsv3' else None)

    def test_preview_applies_orientation_and_rejects_alpha(self):
        from PIL import Image
        from aesthetic_assessors.images import load_preview
        path = self.directory / 'rotated.jpg'
        exif = Image.Exif()
        exif[274] = 6
        Image.new('RGB', (4, 2), 'gray').save(path, exif=exif)
        with load_preview(path) as image:
            self.assertEqual(image.size, (2, 4))
        path = self.directory / 'alpha.png'
        Image.new('RGBA', (2, 2), (128, 128, 128, 0)).save(path)
        with self.assertRaises(ValueError): load_preview(path)

    def test_namespace_directory_is_not_an_installed_dependency(self):
        from aesthetic_assessors.configuration import dependency_status
        namespace = self.directory / 'only_namespace_fixture'
        namespace.mkdir()
        sys.path.insert(0, str(self.directory))
        try:
            self.assertFalse(dependency_status(['only_namespace_fixture'])['only_namespace_fixture'])
        finally:
            sys.path.remove(str(self.directory))


if __name__ == '__main__': unittest.main()
