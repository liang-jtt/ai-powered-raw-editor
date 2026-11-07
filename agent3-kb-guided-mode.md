# Agent 3 任务：新增知识增强修图 Mode

## 任务目标

在现有 AI-PP3 程序中新增一个可通过 `--preset` 调用的知识增强模式。建议名称为 `kb-guided`。

本任务是“小范围 Prompt 扩展”，不是重写程序，也不是搭建完整 RAG 或多 Agent 系统。

目标调用方式：

```bash
ai-pp3 input.dng --preset kb-guided
```

## 工作目录

主要代码目录：

```text
C:\Users\29435\AntigravityProjects\ai-edit-photos\art-main
```

知识资料目录：

```text
C:\Users\29435\AntigravityProjects\ai-edit-photos\knowledge-base
```

## 开始前检查

1. 先查看当前 Git 状态：

   ```bash
   git status --short
   ```

2. 阅读以下文件，理解现有实现，不要凭猜测改动：

   - `art-main/src/prompts.ts`
   - `art-main/src/bin.ts`
   - `art-main/src/agent.ts`
   - `art-main/src/ai-generation/ai-processor.ts`
   - `art-main/src/__tests__/bin.test.ts`

3. 阅读知识库验收结果，只提取已经标记为可用或已验证的规则：

   - `knowledge-base/validation/validation-report.md`
   - `knowledge-base/next-round/validation-report.md`

## 必须完成的修改

### 1. 新增 Prompt 模板

在 `art-main/src/prompts.ts` 中新增独立模板，例如：

```ts
const KB_GUIDED_PROMPT_TEMPLATE = `...`;
```

模板必须要求模型按照以下顺序工作：

1. 诊断图像问题。
2. 判断哪些问题确实存在。
3. 选择适用规则。
4. 规划参数修改。
5. 执行修改。
6. 检查结果和副作用。

模板至少应包含以下约束：

- 没有明确问题时保持原参数。
- 先检查曝光、高光和阴影，再处理色彩和细节。
- 主体暗而背景正常时，不要直接提高全局曝光。
- 高 ISO 时先检查彩色噪声，再评估亮度噪声。
- 降噪后再锐化，并检查纹理、毛发、树叶和织物是否被抹除。
- 局部问题不能假装用全局参数解决。
- 不确定的 PP3 字段、范围或模块不要修改。
- 不得假装创建未验证的 Locallab、RT-spot 或局部蒙版。

输出格式必须要求包含：

```text
DIAGNOSIS
RULES_USED
PLAN
NOT_APPLIED
EXECUTION
QA_CHECKS
FINAL_STATUS
```

### 2. 接入 preset 映射

把 `kb-guided` 加入现有 preset 选择逻辑，使以下调用有效：

```ts
getPromptByPreset("kb-guided", ...)
```

必须保留并确保原有模式行为不变：

- `aggressive`
- `creative`
- `balanced`
- `technical`

未知 preset 的原有回退行为也不得改变，除非测试证明当前行为本身会阻止新模式运行。

### 3. 更新 CLI 帮助文本和文档

在 `art-main/src/bin.ts` 的 preset 帮助文本中加入 `kb-guided`。

在 `art-main/README.md` 中增加一条最小使用示例，不要大篇幅重写 README。

## 明确禁止的改动

本任务不得做以下事情：

- 不得删除或覆盖原有四个 Prompt 模板。
- 不得把整个知识库全文拼接到 Prompt 中。
- 不得新增 RAG、向量数据库、训练流程或多 Agent 编排。
- 不得修改 PP3 解析器、参数替换器或 RawTherapee CLI 执行流程。
- 不得新增未经验证的 PP3 字段、参数名或数值范围。
- 不得声称该模式必然提升画质。
- 不得顺手重构无关代码或统一格式化整个项目。
- 不得修改用户已有但与本任务无关的工作区变更。

## 知识规则的使用要求

只选择少量、可解释、与当前 RawTherapee 全局参数直接对应的规则。建议首版不超过 20 条。

每条规则应满足：

- 能说明适用条件。
- 能说明不适用或风险。
- 能映射到当前已存在的参数。
- 不依赖未验证的局部蒙版能力。

如果资料中字段名、范围或版本存在疑问，保留为提示词中的“不要修改/需要验证”约束，不得自行猜测。

## 测试要求

至少完成以下检查：

1. 运行项目现有测试。
2. 增加或补充测试，验证 `kb-guided` 能返回新模板。
3. 验证 CLI 帮助文本包含 `kb-guided`。
4. 验证原有 preset 相关测试仍然通过。
5. 如果环境允许，使用 RawTherapee 5.13 对一个已有 PP3 做最小执行验证；若无法执行，必须记录原因。

建议命令（按项目实际脚本调整）：

```bash
npm test
npm run build
```

## 交付物

完成后必须提供：

1. 修改文件列表。
2. 每个文件的修改目的。
3. 测试命令及结果。
4. 新模式的实际调用示例。
5. 未完成项、假设和需要后续人工验证的内容。
6. `git diff --stat` 和关键 `git diff` 摘要。

## 完成判定

只有同时满足以下条件，任务才算完成：

- `--preset kb-guided` 可以被识别并进入新模板。
- 原有模式仍可用。
- 新模板包含诊断、规则、执行和 QA 约束。
- 没有引入未经验证的局部蒙版或 PP3 字段。
- 测试结果已明确记录。
- 改动范围保持在本任务目标内。

如果发现现有代码结构无法安全加入新模式，不要扩大改造范围；停止并报告具体阻塞点、相关文件和建议的最小后续改动。
