import { describe, expect, it } from "vitest";
import {
  getPromptByPreset,
  getParameterRangesForSections,
  PROMPTS,
} from "../prompts.js";
import { DEFAULT_EDITABLE_SECTIONS } from "../constants.js";

describe("luminance editing and tonal guidance", () => {
  it("opens the existing Lab lightness section with activation and curve instructions", () => {
    expect(DEFAULT_EDITABLE_SECTIONS).toContain("Luminance Curve");
    const reference = getParameterRangesForSections(["Luminance Curve"]);
    expect(reference).toContain("Enabled");
    expect(reference).toContain("Brightness");
    expect(reference).toContain("Contrast");
    expect(reference).toContain("Chromaticity");
    expect(reference).toContain("LCurve");
    expect(reference).toContain("0;");
    expect(reference).toContain("x0;y0");
    expect(reference).not.toContain("[Exposure]");
  });

  it.each(Object.keys(PROMPTS))(
    "adds the approved tonal policy to built-in %s",
    (preset) => {
      const prompt = getPromptByPreset(preset, ["Exposure", "Luminance Curve"]);
      expect(prompt).toContain("不要强行大幅抬升高光或阴影");
      expect(prompt).toContain("先组织明度层次");
      expect(prompt).toContain("空气透视");
      expect(prompt).toContain("[Luminance Curve]");
      expect(prompt).not.toContain("%%PARAMETER_RANGES%%");
    },
  );
});

describe("clear preset", () => {
  it("combines the approved aesthetic goal and scene-dependent planning", () => {
    const prompt = getPromptByPreset("clear", ["Exposure"]);
    expect(PROMPTS.clear).toBeDefined();
    expect(prompt).toContain("以鲜明光感、清晰色彩关系和空间层次为目标");
    expect(prompt).toContain("最值得改变的两到三个视觉关系");
    expect(prompt).toContain("可以进行具有明确视觉变化的风格塑造");
    expect(prompt).toContain("光线均匀或以阴影为主");
    expect(prompt).toContain("对应到实际使用的参数");
    expect(prompt).toContain("Compensation");
    expect(prompt).not.toContain("%%PARAMETER_RANGES%%");
    expect(prompt).toContain("PLAN:");
    expect(prompt).toContain("EXECUTION:");
    expect(prompt).not.toMatch(/ARTISTIC MANDATE|GUARDRAILS|preserve neutral/i);
  });

  it("leaves default selection and custom prompt passthrough intact", () => {
    expect(getPromptByPreset()).toBe(getPromptByPreset("default"));
    expect(getPromptByPreset("My custom photo editing instructions")).toBe(
      "My custom photo editing instructions",
    );
  });
});

describe("kb-guided preset", () => {
  it("returns the knowledge-guided template with selected ranges", () => {
    const prompt = getPromptByPreset("kb-guided", ["Exposure"]);

    expect(prompt).toContain("[Exposure]");
    expect(prompt).not.toContain("%%PARAMETER_RANGES%%");
    expect(prompt).toContain("DIAGNOSIS");
    expect(prompt).toContain("RULES_USED");
    expect(prompt).toContain("PLAN");
    expect(prompt).toContain("NOT_APPLIED");
    expect(prompt).toContain("EXECUTION");
    expect(prompt).toContain("QA_CHECKS");
    expect(prompt).toContain("FINAL_STATUS");
    expect(PROMPTS["kb-guided"]).toContain("KNOWLEDGE-GUIDED WORKFLOW");
  });
});
