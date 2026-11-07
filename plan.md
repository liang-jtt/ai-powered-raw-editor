# AI 修图知识库最小实现计划

## 1. 目标

为 AI-PP3 提供一套最小但可验证的修图知识库，使它能够完成：

```
读取照片信息 → 判断主要问题 → 选择处理策略 → 生成 PP3 → 渲染预览 → 检查结果
```

MVP 的目标不是让系统成为“专家”，而是验证：

1. 结构化知识是否比单一提示词更有效。
2. 检索到的规则能否稳定转成 RawTherapee 参数。
3. 输出质量是否比 AI-PP3 当前版本更稳定。

## 2. MVP 范围

### 必须支持

- RAW 照片的基础曝光、白平衡、色彩、对比度、降噪和锐化。
- 全局调整，以及 AI-PP3 当前能够可靠表达的局部调整。
- 人像、风景、夜景、室内、逆光五类常见场景。
- 单张照片处理；批处理可以复用同一流程，但不是首要验收目标。
- 输出 JPG/TIFF、PP3、处理报告和运行日志。

### MVP 暂不支持

- 自动学习个人审美。
- 复杂皮肤精修、物体移除、合成和重构构图。
- 直接训练新的视觉模型。
- 覆盖所有相机、镜头和 ISO。
- 追求“专家”或“完全自动化”的产品承诺。

## 3. 知识库的最小组成

MVP 只需要四类内容和一套评测记录：

```
knowledge/
├── facts/          # 工具和基础理论事实
├── rules/          # 问题到处理动作的诊断规则
├── workflows/      # 按场景组织的最小 SOP
├── cases/          # 带参数和结果的真实案例
└── evaluations/    # 固定测试集和评分记录
```

### 3.1 工具事实（必须）

回答“参数是什么、能做什么、有什么限制”。每条事实至少记录：

```yaml
id: fact-001
topic: highlights
tool: RawTherapee
statement: "控制高光区域的亮度和细节恢复"
limitations: "不能代替局部蒙版解决主体与背景的独立曝光问题"
source: "来源链接或文档名称"
```

首版只收集实际会调用的模块：Exposure、White Balance、Tone、Color、Detail、Noise Reduction、Sharpening、Local Adjustments。

### 3.2 诊断规则（必须）

这是知识库的核心。每条规则至少包含：

```yaml
id: rule-001
scope:
  image_types: [outdoor_portrait]
problem: face_highlight_clipping
diagnosis: "脸部亮部细节不足，但整体曝光正常"
preconditions:
  - global_exposure_is_acceptable
preferred_actions:
  - tool: local_adjustment
    parameter: highlights
    direction: decrease
avoid_actions:
  - tool: global_exposure
    reason: "会同时压暗背景和主体"
exceptions:
  - "主体整体欠曝时先处理主体曝光"
quality_checks:
  - skin_texture_preserved
  - eyes_not_flattened
source: "来源案例或文档"
confidence: medium
```

首版建议完成 20–30 条高频规则，优先覆盖：

- 整体欠曝、过曝、局部高光溢出。
- 整体偏暖、偏冷、偏绿、偏红。
- 主体与背景曝光不平衡。
- 高 ISO 彩色噪声、亮度噪声。
- 细节不足、过度锐化和锐化光晕。
- 人像肤色过红、过灰。

### 3.3 场景 SOP（必须）

首版不需要为每个场景写长教程，只需定义处理顺序和停止条件：

```yaml
id: workflow-night
scene: night
steps:
  - inspect_exposure_and_clipping
  - correct_white_balance
  - recover_highlights
  - apply_moderate_denoise
  - apply_detail_preserving_sharpening
stop_conditions:
  - no_major_clipping
  - noise_reduced_without_plastic_texture
```

每个场景先有 1 个 SOP 即可。规则负责具体判断，SOP 负责避免步骤顺序混乱。

### 3.4 案例（必须）

首版准备 10–20 个高质量案例即可，不追求数量。每个案例至少保留：

```yaml
id: case-001
image_type: high_iso_portrait
metadata:
  camera: "可选"
  iso: 3200
problems: [high_iso_noise, cool_color_cast]
diagnosis: "暗部有明显亮度噪声，肤色偏冷"
actions:
  - "先校正白平衡"
  - "中等降噪，保护脸部和头发纹理"
pp3: "edited.pp3"
before: "before.jpg"
after: "after.jpg"
quality_checks:
  - "暗部噪声下降"
  - "皮肤没有塑料感"
  - "头发边缘没有明显伪影"
human_rating: 0
source: "来源和许可信息"
```

