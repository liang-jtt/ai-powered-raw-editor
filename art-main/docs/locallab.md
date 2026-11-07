# Locallab V1：AI-PP3 接入说明

## 实现位置

| 文件 | 职责 |
| --- | --- |
| `src/constants.ts` | 默认开放 Locallab，显式 sections 仍决定是否开放 |
| `src/prompts.ts` | 登记允许字段、原生坐标、创建例外、生命周期和几何边界；保留各模式审美目标 |
| `src/pp3-parser.ts` | 继续解析 PP3 章节响应，局部重复键和空键明确报错 |
| `src/pp3-sections/local-adjustments.ts` | 集中维护默认值、字段白名单和范围；验证编号、几何，原子创建／追加／修改 |
| `src/pp3-sections/section-manipulation.ts` | 仅对 Locallab 委派受控新增，其他章节仍只替换原字段 |
| `src/ai-generation/ai-processor.ts` | 生产请求增加章节允许时的能力／下一编号／坐标上下文；响应走同一解析写回路径；导出 applyAIResponse 供离线验证 |
| `src/__tests__/local-adjustments*.test.ts` | 创建、保留、异常、权限、几何及 mock AI 请求到 PP3 的完整路径测试 |

未修改 RawTherapee 包装器、viewer 评分、模型、地址、凭据或修后流程。没有新增服务、依赖或专属功能目录。
必要的兼容路径改动：先识别旧 SEARCH/REPLACE 块，禁止其更改 Locallab（包括无章节头替换），避免绕过新校验；全局 legacy 替换继续可用。

## 实际 AI 输出协议

继续返回普通 PP3 章节，不使用 JSON。下面是没有现存 spot 时的合法输出：

```ini
[Locallab]
Name_0=Window light
CenterX_0=-400
CenterY_0=100
Loc_0=400;400;550;550;
Transit_0=50
Expcomp_0=0.3
Chroma_0=25
Sensiex_0=100
Sensi_0=100
```

程序会补齐 Shape=ELI、SpotMethod=norm、Activ/Isvisible=true、过渡默认值、工具零值和启用标记。给出 Expcomp 会默认启用 Expexpose；给出 Lightness/Contrast/Chroma 会默认启用 Expcolor；显式 false 优先。工具可在同一点同时使用。

默认值来自 5.13 的 LocallabSpot 构造函数；只集中写入本版支持的小组字段，其余值由匹配版本引擎初始化。原有未知字段保留、不可通过该接口新增或修改。GUI 的完整原生 PP3 中保留的额外掩膜或工具字段仍可能影响既有 spot。

## 生命周期与校验

- 新点必须提供 Name、CenterX、CenterY、Loc。第一个索引0，之后紧接当前点数；同一响应可以创建多个连续新索引，允许字段乱序。已有索引表示原位修改，不能用作新区域编号。
- 原点保留，追加不覆写旧点；不提供删除、重排或自动填补编号空洞。缺口、非规范编号、孤立字段、重复字段、无效类型／数值／枚举／列表均报 Locallab 错误。
- Selspot 只是 GUI 当前选择，不是渲染选择；引擎按 Name_0、Name_1…顺序读取所有点。保留原 Selspot，新建章节默认0，显式值须指向存在的点。
- 所有校验成功后才返回完整 PP3。失败不返回半成品，调用流程不会将无效结果写成候选或渲染。新字段稳定追加在原章节末尾，缺失章节追加在原章节顺序之后。
- 默认开放 Locallab；明确不含它的 sections 会省略创建参考和编号上下文，并拒绝直接局部响应。旧替换协议也不能绕过。其他章节没有获得任意字段新增权限。
- 不需要局部时可只输出原有全局调整，不初始化或启用局部章节；空局部块不创建章节。
- 5.13 对应 PP3 Version=353；带其他版本号的基底在尝试局部修改时明确拒绝。

## 坐标、范围与几何

使用**引擎原生坐标**，没有悄悄转换字段含义。中心 fraction = 0.5 + Center/2000：X向右、Y向下，左／上=-1000，中间0，右／下=1000。

Loc 四数顺序为 **右；左；下；上；**，是各方向半径，分别以图像宽／高的1/2000为单位，整数2..3000；超出边界的范围可以保留。该表示也允许四个方向不对称，和普通对称椭圆略有区别。

