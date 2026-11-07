# Guidance 2 提取报告

本批资料数：5（3 个 Adobe 官方帮助页，2 个公开视频条目）。

| 类型 | 数量 |
|---|---:|
| facts/workflows facts | 3 |
| rules | 10 |
| workflows | 3 |
| cases | 3 |
| quality/negative knowledge | 5（规则 r2-004、005、006、008、010 及其质量检查） |
| needs_validation / unresolved | 6 |
| 已记录冲突 | 0 |

## 质量结论

核心可复用结论是：先建立全局基线，再用局部蒙版处理空间不均；对支持格式先 Denoise，再做 AI 蒙版/移除；配置文件只作为起点。所有规则都带场景、可观察征兆、避免动作和质量检查，未搬运 guidance1 的精确参数表。

## 未完成项

三个案例均含 diagnosis、actions、quality_checks，但公开页面没有完整 PP3、原图/结果下载或逐帧参数；case2-003 因此明确标成 low-confidence reference。下一批应补充可下载 RAW/PP3 的完整人像、夜景和混合光案例，并记录输出尺寸、显示设备和人工 A/B 反馈。
