import { SectionChange } from "../pp3-parser.js";

// RawTherapee 5.13: params/locallab.cc constructor and LoadUtil;
// rtgui/controlspotpanel.cc and rtgui/tools/locallabtools.cc define GUI limits.
// Center limits below are an adapter subset (including off-frame centers), not GUI limits.
export const LOCAL_SPOT_DEFAULTS: Readonly<Record<string, string>> = {
  Shape: "ELI",
  SpotMethod: "norm",
  Isvisible: "true",
  Activ: "true",
  CenterX: "0",
  CenterY: "0",
  Loc: "150;150;150;150;",
  Transit: "60",
  Transitweak: "1",
  Transitgrad: "0",
  Expexpose: "false",
  Expcomp: "0",
  Sensiex: "60",
  Expcolor: "false",
  Lightness: "0",
  Contrast: "0",
  Chroma: "0",
  Sensi: "30",
};
const ranges: Record<string, [number, number, boolean?]> = {
  CenterX: [-2000, 2000, true],
  CenterY: [-2000, 2000, true],
  Transit: [2, 100],
  Transitweak: [0.5, 25],
  Transitgrad: [-1, 1],
  Expcomp: [-1.5, 1.5],
  Sensiex: [0, 100, true],
  Sensi: [0, 100, true],
  Lightness: [-100, 500, true],
  Contrast: [-100, 100, true],
  Chroma: [-100, 150, true],
};
const booleans = new Set(["Isvisible", "Activ", "Expexpose", "Expcolor"]);
const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const fail = (message: string): never => {
  throw new Error(`Locallab: ${message}`);
};

function numberValue(
  value: string,
  min: number,
  max: number,
  integer = false,
): number {
  const n = Number(value);
  if (
    !numeric.test(value) ||
    !Number.isFinite(n) ||
    n < min ||
    n > max ||
    (integer && (!Number.isInteger(n) || !/^[+-]?\d+$/.test(value)))
  )
    fail(
      `invalid number '${value}'; expected ${integer ? "integer " : ""}${min}..${max}`,
    );
  return n;
}

function validate(field: string, value: string): void {
  if (ranges[field]) {
    numberValue(value, ...ranges[field]);
    return;
  }
  if (booleans.has(field)) {
    if (!["true", "false"].includes(value))
      fail(`invalid boolean ${field}=${value}`);
    return;
  }
  if (field === "Name") {
    if (!value || /[\r\n\\\[\]]/.test(value)) fail("invalid spot name");
    return;
  }
  if (field === "Shape" && value === "ELI") return;
  if (field === "SpotMethod" && value === "norm") return;
  if (field === "Loc") {
    if (!/^(?:\d+;){4}$/.test(value))
      fail("Loc requires right;left;bottom;top; with a trailing semicolon");
    for (const v of value.slice(0, -1).split(";"))
      numberValue(v, 2, 3000, true);
    return;
  }
  fail(`unsupported field/value ${field}=${value}`);
}

/** Read only for validation/context. Local writes below preserve the original lines. */
function profileValues(content: string): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>();
  let section = "";
  for (const line of content.split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]\s*$/.exec(line);
    if (header) {
      section = header[1];
      if (section === "Locallab" && result.has(section))
        fail("duplicate base section");
      if (!result.has(section)) result.set(section, new Map());
    } else {
      const entry = /^\s*([^#;=]+?)\s*=(.*)$/.exec(line);
      if (entry && section) {
        const map = result.get(section)!;
        if (section === "Locallab" && map.has(entry[1]))
          fail(`duplicate base key ${entry[1]}`);
        map.set(entry[1], entry[2].trim());
      }
    }
  }
  return result;
}

/** V1 uses the uncropped, unmanipulated frame. Camera orientation and uniform
 * preview/output resizing are already applied by RT, before the viewer sees it.
 * Crop is after Locallab in normal simpleprocess; do not silently use crop coordinates.
 */
