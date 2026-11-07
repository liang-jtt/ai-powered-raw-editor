# 两个独立审美评分模块

| 模块 | 入口 | 评分用途 | 安装与权重说明 |
| --- | --- | --- | --- |
| ICAA | `icaa/cli.py` | 色彩审美分，另附整体审美分 | [ICAA 说明](icaa/README.md) |
| HPSv3 | `hpsv3/cli.py` | 同一文字描述下的人类偏好分 | [HPSv3 说明](hpsv3/README.md) |

两个模块共享 JSON 协议和图片读取逻辑，模型适配器、依赖和配置分别独立。全部内容位于本目录，**没有接入或修改 `art-main/`、`color-inspector/`，不会自动改变修图行为**。

## 本次交付状态

- 两个 CLI、Python 适配器、Node 调用端已实现；状态与错误处理可直接运行。
- ICAA 官方源码已下载到 `.runtime/icaa-source`，固定在 `e7b2a88e32f3db811ef2b550a66e490869160b4a`。独立 `.venv-icaa` 使用现有系统 PyTorch，并仅在该虚拟环境内补充 timm / einops；官方 DAT 结构单图前向检查通过。
- **2026-11-03 已下载官方 ICAA17K multi 训练权重并完成 CPU 真实照片评分。** 猫照片三次重复评分及独立 CLI 均通过；色彩审美为 `0.5729838013648987`，整体审美为 `0.42509615421295166`。详见 [ICAA 说明](icaa/README.md)。未接入修图工作流，尚未验证候选排序是否符合用户偏好。
- **未安装 HPSv3 包，也未下载 HPSv3 / Qwen2-VL-7B 权重。** 当前现有 Python 的 PyTorch 为 CPU 版；HPSv3 训练依赖栈更适合单独的 Linux / CUDA 环境。
- 接口测试与训练模型推理是两件事。`status` 返回 `can_attempt_inference:false` / `inference_verified:false` 时，不能理解成模型已经可用。不存在随机评分、启发式评分或回退到别的模型。

## 公共协议

每次启动读取一个 JSON 对象，stdout 返回一个 JSON 对象后退出。上游模型的普通打印重定向到 stderr。成功退出码 0；失败退出码 1。

### 状态检查（不加载模型）

在工作区根目录执行：

```powershell
'{"operation":"status"}' | python .\aesthetic-assessors\icaa\cli.py
'{"operation":"status"}' | python .\aesthetic-assessors\hpsv3\cli.py
```

ICAA 使用本次准备的独立环境检查依赖：

```powershell
'{"operation":"status"}' | .\aesthetic-assessors\.venv-icaa\Scripts\python.exe .\aesthetic-assessors\icaa\cli.py
```

`dependencies` 仅表示可找到包，不保证所有间接依赖或二进制兼容；`asset_problem` 描述首个配置/文件问题。`can_attempt_inference` 表示允许尝试，**不保证加载成功、GPU 可用或权重正确**。`inference_verified` 仅在该 Python 评分器实例成功运行推理后变为 true，单独启动的状态检查不会继承上一次进程的状态。

### 批量评分

ICAA（不需要文字）：

```json
{
  "operation": "score",
  "image_paths": ["C:/photos/A.png", "C:/photos/B.png", "C:/photos/C.png"]
}
```

HPSv3（所有候选共享同一段文字）：

```json
{
  "operation": "score",
  "image_paths": ["C:/photos/A.png", "C:/photos/B.png", "C:/photos/C.png"],
  "prompt": "A naturally edited portrait with balanced colors and realistic skin tones."
}
```

支持每次 1–32 张图。`operation` 改为 `rank` 会同时返回分数和排名，至少需要两张。不要对每个候选写不同 prompt 再比较分数。

### 返回数据

成功：`{"ok":true,"data":{...}}`。`data` 字段：

| 字段 | 含义 |
| --- | --- |
| `schema_version` | `1.0` |
| `backend` | `icaa` / `hpsv3` |
| `score_kind` | `color_aesthetic` / `human_preference_mu` |
| `score_range` | ICAA 为 `[0,1]`，HPSv3 为 null（不强行映射成 0–100） |
| `higher_is_better` | true，仅对该后端当前配置成立 |
| `scores` | 按输入顺序排列，每项含 `input_index`、`image_path`、`score` 及后端附加字段 |
| `ranking` | 仅 rank 操作返回，按 score 降序排列，另附 `rank` |
| `best_indices` | 仅 rank 返回，所有最高分候选的 0-based 输入索引 |
| `prompt` | HPSv3 实际使用的共同描述 |
| `checkpoint_path` | 当前使用的权重路径，方便追踪 |
| `preprocessing` / `limitations` | 预处理及解释边界 |

