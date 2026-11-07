# AI 修图知识提取执行指南

## 1. 任务目标

把官方文档、教材摘要、专业案例和个人反馈，提取为 AI-PP3/RawTherapee 可检索、可验证的知识。每条知识应尽量回答：看到什么问题、如何判断、为什么这样判断、应该采取什么动作、映射到什么工具或参数、如何检查结果、什么情况下不要这样做。

目标是提取可执行决策，不是写文章摘要。

## 2. 当前任务边界

必须覆盖：RAW 基础曝光；白平衡和常见色偏；高光、阴影和对比度；基础色彩调整；高 ISO 降噪；锐化和细节保留；RawTherapee 局部调整的能力和限制；人像、风景、夜景、室内、逆光五类场景。

暂不扩展：复杂皮肤精修、物体移除、合成；个人风格自动学习；训练新视觉模型；没有证据时推断具体 PP3 数值；仅凭 Before/After 猜测完整处理步骤；“适用于所有照片”的万能参数。

## 3. 资料分类

先给每份资料标记类型：

- official-doc：RawTherapee 官方文档、RawPedia、参数说明。
- theory：摄影、RAW、色彩管理和降噪理论。
- expert-workflow：专业摄影师或后期师的完整工作流。
- case：有原图、过程、参数或结果的具体案例。
- personal-feedback：用户对候选结果的选择和反馈。
- short-tip：短视频或零散技巧。

资料类型影响置信度，但不能代替事实验证。

## 4. 固定处理步骤

### Step 1：记录来源

每份资料先建立来源记录：

- source_id：唯一 ID。
- title：标题。
- author：作者或机构。
- url：原始链接。
- source_type：资料类型。
- published_at：发布日期或 unknown。
- accessed_at：访问日期。
- license：许可证或 unknown。
- scope：覆盖的工具和场景。

无法确认的字段填 unknown，不要猜。

### Step 2：判断是否值得提取

满足以下任一项才进入核心知识：

- 解释了 RawTherapee 参数或算法。
- 描述了可重复的判断流程。
- 说明问题、原因和处理动作之间的关系。
- 给出有上下文的参数变化和结果。
- 给出失败条件、例外或质量检查。
- 来自用户对真实输出的明确反馈。

以下内容只能作为低置信度参考：

- 没有上下文的“数值拉到某处就好看”。
- 只展示最终图的 Before/After。
- 没有说明适用范围的绝对化建议。
- 只有个人偏好、没有场景说明的观点。

### Step 3：拆成最小知识单元

一条记录只表达一个主要判断。长文应拆成：工具事实、诊断规则、SOP 步骤、完整案例、负面知识、质量检查。所有拆分记录都保留同一个 source_id。

### Step 4：标记知识性质

knowledge_kind 只能取以下值：

- fact：可验证的工具或算法行为。
- heuristic：有适用条件的经验规则。
- workflow：推荐的处理顺序。
- preference：作者或用户的审美偏好。
- case：带上下文的具体实例。

不能把 preference 改写成 fact。

## 5. 诊断规则字段

每条规则必须包含：

- id、knowledge_kind、source_id。
- scope：照片类型和工具。
- problem：问题标签和可观察现象。
- diagnosis：判断及置信度。
- preconditions：适用前提。
- preferred_actions：首选动作和语义参数映射。
- avoid_actions：不建议动作及原因。
- exceptions：例外。
- quality_checks：结果检查项。
- needs_validation：是否需要实测。

规则必须尽量回答：适用于什么照片、观察到什么、为什么这样判断、首选动作、不建议做什么、例外是什么、如何检查、哪些字段仍需实测。

## 6. 工具事实字段

每条事实必须包含：

- id、knowledge_kind=fact、source_id。
- tool、module、topic。
- statement：用自己的话准确描述行为。
- parameter：已确认的参数名、范围和单位；无法确认填 unknown。
- limitations：副作用和不适用情况。
- verification：文档、GUI 对照、PP3 实测或 unknown。
- confidence。

不要凭经验填写 PP3 字段名、范围或单位。

## 7. 场景 SOP 字段

每个 SOP 至少包含：

- id、knowledge_kind=workflow、source_id、scene。
- goal：目标。
- steps：有 order、action、reason 的步骤列表。
- stop_conditions：停止条件。
- failure_signals：失败信号。
- needs_validation。

SOP 规定顺序和停止条件；参数数值只有在证据可靠时才写入。

## 8. 案例字段

每个案例至少包含：

- id、knowledge_kind=case、source_id、image_type。
- input：文件、相机、ISO、光线等信息；未知填 unknown。
- problems：问题列表。
- diagnosis：诊断。
- actions：有顺序的操作、参数或 PP3 路径。
- result：before、after、变化描述。
- quality_checks：通过和失败项目。
- human_feedback。
- reproducibility：verified、partial 或 unknown。
- confidence。

没有真实参数、过程或反馈时，不得声称案例可复现。

## 9. 蒙版和局部调整

遇到局部调整，必须记录：

- 目标区域：人物、脸部、天空、背景、亮部或某种颜色。
- 识别方式：位置、颜色、亮度、ΔE、人工选择或 unknown。
- 使用工具：RT-spot、Local Adjustments 或其他。
- 是否有排除区域和过渡。
- 是否可由 PP3/CLI 重现。
- 是否只是 GUI 操作描述。

若只有“给人物加蒙版”而没有 RawTherapee 对应字段，标记 execution_status=conceptual_only 和 needs_implementation=true，不得写成可执行 PP3 规则。

## 10. 冲突和不确定性

不同来源冲突、工具不同、版本不同或缺少参数时，不要自行裁决。记录：

- conflict.status=unresolved。
- conflict.sources。
- conflict.summary。
- conflict.resolution_needed=true。

可以保留多条带不同 scope 或 preference 的规则。

## 11. 每批交付物

交付目录：

- extracted/sources.yaml
- extracted/facts.yaml
- extracted/rules.yaml
- extracted/workflows.yaml
- extracted/cases.yaml
- extracted/unresolved.yaml
- extracted/extraction-report.md

报告必须包含：处理资料数量；各类知识数量；needs_validation 数量；只有概念、没有可执行参数的条目数量；个人偏好条目数量；来源冲突数量；仍需 RawTherapee 实测的参数；无法支持当前 AI-PP3 的知识；下一批优先验证项目。

## 12. 质量验收清单

- [ ] 每条记录有唯一 ID。
- [ ] 每条记录有 source_id。
- [ ] 事实、经验、流程、偏好和案例没有混为一谈。
- [ ] 规则包含适用条件和质量检查。
- [ ] 没有凭空补写 PP3 参数名或数值。
- [ ] 没有把 Lightroom 功能直接当成 RawTherapee 功能。
- [ ] 局部蒙版内容标记了是否真正可执行。
- [ ] 不确定内容标记了置信度或待验证状态。
- [ ] 个人偏好没有被写成普遍规律。
- [ ] 来源、日期和许可状态已记录。
- [ ] 报告列出了未解决问题。

## 13. 首批任务规模

第一次建议处理：

- 2–3 份 RawPedia 或官方文档。
- 2 份 RAW 或色彩理论资料。
- 3–5 个完整修图案例。
- 5 张固定测试照片的人工反馈。

首批目标：

- 10 条 facts。
- 20 条 rules。
- 5 个 workflows。
- 5 个 cases。
- 未解决或待验证项目不超过 10 个。

首批完成后，先让 AI-PP3 在固定测试集上运行并人工评测，再决定下一批补充什么。
