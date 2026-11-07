# HPSv3 人类偏好模块

来源：[HPSv3 官方项目](https://github.com/MizzenAI/HPSv3)，官方推理类 `HPSv3RewardInferencer`。协议见 [公共说明](../README.md)。入口 `hpsv3/cli.py`，Python 类 `HPSv3Scorer`。

## 分数含义

输入图片和**共同的文字描述**，调用官方 `reward(prompts=..., image_paths=...)`。按官方用法返回：

- `score`：第 1 维 mu，人类偏好评分，越高越好，无固定 0–1 / 0–100 范围。
- `auxiliary_raw`：第 2 维原始值，只保留供追踪，不解释成已校准置信度。

HPSv3 同时考虑质量和文字匹配，不是专门针对 RAW 调色训练的裁判。比较同一张照片的细微色彩版本前，需要用自己的选择验证排序。

## 本次实际状态

接口封装完成，协议与输出解码测试通过。**当前未安装官方 HPSv3 包，未下载 HPSv3 / Qwen2-VL-7B 模型，真实预训练推理未验证。** 现有 Python 为 CPU PyTorch，不能据此声称支持 CUDA 推理。

## 独立环境

官方 1.0.0 包带 transformers、deepspeed、trl 等训练依赖；建议在单独的 Linux + CUDA 环境安装，避免影响 AI-PP3 或 ICAA。原生 Windows 安装训练依赖可能需要额外适配，本次没有验证该安装路线。

例如在目标 Linux 环境，从工作区根目录执行：

```bash
python3 -m venv aesthetic-assessors/.venv-hpsv3
aesthetic-assessors/.venv-hpsv3/bin/python -m pip install -r aesthetic-assessors/hpsv3/requirements.txt
```

按设备先安装匹配的 CUDA PyTorch。模型为 Qwen2-VL-7B 级别，显存/内存需要在目标环境实测；本封装不提供量化或多 GPU 自动分配，不承诺 4GB 显卡可运行。配置 `cpu` 会使用 float32，内存与速度成本较高，当前也未验证完整 CPU 推理。

## 本地模型资产

需要两个来源的完整资产：

1. [MizzenAI/HPSv3](https://huggingface.co/MizzenAI/HPSv3) 的 `HPSv3.safetensors`。
2. [Qwen/Qwen2-VL-7B-Instruct](https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct) 的完整基础模型快照，包含模型分片、config、processor、tokenizer。

安装 huggingface_hub 后，可在目标环境通过以下 Python 代码单独下载。该动作与评分请求分开，模型较大：

```python
from huggingface_hub import hf_hub_download, snapshot_download

hf_hub_download('MizzenAI/HPSv3', 'HPSv3.safetensors',
                local_dir='aesthetic-assessors/.runtime/weights')
snapshot_download('Qwen/Qwen2-VL-7B-Instruct',
                  local_dir='aesthetic-assessors/.runtime/Qwen2-VL-7B-Instruct')
```

编辑本目录 `config.local.json`，示例路径相对该配置文件：

```json
{
  "checkpoint_path": "../.runtime/weights/HPSv3.safetensors",
  "base_model_path": "../.runtime/Qwen2-VL-7B-Instruct",
  "device": "cuda"
}
```

评分时明确传入本地 checkpoint 和基础模型路径，加载期间设置 HF 离线环境标记，不调用官方“省略 checkpoint 自动下载”的分支。缺文件返回错误，不代替下载。状态检查仅粗查文件存在；完整分片与 tokenizer 的可用性由真实加载确认。

适配器读取已安装包自带的 `HPSv3_7B.yaml`，生成临时推理配置，替换本地基础模型路径，关闭 Flash Attention 2 并使用 SDPA，关闭训练日志上报；不修改官方安装包文件。CPU 模式还设置 float32、关闭 bf16/fp16。官方依赖不兼容时明确报错，不切换别的模型。

## 请求

```json
{
  "operation": "rank",
  "image_paths": ["/photos/A.png", "/photos/B.png"],
  "prompt": "A naturally edited landscape photograph with balanced colors and soft contrast."
}
```

HPSv3 的 prompt 必须是非空字符串，一个请求只能提供一段共同描述。建议写照片内容和希望的风格，避免逐个候选写不同描述而破坏可比性。

一个请求加载一次模型，逐张评分以控制峰值内存。接口会先将输入统一为方向正确的 sRGB PNG 临时预览，再交给官方 processor，结束后清理临时图片，不修改输入。

验证时先运行 `{"operation":"status"}`；完整评分成功后，再检查分数与你对候选的选择是否一致。文件存在、能 import、接口测试通过，均不代表真实照片审美排序已经可靠。
