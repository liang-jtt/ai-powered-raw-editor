"""Consistent oriented sRGB previews for both models; inputs are never rewritten."""
import io
from pathlib import Path


def load_preview(path):
    from PIL import Image, ImageCms, ImageOps
    path = Path(path).expanduser().absolute()
    with path.open('rb') as stream:
        header = stream.read(26)
    if header.startswith(b'\x89PNG\r\n\x1a\n') and header[24:25] != b'\x08':
        raise ValueError('render an 8-bit RGB sRGB preview; high-bit-depth PNG is unsupported')
    with Image.open(path) as source:
        if source.format not in ('JPEG', 'PNG') or source.mode not in ('RGB', 'RGBA'):
            raise ValueError('expected an 8-bit RGB PNG/JPEG preview')
        if getattr(source, 'n_frames', 1) != 1:
            raise ValueError('animated previews are unsupported')
        image = ImageOps.exif_transpose(source)
        if image.mode == 'RGBA' or 'transparency' in source.info:
            if image.convert('RGBA').getchannel('A').getextrema() != (255, 255):
                raise ValueError('composite transparent pixels onto an explicit background first')
        image = image.convert('RGB')
        icc = source.info.get('icc_profile')
        if icc:
            try:
                image = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(icc)),
                                                 ImageCms.createProfile('sRGB'), outputMode='RGB')
            except (ValueError, OSError, ImageCms.PyCMSError) as exc:
                raise ValueError('invalid or unsupported ICC profile') from exc
        return image.copy()
