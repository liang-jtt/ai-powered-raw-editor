import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("../utils/ai-provider.js", () => ({
  handleProviderSetup: vi.fn(() => ({})),
}));
vi.mock("../viewer/index.js", () => ({
  analyzeViewer: vi.fn(async (image_path: string) => ({ image_path })),
  formatViewerForAI: vi.fn(() => "VIEWER MEASUREMENTS"),
}));
import { generateText } from "ai";
import {
  applyAIResponse,
  processAIGeneration,
} from "../ai-generation/ai-processor.js";
const base =
  "[Version]\nAppVersion=5.13\nVersion=353\n[Exposure]\nCompensation=0\n[Locallab]\nEnabled=false\nSelspot=0\n[Other]\nKeep=yes\n";
const response =
  "EXECUTION:\n```ini\n[Locallab]\nName_0=Window\nCenterX_0=-400\nCenterY_0=100\nLoc_0=300;300;450;450;\nExpcomp_0=0.3\nChroma_0=10\n[Exposure]\nCompensation=0.1\n```";
let dir: string;
beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "aipp3-local-test-"));
  await sharp({
    create: { width: 16, height: 12, channels: 3, background: "#808080" },
  })
    .png()
    .toFile(path.join(dir, "preview.png"));
  await fs.writeFile(path.join(dir, "base.pp3"), base);
});
afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});
beforeEach(() => vi.clearAllMocks());
function options(sections = ["Exposure", "Locallab"]) {
  return {
    previewPath: path.join(dir, "preview.png"),
    basePP3Path: path.join(dir, "base.pp3"),
    sections,
    providerName: "mock",
    visionModel: "mock",
    prompt: undefined,
    preset: "clear",
    maxRetries: 0,
    verbose: false,
  };
}
describe("production local AI integration without remote API", () => {
  it("sends the reference and creates/updates spots through the actual response path", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({ text: response } as Awaited<
      ReturnType<typeof generateText>
    >);
    const result = await processAIGeneration(options());
    const text = JSON.stringify(
      vi.mocked(generateText).mock.calls[0][0].messages,
    );
    expect(text).toContain("CenterX_i");
    expect(text).toContain("Next new spot index: 0");
    expect(result).toContain("Name_0=Window");
    expect(result).toContain("Expexpose_0=true");
    expect(result).toContain("Expcolor_0=true");
    expect(result).toContain("Compensation=0.1");
    expect(result).toContain("Keep=yes");
    const second = applyAIResponse(result, "[Locallab]\nExpcomp_0=-0.2", [
      "Locallab",
    ]);
    expect(second).toContain("Expcomp_0=-0.2");
    expect(second.match(/Name_0=/g)).toHaveLength(1);
  });
  it("does not advertise local creation when sections excludes it and rejects bypass", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({ text: response } as Awaited<
      ReturnType<typeof generateText>
    >);
    await expect(processAIGeneration(options(["Exposure"]))).rejects.toThrow(
      /Locallab.*excluded/,
    );
    const text = JSON.stringify(
      vi.mocked(generateText).mock.calls[0][0].messages,
    );
    expect(text).not.toContain("CenterX_i");
    expect(text).not.toContain("Next new spot");
  });
  it("keeps legacy global replacements working without opening local writes", () => {
    const result = applyAIResponse(
      base,
      "<<<<<<< SEARCH\n[Exposure]\nCompensation=0\n=======\n[Exposure]\nCompensation=0.2\n>>>>>>> REPLACE",
      ["Exposure"],
    );
    expect(result).toContain("Compensation=0.2");
    expect(result).toContain("Enabled=false");
    expect(() =>
      applyAIResponse(
        base,
        "<<<<<<< SEARCH\n[Locallab]\nEnabled=false\n=======\n[Locallab]\nEnabled=true\n>>>>>>> REPLACE",
        ["Exposure"],
      ),
    ).toThrow(/Locallab/);
  });
  it("rejects geometry changes made with a local request even when geometry is an existing global field", () => {
    expect(() =>
      applyAIResponse(
        base + "[Crop]\nEnabled=false\n",
        response.replace("[Locallab]", "[Crop]\nEnabled=true\n[Locallab]"),
        ["Crop", "Locallab"],
      ),
    ).toThrow(/geometry/);
  });
  it("requires only supported fields even when the model supplies a whole native profile", () => {
    expect(() =>
      applyAIResponse(
        base,
        response.replace("Chroma_0=10", "UnknownNative_0=4"),
        ["Locallab"],
      ),
    ).toThrow(/unsupported field/);
  });
  it("gives an explicit failure for invalid local fields in EXECUTION", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: response.replace("Expcomp_0=0.3", "Expcomp_0=NaN"),
    } as Awaited<ReturnType<typeof generateText>>);
    await expect(processAIGeneration(options())).rejects.toThrow(/Locallab/);
    expect(await fs.readFile(path.join(dir, "base.pp3"), "utf8")).toBe(base);
  });
});

it("does not let header-free legacy replacements mutate local values", () => {
  const content = applyAIResponse(base, response, ["Locallab"]);
  expect(() =>
    applyAIResponse(
      content,
      "<<<<<<< SEARCH\nExpcomp_0=0.3\n=======\nExpcomp_0=999\n>>>>>>> REPLACE",
      ["Exposure", "Locallab"],
    ),
  ).toThrow(/Locallab/);
});

it("allows global-only editing on a cropped baseline even when local capability is selected", () => {
  const content = base + "[Crop]\nEnabled=true\n";
  expect(
    applyAIResponse(content, "[Exposure]\nCompensation=0.4", [
      "Exposure",
      "Locallab",
    ]),
  ).toContain("Compensation=0.4");
});
