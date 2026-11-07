import { describe, expect, it } from "vitest";
import { parseDirectSectionChanges } from "../pp3-parser.js";
import { applyDirectSectionChanges } from "../pp3-sections/section-manipulation.js";
import { DEFAULT_EDITABLE_SECTIONS } from "../constants.js";
import { getPromptByPreset, PROMPTS } from "../prompts.js";
const base =
  "[Version]\nAppVersion=5.13\nVersion=353\n[Exposure]\nCompensation=0\n[Other]\nMystery=keep\n";
const spot = (i = 0) =>
  `[Locallab]\nName_${i}=Region ${i}\nCenterX_${i}=-400\nCenterY_${i}=200\nLoc_${i}=400;400;300;300;\nExpcomp_${i}=0.4\nChroma_${i}=15\n`;
const apply = (content: string, response: string) =>
  applyDirectSectionChanges(
    content,
    parseDirectSectionChanges(response),
    false,
  );
describe("controlled Locallab PP3 writes", () => {
  it.each([base, base + "[Locallab]\nEnabled=false\nSelspot=0\n"])(
    "creates a complete first spot",
    (content) => {
      const result = apply(content, spot());
      expect(result).toContain("Name_0=Region 0");
      expect(result).toContain("Shape_0=ELI");
      expect(result).toContain("Enabled=true");
      expect(result).toContain("Expexpose_0=true");
      expect(result).toContain("Expcolor_0=true");
      expect(result).toContain("Mystery=keep");
    },
  );
  it("appends without replacing old spots or unknown native fields", () => {
    const first = apply(base, spot()) + "\nUnknownNative_0=preserve\n";
    const result = apply(first, spot(1));
    expect(result).toContain("Name_0=Region 0");
    expect(result).toContain("Name_1=Region 1");
    expect(result).toContain("UnknownNative_0=preserve");
    const changed = apply(result, "[Locallab]\nExpcomp_0=-0.2\n");
    expect(changed.match(/Expcomp_0=/g)).toHaveLength(1);
    expect(changed).toContain("Expcomp_0=-0.2");
  });
  it("allows multiple new spots and keeps global edits and section order", () => {
    const result = apply(
      base,
      spot() +
        spot(1).replace("[Locallab]\n", "") +
        "[Exposure]\nCompensation=0.2\n",
    );
    expect(result).toContain("Name_1=Region 1");
    expect(result).toContain("Compensation=0.2");
    expect(result.indexOf("[Exposure]")).toBeLessThan(
      result.indexOf("[Other]"),
    );
  });
  it("does not touch a disabled local section for global-only changes", () => {
    const content = base + "[Locallab]\nEnabled=false\nSelspot=0\n";
    expect(apply(content, "[Exposure]\nCompensation=0.3")).toContain(
      "[Locallab]\nEnabled=false\nSelspot=0",
    );
    expect(apply(content, "")).toBe(content);
  });
  it.each([
    "Expcomp_0=NaN",
    "Expcomp_0=Infinity",
    "Expcomp_0=5",
    "CenterX_0=0.2",
    "Shape_0=RECT",
    "Loc_0=100;0;100;100;",
    "Loc_0=1;2;3;",
    "Enabled=yes",
    "Typo_0=1",
    "Name_-1=bad",
    "Name_01=bad",
    "Expcomp=1",
    "Selspot=4",
  ])("rejects invalid patch %s atomically", (line) => {
    expect(() => apply(base, spot() + line + "\n")).toThrow(/Locallab/);
    expect(base).not.toContain("Name_0");
  });
  it("rejects a new spot without explicit placement or with an index gap", () => {
    expect(() =>
      apply(base, "[Locallab]\nName_0=partial\nExpcomp_0=1"),
    ).toThrow(/Locallab/);
    expect(() => apply(base, spot(2))).toThrow(/Locallab/);
  });
  it("rejects duplicate fields instead of losing them in the parser", () => {
    expect(() => apply(base, spot() + "Expcomp_0=0.8\n")).toThrow(/Locallab/);
  });
  it("rejects duplicate base fields and discontinuous base spots on local edits", () => {
    const first = apply(base, spot());
    expect(() =>
      apply(first + "\nName_0=duplicate", "[Locallab]\nExpcomp_0=0.2"),
    ).toThrow(/Locallab/);
    expect(() => apply(base + "[Locallab]\nName_2=orphan\n", spot())).toThrow(
      /Locallab/,
    );
  });
  it("rejects enabling an empty section", () => {
    expect(() => apply(base, "[Locallab]\nEnabled=true")).toThrow(/Locallab/);
  });
  it.each([
    "[Crop]\nEnabled=true",
    "[Rotation]\nDegree=3",
    "[Coarse Transformation]\nRotate=90",
    "[Coarse Transformation]\nHorizontalFlip=true",
  ])("guards unsupported geometry %s", (geometry) => {
    expect(() => apply(base + geometry + "\n", spot())).toThrow(
      /Locallab.*geometry/i,
    );
  });
  it("permits an off-frame center and extents beyond the frame within the supported bounds", () => {
    const response = spot()
      .replace("CenterX_0=-400", "CenterX_0=1200")
      .replace("400;400;300;300;", "2000;2000;2000;2000;");
    expect(apply(base, response + "Sensiex_0=100\nSensi_0=100\n")).toContain(
      "CenterX_0=1200",
    );
  });
});
describe("Locallab prompt contract", () => {
  it("opens local editing by default", () =>
    expect(DEFAULT_EDITABLE_SECTIONS).toContain("Locallab"));
  it.each(Object.keys(PROMPTS))(
    "documents creation, native coordinates and optional use in %s",
    (p) => {
      const prompt = getPromptByPreset(p, ["Exposure", "Locallab"]);
      expect(prompt).toContain("CenterX_i");
      expect(prompt).toContain("2000");
      expect(prompt).toContain("Name_i");
      expect(prompt).not.toContain(
        "Do not pretend to create unverified Locallab",
      );
    },
  );
  it("does not inject local capability when excluded", () => {
    expect(getPromptByPreset("clear", ["Exposure"])).not.toContain("CenterX_i");
  });
});

