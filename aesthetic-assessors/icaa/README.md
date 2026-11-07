# ICAA 色彩审美模块

来源：[ICCV 2023 官方项目](https://github.com/woshidandan/Image-Color-Aesthetics-and-Quality-Assessment)。封装的是 **ICAA17K_code 的 DAT 模型**，不是仓库其他模型或后续 Refine 项目。

接口和原项目隔离；协议见 [公共说明](../README.md)。入口 `icaa/cli.py`，Python 类 `ICAAScorer`。

## 分数含义

官方 ICAA17K 代码训练两项输出：`[MOS/10, color/10]`，使用 sigmoid。官方验证色彩任务时选择第 2 项。接口因此返回：

- `score`：第 2 项，色彩审美分，0–1，越高越好。
- `overall_score`：第 1 项，整体审美分，0–1，单独保留。

这不是 10 档评分分布，也不是“好看概率”，不要乘 100 后当作百分制准确率。严格加载匹配 checkpoint，不允许仅加载分类骨干后用随机审美头打分。

## 本次实际状态

官方源码已准备在 `../.runtime/icaa-source`；独立 `../.venv-icaa` 已建立，继承当前 Python 已有的 CPU PyTorch / torchvision，并仅在该环境安装 timm 1.0.22、einops 0.8.1。未修改全局环境或原项目。

**2026-11-03 已完成独立 CPU 部署和真实照片评分。** 从官方 README 链接的 Google Drive 获取 `e_30_ICAA17K_multi_tacc0.9622_srcc0.8811_tlcc0.8981.pth`（348,884,485 字节），保存为 `../.runtime/weights/icaa17k-color.pth`。现有配置无需修改；完整模型通过 `weights_only=True` 读取、`strict=True` 加载，未修改模型结构。

用户提供的猫照片连续三次评分一致：色彩审美 `0.5729838013648987`，整体审美 `0.42509615421295166`。首次加载及评分 11.48 秒，复用模型后的两次评分为 0.307 / 0.291 秒；独立 CLI 另一次启动及评分为 9.00 秒。CPU 推理进程峰值工作集约 1008 MiB，峰值进程提交内存约 1496 MiB；未使用 GPU。这些是本机单图测量，不是通用性能保证。

结果、权重 SHA256、照片 SHA256、重复测试和内存记录见 `../.runtime/verification-2026-11-03/cat-photo-icaa.json`；命令行结果见同目录 `cat-photo-cli.json`。输入照片未改写，未接入 AI-PP3，尚未验证候选排序与用户偏好的一致性。

## 在新机器安装

工作区根目录：

```powershell
python -m venv .\aesthetic-assessors\.venv-icaa
.\aesthetic-assessors\.venv-icaa\Scripts\python.exe -m pip install -r .\aesthetic-assessors\icaa\requirements.txt
python .\aesthetic-assessors\icaa\prepare_source.py
```

最后一条仅当目标源码目录不存在时运行；脚本拒绝覆盖既有目录。它下载固定版本的 3 个模型文件与一个 YAML，生成隔离的包名与来源清单。不下载数据集或模型权重。若检查依赖失败，请在独立环境中选择相互匹配的 torch/torchvision 版本。

源码固定版本：`e7b2a88e32f3db811ef2b550a66e490869160b4a`。唯一源代码改动是将 `dat.py` 内绝对 `models.SoftHistogram` 导入改为相对导入，避免污染其他模块的 `models` 命名空间。逐文件 SHA256 与来源在运行目录 `PROVENANCE.json`。

## 配置真实权重

官方 README 提供 [权重文件夹入口](https://drive.google.com/drive/folders/1plWBu2nZw8BcIcjfq833zdzZ0Pk0L4Ug?usp=sharing)，但同时保留“权重暂未公开”的旧说明。2026-11-03 已实际从该目录下载并验证上述 ICAA17K multi 权重，文件 ID 为 `1WSviWMjFY6GDggLKtpjJ6ORON-AAs3v4`。**不要把同目录的 SPAQ 权重、AVA 预训练或 ImageNet 骨干权重当成 ICAA17K 色彩模型。**

把匹配 `ICAA17K_code/configs/dat_base.yaml`、包含完整两个审美头的 state_dict 放到自己的路径，编辑 `config.local.json`（本次已从示例生成）：

```json
{
  "source_dir": "../.runtime/icaa-source",
  "checkpoint_path": "../.runtime/weights/icaa17k-color.pth",
  "device": "cpu"
}
```

支持纯 state_dict、`{"state_dict":...}` 或 `{"model":...}`，可去除 DataParallel 的 `module.` 前缀。使用 `torch.load(weights_only=True)` 与 `strict=True`；键或尺寸不匹配会报错。配置 `cuda` 时先检查实际可用性，不自动静默切换设备。

## 运行

```powershell
'{"operation":"status"}' | .\aesthetic-assessors\.venv-icaa\Scripts\python.exe .\aesthetic-assessors\icaa\cli.py
```

资产齐全后，把下面请求中的图片换成实际路径，再通过管道传给相同命令：

```json
{"operation":"rank","image_paths":["C:/photos/A.png","C:/photos/B.png"]}
```

模型使用官方验证预处理：Resize(224,224) + ToTensor + ImageNet normalize。额外先统一 EXIF 方向和 sRGB。由于原版直方图路径与批次维度处理方式，每次前向仅处理一张，保证候选不相互影响；一个请求仍可连续评分最多 32 张，模型只加载一次。
