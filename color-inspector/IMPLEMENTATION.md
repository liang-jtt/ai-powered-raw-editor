# 独立颜色检测模块：设计与实施

日期：2026-11-03。用户已确认：新增模块，通过接口提供数据，不影响原 AI-PP3 代码。

## 边界

全部文件位于 `color-inspector/`，不修改 `art-main/`，不安装到原项目，不调用模型或渲染器。使用 Python + scikit-image；通过 Python 函数和单次 JSON 标准输入/输出调用。暂不加入 HTTP 或 MCP 服务。

提供 `analyze_image(image_path, region=None)` 与 `compare_images(before_path, after_path, region=None)`。region 是像素矩形 `{x,y,width,height}`。支持 8 位 RGB PNG/JPEG，处理嵌入 ICC 配置；未标注时明确假设 sRGB。拒绝不支持的位深和透明图像，避免静默改变测量含义。比较要求相同尺寸；调用方保证几何对齐。

报告提供 Lab/HSV 统计、输出通道截断比例、区域 CIEDE2000 差异。输出均为测量，不推断肤色、中性区域、真实曝光或审美合格。CLI 成功为 `{ok:true,data:...}`，失败为 `{ok:false,error:...}` 且非零退出。stdout 只输出 JSON。

## 实施检查项

- [x] 先编写真实合成图片测试，确认缺少模块时失败。
- [x] 实现读取、颜色空间校验、区域校验和两个测量函数。
- [x] 实现 JSON CLI、依赖清单、Node 调用示例与中文说明。
- [x] 验证相同图、颜色偏移、区域裁剪、端点像素、错误请求、不支持格式、ICC、EXIF 方向与子进程输出。
- [x] 运行完整模块测试和实际图片调用，检查原项目文件未在本次任务中修改。

## 验证记录

14 项 unittest 通过，包含真实 Node → Python 子进程调用。Node 适配器语法检查通过。对 `art-main/examples/1/ai.jpg` 左上角 256×256 区域完成只读测量，返回 65,536 个像素的统计，ICC 来源为 embedded_icc。

原目录除 node_modules 外 191 个文件，在模块创建后均没有修改时间变化；所有补丁仅新增/修改本目录文件。原项目哈希基线写入临时目录后因沙箱跨调用临时目录隔离无法取回，故没有宣称完成前后哈希比对。未运行原项目构建或依赖安装，也没有改动原项目执行入口。
