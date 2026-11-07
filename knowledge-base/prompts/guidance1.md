# Knowledge Extraction Guidance 1：技术事实与诊断规则

## 任务目标

负责提取 RawTherapee/RAW 后期的技术基础和通用诊断规则，交付可供 AI-PP3 检索的结构化内容。不要写长篇教程，不要只复述资料。

## 不负责的内容

- 不负责个人审美风格。
- 不负责大量 Before/After 案例。
- 不负责复杂人物精修、物体移除或合成。
- 不负责把没有证据的数值写进 PP3。
- 不与 guidance2 重复提取同一来源或同一规则。

## 资料范围

优先处理以下来源：

1. RawTherapee 官方 RawPedia、参数说明、局部调整和降噪文档。
2. RAW、曝光、白平衡、色彩管理和降噪理论资料。
3. RawTherapee 官方示例 PP3 或官方案例说明。

每份资料先记录 source_id、标题、作者/机构、URL、日期、许可状态和覆盖范围。无法确认的字段写 unknown。

## 必须交付的数量

本批至少交付：

- 5 条工具/理论 facts。
- 10 条诊断 rules。
- 2 个场景 workflows。
- 2 个结构化 cases；案例可以来自官方示例，但必须有足够上下文。
- 至少 5 条 unresolved 或 needs_validation 记录，除非确实没有待验证内容，并说明原因。

不得用一条长摘要冒充多条知识。

## Facts 要求

每条 fact 必须包含：

- id、knowledge_kind=fact、source_id。
- tool、module、topic。
- 用自己的话描述参数或算法行为。
- 已确认的参数名、范围或单位；不能确认则写 unknown。
- limitations 或副作用。
- verification 方法。
- confidence。

优先提取：

- Exposure、White Balance、Tone、Color。
- Noise Reduction、Wavelet、Sharpening。
- Local Adjustments、RT-spot、亮度/色度/色相选择和过渡。

不要把 Lightroom 的工具名称直接当成 RawTherapee 的实现。

## Rules 要求

每条 rule 必须包含：

- 适用照片类型。
- 可观察现象。
- diagnosis 和判断依据。
- preconditions。
- preferred_actions。
- avoid_actions 和原因。
- exceptions。
- quality_checks。
- source_id、confidence、needs_validation。

优先覆盖：

- 整体欠曝、过曝、局部高光溢出。
- 整体偏暖、偏冷、偏绿、偏红。
- 主体与背景曝光不平衡。
- 高 ISO 亮度噪声和彩色噪声。
- 细节不足、过度锐化、锐化光晕。
- 过度提升阴影导致的灰雾。
- 降噪导致的纹理损失。

如果资料没有说明适用条件、例外或检查方法，必须填 unknown 或 needs_validation=true。

## Workflows 要求

只交付两个最小 SOP：

- 一个曝光/色彩类场景。
- 一个高 ISO/降噪类场景。

每个 SOP 只写处理顺序、每步原因、停止条件和失败信号，不要伪造万能参数。

## Cases 要求

每个案例至少包含：

- image_type、input metadata、problems、diagnosis。
- 有顺序的 actions。
- before/after 或原始结果说明。
- PP3/参数路径；没有则写 unknown。
- quality_checks、reproducibility、confidence。

没有真实参数或过程时，不得声称案例可复现。

## 固定交付格式

提交以下文件：

- extracted/guidance1-sources.yaml
- extracted/guidance1-facts.yaml
- extracted/guidance1-rules.yaml
- extracted/guidance1-workflows.yaml
- extracted/guidance1-cases.yaml
- extracted/guidance1-unresolved.yaml
- extracted/guidance1-report.md

报告必须统计资料数、facts/rules/workflows/cases 数、待验证数、冲突数和仍需实测的 PP3 字段。

## 防偷懒验收

- [ ] facts 至少 5 条，且不是同一事实换写。
- [ ] rules 至少 10 条，且每条有适用条件和 quality_checks。
- [ ] 至少 2 个 workflow 和 2 个 case。
- [ ] 每条记录有 source_id 和 confidence。
- [ ] 没有把文章摘要当成规则。
- [ ] 没有凭空补参数名或数值。
- [ ] 报告列出未完成项，而不是只写“已完成”。

