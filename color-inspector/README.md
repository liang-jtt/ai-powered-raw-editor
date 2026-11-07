# 独立颜色检测接口

给大模型提供图片的客观颜色数据，基于 **scikit-image + NumPy + Pillow**。

模块与 `art-main/` 平级，未接入 AI-PP3 的任何执行入口，不修改原项目文件、依赖或配置。只有调用接口时才执行检测，不修改输入图片，不调用大模型，不写 PP3。当前是本地 Python / JSON 子进程接口，不是 HTTP 或 MCP 服务。

## 能提供什么

| 接口 | 用途 |
| --- | --- |
| `analyze_image(image_path, region=None)` | 测量一张图片或一个矩形区域的颜色分布 |
| `compare_images(before_path, after_path, region=None)` | 比较同一张照片两个版本的颜色变化 |

输出包括 Lab 均值与标准差、明度分位数、HSV 饱和度统计、输出像素通道端点比例。对比接口额外提供 Lab 变化、饱和度变化和 CIEDE2000 色差的均值 / P95 / 最大值。

这些是**测量结果**，不输出“偏色不合格”“肤色正确”或审美评分。大模型需要结合场景、风格和用户偏好解释数据。

## 环境

Python 3.10+。当前验证环境：Python 3.12.3、scikit-image 0.23.2、NumPy 1.26.4、Pillow 12.0.0。

建议在本模块自己的虚拟环境中安装，不改原项目环境。从工作区根目录运行：

```powershell
python -m venv .\color-inspector\.venv
.\color-inspector\.venv\Scripts\python.exe -m pip install -r .\color-inspector\requirements.txt
```

若现有 Python 已有这些库，可以直接使用。本次开发使用现有库，没有安装或升级系统依赖。

## 调用方式一：JSON 标准输入 / 输出

每次启动处理一个请求。输入一个 JSON 对象，stdout 输出一个 JSON 对象，之后退出。成功退出码为 0；失败退出码为 1。路径相对调用进程的工作目录解析，推荐使用绝对路径。

下面使用项目已有的示例成片进行只读分析，可直接在工作区根目录运行：

```powershell
$request = @{
    operation = 'analyze'
    image_path = (Join-Path (Get-Location) 'art-main\examples\1\ai.jpg')
    region = @{ x = 0; y = 0; width = 256; height = 256 }
} | ConvertTo-Json -Compress -Depth 4
$request | python .\color-inspector\cli.py
```

示例仅测左上角 256×256 区域，便于快速验证接口；删除 `region` 即测整图。批量分析建议使用修图引擎导出的小尺寸预览。

需要对比时，请换成你自己的两张对齐预览图路径：

```json
{
  "operation": "compare",
  "before_path": "C:/photos/baseline.png",
  "after_path": "C:/photos/candidate.png"
}
```

可选 `region`，两种操作均支持：

```json
{
  "operation": "analyze",
  "image_path": "C:/photos/candidate.png",
  "region": {"x": 100, "y": 200, "width": 300, "height": 200}
}
```

坐标为**应用 EXIF 方向后**图片中的整数像素，原点在左上，x 向右、y 向下。区域必须完整落在图片内。未指定或为 `null` 时检测整张图。只支持手动指定矩形，不自动识别人脸、灰墙或天空。

返回格式：

```json
{"ok": true, "data": {"schema_version": "1.0", "pixel_count": 60000}}
```

上面省略了其他测量字段。失败时例如：

```json
{"ok": false, "error": {"code": "ValueError", "message": "operation must be analyze or compare"}}
```

`error.code` 是 Python 异常类型名，调用方应首先检查 `ok` 和退出码。JSON 使用 ASCII 转义，中文路径可以正常传递；stdout 不含进度文字。

## 调用方式二：Node.js / AI-PP3 将来调用

提供了独立适配器 `examples/node-client.mjs`，仅使用 Node 内置模块。它通过子进程调用 Python，返回解析后的 `data`，出错则抛异常。默认 30 秒超时；大图可以增加超时。Python 必须指向安装了上述依赖的解释器。

从工作区根目录运行以下示例（不会改动 AI-PP3）：