只有 Before/After 而没有诊断、PP3 或处理说明的图片，不计入高质量案例；可以作为普通参考资料保存。

### 3.5 评测记录（必须）

必须建立一个固定的小型测试集，用来比较：

```
当前 AI-PP3
vs.
加入知识库后的 AI-PP3
```

首版建议 20 张照片，每类场景至少 3 张，并记录：

- 曝光和高光是否改善。
- 白平衡和肤色是否自然。
- 降噪后是否保留纹理。
- 是否产生锐化光晕、色块或塑料感。
- 人工评分（1–5 分）。
- 失败原因。

没有评测集，就无法判断知识库是否真的带来改进。

## 4. 知识来源的最小策略

首版不需要大量爬取资料，按以下顺序获取：

1. RawTherapee 官方 RawPedia：参数含义、处理模块、降噪和局部调整限制。
2. RAW、色彩管理和摄影后期教材：基础原理。
3. 少量完整的专业案例：问题、判断、步骤和结果。
4. 自己对测试照片的选择和反馈：用于记录实际偏好。

短视频和博主内容只作为案例或经验来源。每条入库内容都要记录来源、日期和许可状态；不要把未经许可的完整课程或视频原文直接复制进公开项目。

## 5. 运行时流程

```
1. 读取 RAW、EXIF 和预览
2. 识别场景并生成初步问题列表
3. 按问题和场景检索 facts、rules、workflow、cases
4. 生成结构化编辑计划
5. 将计划映射为 AI-PP3/PP3 参数
6. 调用 RawTherapee 渲染预览
7. 根据 quality_checks 检查结果
8. 必要时只允许一轮有限修正
9. 输出 JPG/TIFF、PP3、报告、日志
```

编辑计划和最终报告必须说明：

- 使用了哪些规则。
- 修改了哪些参数。
- 哪些建议没有采用，以及原因。
- 哪些检查通过或失败。
- 是否发生了二次修正。

## 6. 实现边界

建议保持四个组件分离：

```
AI-PP3              生成分析和 PP3
知识库              提供事实、规则、SOP 和案例
编排脚本/Skill       负责检索、调用、重试和整理输出
RawTherapee          负责实际 RAW 渲染
```

知识库首版可以先使用 Markdown/YAML 文件和简单标签检索，不必立即引入向量数据库。只有当资料规模或检索质量明显成为瓶颈时，再加入 embeddings/RAG 服务。

## 7. 后续补充项

以下内容不属于 MVP 必需项：

- 相机型号/ISO 专用降噪配置。
- 更细的色彩科学和噪声模型。
- 100% 局部自动裁切和图像质量指标。
- 更多失败案例和 Negative Knowledge。
- 多候选方案的自动评分与选择。
- 个人风格案例库和 A/B 选择记录。
- 根据反馈自动更新规则权重。
- 向量检索、重排序和知识库管理界面。
- 多 Agent 分工。
- 批量任务队列、远程上传和结果回传。

## 8. 里程碑

### M0：定义范围

- 确定支持的照片类型和 RawTherapee 模块。
- 确定输出格式和质量检查项。
- 建立目录和 Schema。

### M1：规则库原型

- 完成 20–30 条诊断规则。
- 完成 5 个场景 SOP。
- 完成 10–20 个结构化案例。

### M2：接入 AI-PP3

- 让 AI-PP3 读取检索结果。
- 将编辑计划转换为 PP3 参数。
- 保留 PP3、预览和报告。

### M3：小规模评测

- 使用固定测试集运行原版和知识库版。
- 记录人工评分和失败原因。
- 修正最常见的规则、参数边界和检查项。

### M4：决定是否继续

满足以下条件后，再进入个人风格和专家级扩展：

- 知识库版在多数测试场景中不劣于原版。
- 至少一个场景有稳定、可重复的改善。
- 失败原因可以被定位，而不是只能归结为“模型审美不好”。
- 输出过程可重现，原图不会被覆盖。

## 9. MVP 完成标准

MVP 完成不以资料数量判断，而以以下结果判断：

```
给定同一张 RAW 和同一套规则，能够重复生成相近结果；
能够解释主要修改及其依据；
能够发现明显的曝光、色偏、降噪或锐化问题；
能够保留失败输出、PP3 和日志，支持人工复盘。
```

达到这些标准后，才值得继续建设个人风格知识库、相机/ISO 降噪知识和更复杂的自动迭代。

