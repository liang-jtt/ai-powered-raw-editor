import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import numpy as np
from PIL import Image, ImageCms

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


class InspectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=ROOT)
        self.directory = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def save(self, name, pixels, **kwargs):
        path = self.directory / name
        Image.fromarray(np.array(pixels, dtype=np.uint8)).save(path, **kwargs)
        return str(path)

    def api(self):
        from color_inspector import analyze_image, compare_images
        return analyze_image, compare_images

    def invoke(self, request):
        return subprocess.run(
            [sys.executable, str(ROOT / 'cli.py')], input=json.dumps(request),
            text=True, encoding='utf-8', capture_output=True, cwd=self.directory,
        )

    def test_neutral_gray_is_achromatic_and_finite(self):
        analyze, _ = self.api()
        path = self.save('gray.png', [[[128, 128, 128]] * 2] * 2)
        report = analyze(path)
        self.assertEqual(report['pixel_count'], 4)
        self.assertAlmostEqual(report['lab_mean'][0], 53.585, places=2)
        self.assertAlmostEqual(report['lab_mean'][1], 0, places=2)
        self.assertAlmostEqual(report['lab_mean'][2], 0, places=2)
        self.assertEqual(report['hsv_saturation_mean'], 0)
        self.assertEqual(report['color_management']['source'], 'assumed_srgb')
        json.dumps(report, allow_nan=False)

    def test_identical_images_have_zero_delta(self):
        _, compare = self.api()
        path = self.save('same.png', [[[120, 100, 80], [20, 50, 80]]])
        result = compare(path, path)
        self.assertEqual(result['delta_e_ciede2000']['mean'], 0)
        self.assertEqual(result['lab_mean_change'], [0, 0, 0])

    def test_warmer_image_increases_b_and_delta_e(self):
        _, compare = self.api()
        before = self.save('before.png', [[[128, 128, 128]]])
        after = self.save('after.png', [[[160, 135, 90]]])
        result = compare(before, after)
        self.assertGreater(result['lab_mean_change'][2], 10)
        self.assertGreater(result['delta_e_ciede2000']['mean'], 10)

    def test_region_and_channel_endpoints(self):
        analyze, _ = self.api()
        path = self.save('regions.png', [[[255, 0, 128], [128, 128, 128]]])
        result = analyze(path, {'x': 0, 'y': 0, 'width': 1, 'height': 1})
        self.assertEqual(result['pixel_count'], 1)
        self.assertEqual(result['channel_endpoints']['any_channel_at_max_ratio'], 1)
        self.assertEqual(result['channel_endpoints']['any_channel_at_min_ratio'], 1)
        self.assertEqual(result['channel_endpoints']['all_channels_at_min_ratio'], 0)

    def test_rejects_invalid_regions(self):
        analyze, _ = self.api()
        path = self.save('gray.png', [[[128, 128, 128]]])
        for region in [
            {'x': -1, 'y': 0, 'width': 1, 'height': 1},
            {'x': 0, 'y': 0, 'width': 2, 'height': 1},
            {'x': 0, 'y': 0, 'width': 0, 'height': 1},
            {'x': False, 'y': 0, 'width': 1, 'height': 1},
            {'x': 0.5, 'y': 0, 'width': 1, 'height': 1},
            {},
        ]:
            with self.subTest(region=region), self.assertRaises(ValueError):
                analyze(path, region)

    def test_compare_rejects_size_mismatch(self):
        _, compare = self.api()
        first = self.save('one.png', [[[128, 128, 128]]])
        second = self.save('two.png', [[[128, 128, 128]] * 2])
        with self.assertRaises(ValueError):
            compare(first, second)

    def test_embedded_srgb_profile_and_jpeg(self):
        analyze, _ = self.api()
        profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
        path = self.save('tagged.jpg', [[[128, 128, 128]]], icc_profile=profile)
        self.assertEqual(analyze(path)['color_management']['source'], 'embedded_icc')

    def test_exif_orientation_is_applied_before_region_selection(self):
        analyze, _ = self.api()
        exif = Image.Exif()
        exif[274] = 6
        path = self.save('rotated.jpg', [[[128, 128, 128]] * 2], exif=exif)
        report = analyze(path, {'x': 0, 'y': 1, 'width': 1, 'height': 1})
        self.assertEqual(report['image_size'], {'width': 1, 'height': 2})
        self.assertEqual(report['pixel_count'], 1)

    def test_rejects_bad_icc_transparency_and_16bit(self):
        analyze, _ = self.api()
        invalid = self.save('badicc.png', [[[128, 128, 128]]], icc_profile=b'bad')
        alpha = self.save('alpha.png', [[[128, 128, 128, 100]]])
        high = self.directory / '16bit.png'
        Image.fromarray(np.array([[32000]], dtype=np.uint16)).save(high)
        for path in [invalid, alpha, high]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                analyze(str(path))

    def test_cli_success_from_unrelated_working_directory(self):
        path = self.save('gray.png', [[[128, 128, 128]]])
        result = self.invoke({'operation': 'analyze', 'image_path': path})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(json.loads(result.stdout)['ok'])
        self.assertEqual(result.stderr, '')

    def test_cli_compare(self):
        path = self.save('gray.png', [[[128, 128, 128]]])
        result = self.invoke({'operation': 'compare', 'before_path': path, 'after_path': path})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['data']['delta_e_ciede2000']['max'], 0)

    def test_cli_errors_are_json_and_nonzero(self):
        for request in [[], {}, {'operation': 'delete'},
                        {'operation': 'analyze', 'image_path': 'missing.png'}]:
            with self.subTest(request=request):
                result = self.invoke(request)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(json.loads(result.stdout)['ok'])
                self.assertNotIn('Traceback', result.stderr)

    def test_cli_malformed_json(self):
        result = subprocess.run([sys.executable, str(ROOT / 'cli.py')],
                                input='{broken', text=True, capture_output=True)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(json.loads(result.stdout)['error']['code'], 'JSONDecodeError')

    def test_node_adapter_calls_python_without_touching_aipp3(self):
        path = self.save('gray.png', [[[128, 128, 128]]])
        adapter = (ROOT / 'examples' / 'node-client.mjs').as_uri()
        script = (
            f'import {{ inspectColor }} from {json.dumps(adapter)};'
            'import { readFileSync } from "node:fs";'
            'const args = JSON.parse(readFileSync(0, "utf8"));'
            'console.log(JSON.stringify(await inspectColor(args.request, {python: args.python})));'
        )
        result = subprocess.run(
            ['node', '--input-type=module', '-e', script], text=True, encoding='utf-8',
            input=json.dumps({'python': sys.executable,
                              'request': {'operation': 'analyze', 'image_path': path}}),
            capture_output=True, cwd=self.directory,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['pixel_count'], 1)


if __name__ == '__main__':
    unittest.main()