```powershell
@'
import { inspectColor } from './color-inspector/examples/node-client.mjs';

const report = await inspectColor({
  operation: 'analyze',
  image_path: './art-main/examples/1/ai.jpg',
  region: { x: 0, y: 0, width: 256, height: 256 },
}, { python: 'python', timeoutMs: 60000 });

console.log(JSON.stringify(report, null, 2));
'@ | node --input-type=module
```

将来接入时，由 AI-PP3 调用这个函数，再把报告和图片一起交给模型即可。**当前没有自动调用、自动重试、自动修图或自动排序行为。**

## 调用方式三：Python 函数

将本目录加入 Python 模块搜索路径后：

```python
from color_inspector import analyze_image, compare_images

report = analyze_image("C:/photos/candidate.png")
comparison = compare_images("C:/photos/baseline.png", "C:/photos/candidate.png")
```

例如从本目录启动 Python，或由调用方把本目录加入 `sys.path`。函数直接返回字典，失败抛出异常，不附加 CLI 的 `ok/data` 外壳。

## 字段含义

| 字段 | 含义 |
| --- | --- |
| `schema_version` | 当前数据结构版本 `1.0` |
| `color_management` | 工作色彩空间、ICC 来源、测量位深、方向处理说明 |
| `image_size` / `region` / `pixel_count` | 方向修正后的整图尺寸、检测范围和像素数 |
| `lab_mean` / `lab_std` | 顺序为 `[L*, a*, b*]`；L* 通常 0–100，a* 正为红向，b* 正为黄向 |
| `lightness_percentiles` | 区域 L* 的 P05 / P50 / P95，用来描述明度分布 |
| `hsv_saturation_mean` / `hsv_saturation_p95` | HSV 饱和度的均值和 P95，范围 0–1 |
| `channel_endpoints` | 在工作空间中，至少一个 / 全部通道恰好为 0 或 255 的像素比例，范围 0–1 |
| `before` / `after` | 对比时两张图片各自的完整分析报告 |
| `lab_mean_change` | after 减 before，顺序 `[ΔL*, Δa*, Δb*]` |
| `hsv_saturation_mean_change` | after 减 before 的平均饱和度变化 |
| `channel_endpoint_ratio_changes` | after 减 before 的各项通道端点比例变化 |
| `delta_e_ciede2000` | 对应像素色差的均值、P95、最大值 |
| `limitations` | 供调用方和模型使用的数据解释边界 |

例如：`lab_mean_change[2] > 0` 表示区域平均颜色向黄色方向移动；它不代表白平衡一定错误。全图 b* 偏高也可能只是照片里本来就有大量黄色物体。

## 输入与解释边界

- 当前只接受 **8 位 RGB PNG / JPEG**。RGBA 仅在完全不透明时接受；拒绝透明图片、RAW、16 位 PNG、灰度图、调色板图和动画。请从修图引擎导出用于分析的 8 位 sRGB 预览，原 RAW 与高位深成片不受影响。
- 有嵌入 ICC 时通过 Pillow / LittleCMS 转为 sRGB；坏的 ICC 会报错。没有 ICC 时明确假设 sRGB，报告标注 `assumed_srgb`；不依据其他 PNG 标签猜测色彩空间。
- ICC 转换和 8 位量化会影响测量；结果描述的是该预览，不是 RAW 传感器数值。高精度生产用途应另行增加高位深色彩管理管线。
- 比较要求方向修正后的尺寸完全一致，不自动缩放或配准。调用方须保证同一照片、同一裁剪、像素对齐；不同场景参考图不宜逐像素比较。
- 通道端点比例不是实际过曝 / 欠曝判定：纯红色也可能有一个通道为 255、另一个为 0。模块因此不把它命名为曝光合格率。
- 不设统一肤色、中性色或审美阈值。想分析灰墙或皮肤，需要调用方先提供可靠区域。
- 不上传图片、不启动常驻服务。大图会在本地占用内存，当前不自动降采样，以免改变端点统计与区域含义。

## 验证

在工作区根目录运行：

```powershell
python -m unittest discover -s .\color-inspector\tests -v
```

测试依赖 Python 上述库和 Node.js（适配器测试）。覆盖中性灰、颜色偏移、相同图、区域边界、端点比例、ICC、透明图与高位深拒绝、JSON 错误、不同工作目录调用和 Node → Python 实际通信。
