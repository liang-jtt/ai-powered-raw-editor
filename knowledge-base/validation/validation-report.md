# 知识库资料验收报告

## 1. 验收范围

本次验收对象：

- Guidance 1：技术事实与诊断规则。
- Guidance 2：工作流案例与质量验收。
- 三份执行提示词：extract-guidance.md、guidance1.md、guidance2.md。

验收依据为两份 guidance 的数量要求、字段要求、来源记录要求和“不得把未经验证内容当作可执行 PP3”的约束。

## 2. 数量验收

| 产物 | 要求 | 实际 | 结论 |
|---|---:|---:|---|
| Guidance 1 facts | >= 5 | 10 | 通过 |
| Guidance 1 rules | >= 10 | 12 | 通过 |
| Guidance 1 workflows | >= 2 | 2 | 通过 |
| Guidance 1 cases | >= 2 | 2 | 通过，但均为 partial reproducibility |
| Guidance 1 unresolved | >= 5 | 6 | 通过 |
| Guidance 2 facts | >= 3 | 3 | 通过 |
| Guidance 2 rules | >= 10 | 10 | 通过 |
| Guidance 2 workflows | >= 3 | 3 | 通过 |
| Guidance 2 cases | >= 3 | 3 | 通过，但有 low-confidence case |
| Guidance 2 quality/negative knowledge | >= 5 | 5 | 通过 |
| Guidance 2 unresolved | >= 5 | 6 | 通过 |

数量门槛全部达到。

## 3. 质量结论

### 3.1 可以进入知识库的内容

- Guidance 1 的曝光、白平衡、噪声、锐化和 RT-spot 基础事实。
- Guidance 1 的常见曝光、白平衡、降噪和锐化诊断规则。
- Guidance 1 的两个最小 SOP。
- Guidance 2 的场景判断、质量检查和负面知识。
- 两组资料中的规则、SOP 和案例说明，作为检索参考。

### 3.2 只能作为参考、暂不能直接执行的内容

- 没有经过 RawTherapee 实测的 PP3 参数名、范围和版本行为。
- Guidance 1 的两个案例：来源说明了流程，但没有原始文件和完整 PP3。
- Guidance 2 的三个案例：主要来自 Adobe 文档或公开视频描述，没有可下载的原图、结果和逐步参数。
- Guidance 2 中关于 People/Sky/Subject mask 的内容：它描述的是 Lightroom 能力，不能直接当作 RawTherapee 蒙版实现。
- 两个公开视频来源目前是 YouTube 搜索结果页，不是具体视频或完整转录，不能作为高置信度证据。

## 4. 发现的问题

### P1：字段命名不统一

两组文件使用了不同字段：

- image_type 与 photo_type。
- statement、description 与 diagnosis。
- parameters、parameter_mapping 与 parameters_or_pp3。
- quality_checks 有字符串列表和 passed/failed 两种形式。

这不会阻止人工阅读，但会阻碍自动检索和后续程序处理。

### P1：部分记录缺少 source_id

Guidance 1 的 cases 和 workflows 没有逐条 source_id。Guidance 2 的 workflows 也没有逐条 source_id。

来源可以从批次报告推断，但不满足逐条可追溯要求。后续应补齐。

### P1：工具概念混用风险

Guidance 2 的规则和 SOP 大多以 Lightroom 的 Masking、Enhance 和 Remove 为依据。它们可以提供通用工作流启发，但必须在进入 RawTherapee 执行层前转换并验证。

### P2：案例可复现性不足

当前案例适合作为：

- 诊断语言样本。
- 工作流参考。
- 质量检查清单。

不适合作为：

- 精确参数模板。
- 自动 PP3 生成样例。
- 个人风格训练样本。

### P2：规则仍缺少实测闭环

许多规则的 confidence 较高，但尚未经过固定 RAW 测试集验证。confidence 表示来源可信度，不等于在 AI-PP3 中已经验证有效。

## 5. 归档后的使用分层

### Tier A：可直接用于提示和检索

- 工具事实。
- 处理顺序。
- 失败信号。
- 质量检查。
- “不要用全局参数解决局部问题”等通用判断。

### Tier B：需要参数和版本验证后使用

- PP3 字段名和数值范围。
- 降噪强度、Detail recovery、Median 等具体参数。
- RT-spot 的 Scope、Transition 和局部蒙版字段。
- 相机/ISO 相关阈值。

### Tier C：只作为概念参考

- Lightroom 的 People/Sky/Subject mask。
- Adobe Enhance 的工具顺序。
- 没有原图、PP3 或完整过程的公开视频案例。

## 6. 下一步必做事项

1. 统一所有 YAML 字段命名。
2. 为每条 fact、rule、workflow、case 补齐 source_id。
3. 用 20 张固定 RAW 测试 PP3 字段和规则。
4. 将 Lightroom 规则改写为工具无关的诊断规则，再单独增加 RawTherapee 映射。
5. 获取至少 3 个可下载 RAW + PP3 + before/after 的完整案例。
6. 为每条已验证规则记录测试结果和失败原因。

## 7. 总结

两组 Agent 的提取任务在数量和基本结构上通过验收。

当前资料可以支持 AI-PP3 的第一版知识增强，尤其适合：

- 提供诊断语言。
- 约束处理顺序。
- 提醒常见副作用。
- 生成质量检查项。

当前资料还不能直接宣称为完整的 RawTherapee 专家知识库，也不能直接保证生成可执行、可复现的高质量 PP3。归档时应保留上述 Tier 分层和待验证标记。

