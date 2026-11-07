import path from "node:path";
import { DEFAULT_VISION_MODEL } from "./constants.js";
import type { ImageFormat } from "./types.js";

export interface OutputIdentity {
  output?: string;
  preset?: string;
  model?: string | string[];
}

export function shanghaiTimestamp(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}-${String(date.getUTCMilliseconds()).padStart(3, "0")}`;
}

export function createOutputPaths(
  inputPath: string,
  options: OutputIdentity,
  format: ImageFormat,
  now = new Date(),
) {
  const extension = format === "jpeg" ? "jpg" : format;
  if (options.output) {
    const parsed = path.parse(options.output);
    const stem = path.join(parsed.dir, parsed.name);
    return {
      pp3Path: `${stem}.pp3`,
      imagePath:
        parsed.ext.toLowerCase() === ".pp3"
          ? `${stem}.${extension}`
          : options.output,
    };
  }
  const parsed = path.parse(inputPath);
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");
  const model = Array.isArray(options.model)
    ? options.model.join("+")
    : options.model || DEFAULT_VISION_MODEL;
  const stem = path.join(
    parsed.dir,
    `${parsed.name}_${safe(options.preset || "default")}_${safe(model)}_${shanghaiTimestamp(now)}`,
  );
  return { pp3Path: `${stem}.pp3`, imagePath: `${stem}.${extension}` };
}