本接口的中心范围为整数-2000..2000，这是经过验证的适配器子集／扩展，不是 GUI 原生范围（GUI为-1000..1000）。画外中心要求椭圆真实与画面相交，且每个启用工具的 scope 必须100；中心外部没有可靠参考颜色，选择性 scope 不开放。测试验证了 CenterX=1200 的 broad-scope 可见边缘效果。

RT 正常管线在 Locallab 前完成相机方向／图像几何，之后才最终裁剪和缩放。viewer 的 rotate/等比缩小以 RT 渲染图为输入，不改变归一化位置。本次两张 RAW 输出 orientation=1，601×900→viewer 267×400 无额外旋转；同一风景 RAW 的1068×1600渲染也验证位置一致。

首版不转换裁剪坐标，不支持用户手动粗旋转／翻转、细旋转、变形、透视、镜头几何配置、framing或非单位几何缩放。遇到这些配置时请求标明不可用；若返回局部修改会明确报错。也检查同一响应中的几何改变。全局-only 响应不因此失败。没有声称所有裁剪／旋转都已支持。

## 字段含义与范围

| 字段 | 开放值／作用 |
| --- | --- |
| Enabled；Expexpose_i；Expcolor_i；Activ_i | true/false；章节、曝光、颜色亮度、spot 启用 |
| Isvisible_i | true/false，只控制 GUI 区域标记显示 |
| Shape_i；SpotMethod_i | ELI；norm，首版只编辑普通椭圆 |
| Transit_i | 2..100，内区全效比例；较低数值有更宽过渡，100为硬边 |
| Transitweak_i | 0.5..25，过渡衰减指数，默认1；增大使外圈效果更快减弱 |
| Transitgrad_i | -1..1，XY过渡差异，默认0 |
| Expcomp_i | -1.5..1.5，采用 GUI 开放范围；引擎内部更宽的兼容钳制不作为本接口范围 |
| Lightness_i；Contrast_i；Chroma_i | 整数-100..500；-100..100；-100..150 |
| Sensiex_i；Sensi_i | 整数0..100，各自工具的颜色相似性 scope，原生默认60／30；100为广泛作用 |

位置和过渡共享，曝光与颜色亮度有各自开关、调整值、scope。Scope 使用中心附近亮度、色度、色相参考，实际作用区未必填满几何椭圆；原生其他设置也可能进一步筛选。

Feather_i 是内部渐变滤镜的宽度，不是本版椭圆羽化字段，因此不开放。首版没有旋转、反选、复杂布尔运算、画笔、外部蒙版、自动识别或独立 Gradient。没有强制模型每张照片创建局部。

## 验证层次

1. 字段解析与写入：已验证，包括完整 mock AI 请求／响应，未发送照片到远端。
2. 合成图 CLI：带微纹理／明暗／颜色变化，验证正负曝光、移动、横纵大小、过渡、颜色、同点曝光＋颜色、多个点及重叠；检查椭圆外对照。
3. 真实 RAW：DSC02691.ARW、DSC08050.ARW；对照、曝光-only、颜色-only、同点共同作用均已渲染和查看；风景图另有不同输出分辨率对照。
4. 远端模型自主选择局部区域与参数：**未实测**，由用户后续运行。

纯平灰图的局部曝光曾产生异常压黑，因此未把它作为正常曝光证据。本次没有修改引擎来解决该异常；使用带纹理合成图及真实 RAW 验证。几何、scope 和新旧 spot 组合对所有照片的效果不能由有限样本保证。

验证材料：`test-output/locallab-20261107-171729/`。具体指标、命令、图像、PP3 与日志见该目录的 VALIDATION.md。

## 官方依据

- [RawPedia Local Adjustments](https://rawpedia.pixls.us/local_adjustments/)：过渡、scope、工具与处理限制。
- [5.13 参数序列化与默认值](https://github.com/RawTherapee/RawTherapee/blob/5.13/rtengine/params/locallab.cc)：构造函数、loadLocalLabParams 连续 Name_i 循环、各工具启用与参数。
- [5.13 源码目录](https://github.com/RawTherapee/RawTherapee/tree/5.13)：rtengine/iplocallab.cc 的 calcLocalParams/calcLocalFactor/calc_ref、simpleprocess.cc 的管线顺序；rtgui/controlspotpanel.cc 的坐标／过渡范围及 rtgui/tools/locallabtools.cc 的颜色与曝光范围。