export function localGeometryProblem(content: string): string | undefined {
  const values = profileValues(content);
  const get = (s: string, k: string) => values.get(s)?.get(k);
  if (get("Crop", "Enabled") === "true") return "crop";
  if (get("Framing", "Enabled") === "true") return "framing";
  if (get("Perspective", "Method") && get("Perspective", "Method") !== "simple")
    return "Perspective.Method";
  const checks: Record<string, Record<string, string>> = {
    "Coarse Transformation": {
      Rotate: "0",
      HorizontalFlip: "false",
      VerticalFlip: "false",
    },
    Rotation: { Degree: "0" },
    Distortion: { Amount: "0", Defish: "false" },
    "Common Properties for Transformations": {
      Scale: "1",
      "Scale horizontally": "1",
      "Scale vertically": "1",
    },
  };
  for (const [s, keys] of Object.entries(checks))
    for (const [k, neutral] of Object.entries(keys)) {
      const value = get(s, k);
      if (
        value !== undefined &&
        (neutral === "false"
          ? value !== neutral
          : Number(value) !== Number(neutral))
      )
        return `${s}.${k}`;
    }
  if (get("LensProfile", "LcMode") && get("LensProfile", "LcMode") !== "none")
    return "lens profile geometry";
  for (const [k, v] of values.get("Perspective") ?? []) {
    if (
      /^(Horizontal|Vertical|Camera(Pitch|Roll|Yaw|ShiftHorizontal|ShiftVertical)|Projection(Pitch|Rotate|Yaw|ShiftHorizontal|ShiftVertical))$/.test(
        k,
      ) &&
      Number(v) !== 0
    )
      return `Perspective.${k}`;
  }
  return undefined;
}

/** One transaction: validate the complete patch, initialize only supported spot
 * defaults, preserve all other fields, then replace/append stable lines. */
