import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export interface ViewerRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
type Data = Record<string, any>;
type Result = { ok: boolean; data?: Data; error?: string };
export type ViewerBackend = (
  backend: "color" | "icaa",
  request: Data,
) => Promise<Data>;
export interface ViewerReport {
  schema_version: string;
  image_path: string;
  color: Result;
  aesthetics: Result;
  regions: { name: string; result: Result }[];
}

async function capture(action: () => Promise<Data>): Promise<Result> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function collectViewerData(
  imagePath: string,
  run: ViewerBackend,
  regions: ViewerRegion[] = [],
): Promise<ViewerReport> {
  const [color, aesthetics] = await Promise.all([
    capture(() =>
      run("color", { operation: "analyze", image_path: imagePath }),
    ),
    capture(async () => {
      const data = await run("icaa", {
        operation: "score",
        image_paths: [imagePath],
      });
      const row = data.scores?.[0];
      if (
        !row ||
        !Number.isFinite(row.score) ||
        !Number.isFinite(row.overall_score)
      ) {
        throw new Error("ICAA returned invalid scores");
      }
      return {
        ...data,
        scores_10: { color: row.score * 10, overall: row.overall_score * 10 },
      };
    }),
  ]);
  const regionalResults = [];
  for (const { name, ...region } of regions) {
    regionalResults.push({
      name,
      result: await capture(() =>
        run("color", {
          operation: "analyze",
          image_path: imagePath,
          region,
        }),
      ),
    });
  }
  return {
    schema_version: "1.0",
    image_path: imagePath,
    color,
    aesthetics,
    regions: regionalResults,
  };
}

function runPython(
  python: string,
  script: string,
  request: Data,
): Promise<Data> {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [script], { windowsHide: true, shell: false });
    let output = "",
      errors = "",
      settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      reject(error);
    };
    const timer = setTimeout(
      () => fail(new Error("Viewer backend timed out")),
      180000,
    );
    child.on("error", fail);
    child.stdin.on("error", fail);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
      if (output.length > 1024 * 1024)
        fail(new Error("Viewer report exceeds 1 MiB"));
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      errors = (errors + chunk).slice(-8192);
    });
    child.on("close", (code) => {
      if (settled) return;
      try {
        const response = JSON.parse(output);
        if (code !== 0 || response.ok !== true)
          throw new Error(
            response.error?.message || errors || `Backend exited ${code}`,
          );
        settled = true;
        clearTimeout(timer);
        resolve(response.data);
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    });
    child.stdin.end(JSON.stringify(request));
  });
}

/** All region coordinates refer to the orientation-corrected analysis PNG. */
export async function analyzeViewer(
  previewPath: string,
  regions: ViewerRegion[] = [],
): Promise<ViewerReport> {
  const root =
    process.env.VIEWER_ROOT ??
    fileURLToPath(new URL("../../../", import.meta.url));
  const imagePath = `${previewPath}.viewer.png`;
  await sharp(previewPath)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .withIccProfile("srgb")
    .png()
    .toFile(imagePath);
  const localPython = path.join(
    root,
    "aesthetic-assessors",
    ".venv-icaa",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  const icaaPython =
    process.env.ICAA_PYTHON ??
    (fs.existsSync(localPython) ? localPython : "python");
  const colorPython = process.env.COLOR_INSPECTOR_PYTHON ?? "python";
  const report = await collectViewerData(
    imagePath,
    (backend, request) =>
      runPython(
        backend === "icaa" ? icaaPython : colorPython,
        path.join(
          root,
          backend === "icaa"
            ? "aesthetic-assessors/icaa/cli.py"
            : "color-inspector/cli.py",
        ),
        request,
      ),
    regions,
  );
  await fs.promises.writeFile(
    `${previewPath}.viewer.json`,
    JSON.stringify(report, null, 2),
  );
  return report;
}

export function formatViewerForAI(report: ViewerReport): string {
  return `VIEWER MEASUREMENTS AND FIELD DEFINITIONS
lab_mean: [L*, a*, b*] average; L* is lightness, positive a* is redward and negative greenward, positive b* is yellowward and negative blueward.
lab_std: standard deviation of those three components.
lightness_percentiles: L* P05/P50/P95, describing darker, median and brighter parts of the measured distribution.
hsv_saturation_mean / hsv_saturation_p95: mean and 95th-percentile HSV saturation, range 0–1.
channel_endpoints: proportions of pixels with any/all RGB channels at 0 or 255 in the rendered preview.
ICAA score: predicted color-aesthetic rating; overall_score: predicted overall-aesthetic rating. Both use the original rating divided by 10. scores_10 restores the ten-point scale.
region: measured rectangle in analysis-image pixels; an empty regions list means whole-image analysis only.
ok/error: backend execution status.
${JSON.stringify(report, (key, value) => (key === "limitations" ? undefined : value), 2)}`;
}
