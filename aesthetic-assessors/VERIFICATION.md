# 验证记录

日期：2026-11-03。

## 后续部署验证：ICAA 已完成，HPSv3 搁置

- 从官方 README 的权重目录下载 `e_30_ICAA17K_multi_tacc0.9622_srcc0.8811_tlcc0.8981.pth`，文件 ID `1WSviWMjFY6GDggLKtpjJ6ORON-AAs3v4`；348,884,485 字节，保存到 `.runtime/weights/icaa17k-color.pth`。完整 `strict=True` 加载成功，未替换模型或评分头。
- 用户猫照片（1280×960、RGB JPEG，无 ICC，按 sRGB 解释）在既有 CPU 环境成功评分三次，色彩分均为 `0.5729838013648987`，整体分均为 `0.42509615421295166`。
- 首次加载及评分 11.4779 秒；同实例后两次为 0.3066 / 0.2912 秒。峰值进程工作集 1,057,079,296 字节，峰值进程提交内存 1,568,215,040 字节；非 GPU 显存。
- 独立 Python CLI 另一次进程真实评分通过，退出码 0，含启动总耗时 9.0011 秒，分数一致。原图前后 SHA256 一致。
- 详细报告和 SHA256：`.runtime/verification-2026-11-03/cat-photo-icaa.json`；CLI 结果：同目录 `cat-photo-cli.json`；可复用请求：同目录 `cat-photo-request.json`。
- 本次仅获取模型、运行单图验证并更新说明；没有接入 AI-PP3 工作流，没有执行候选审美有效性验证，没有部署 HPSv3。下方“尚缺资产”中的 ICAA 状态是部署前的历史记录，现已由本节更新。

## 已验证

- `python -m unittest discover -s aesthetic-assessors/tests -v`：**16 项通过**。覆盖两个 CLI、状态与错误 JSON、候选排名/并列、共同 prompt、颜色头/mu 解码、非法与非有限输出拒绝、配置路径、缺资产拒绝、图片方向/透明度、双 Node 调用端和官方源码导入补丁。
- `python -m unittest discover -s color-inspector/tests -v`：**14 项通过**，原颜色检测模块回归通过。
- `node --check aesthetic-assessors/examples/node-client.mjs`：通过。
- 通过 Node 客户端真实启动两个 Python CLI 执行状态查询，未使用模拟进程。
- ICAA 独立环境中的官方固定版本 DAT 可构建，输入 `(1,3,224,224)` 返回第一项 shape `(1,2)`、数值有限。此项**未加载训练权重，只检查结构兼容性**，没有保存或暴露随机权重评分。
- ICAA 独立环境状态检查正确识别所需依赖，并明确报告缺少训练 checkpoint。
- HPSv3 状态检查正确识别本地同名 CLI 目录不是已安装模型包，明确报告包和 checkpoint 未配置。
- `art-main/` 与 `color-inspector/` 原有 **200 个文件**的前后 SHA256 一致，未新增文件到原模块。排除了 node_modules、虚拟环境和 Python 字节码缓存。
- 对适配器做了独立代码审查；确认输出头选择、严格权重加载、官方 HPSv3 调用参数及缺资产错误路径，无重要未处理发现。

## 未验证 / 尚缺资产

- **ICAA 训练模型真实评分未验证**：没有取得可验证、匹配完整双审美头的 ICAA17K checkpoint。官方源码能够运行并不代表训练权重已可用。
- **HPSv3 训练模型真实评分未验证**：官方模型包、基础 Qwen2-VL-7B 与 HPSv3.safetensors 未安装/下载，当前主 Python 是 CPU PyTorch。
- 两个模型在用户真实候选照片上的排序是否符合偏好，尚未验证。不能仅凭接口测试宣称审美效果或可靠性。

## 环境变更范围

本次仅在本目录创建源码、说明、配置和 ICAA 独立虚拟环境；该环境复用系统已有 torch/torchvision，并在自身目录安装 timm 1.0.22、einops 0.8.1。没有全局 pip 安装，没有修改 AI-PP3 / 颜色检测代码，没有改写输入照片或 PP3。
