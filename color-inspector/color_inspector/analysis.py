"""Color measurements. Ratios describe rendered pixels, not RAW sensor data."""

import io
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageOps
from skimage.color import deltaE_ciede2000, rgb2hsv, rgb2lab


def _read(image_path):
    if not isinstance(image_path, (str, Path)) or not str(image_path):
        raise ValueError('image path must be a non-empty string or Path')
    path = Path(image_path).expanduser().absolute()
    with path.open('rb') as stream:
        header = stream.read(26)
    if header.startswith(b'\x89PNG\r\n\x1a\n') and header[24:25] != b'\x08':
        raise ValueError('only 8-bit PNG is supported; render an 8-bit sRGB preview')
    with Image.open(path) as opened:
        if opened.format not in ('PNG', 'JPEG') or opened.mode not in ('RGB', 'RGBA'):
            raise ValueError('expected an 8-bit RGB PNG/JPEG preview, not RAW, palette, or grayscale')
        if getattr(opened, 'n_frames', 1) != 1:
            raise ValueError('animated images are not supported')
        icc = opened.info.get('icc_profile')
        image = ImageOps.exif_transpose(opened)
        if image.mode == 'RGBA' or 'transparency' in opened.info:
            alpha = np.asarray(image.convert('RGBA'))[:, :, 3]
            if np.any(alpha != 255):
                raise ValueError('transparent pixels are not supported; composite onto an explicit background first')
        image = image.convert('RGB')
        if icc:
            try:
                image = ImageCms.profileToProfile(
                    image, ImageCms.ImageCmsProfile(io.BytesIO(icc)),
                    ImageCms.createProfile('sRGB'), outputMode='RGB',
                )
            except (ImageCms.PyCMSError, OSError, ValueError) as exc:
                raise ValueError('invalid or unsupported embedded ICC profile') from exc
        pixels = np.asarray(image, dtype=np.uint8)
    return pixels, {
        'image_path': str(path),
        'color_management': {
            'working_space': 'sRGB',
            'source': 'embedded_icc' if icc else 'assumed_srgb',
            'measurement_bit_depth': 8,
            'exif_orientation_applied': True,
        },
    }


def _crop(pixels, region):
    height, width = pixels.shape[:2]
    if region is None:
        region = {'x': 0, 'y': 0, 'width': width, 'height': height}
    if not isinstance(region, dict) or set(region) != {'x', 'y', 'width', 'height'}:
        raise ValueError('region must contain exactly x, y, width, height')
    if any(type(value) is not int for value in region.values()):
        raise ValueError('region coordinates must be integers')
    x, y, w, h = (region[key] for key in ('x', 'y', 'width', 'height'))
    if x < 0 or y < 0 or w <= 0 or h <= 0 or x + w > width or y + h > height:
        raise ValueError('region must be non-empty and within the oriented image bounds')
    return pixels[y:y + h, x:x + w], dict(region)


def _summarize(pixels, metadata, region):
    selected, bounds = _crop(pixels, region)
    selected = selected.astype(np.float64) / 255.0
    lab = rgb2lab(selected)
    hsv = rgb2hsv(selected)
    low, high = selected == 0, selected == 1
    report = {
        'schema_version': '1.0',
        **metadata,
        'image_size': {'width': pixels.shape[1], 'height': pixels.shape[0]},
        'region': bounds,
        'pixel_count': int(selected.shape[0] * selected.shape[1]),
        'lab_mean': np.mean(lab, axis=(0, 1)).tolist(),
        'lab_std': np.std(lab, axis=(0, 1)).tolist(),
        'lightness_percentiles': dict(zip(
            ['p05', 'p50', 'p95'], np.percentile(lab[:, :, 0], [5, 50, 95]).tolist(),
        )),
        'hsv_saturation_mean': float(hsv[:, :, 1].mean()),
        'hsv_saturation_p95': float(np.percentile(hsv[:, :, 1], 95)),
        'channel_endpoints': {
            'any_channel_at_min_ratio': float(np.any(low, axis=2).mean()),
            'any_channel_at_max_ratio': float(np.any(high, axis=2).mean()),
            'all_channels_at_min_ratio': float(np.all(low, axis=2).mean()),
            'all_channels_at_max_ratio': float(np.all(high, axis=2).mean()),
        },
        'limitations': [
            'Measurements only: no aesthetic score or automatic pass/fail.',
            'A region is not automatically identified as skin or a neutral surface.',
            'Output channel endpoints do not establish RAW clipping or incorrect exposure.',
            'Untagged images are assumed sRGB; other encodings must be converted first.',
        ],
    }
    return report, lab


def analyze_image(image_path, region=None):
    """Analyze a rendered preview, optionally within a pixel rectangle."""
    pixels, metadata = _read(image_path)
    report, _ = _summarize(pixels, metadata, region)
    return report


def compare_images(before_path, after_path, region=None):
    """Compare aligned renders of one photo, after color management/orientation."""
    before_pixels, before_metadata = _read(before_path)
    after_pixels, after_metadata = _read(after_path)
    if before_pixels.shape != after_pixels.shape:
        raise ValueError('comparison requires matching oriented image dimensions; no automatic resizing')
    before, before_lab = _summarize(before_pixels, before_metadata, region)
    after, after_lab = _summarize(after_pixels, after_metadata, region)
    delta = deltaE_ciede2000(before_lab, after_lab)
    return {
        'schema_version': '1.0',
        'before': before,
        'after': after,
        'lab_mean_change': (np.array(after['lab_mean']) - before['lab_mean']).tolist(),
        'hsv_saturation_mean_change': after['hsv_saturation_mean'] - before['hsv_saturation_mean'],
        'channel_endpoint_ratio_changes': {
            key: after['channel_endpoints'][key] - value
            for key, value in before['channel_endpoints'].items()
        },
        'delta_e_ciede2000': {
            'mean': float(delta.mean()),
            'p95': float(np.percentile(delta, 95)),
            'max': float(delta.max()),
        },
        'limitations': [
            'Caller must provide geometrically aligned versions of the same photo.',
            'Delta E measures change, not whether a color is correct or attractive.',
            'A positive b* change indicates movement toward yellow, not proof of a bad white balance.',
        ],
    }
