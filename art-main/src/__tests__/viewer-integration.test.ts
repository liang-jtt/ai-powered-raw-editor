import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../utils/image-processing.js", () => ({
  calculateHistogramFromBuffer: vi.fn(async () => ({})),
  analyzeHistogram: vi.fn(() => ({})),
  formatHistogramForLLM: vi.fn(
    () => "PROCESSING RECOMMENDATIONS: legacy histogram guidance",
  ),
}));
vi.mock("../viewer/index.js", () => ({
  analyzeViewer: vi.fn(async () => ({ image_path: "analysis.png" })),
  formatViewerForAI: vi.fn(
    () => "VIEWER: lab_mean=[50,1,8]; scores_10.color=5.7",
  ),
}));
vi.mock("../file-operations/file-handlers.js", () => ({
  readImageData: vi.fn(async () => Buffer.from("analysis-image")),
  readBasePP3Content: vi.fn(async () => "[Exposure]\nCompensation=0\n"),
  setupPreviewAndValidation: vi.fn(async () => ({
    previewCreated: true,
    finalBasePP3Path: "base.pp3",
  })),
  cleanupPreviewFiles: vi.fn(async () => {}),
}));
vi.mock("../utils/ai-provider.js", () => ({
  handleProviderSetup: vi.fn(() => ({})),
}));
vi.mock("ai", () => ({
  generateText: vi.fn(async () => ({
    text: "EXECUTION:\n```\n[Exposure]\nCompensation=0.3\n```",
  })),
}));
vi.mock("node:fs", () => ({
  default: { promises: { writeFile: vi.fn(async () => {}) } },
}));
import { processAIGeneration } from "../ai-generation/ai-processor.js";
import {
  readImageData,
  readBasePP3Content,
} from "../file-operations/file-handlers.js";
import { generateText } from "ai";
import { generatePP3FromRawImage } from "../agent.js";

describe("pre-edit viewer integration", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    "default",
    "clear",
    "creative",
    "balanced",
    "technical",
    "aggressive",
    "kb-guided",
  ])(
    "sends matching viewer data without histogram adjustment instructions in %s mode",
    async (preset) => {
      const result = await processAIGeneration({
        previewPath: "baseline.png",
        basePP3Path: "base.pp3",
        sections: ["Exposure"],
        providerName: "openai-compatible",
        visionModel: "test",
        prompt: undefined,
        preset,
        maxRetries: 0,
        verbose: false,
      });
      expect(result).toContain("Compensation=0.3");
      expect(readImageData).toHaveBeenCalledWith("analysis.png", false);
      expect(generateText).toHaveBeenCalledTimes(1);
      const request = vi.mocked(generateText).mock.calls[0][0];
      const text = JSON.stringify(request.messages);
      expect(text).toContain("scores_10.color=5.7");
      expect(text).not.toContain("PROCESSING RECOMMENDATIONS");
      if (["default", "clear"].includes(preset))
        expect(text).not.toMatch(/preserve neutral|aggressiv|avoid.*warm/i);
      if (preset === "clear") expect(text).toContain("两到三个视觉关系");
    },
  );

  it("sends the luminance section by default and applies its curve through the existing PP3 parser", async () => {
    vi.mocked(readBasePP3Content).mockResolvedValueOnce(
      "[Exposure]\nCompensation=0\n[Luminance Curve]\nEnabled=false\nBrightness=0\nContrast=0\nLCurve=0;\nChromaticity=0\n[White Balance]\nSetting=Camera\n",
    );
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "EXECUTION:\n```ini\n[Luminance Curve]\nEnabled=true\nLCurve=1;0;0;0.25;0.20;0.75;0.80;1;1;\n```",
    } as Awaited<ReturnType<typeof generateText>>);
    const result = await generatePP3FromRawImage({
      inputPath: "input.ARW",
      visionModel: "test",
      preset: "clear",
    });
    const request = vi.mocked(generateText).mock.calls[0][0];
    expect(JSON.stringify(request.messages)).toContain("[Luminance Curve]");
    expect(JSON.stringify(request.messages)).toContain("LCurve=0;");
    expect(result).toContain("LCurve=1;0;0;0.25;0.20;0.75;0.80;1;1;");
    expect(result).toContain("Enabled=true");
    expect(result).toContain("Setting=Camera");
  });
});
