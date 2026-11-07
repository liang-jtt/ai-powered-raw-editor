import { expect, it } from "vitest";
import { createOutputPaths } from "../output-naming.js";
import { DEFAULT_VISION_MODEL } from "../constants.js";

it("names outputs with preset, model and explicit Shanghai timestamp", () => {
  const result = createOutputPaths(
    "photo.ARW",
    { preset: "creative" },
    "jpeg",
    new Date("2026-11-05T17:10:20.123Z"),
  );
  expect(DEFAULT_VISION_MODEL).toBe("gpt-6.1-sol");
  expect(result.imagePath).toBe(
    "photo_creative_gpt-6.1-sol_20261106-011020-123.jpg",
  );
  expect(result.pp3Path).toBe(
    "photo_creative_gpt-6.1-sol_20261106-011020-123.pp3",
  );
});

it("keeps an explicit image output separate from the PP3", () => {
  const result = createOutputPaths(
    "photo.ARW",
    { output: "chosen.jpg" },
    "jpeg",
  );
  expect(result.imagePath).toBe("chosen.jpg");
  expect(result.pp3Path).toBe("chosen.pp3");
});

it("keeps an explicit PP3 output separate from the rendered image", () => {
  const result = createOutputPaths(
    "photo.ARW",
    { output: "chosen.pp3" },
    "jpeg",
  );
  expect(result.pp3Path).toBe("chosen.pp3");
  expect(result.imagePath).toBe("chosen.jpg");
});
