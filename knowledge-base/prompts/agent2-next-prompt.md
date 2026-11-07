# Agent 2 下一轮任务：通用诊断规则、案例与质量验收

你负责把现有 Lightroom/案例资料重写为工具无关的修图知识，并补充可复现案例和质量验收规则。目标不是研究 PP3 字段，而是回答：照片为什么需要某种处理、什么情况下适用、处理后怎样才算合格。

## 开始前必须阅读

1. knowledge-base/prompts/extract-guidance.md
2. knowledge-base/prompts/guidance2.md
3. knowledge-base/validation/validation-report.md
4. knowledge-base/data/guidance2/ 下的全部文件
5. knowledge-base/data/guidance1/ 中的 rules、workflows、unresolved

这些文件中的规则是待整理资料，不得默认全部正确。

## 任务

### A. 将 Lightroom 规则拆成两层

对 Guidance 2 中每条规则分别生成：

1. 工具无关诊断层：
   - scene/image_type。
   - observable_signs。
   - diagnosis。
   - preconditions。
   - preferred semantic action。
   - avoid action。
   - exceptions。
   - quality checks。
   - human confirmation conditions。

2. 工具实现备注：
   - 原资料中的 Lightroom 实现。
   - 是否依赖 People/Sky/Subject Mask、Enhance 或 Remove。
   - 是否需要 RawTherapee 技术映射。
   - execution_status=needs_mapping 或 conceptual_only。

不要自行填写 RawTherapee PP3 参数；这部分由 Agent 1 负责。

### B. 统一现有知识字段

将本轮重写内容统一使用：

- id
- knowledge_kind
- source_id
- scene
- image_type
- observable_signs
- diagnosis
- preconditions
- preferred_actions
- avoid_actions
- exceptions
- quality_checks
- human_confirmation
- confidence
- needs_validation
- implementation_notes

个人审美必须标记 preference；不得写成 fact。

### C. 补齐场景规则

重点补充和清理：

- 人像肤色偏红、偏绿、灰暗。
- 夜景降噪与灯光氛围。
- 逆光主体与背景曝光关系。
- 室内混合光。
- 风景主体和背景竞争。
- 过度降噪、过度锐化、风格过强。

每条规则必须包含可观察现象、例外和质量检查。没有这些字段的规则不得标记为 ready。

### D. 寻找完整案例

寻找至少 2 套不同场景的案例，优先：

1. 人像、逆光或室内混合光。
2. 夜景高 ISO 或风景。

完整案例要求：

- 可合法访问或下载的 RAW。
- 有处理参数、PP3，或足够完整的逐步操作记录。
- 有 Before/After 或可重现结果。
- 有来源和许可信息。
- 能说明 diagnosis、actions 和 quality checks。

只有公开视频标题、搜索结果页或最终截图的内容，不计入完整案例。若找不到，提交候选清单并列出缺失项。

### E. 建立人工验收模板

为后续 20 张 RAW 测试设计一份简洁评分模板，至少包括：

- 技术正确性。
- 曝光和高光。
- 白平衡与肤色。
- 噪声和纹理。
- 锐化与伪影。
- 主体表现。
- 是否需要大幅返工。
- A/B 选择。
- 用户自由反馈。

区分机器可检查项与必须由用户判断的审美项。

## 输出位置

创建并只写入：

knowledge-base/next-round/agent2/

至少交付：

- sources.yaml
- generic-rules.yaml
- workflows.yaml
- cases.yaml
- quality-checks.yaml
- human-review-template.md
- unresolved.yaml
- report.md

不要修改 knowledge-base/data/ 下的原始提取结果，也不要修改三份 guidance。

## 验收标准

- 所有 Lightroom 特有操作都已从通用诊断层分离。
- 每条规则有 source_id、适用条件、例外和质量检查。
- 不含未经验证的 RawTherapee PP3 参数。
- 至少覆盖人像、夜景、逆光/混合光、风景四类场景。
- 至少提交 2 个完整案例，或有证据的未找到说明和候选清单。
- 提交可直接用于 20 张 RAW 测试的人工评分模板。
- report.md 列出完成项、未完成项、低置信度内容和下一步，不得只写“任务完成”。

结束时只汇报产物路径、规则数量、完整案例数量、待验证数量和主要阻塞，不要重复大段资料内容。