export function applyLocalAdjustments(
  content: string,
  changes: SectionChange[],
): string {
  if (!changes.length) return content;
  const values = profileValues(content);
  const current = values.get("Locallab") ?? new Map<string, string>();
  const version = values.get("Version")?.get("Version");
  if (version && version !== "353")
    fail(`unsupported PP3 Version=${version}; use a 5.13/353 base profile`);
  const patch = new Map<string, string>();
  const touched = new Set<number>();
  for (const change of changes)
    for (const [key, line] of change.parameters) {
      if (patch.has(key)) fail(`duplicate response key ${key}`);
      const value = line.slice(line.indexOf("=") + 1).trim();
      if (key === "Enabled") {
        if (!["true", "false"].includes(value)) fail("invalid Enabled boolean");
      } else if (key === "Selspot") numberValue(value, 0, 1_000_000, true);
      else {
        const match = /^(.+)_((?:0|[1-9]\d*))$/.exec(key);
        if (!match) fail(`invalid field/index ${key}`);
        const index = Number(match![2]);
        if (!Number.isSafeInteger(index) || index > 1_000_000)
          fail(`invalid spot index ${key}`);
        validate(match![1], value);
        touched.add(index);
      }
      patch.set(key, value);
    }
  const names = [...current.keys()]
    .filter((k) => /^Name_\d+$/.test(k))
    .map((k) => Number(k.slice(5)))
    .sort((a, b) => a - b);
  names.forEach((n, i) => {
    if (n !== i) fail("base spot numbering is not contiguous from zero");
  });
  for (const key of current.keys()) {
    const m = /_(\d+)$/.exec(key);
    if (m && String(Number(m[1])) !== m[1])
      fail(`non-canonical base index ${key}`);
    if (m && Number(m[1]) >= names.length) fail(`orphan base field ${key}`);
  }
  let count = names.length;
  for (const i of [...touched].sort((a, b) => a - b)) {
    if (i > count) fail(`index gap: next new spot must be ${count}`);
    const isNew = i === count;
    if (isNew) {
      for (const field of ["Name", "CenterX", "CenterY", "Loc"])
        if (!patch.has(`${field}_${i}`))
          fail(`new spot ${i} requires ${field}_${i}`);
      count++;
    } else if (
      (current.get(`Shape_${i}`) ?? "ELI") !== "ELI" ||
      (current.get(`SpotMethod_${i}`) ?? "norm") !== "norm"
    )
      fail(
        `spot ${i} is not a supported normal ellipse; preserved, but cannot be edited in V1`,
      );
    const value = (field: string) =>
      patch.get(`${field}_${i}`) ??
      current.get(`${field}_${i}`) ??
      LOCAL_SPOT_DEFAULTS[field];
    for (const [k, v] of Object.entries(LOCAL_SPOT_DEFAULTS))
      if (isNew || !current.has(`${k}_${i}`)) {
        if (!patch.has(`${k}_${i}`)) patch.set(`${k}_${i}`, v);
      }
    if (
      !changes.some((c) => c.parameters.has(`Expexpose_${i}`)) &&
      changes.some((c) => c.parameters.has(`Expcomp_${i}`))
    )
      patch.set(`Expexpose_${i}`, "true");
    if (
      !changes.some((c) => c.parameters.has(`Expcolor_${i}`)) &&
      ["Lightness", "Contrast", "Chroma"].some((k) =>
        changes.some((c) => c.parameters.has(`${k}_${i}`)),
      )
    )
      patch.set(`Expcolor_${i}`, "true");
    for (const field of Object.keys(LOCAL_SPOT_DEFAULTS))
      validate(field, value(field));
    const loc = value("Loc");
    if (
      !loc ||
      value("CenterX") === undefined ||
      value("CenterY") === undefined
    )
      fail(`spot ${i} has no complete placement`);
    const [right, left, bottom, top] = loc.split(";").map(Number);
    const cx = 1000 + Number(value("CenterX")),
      cy = 1000 + Number(value("CenterY"));
    // calc_ref samples around the center, and has no valid color reference when
    // that sample is wholly off-frame. Only the verified broad-scope path is open.
    if (cx < 0 || cx > 2000 || cy < 0 || cy > 2000) {
      if (
        (value("Expexpose") === "true" && Number(value("Sensiex")) !== 100) ||
        (value("Expcolor") === "true" && Number(value("Sensi")) !== 100)
      ) {
        fail(`off-frame spot ${i} requires scope 100 for each enabled tool`);
      }
    }
    const nearX = Math.max(0, Math.min(2000, cx)) - cx;
    const nearY = Math.max(0, Math.min(2000, cy)) - cy;
    if (
      (nearX / (nearX < 0 ? left : right)) ** 2 +
        (nearY / (nearY < 0 ? top : bottom)) ** 2 >=
      1
    )
      fail(`spot ${i} is entirely outside the image`);
  }
  if (touched.size && !patch.has("Enabled")) patch.set("Enabled", "true");
  if (!current.has("Selspot") && !patch.has("Selspot"))
    patch.set("Selspot", "0");
  const selected = Number(
    patch.get("Selspot") ?? current.get("Selspot") ?? "0",
  );
  if (
    !Number.isInteger(selected) ||
    selected < 0 ||
    selected >= Math.max(1, count)
  )
    fail("Selspot must reference an existing spot");
  if ((patch.get("Enabled") ?? current.get("Enabled")) === "true" && !count)
    fail("cannot enable an empty local section");
  if (touched.size || patch.get("Enabled") === "true") {
    const problem = localGeometryProblem(content);
    if (problem) fail(`unsupported preview geometry: ${problem}`);
  }
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  let start = lines.findIndex((l) => l.trim() === "[Locallab]");
  if (start < 0) {
    if (lines[lines.length - 1] !== "") lines.push("");
    start = lines.length;
    lines.push("[Locallab]");
  }
  let end = lines.findIndex((l, i) => i > start && /^\s*\[/.test(l));
  if (end < 0) end = lines.length;
  for (let i = start + 1; i < end; i++) {
    const m = /^\s*([^=]+?)\s*=/.exec(lines[i]);
    if (m && patch.has(m[1])) {
      lines[i] = `${m[1]}=${patch.get(m[1])}`;
      patch.delete(m[1]);
    }
  }
  while (end > start + 1 && !lines[end - 1].trim()) end--;
  lines.splice(end, 0, ...[...patch].map(([k, v]) => `${k}=${v}`));
  return lines.join(newline);
}
