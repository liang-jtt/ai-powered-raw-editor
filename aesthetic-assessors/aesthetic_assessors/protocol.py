"""Shared JSON contract; no model-specific scores are synthesized here."""
import contextlib
import json
import math
import sys


def validate_paths(paths, minimum=1):
    if not isinstance(paths, list) or not minimum <= len(paths) <= 32:
        raise ValueError(f'image_paths must contain {minimum} to 32 paths')
    if any(not isinstance(path, str) or not path.strip() for path in paths):
        raise ValueError('each image path must be a non-empty string')
    return paths


def finite_number(value):
    if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value):
        raise ValueError('model returned a non-finite or non-numeric score')
    return float(value)


def validate_rows(rows, count):
    if not isinstance(rows, list) or len(rows) != count:
        raise ValueError('model output count does not match image count')
    for row in rows:
        if not isinstance(row, dict) or 'score' not in row:
            raise ValueError('model output must contain a score for every image')
        finite_number(row['score'])
    # Reject NaN/Infinity in secondary heads as well.
    json.dumps(rows, allow_nan=False)
    return rows


def handle_request(request, backend):
    if not isinstance(request, dict):
        raise ValueError('request must be a JSON object')
    operation = request.get('operation')
    if operation not in ('status', 'score', 'rank'):
        raise ValueError('operation must be status, score, or rank')
    allowed = {'operation'} if operation == 'status' else {'operation', 'image_paths', 'prompt'}
    if set(request) - allowed:
        raise ValueError('request contains unknown fields')
    if operation == 'status':
        return backend.status()
    paths = validate_paths(request.get('image_paths'), 2 if operation == 'rank' else 1)
    prompt = request.get('prompt')
    if backend.name == 'hpsv3' and (not isinstance(prompt, str) or not prompt.strip()):
        raise ValueError('HPSv3 requires one non-empty prompt shared by all candidates')
    if backend.name == 'icaa' and prompt is not None:
        raise ValueError('ICAA evaluates images only; omit prompt')
    rows = validate_rows(backend.score(paths, prompt), len(paths))
    scores = [{'input_index': index, 'image_path': path, **row}
              for index, (path, row) in enumerate(zip(paths, rows))]
    report = {
        'schema_version': '1.0', 'backend': backend.name,
        **backend.metadata(), 'higher_is_better': True, 'scores': scores,
        'limitations': [
            'Scores are model estimates, not objective aesthetic correctness.',
            'Compare aligned versions of the same photo; validate against user choices.',
            'Scores from different backends/configurations are not on a shared scale.',
        ],
    }
    if backend.name == 'hpsv3':
        report['prompt'] = prompt
    if operation == 'rank':
        ordered = sorted(scores, key=lambda row: row['score'], reverse=True)
        ranking, previous, rank = [], None, 0
        for position, row in enumerate(ordered, 1):
            if row['score'] != previous:
                rank = position
            ranking.append({**row, 'rank': rank})
            previous = row['score']
        report['ranking'] = ranking
        report['best_indices'] = [row['input_index'] for row in ranking if row['rank'] == 1]
    return report


def run_cli(backend, input_stream=None):
    try:
        request = json.load(input_stream or sys.stdin)
        # Upstream packages sometimes print on import and model initialization.
        with contextlib.redirect_stdout(sys.stderr):
            data = handle_request(request, backend)
        response, status = {'ok': True, 'data': data}, 0
        encoded = json.dumps(response, ensure_ascii=True, allow_nan=False)
    except Exception as exc:
        encoded = json.dumps({'ok': False, 'error': {
            'code': type(exc).__name__, 'message': str(exc), 'backend': backend.name,
        }}, ensure_ascii=True, allow_nan=False)
        status = 1
    print(encoded)
    return status