严格同分保留并列。例如分数 `[0.3,0.8,0.8]` 对应输入排名 `[3,1,1]`，最佳索引 `[1,2]`。很小的分差也不自动宣称有可靠的审美优势；接口不生成置信度或统一合格线。

失败格式：

```json
{
  "ok": false,
  "error": {
    "code": "FileNotFoundError",
    "message": "具体缺少的配置或模型文件",
    "backend": "icaa"
  }
}
```

路径相对调用进程工作目录解析；推荐图片绝对路径。配置里的相对资产路径则相对**配置文件所在目录**解析。未知请求字段会报错，不接受请求中的任意模块加载路径。ICAA 的 `prompt` 可省略或为 null；其他值会报错。

## Node.js 调用

`examples/node-client.mjs` 提供两个独立函数，无需 npm 依赖：

```javascript
import { assessICAA, assessHPSv3 } from './aesthetic-assessors/examples/node-client.mjs';

// 这个状态查询无需模型权重，可直接运行。
console.log(await assessICAA({ operation: 'status' }));
console.log(await assessHPSv3({ operation: 'status' }));
```

配置好权重后：

```javascript
const icaaReport = await assessICAA({
  operation: 'rank',
  image_paths: ['C:/photos/A.png', 'C:/photos/B.png'],
}, {
  python: './aesthetic-assessors/.venv-icaa/Scripts/python.exe',
  config: './aesthetic-assessors/icaa/config.local.json',
  timeoutMs: 300000,
});

const hpsReport = await assessHPSv3({
  operation: 'rank',
  image_paths: ['C:/photos/A.png', 'C:/photos/B.png'],
  prompt: 'A naturally edited portrait with balanced colors and realistic skin tones.',
}, {
  python: 'C:/your-hps-environment/python.exe',
  config: './aesthetic-assessors/hpsv3/config.local.json',
  timeoutMs: 300000,
});
```

两个函数返回 `data`，失败抛异常，默认超时 5 分钟。每次调用是新 Python 进程；**一次请求放入全部候选**，不要逐张启动大型模型。若长期运行，使用 Python 类复用实例，或以后再加常驻服务 / MCP 外层；当前没有 HTTP/MCP 服务。

HPSv3 若部署在另一台 Linux/GPU 机器，Node 调用端也需运行在那里，或者后续增加网络服务。本次本地子进程接口不自带远程执行能力。

## Python 调用

把 `aesthetic-assessors/` 加入 Python 模块搜索路径后：

```python
from aesthetic_assessors import ICAAScorer, HPSv3Scorer
from aesthetic_assessors.protocol import handle_request

icaa = ICAAScorer('C:/project/aesthetic-assessors/icaa/config.local.json')
print(icaa.status())

# 配置并安装模型后；同一个实例重复调用会复用模型。
report = handle_request({
    'operation': 'rank',
    'image_paths': ['C:/photos/A.png', 'C:/photos/B.png'],
}, icaa)
```

类的 `.score(paths, prompt=None)` 直接返回每张图的原始评分字典；`handle_request` 额外附加协议字段并生成排名。两个后端应使用各自环境，ICAA 无需安装 HPSv3。Python 实例按串行使用设计，不保证同实例多线程调用。

## 与当前修图流程配合

AI-PP3 输出候选预览 → 分别请求颜色检测、ICAA、HPSv3 → 将图片和三份报告交给主大模型 → 决定保留哪个或修改参数。两个审美接口不会修改图片、PP3，也不会自动将自己的分数加权成最终结论。

只接受 8 位 RGB PNG/JPEG，不直接读取 RAW；处理 EXIF 方向与嵌入 ICC，未标注时假设 sRGB。拒绝透明图、高位深 PNG、动画和非 RGB 预览。不自动配准、识别人脸或学习用户样片偏好。比较时使用相同照片的候选版本；两个后端的分数不能直接相加或比较大小。

## 验证

```powershell
python -m unittest discover -s .\aesthetic-assessors\tests -v
node --check .\aesthetic-assessors\examples\node-client.mjs
```

接口测试用明确的测试后端检查排名与输出解码，不代表真实预训练模型性能。ICAA 已额外通过真实权重单图推理验证；HPSv3 未通过真实推理验证，详情见 [验证记录](VERIFICATION.md)。
