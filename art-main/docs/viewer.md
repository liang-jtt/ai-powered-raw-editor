# Viewer

Viewer runs after RawTherapee renders the baseline and before `processAIGeneration`
requests PP3 edits. It combines local color-inspector measurements and ICAA scores.
There is no added candidate review or automatic revision loop.

The new `default` preset is style-free. Existing explicit presets remain selectable.
Editing requests send viewer measurements and field definitions without legacy histogram
adjustment recommendations. The prompt and response are saved beside the preview for inspection.

## Clear 模式

`clear` 使用已确认的通透目标和操作思路：鲜明光感、清晰色彩关系、空间层次，
先分析主要差距，再选择两到三个视觉关系，将预期变化对应到 PP3 参数。
根据原图决定冷暖与调整幅度，分别考虑鲜明光影和均匀／阴影光线场景。
提示词保留中文原意，仅补充参数参考及程序解析需要的 ANALYSIS / PLAN / EXECUTION 输出格式。

```powershell
node dist/bin.js input.ARW --provider openai-compatible --preset clear --generations 1 --keep-preview
```

所有内置模式使用 viewer 报告与字段解释，不附加旧直方图模块的自动调参建议。
它是可显式选择的独立模式；默认模式仍为 `default`，默认模型仍为 `gpt-6.1-sol`。
命名规则会自动包含 `_clear_<model>_<timestamp>`。此次新增没有运行真实照片生成。

## 明度编辑更新（2026-11-07）

单次和多候选生成共用默认可编辑模块列表，新增已有 PP3 的 `[Luminance Curve]`。
模型会同时看到当前模块值与 Enabled、Brightness、Contrast、Chromaticity、LCurve 的说明。
参考范围和字段核对自 RawTherapee 5.13 官方源码：
[labcurve.cc](https://github.com/RawTherapee/RawTherapee/blob/5.13/rtgui/tools/labcurve.cc)、
[procparams.cc](https://github.com/RawTherapee/RawTherapee/blob/5.13/rtengine/procparams.cc)、
[diagonalcurvetypes.h](https://github.com/RawTherapee/RawTherapee/blob/5.13/rtengine/diagonalcurvetypes.h)。

所有内置模式增加统一的明暗处理原则：先组织明度层次，不强行大幅抬升高光或阴影，
不默认用提阴影、压高光来换取全部细节；再判断鲜艳度、局部对比和去雾的用途，保留合理空气透视。
自定义 `--prompt` 文本仍按原样使用。显式 `--sections` 继续覆盖默认模块列表。

为避免旧提示与新原则冲突，仅在编辑请求组装处关闭旧直方图的自动处理建议；
原 PP3 解析／写回和 RawTherapee 渲染引擎没有改动，没有新增蒙版或循环。
提示词指导不会在程序中硬钳制参数数值；模型仍按场景选择实际幅度。

本机引擎已用合成灰阶图验证：开启模块后，Brightness 和非恒等 LCurve 都能实际改变像素。
记录在 `test-output/luminance-20261107/verification.json`。未调用外部 AI 或重修用户照片。

```powershell
node dist/bin.js input.ARW --provider openai-compatible --preset default --generations 1 --keep-preview
```

Use the provider/model already configured for your installation. `default` is also
the default when `--preset` is omitted. `--generations 1` uses direct rendering;
explicit multi-generation commands retain the project's pre-existing selection path.

The default model is now `gpt-6.1-sol` for both the CLI and library entry points.
Unless an explicit output path is supplied, rendered images and PP3 files include
`_<preset>_<model>_<YYYYMMDD-HHmmss-SSS>` in the filename. Timestamps use
Asia/Shanghai. Each output has a `.run.json` record with the mode, model, input,
completion time and artifact paths. An explicit image output no longer shares
the same path as its PP3 file.

The four DSC02691 comparisons are catalogued in `output/photo-comparison/` with
a Chinese `图片索引.md` and machine-readable `index.json`. Historical timestamps
come from original image modification times, which are preserved on the copies.

## Artifacts

- `*_preview.*.viewer.png`: orientation-corrected, max-edge 1600px, 8-bit sRGB PNG;
  this exact image goes to both measurement modules and the editing AI.
- `*_preview.*.viewer.json`: measurements, ratings, execution status.
- `*_preview.*.ai-request.txt`: actual text sent to the editing model.
- `*_preview.*.ai-response.txt`: model response before PP3 parsing.
- Original CLI PP3/image outputs are unchanged.

Failed Python backends are recorded as errors; their scores are not synthesized.
Image preparation errors stop processing because a matching analysis image is required.
The original RAW is used for final rendering and is not uploaded by this pipeline.
The configured AI provider receives the analysis preview, PP3 text and viewer report.

## Local installation

This checkout uses sibling directories `../color-inspector` and
`../aesthetic-assessors`. Viewer discovers the existing isolated ICAA environment.
It does not download weights or modify Python environments automatically.

Optional environment settings: `VIEWER_ROOT` (directory containing both modules),
`ICAA_PYTHON`, `COLOR_INSPECTOR_PYTHON`. Packaging the Node project alone does not
include these sibling modules; configure their root on another machine.

## Future regions

`analyzeViewer(previewPath, regions)` already accepts optional named rectangles
`{name,x,y,width,height}`. Coordinates refer to the orientation-corrected analysis
PNG, not the full RAW dimensions. Whole-image ICAA scores remain separate from
regional color measurements. No region detector or automatic crop selection is enabled.

## Validation, 2026-11-06

- TypeScript compiler passed.
- Full Vitest run: 116 passed, 1 skipped.
- DSC02691.ARW baseline successfully rendered and both real Python modules ran:
  ICAA color `0.6582741141319275`, overall `0.5045061111450195`.
- After the user explicitly approved sending the reduced preview, report and PP3 to
  the configured endpoint, the single-generation `default` run completed successfully.
  Both real backends succeeded. The rendered JPEG, PP3, exact prompt, response and
  `run-summary.json` are in `output/viewer-2026-11-06/`. No post-edit review was run.
