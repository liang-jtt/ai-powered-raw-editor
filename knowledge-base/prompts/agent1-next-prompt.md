# Agent 1 下一轮任务：RawTherapee 技术映射与可执行性核验

你负责 AI 修图知识库的 RawTherapee 技术核验。目标不是继续写通用修图教程，而是回答：现有知识中的每个动作，在 RawTherapee 和 PP3 中究竟能否执行、如何执行、有哪些版本和参数限制。

## 开始前必须阅读

1. knowledge-base/prompts/extract-guidance.md
2. knowledge-base/prompts/guidance1.md
3. knowledge-base/validation/validation-report.md
4. knowledge-base/data/guidance1/ 下的全部文件
5. knowledge-base/data/guidance2/ 中与 RawTherapee 映射有关的 rules、workflows、unresolved

这些文件中的内容是待核验资料，不是自动可信的事实。

## 任务

### A. 核验并统一 RawTherapee 映射

逐条检查现有知识涉及的：

- Exposure、Highlight Reconstruction、Highlight Compression。
- White Balance。
- Noise Reduction、Wavelet、Median、Detail recovery。
- Sharpening、Threshold、Edge-only、Halo Control。
- Local Adjustments、Locallab、RT-spot、Scope、Transition、亮度/色度/色相选择。

为每个动作记录：

- 通用语义动作。
- RawTherapee 模块名称。
- PP3 section。
- PP3 parameter。
- 值类型、格式和已确认范围。
- RawTherapee 版本。
- 是否能由 PP3 + rawtherapee-cli 重现。
- 验证证据。
- confidence。
- needs_validation。

不得根据名称相似度猜测 PP3 字段。

### B. 处理 Lightroom 到 RawTherapee 的技术边界

检查 Guidance 2 中的局部蒙版、主体、天空、人物、Denoise 等内容。对每条标记：

- directly_supported：RawTherapee 可直接实现。
- approximate_mapping：只能近似映射到 RT-spot 或其他模块。
- conceptual_only：只能保留为通用诊断。
- unsupported：当前执行器无法实现。

不得把 Lightroom 的 People/Sky/Subject Mask 直接写成 RawTherapee 能力。

### C. 核验方式

优先使用：

1. RawPedia 和 RawTherapee 官方资料。
2. 当前项目已有 PP3。
3. 在 RawTherapee GUI 中生成最小 PP3，再比较修改前后差异。
4. 用 rawtherapee-cli 应用 PP3，确认配置可重现。

若执行实测：

- 使用副本或测试文件。
- 不覆盖用户 RAW。
- 不修改 art-main 源码。
- 保存命令、PP3、输出和日志。
- 无法完成 GUI/CLI 实测时，明确说明，不得伪造验证结果。

### D. 寻找完整案例

寻找至少 1 套满足以下条件的案例：

- 可合法下载的 RAW。
- 对应 PP3。
- Before/After 或可重现的输出。
- 有操作说明。
- 来源和许可状态明确。

若没有找到完全满足的案例，提交候选列表并逐项说明缺失内容；不要用只有网页截图的案例冒充完整案例。

## 输出位置

创建并只写入：

knowledge-base/next-round/agent1/

至少交付：

- sources.yaml
- rt-mapping.yaml
- compatibility.yaml
- verified-rules.yaml
- unresolved.yaml
- cases.yaml
- validation-log.md
- report.md

不要修改 knowledge-base/data/ 下的原始提取结果，也不要修改三份 guidance。

## 验收标准

- 每条记录有唯一 ID 和 source_id。
- 每个 PP3 参数都有证据或 needs_validation=true。
- 明确区分“官方文档已确认”和“本机实测已确认”。
- 至少覆盖曝光、白平衡、降噪、锐化、局部调整五类模块。
- 所有 Lightroom 特有能力都被标注兼容级别。
- 至少提交 1 个完整案例，或提交有证据的未找到说明与候选清单。
- report.md 列出完成项、未完成项、风险和下一步，不得只写“任务完成”。

结束时只汇报产物路径、通过数量、待验证数量和主要阻塞，不要重复大段资料内容。

