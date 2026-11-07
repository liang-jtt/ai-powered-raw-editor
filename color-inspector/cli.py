"""One JSON request on stdin, one JSON response on stdout; no persistent server."""

import json
import sys


def main():
    try:
        request = json.load(sys.stdin)
        if not isinstance(request, dict):
            raise ValueError('request must be a JSON object')
        operation = request.get('operation')
        fields = {
            'analyze': {'operation', 'image_path', 'region'},
            'compare': {'operation', 'before_path', 'after_path', 'region'},
        }
        if not isinstance(operation, str) or operation not in fields:
            raise ValueError('operation must be analyze or compare')
        if set(request) - fields[operation]:
            raise ValueError('request contains unknown fields')
        from color_inspector import analyze_image, compare_images
        if operation == 'analyze':
            data = analyze_image(request.get('image_path'), request.get('region'))
        else:
            data = compare_images(request.get('before_path'), request.get('after_path'), request.get('region'))
        response = {'ok': True, 'data': data}
        status = 0
    except Exception as exc:
        response = {'ok': False, 'error': {'code': type(exc).__name__, 'message': str(exc)}}
        status = 1
    print(json.dumps(response, ensure_ascii=True, allow_nan=False))
    return status


if __name__ == '__main__':
    raise SystemExit(main())
