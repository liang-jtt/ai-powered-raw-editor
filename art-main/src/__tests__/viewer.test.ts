import { describe, expect, it } from "vitest";
import { collectViewerData, formatViewerForAI } from "../viewer/index.js";
import { getPromptByPreset } from "../prompts.js";

describe("viewer", () => {
  it("combines real backend shapes and retains raw and ten-point scores", async () => {
    const calls: unknown[] = [];
    const report = await collectViewerData(
      "photo.png",
      async (backend, request) => {
        calls.push({ backend, request });
        return backend === "color"
          ? { lab_mean: [50, -10, 20] }
          : { scores: [{ score: 0.57, overall_score: 0.42 }] };
      },
    );
    expect(report.color.ok).toBe(true);
    expect(report.aesthetics.data?.scores_10.color).toBeCloseTo(5.7);
    expect(report.aesthetics.data?.scores_10.overall).toBeCloseTo(4.2);
    expect(calls).toHaveLength(2);
    const text = formatViewerForAI(report);
    expect(text).toContain("lab_mean");
    expect(text).toContain("L*");
    expect(text).not.toMatch(
      /avoid.*warm|preserve neutral|decrease temperature/i,
    );
  });

  it("keeps successful color data when ICAA fails, without inventing scores", async () => {
    const report = await collectViewerData("photo.png", async (backend) => {
      if (backend === "icaa") throw new Error("missing checkpoint");
      return { pixel_count: 100 };
    });
    expect(report.color.ok).toBe(true);
    expect(report.aesthetics).toEqual({
      ok: false,
      error: "missing checkpoint",
    });
  });

  it("forwards future named rectangles while keeping ICAA whole-image", async () => {
    const requests: Record<string, unknown>[] = [];
    const region = { name: "wall", x: 1, y: 2, width: 3, height: 4 };
    const report = await collectViewerData(
      "photo.png",
      async (backend, request) => {
        requests.push(request);
        return backend === "icaa"
          ? { scores: [{ score: 0.5, overall_score: 0.5 }] }
          : {};
      },
      [region],
    );
    expect(report.regions[0].name).toBe("wall");
    expect(requests).toContainEqual({
      operation: "analyze",
      image_path: "photo.png",
      region: { x: 1, y: 2, width: 3, height: 4 },
    });
    expect(requests.find((r) => r.operation === "score")).not.toHaveProperty(
      "region",
    );
  });
});

it("uses a default task and output protocol without an existing style", () => {
  const prompt = getPromptByPreset(undefined, ["Exposure"]);
  expect(prompt).toContain("Compensation");
  expect(prompt).toContain("EXECUTION");
  expect(prompt).not.toMatch(
    /aggressiv|ARTISTIC MANDATE|KNOWLEDGE-GUIDED|preserve neutral|warm cast/i,
  );
});
