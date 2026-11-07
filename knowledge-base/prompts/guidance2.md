# Knowledge Extraction Guidance 2：工作流案例与质量验收

## 任务目标

负责提取专业修图工作流、真实案例、个人反馈和质量检查知识，交付可供 AI-PP3 检索的结构化内容。重点是“问题如何被处理并验证”，不是收集链接数量。

## 不负责的内容

- 不负责重复 guidance1 的 RawTherapee 基础参数事实。
- 不负责把个人风格写成普遍规律。
- 不负责复杂皮肤精修、物体移除或生成式合成。
- 不负责没有上下文的万能数值。
- 不与 guidance1 重复使用同一案例或同一来源片段。

## 资料范围

优先处理以下来源：

1. 3–5 个完整的专业修图案例或工作流。
2. 有原图、过程、参数、结果或明确解释的教程。
3. 用户对 AI-PP3 候选结果的 A/B 选择和文字反馈。
4. 少量官方资料中与质量检查、局部调整或降噪副作用相关的案例。

每份资料先记录 source_id、标题、作者/机构、URL、日期、许可状态和覆盖范围。无法确认的字段写 unknown。

## 必须交付的数量

本批至少交付：

- 3 条与工作流/质量判断相关的 facts。
- 10 条诊断或经验 rules。
- 3 个场景 workflows。
- 3 个结构化 cases。
- 至少 5 条 quality-check 或 negative-knowledge 记录。
- 至少 5 条 unresolved 或 needs_validation 记录，除非确实没有待验证内容，并说明原因。

不得用一篇文章的多个句子机械拆成多条记录。

## Facts 要求

本批 facts 只提取工作流事实，例如：

- 某类场景为什么要先处理曝光再处理肤色。
- 某类降噪为什么需要检查纹理和色彩。
- 某种局部调整为什么不能用全局参数替代。

每条必须包含：

- id、knowledge_kind=fact 或 workflow。
- source_id、statement、scope。
- limitations。
- verification 和 confidence。

工具参数的精确范围交给 guidance1，不要重复搬运。

## Rules 要求

每条 rule 必须包含：

- image_type 或 scene。
- problem 和 observable_signs。
- diagnosis 及依据。
- preferred_actions。
- avoid_actions、原因和例外。
- quality_checks。
- 是否涉及局部调整或蒙版。
- source_id、confidence、needs_validation。

优先覆盖：

- 人像肤色过红、过灰、偏绿。
- 夜景保留灯光氛围与降噪的取舍。
- 逆光主体和背景的曝光关系。
- 室内混合光的白平衡判断。
- 风景主体不突出、背景竞争。
- 过度降噪、过度锐化、风格过重。
- “看起来更亮”但细节和层次变差的情况。

如果资料只表达作者偏好，knowledge_kind 应为 preference 或 heuristic，并标明适用范围。

## Workflows 要求

必须完成三个最小 SOP：

- 人像：曝光/肤色/纹理检查。
- 夜景：灯光氛围/降噪/细节检查。
- 逆光或室内：主体与背景、混合光或局部处理判断。

每个 SOP 必须有：

- goal。
- 有 order、action、reason 的步骤。
- stop_conditions。
- failure_signals。
- 需要人工确认的条件。

## Cases 要求

必须完成三个案例，优先选择不同场景。每个案例至少包含：

- image_type、camera/ISO/lighting（未知填 unknown）。
- problems、diagnosis、actions。
- before/after 或可访问的结果说明。
- 参数或 PP3；没有则写 unknown。
- quality_checks 的 passed 和 failed。
- human_feedback。
- reproducibility、confidence、source_id。

只有 Before/After、没有过程或参数的素材只能标记为 low-confidence reference，不计入 3 个高质量案例。

## 额外的质量和负面知识

至少交付 5 条独立记录，说明：

- 什么情况下不要整体提高曝光。
- 什么情况下不要继续增强降噪。
- 什么情况下不要提高饱和度来补救灰暗。
- 什么情况下不要使用强锐化。
- 哪些结果必须退回人工检查。

每条记录必须有 when、avoid、reason、prefer 或 exception、quality_check。

## 固定交付格式

提交以下文件：

- extracted/guidance2-sources.yaml
- extracted/guidance2-facts.yaml
- extracted/guidance2-rules.yaml
- extracted/guidance2-workflows.yaml
- extracted/guidance2-cases.yaml
- extracted/guidance2-unresolved.yaml
- extracted/guidance2-report.md

报告必须统计资料数、facts/rules/workflows/cases 数、质量/负面知识数、待验证数、冲突数和建议的下一批资料。

## 防偷懒验收

- [ ] facts 至少 3 条，且内容属于工作流判断，不是复制 guidance1 参数表。
- [ ] rules 至少 10 条，覆盖至少 3 个场景。
- [ ] 至少 3 个 workflow 和 3 个高质量 case。
- [ ] 至少 5 条独立的负面知识或质量检查。
- [ ] 每个 case 都有 diagnosis、actions 和 quality_checks。
- [ ] 个人偏好已标记，未写成普遍事实。
- [ ] 每条记录有 source_id、confidence 和待验证状态。
- [ ] 报告列出未完成项，而不是只写“已完成”。

