# 下一轮 Agent 产物验收报告

验收日期：2026-08-31

## 总体结论

- Agent 1：部分通过，需要定向返工后才能合并。
- Agent 2：有条件通过，修复来源引用后可以进入待验证知识层。
- 完整案例：两边均为 0，但都明确提交了候选和缺失项，符合“找不到时提交有证据说明”的替代要求。
- 当前不应开始正式知识库合并或 20 张 RAW 测试；先完成 Agent 1 的 CLI/PP3 实测和两处数据修复。

## Agent 1 验收

### 已完成

- 提交了要求的 8 个文件。
- 建立 13 条 RawTherapee 映射。
- 建立 12 条技术规则状态记录。
- 建立 11 条 Lightroom 兼容性分类。
- 覆盖曝光、白平衡、降噪、Wavelet、锐化和 Local Adjustments。
- 没有把自动 People/Sky/Subject Mask 误写为 RawTherapee 原生能力。
- 对未知 PP3 范围和 Locallab 字段保留 needs_validation。
- 没有修改原始知识库或 art-main 源码。
- 完整案例未找到时，提交了三个本地候选及缺失项。

### 必须返工

#### P0：遗漏已安装的 RawTherapee CLI

Agent 只运行了 PATH 查询，并据此报告 rawtherapee-cli 不可用。

实际位置：

C:\Program Files\RawTherapee\5.13\rawtherapee-cli.exe

验收时执行 --version 已成功返回：

RawTherapee, version 5.13, command line.

因此 CLI 并未缺失，只是没有加入 PATH。Agent 1 必须使用绝对路径，在复制的 RAW/PP3 上完成至少基础渲染验证，不能继续把它列为环境阻塞。

#### P0：unresolved.yaml 不是有效 YAML

使用 PyYAML 6.0.3 解析时，knowledge-base/next-round/agent1/unresolved.yaml 失败。原因是 flow mapping 中未加引号的 question 文本包含问号等符号。

其他 11 个 YAML 文件均可解析。

必须将 unresolved 条目改为普通块状 YAML 或给字符串完整加引号，并重新运行 YAML 解析。

#### P1：报告计数不一致

Agent 1 report.md 的 Completed 段写：

- approximate mappings = 6
- conceptual-only = 2

同一文件 Counts 表和 compatibility.yaml 实际为：

- approximate mappings = 7
- conceptual-only = 1

必须以 compatibility.yaml 实际数据为准修正报告。

#### P1：技术验证尚未完成

当前 mapping 只证明：

- 字段在 PP3 中出现。
- 官方文档描述了相关模块。

尚未证明：

- 字段可被 CLI 正确加载。
- 修改字段会产生预期像素变化。
- PP3 5.11/5.13 行为一致。
- Locallab RT-spot 可以被当前执行器创建。

因此 12 条 verified-rules 目前仍是“映射候选”，不能作为已验证可执行规则合并。

### Agent 1 验收状态

部分通过。必须完成：

1. 修复 invalid YAML。
2. 修正报告计数。
3. 使用已安装的 5.13 CLI 完成复制资产的基础渲染。
4. 更新 validation-log、cli_reproducible 和 unresolved。
5. 对 Locallab 若仍无法验证，保留未完成状态，不得猜测。

## Agent 2 验收

### 已完成

- 提交了要求的 8 个文件。
- 10 条工具无关诊断规则结构完整。
- 4 个场景 SOP，超过要求的 3 个。
- 6 条质量/负面知识，超过要求的 5 条。
- 提交了 20 张 RAW 人工评分模板。
- 正确拆分了通用诊断与 Lightroom 实现备注。
- 没有写入未经验证的 RawTherapee PP3 参数。
- 所有 Agent 2 YAML 均通过 PyYAML 6.0.3 语法解析。
- 对未找到完整案例的情况如实报告，没有用搜索结果页冒充完整案例。

### 必须修复

#### P1：存在悬空 source_id

cases.yaml 中 candidate2-ppa-exposure-wb-video 使用：

source_id: ppa_exposure_wb_video_2025

但 Agent 2 的 sources.yaml 没有该来源记录。

必须：

- 补充完整 source 记录，或
- 删除该候选，或
- 将其明确引用到旧批次全局来源并建立可解析的引用策略。

#### P1：规则尚未经过效果验证

10 条规则中，除风格偏好外均带 needs_validation=true。它们可以进入“待验证通用规则”，但不能标记为 ready 或 verified。

#### P2：部分规则仍高度依赖语义蒙版

人像、逆光、风景等规则虽然已写成工具无关语言，但执行仍依赖 needs_mapping/conceptual_only。必须等 Agent 1 的 RawTherapee 映射结果才能组合为可执行规则。

### Agent 2 验收状态

有条件通过。修复悬空 source_id 后，可以保留为：

- 通用诊断规则。
- 场景 SOP。
- 质量检查。
- 人工评审模板。

不可直接当作 RawTherapee 可执行知识。

## 完整案例验收

两个 Agent 均未找到满足全部条件的案例：

- 许可清晰且可下载的 RAW。
- 对应 PP3 或完整处理记录。
- 可核对 Before/After。
- 场景诊断和操作说明。

这不属于虚假完成，因为两个提示词允许在找不到时提交候选和缺失项。当前候选只能进入 cases/candidates，不能进入 cases/verified。

## 合并前置条件

满足以下条件后才能开始合并：

- [ ] Agent 1 unresolved.yaml 可解析。
- [ ] Agent 1 report.md 计数一致。
- [ ] Agent 1 使用绝对路径完成 RawTherapee 5.13 CLI 基础验证。
- [ ] Agent 1 更新至少一部分 mapping 的 cli_reproducible 状态。
- [ ] Agent 2 修复 ppa_exposure_wb_video_2025 来源引用。
- [ ] 合并时区分 candidate、needs_validation、verified 三个状态。
- [ ] 完整案例继续保持候选状态，不进入可执行基准集。

## 推荐下一步

不需要让 Agent 2 重做全部任务。只需修复 source_id。

Agent 1 需要一次定向返工，重点不是继续搜资料，而是利用本机已经安装的 RawTherapee 5.13：

1. 用绝对路径调用 CLI。
2. 在复制的 RAW 和 PP3 上渲染。
3. 保存命令、输出和日志。
4. 修复 YAML 和计数。
5. 更新映射验证状态。

完成后再进行最终合并和 20 张 RAW 测试。