describe("native serialization edge cases", () => {
  it.each(["CenterX_0=1e2", "CenterX_0=1.0", "Selspot=0e0"])(
    "rejects non-native integer syntax %s",
    (line) => {
      expect(() =>
        apply(
          base,
          line.startsWith("CenterX")
            ? spot().replace("CenterX_0=-400", line)
            : spot() + line,
        ),
      ).toThrow(/Locallab/);
    },
  );
  it("rejects an ellipse whose bounding box alone intersects a frame corner", () => {
    expect(() =>
      apply(
        base,
        spot()
          .replace("CenterX_0=-400", "CenterX_0=1200")
          .replace("CenterY_0=200", "CenterY_0=1200")
          .replace("400;400;300;300;", "250;250;250;250;") +
          "Sensiex_0=100\nSensi_0=100\n",
      ),
    ).toThrow(/outside/);
  });
  it("keeps an empty local response unchanged", () =>
    expect(apply(base, "[Locallab]\n")).toBe(base));
});

it("requires broad scopes for an off-frame center with no reliable color reference", () => {
  expect(() =>
    apply(
      base,
      spot()
        .replace("CenterX_0=-400", "CenterX_0=1200")
        .replace("400;400;300;300;", "800;800;600;600;"),
    ),
  ).toThrow(/scope/);
});

it("rejects an empty local field name", () =>
  expect(() => apply(base, spot() + "=1\n")).toThrow(/Locallab/));
it("does not inherit invalid placement while enabling an existing spot", () => {
  const first = apply(base, spot()).replace("CenterX_0=-400", "CenterX_0=NaN");
  expect(() => apply(first, "[Locallab]\nChroma_0=10")).toThrow(/Locallab/);
});

it("rejects unverified camera-model perspective geometry", () => {
  expect(() =>
    apply(base + "[Perspective]\nMethod=camera_based\n", spot()),
  ).toThrow(/geometry/);
});
