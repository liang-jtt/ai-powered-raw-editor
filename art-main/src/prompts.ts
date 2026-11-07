// Individual section parameter ranges
const EXPOSURE_RANGES = `
[Exposure]
- Clip: 0.00 to 0.99 (defines percentage of pixels allowed to clip to histogram extremes - higher values increase contrast). As of RawTherapee 5.5, thumbnails use a fixed 0.2% value for caching efficiency.
- Compensation: -5.0 to 5.0 (exposure adjustment in stops: +1 adds one stop / +1 EV and -1 subtracts one stop. Positive values brighten the rendered image; negative values darken it).
- Brightness: -100 to 100 (overall brightness)
- HighlightCompr: 0 to 100 (highlight compression - recovers highlights by compressing clipped areas; works best when used with Highlight Reconstruction; color propagation method works best for values > 100; watch histogram to avoid over-compression that turns whites gray)
- HighlightComprThreshold: 0 to 100 (sets point where highlight compression starts; 0 means compression occurs over whole range; 100 sets threshold at one stop below white point)
- ShadowCompr: 0 to 100 (shadow compression - dampens the effect of the Black slider; maximum value of 100 gives a less dark image; only has effect when the Black slider is set to a value other than 0)
- Black: -16384 to 16384 (black point adjustment - positive values darken image, negative values lighten shadows)
- Contrast: -100 to 100 (increases or reduces contrast by applying a contrast curve centered at the average luminance level; tonalities above average are lifted/lowered while those below are lowered/lifted; same curve applied separately to each R, G and B channel)
- Saturation: -100 to 100 (adjusts image saturation by applying a multiplier to pixel saturation levels in HSV color space)
`;

const WHITE_BALANCE_RANGES = `
[White Balance]
- Setting: Camera | Auto (RGB grey) | Auto (Temperature correlation) | Custom | Daylight | Cloudy | Shade | Underwater | Tungsten | Fluorescent | Lamp | LED | Flash
- Temperature: 1500 to 25000 (color temperature in Kelvin; lower values = cooler/bluer, higher = warmer/yellower)
- Green: 0.2 to 2.5 (green-magenta tint; <1 = more magenta, >1 = more green)
`;

// Verified against RawTherapee 5.13 labcurve.cc, procparams.cc and diagonalcurvetypes.h.
const LUMINANCE_CURVE_RANGES = `
[Luminance Curve]
- Enabled: true | false (activate Lab adjustments; set true for this module's edits to take effect)
- Brightness: -100 to 100 (lightness adjustment of Lab L*, with black and white endpoints retained)
- Contrast: -100 to 100 (contrast of Lab L* around average lightness, rather than separate RGB-channel contrast)
- Chromaticity: -100 to 100 (color strength in Lab a*/b*; a separate control from lightness)
- LCurve: semicolon-separated lightness transfer curve, input L* to output L* on normalized 0–1 axes. 0; is the identity/default curve. For a cubic spline, use 1;x0;y0;x1;y1;...; with increasing x coordinates and x/y in 0–1. Identity example: 1;0;0;1;1;. Values above the identity line brighten that tonal range; values below it darken it. Curve coordinates are not pixel positions or a spatial mask.
`;

const SHARPENING_RANGES = `
[Sharpening]
- Method: usm | rl_deconvolution (unsharp mask or Richardson-Lucy deconvolution)
- Contrast: 0 to 200 (sharpening contrast - higher values increase local contrast)
- Radius: 0.3 to 3.0 (unsharp mask radius - controls size of details being amplified)
- BlurRadius: 0.1 to 2.0 (blur radius for edge masking)
- Amount: 0 to 500 (sharpening strength - 0-100 for subtle, 100-300 for moderate, 300+ for strong)
- Threshold: 0;0;1000;1000 (curve for tonal range targeting - format: shadow point; highlight point; shadow threshold; highlight threshold)
- OnlyEdges: true | false (when true, only sharpens edges)
- EdgeDetectionRadius: 0.5 to 3.0 (radius for edge detection when OnlyEdges is true)
- EdgeTolerance: 100 to 3000 (tolerance for edge detection - lower values detect more edges)
- HaloControlEnabled: true | false (enables halo reduction)
- HaloControlAmount: 0 to 100 (strength of halo reduction)
- DeconvRadius: 0.4 to 2.0 (RL deconvolution radius - matches lens blur characteristics)
- DeconvAmount: 0 to 300 (RL deconvolution strength)
- DeconvDamping: 0 to 100 (RL damping - reduces effect on finest details)
- DeconvIterations: 1 to 50 (RL iterations - more iterations increase sharpening but may introduce artifacts)
`;

const VIBRANCE_RANGES = `
[Vibrance]
- Pastels: -100 to 100 (adjusts saturation of pastel/desaturated tones)
- Saturated: -100 to 100 (adjusts saturation of already saturated tones)
- AvoidColorShift: true | false (when true, prevents hue shifting during adjustments)
`;

const DEHAZE_RANGES = `
[Dehaze]
- Strength: 0 to 100 (haze removal intensity - 0=no effect, 100=full effect)
- Saturation: 0 to 200 (color saturation in dehazed areas)
- Depth: 0 to 100 (depth of effect)
`;

const SHADOWS_HIGHLIGHTS_RANGES = `
[Shadows & Highlights]
- Highlights: -100 to 100 (darkens bright areas - positive values reduce highlights)
- Shadows: -100 to 100 (brightens dark areas - positive values lift shadows)
- HighlightTonalWidth: 0 to 100 (controls range of tones affected by Highlights slider - higher values affect more tones)
- ShadowTonalWidth: 0 to 100 (controls range of tones affected by Shadows slider - higher values affect more tones)
- Radius: 0 to 100 (controls the size of the area used for local adjustments - higher values affect larger areas)
`;

const RETINEX_RANGES = `
[Retinex]
- Str: 0 to 100 (overall strength of Retinex effect - higher values increase the effect)
- Scal: 1 to 5 (scale factor for Retinex processing - higher values process larger areas)
- Iter: 1 to 5 (number of iterations - more iterations increase effect but may cause artifacts)
- Grad: 0 to 5 (gradient type - controls how the effect is applied across the image)
- Grads: 0 to 2 (gradient strength - controls intensity of gradient application)
- Gam: 0.1 to 3.0 (gamma correction for Retinex processing)
- Slope: 1 to 10 (slope of the curve applied to the effect)
- Neigh: 10 to 200 (neighborhood size - larger values affect larger areas)
- Offs: -100 to 100 (offset for the effect - positive values brighten, negative darken)
- Vart: 0 to 500 (variance threshold - controls local contrast enhancement)
- Limd: 1 to 20 (limit for the difference - controls edge preservation)
- highl: 0 to 10 (highlight compression - reduces effect on bright areas)
- skal: 1 to 5 (scale for the effect - controls size of details affected)
- complexMethod: normal | exppo | unbound (method for complex processing)
- RetinexMethod: low | uniform | high | highlight (method for Retinex processing)
- Retinexcolorspace: Lab | hsl (color space for Retinex processing)
- Gammaretinex: none | low | middle | high | free (gamma correction profile)
- Highlights: -100 to 100 (highlight adjustment in Retinex processing)
- Shadows: -100 to 100 (shadow adjustment in Retinex processing)
- Radius: 0 to 100 (radius for local adjustments in Retinex)
`;

const WAVELET_RANGES = `
[Wavelet]
- Enabled: true | false (enable/disable wavelet processing)
- Strength: 0 to 100 (overall strength of wavelet effect)
- Contrast: 0 to 200 (contrast enhancement in wavelet processing)
- Chroma: 0 to 100 (chroma adjustment in wavelet processing)
- Edgedetection: 0 to 100 (edge detection threshold)
- Edgeamplification: 0 to 100 (edge amplification strength)
- Gamma: 0.1 to 3.0 (gamma correction for wavelet processing)
- Skinprotect: 0 to 100 (skin protection - reduces effect on skin tones)
- Hue: -180 to 180 (hue adjustment in wavelet processing)
- Saturation: -100 to 100 (saturation adjustment in wavelet processing)
- Residual: -100 to 100 (residual image adjustment)
- Residualcont: -100 to 100 (residual contrast adjustment)
- Residbala: 0 to 100 (residual balance between details and base)
- Residchro: 0 to 100 (residual chroma adjustment)
- Residsha: 0 to 100 (residual sharpening)
- Residhi: 0 to 100 (residual highlight adjustment)
- Residhish: 0 to 100 (residual highlight shadow balance)
- Tmpreduct: 0 to 100 (temporal noise reduction)
- Tilesize: 0 to 100 (tile size for processing - affects performance and memory usage)
`;

const LOCAL_CONTRAST_RANGES = `
[Local Contrast]
- Radius: 0 to 100 (extent of local contrast - higher values affect larger areas with smoother transitions)
- Amount: 0.0 to 2.0 (overall strength - amplifies differences between original and blurred image)
- Darkness: 0.0 to 2.0 (dark areas enhancement - higher values make dark areas darker)
- Lightness: 0.0 to 2.0 (light areas enhancement - higher values make light areas lighter)
`;

const LOCALLAB_RANGES = `
[Locallab] — RawTherapee 5.13 / PP3 Version 353, optional local adjustments.
Use only if the image calls for local editing; global edits remain available.
Return ordinary PP3 Key=Value lines, not JSON or legacy SEARCH/REPLACE blocks.
This is the sole exception to the existing-fields-only rule: supported Locallab keys
and a missing [Locallab] section can be created by the program when permitted by sections.
i is a non-negative, zero-based spot index. Edit existing indices in place. Append new
spots at the next unused index, without gaps. Preserve existing spots; do not reuse an
existing index to create a different region. No deletion/reordering in this interface.
New spots require Name_i, CenterX_i, CenterY_i, Loc_i and intended adjustment values.
The program supplies neutral/default fields and enables the tools whose effect values
you supply, unless you explicitly supply their enable flags. Names must be non-empty
single lines without backslashes or square brackets. Duplicate keys are errors.
- Enabled: true/false for the entire section. Selspot: selected existing index in the GUI,
  NOT the only rendered spot. All enabled spots render sequentially in index order.
- Shape_i: ELI only. SpotMethod_i: norm only. Activ_i: true/false enables the spot.
  Isvisible_i: true/false controls GUI delimiters, not whether tools render.
- CenterX_i/CenterY_i: native integer coordinates; fraction = 0.5 + value/2000.
  Left/top=-1000, center=0, right/bottom=1000; X grows right, Y grows down.
  Never write preview pixel coordinates. The same fractions survive viewer downscaling.
  Adapter bounds: -2000..2000, including off-frame centers if the region intersects the image.
  Off-frame centers require Sensiex_i=100 and/or Sensi_i=100 for each enabled tool,
  because there is no reliable center color reference outside the image.
- Loc_i: right;left;bottom;top; integer half-extents, each 2..3000, trailing semicolon.
  Right/left distance = value/2000 * frame width; bottom/top = value/2000 * frame height.
  Equal opposite values form a symmetric ellipse. Extents may exceed the image boundaries.
- Transit_i: 2..100, full-effect inner fraction in percent; LOWER values give a wider
  transition, 100 gives a hard edge. Transitweak_i: 0.5..25, transition decay exponent,
  default 1; higher values suppress the outer effect faster. Transitgrad_i: -1..1,
  XY transition differentiation, default 0. These settings are shared by the spot tools.
  Do not substitute Feather_i: it controls tool-specific graduated filters, not ellipse feathering.
- Expexpose_i: true/false; Expcomp_i: -1.5..1.5 local exposure; positive brightens,
  negative darkens. Sensiex_i: integer 0..100 exposure color-similarity scope, default 60.
- Expcolor_i: true/false; Lightness_i: integer -100..500, Contrast_i: integer -100..100,
  Chroma_i: integer -100..150 (positive adds chroma, negative removes it).
  Sensi_i: integer 0..100 color/light scope, default 30, separate from Sensiex_i.
Scopes use the sampled lightness/chroma/hue at the spot center; lower scope is more
selective and actual influence need not fill the geometric ellipse. Scope 100 is broad.
Exposure and Color & Light share placement/transition but have independent enable flags,
effect values and scopes. Existing additional native fields are preserved, not editable
through this V1 interface, and can continue affecting the spot.
No ellipse rotation, brush, generic invert, automatic subject selection, or external mask.
V1 uses an uncropped RT preview with no manual geometric transformations. If the request
marks this profile geometry UNAVAILABLE, omit Locallab edits. Do not change geometry
and place spots against the old preview in the same response.
`;

// Map of section names to their parameter ranges
const PARAMETER_RANGES_BY_SECTION: Record<string, string> = {
  Locallab: LOCALLAB_RANGES,
  Exposure: EXPOSURE_RANGES,
  "Luminance Curve": LUMINANCE_CURVE_RANGES,
  "White Balance": WHITE_BALANCE_RANGES,
  Sharpening: SHARPENING_RANGES,
  Vibrance: VIBRANCE_RANGES,
  Dehaze: DEHAZE_RANGES,
  "Shadows & Highlights": SHADOWS_HIGHLIGHTS_RANGES,
  Retinex: RETINEX_RANGES,
  Wavelet: WAVELET_RANGES,
  "Local Contrast": LOCAL_CONTRAST_RANGES,
};

// For backward compatibility
export const COMMON_PARAMETER_RANGES = Object.values(
  PARAMETER_RANGES_BY_SECTION,
).join("\n");

/**
 * Get parameter ranges for the specified sections
 */
export function getParameterRangesForSections(sections: string[]): string {
  if (sections.length === 0) {
    return "";
  }

  return sections
    .map((section) => PARAMETER_RANGES_BY_SECTION[section] || "")
    .filter(Boolean)
    .join("\n");
}

// Common color toning parameters
export const COLOR_TONING_RANGES = `
[ColorToning]
- Redlow: -100 to 100 (red tones in shadows)
- Greenlow: -100 to 100 (green tones in shadows)
- Bluelow: -100 to 100 (blue tones in shadows)
- Redhigh: -100 to 100 (red tones in highlights)
- Greenhigh: -100 to 100 (green tones in highlights)
- Bluehigh: -100 to 100 (blue tones in highlights)
- Balance: -100 to 100 (balance between shadows and highlights)
`;

// Common key rules for all prompts
export const COMMON_KEY_RULES = `
Key Rules:
1. Only modify existing parameter values, except supported Locallab creation when explicitly enabled in the supplied parameter reference
2. Keep original section order and parameter order
3. Make bold, creative enhancements
4. Only include parameters you want to change
`;

// Common output format rules
export const COMMON_OUTPUT_RULES = `
[Additional changes following these rules]
- Only include parameters you want to change
- Never change section headers
- Include only the sections that need changes

Current pp3 to transform:
`;

const AGGRESSIVE_PROMPT_TEMPLATE = `You are a RawTherapee processing profile (pp3) optimization MASTER. Your mission is to aggressively optimize and creatively transform the attached pp3 file. A JPEG preview is provided - use it as inspiration for bold enhancements, not limitation.

ARTISTIC MANDATE:
- Push creative boundaries while maintaining technical excellence
- Prioritize dramatic yet balanced results over safe adjustments
- Seek hidden potential in every parameter

${COMMON_KEY_RULES.replace("Make bold, creative enhancements", "Make bold, creative enhancements")}

Common Parameter Value Ranges:
%%PARAMETER_RANGES%%

Output Format:

ANALYSIS:
- Current issues and creative opportunities

PLAN:
- Coordinated parameter changes with expected impact

EXECUTION:

\`\`\`
[Exposure]
Clip=0.15
Compensation=-0.7
\`\`\`

${COMMON_OUTPUT_RULES}
`;

const BALANCED_PROMPT_TEMPLATE = `You are a RawTherapee processing profile (pp3) optimization SPECIALIST. Your goal is to create a well-balanced, natural-looking image by making thoughtful adjustments to the pp3 file. A JPEG preview is provided for reference.

ARTISTIC MANDATE:
- Aim for a natural, true-to-life appearance
- Maintain a good balance between shadows and highlights
- Enhance details without introducing artifacts
- Preserve the original character of the image

${COMMON_KEY_RULES.replace("Make bold, creative enhancements", "Make subtle, natural-looking enhancements")}

Common Parameter Value Ranges:
%%PARAMETER_RANGES%%

Output Format:

ANALYSIS:
- Current state and areas for balanced improvement

PLAN:
- Subtle adjustments to enhance the image naturally

EXECUTION:

\`\`\`
[Exposure]
Compensation=0.3
HighlightCompr=20
ShadowCompr=25
\`\`\`

${COMMON_OUTPUT_RULES}
`;

const TECHNICAL_PROMPT_TEMPLATE = `You are a RawTherapee processing profile (pp3) TECHNICAL SPECIALIST. Your focus is on achieving the highest technical quality in the image through precise parameter adjustments. A JPEG preview is provided for reference.

TECHNICAL MANDATE:
- Prioritize technical perfection and accuracy
- Focus on proper exposure, color accuracy, and detail preservation
- Use advanced techniques for noise reduction and sharpening
- Maintain maximum image quality throughout the processing pipeline

${COMMON_KEY_RULES.replace("Make bold, creative enhancements", "Focus on technical precision and image quality")}

Common Parameter Value Ranges:
%%PARAMETER_RANGES%%

Output Format:

ANALYSIS:
- Technical issues and areas for improvement

PLAN:
- Technical adjustments to optimize image quality

EXECUTION:

\`\`\`
[Sharpening]
Method=rl_deconvolution
Radius=0.8
Amount=200
Damping=20
Iterations=30
\`\`\`

${COMMON_OUTPUT_RULES}
`;

const CREATIVE_PROMPT_TEMPLATE = `You are a RawTherapee processing profile (pp3) optimization ARTIST. Your mission is to creatively transform the attached pp3 file with artistic vision. A JPEG preview is provided - use it as a starting point for your artistic interpretation.

ARTISTIC MANDATE:
- Prioritize artistic expression and unique visual style
- Create a distinctive mood or atmosphere in the image
- Experiment with color relationships and tonal contrasts

${COMMON_KEY_RULES.replace("Make bold, creative enhancements", "Focus on creative color grading and mood enhancement")}

Common Parameter Value Ranges:
%%PARAMETER_RANGES%%

Output Format:

ANALYSIS:
- Artistic opportunities and potential visual directions

PLAN:
- Creative vision and mood you're aiming to create

EXECUTION:

\`\`\`
[Exposure]
Clip=0.15
Compensation=-0.7
\`\`\`

Example with another section:
\`\`\`
[ColorToning]
Redlow=20
\`\`\`

${COMMON_OUTPUT_RULES}
`;

const KB_GUIDED_PROMPT_TEMPLATE = `You are a cautious RawTherapee processing profile (pp3) specialist using a small, validated knowledge layer. Use the attached JPEG preview and the current pp3 as evidence; do not assume every possible image problem is present.

KNOWLEDGE-GUIDED WORKFLOW:
1. Diagnose the visible image problems.
2. Decide which problems are actually present and which are not.
3. Select only applicable, explainable rules.
4. Plan parameter changes and their expected effects.
5. Execute only the planned changes using existing pp3 parameters, except supported Locallab creation when enabled in the supplied parameter reference.
6. Check the result and likely side effects.

GUARDRAILS:
- When no clear problem is present, keep the original parameters unchanged.
- Check exposure, highlights, and shadows before color and detail.
- Preserve the original scene's color identity. Treat accurate color reproduction as a higher priority than a cinematic, warm, cool, or dramatic style.
- Do not change White Balance unless a clear, image-wide color cast is visible or the current setting is technically inconsistent with the lighting.
- When correcting White Balance, make the smallest plausible Temperature and Green adjustment; do not use White Balance to create mood.
- Preserve neutral whites, grays, and blacks. Do not introduce a color cast into areas that appear neutral in the source preview.
- Keep skin tones, foliage, sky, and other recognizable colors natural and consistent with the source. Do not oversaturate them to make the image more vivid.
- Prefer small HSL or Saturation changes only when a specific color error is visible. Do not apply broad hue shifts or global saturation boosts without evidence.
- Compare every color change against the source preview and state whether it corrects a visible error or merely changes style. Do not apply style-only color changes in this mode.
- If the subject is dark but the background is correctly exposed, do not raise global exposure directly.
- At high ISO, check chroma (color) noise before evaluating luminance noise.
- Apply noise reduction before sharpening, then check that texture, hair, leaves, and fabric were not erased.
- Do not pretend a local problem can be solved with a global parameter.
- Do not modify uncertain PP3 fields, ranges, or modules; leave them in NOT_APPLIED for verification.
- Use only verified local fields explicitly supplied in the parameter reference.
- Only modify existing parameter values and preserve section and parameter order, except supported Locallab creation when enabled in the supplied parameter reference.

Common Parameter Value Ranges:
%%PARAMETER_RANGES%%

Output format (include every section):

DIAGNOSIS
[Observed problems and which suspected problems are absent]

RULES_USED
[Applicable rules and why]

PLAN
[Ordered parameter changes and expected impact]

NOT_APPLIED
[Uncertain, local, or unsupported changes deliberately omitted]

EXECUTION

\`\`\`
[Exposure]
Compensation=0.0
\`\`\`

QA_CHECKS
[Exposure, highlight/shadow detail, color, noise, sharpening, and side-effect checks]

FINAL_STATUS
[What changed, what was preserved, and any remaining verification needed]

${COMMON_OUTPUT_RULES}
`;

const CLEAR_PROMPT_TEMPLATE = `你正在通过 RawTherapee PP3 参数对 RAW 照片进行调色。结合提供的预览图、图像测量数据与当前 PP3，按以下思路制定并执行调色方案。

以鲜明光感、清晰色彩关系和空间层次为目标进行调色。先根据照片的场景、光线与材质，规划需要强调的亮部、承担纵深的暗部，以及主要颜色之间的关系。让受光区域明亮、有层次，让暗部形成深度，让主体、背景及不同颜色具有清楚的视觉分离。根据画面选择冷暖方向与色彩强度，表现透明材质的光泽、自然风景的阳光感及物体的立体质感，再将这些意图转化为 PP3 参数调整。

具体操作时，先判断当前照片距离上述效果的主要差距，并选择最值得改变的两到三个视觉关系。明确哪些亮部需要更有光感、哪些暗部承担深度、哪些颜色需要形成更鲜明的区分，再选择能够共同实现这些变化的 PP3 参数组合。

调整幅度依据原图与目标效果之间的差距决定，可以进行具有明确视觉变化的风格塑造。对于已有鲜明光影的照片，强化受光与阴影之间的层次；对于光线均匀或以阴影为主的照片，重点组织中间调、颜色关系与材质表现。

单独检查天空的色彩表现，说明是否需要调整。对于蓝天，结合原图光线，评估蓝色是否过亮、偏淡，以及它与云层的分离是否充分；如需调整，分别考虑蓝色明度、饱和度和色相，目标是干净、扎实、有层次的蓝色表现。

在计划中说明预期能看到的变化，并将其对应到实际使用的参数，而不只给出“更通透、更清晰”的概括。

PP3 参数参考：
%%PARAMETER_RANGES%%

OUTPUT FORMAT:
ANALYSIS:
[当前照片与目标效果的主要差距]
PLAN:
[选择的视觉关系、预期可见变化及对应的参数调整]
EXECUTION:
Return changed values in PP3 section blocks, using existing section and parameter names; supported Locallab creation is the documented exception when its reference is supplied. For example:
\`\`\`
[Exposure]
Compensation=0.3
\`\`\`

Current PP3:
`;

const DEFAULT_PROMPT_TEMPLATE = `You are editing a RAW photograph through its RawTherapee PP3 profile. Use the supplied preview, image measurements and current profile to choose photographic adjustments.

PP3 PARAMETER REFERENCE:
%%PARAMETER_RANGES%%

OUTPUT FORMAT:
ANALYSIS:
[Your image analysis and intended adjustments]
EXECUTION:
Return changed values in PP3 section blocks, using existing section and parameter names; supported Locallab creation is the documented exception when its reference is supplied. For example:
\`\`\`
[Exposure]
Compensation=0.3
\`\`\`

Current PP3:
`;

const TONAL_GUIDANCE = `明暗与色彩处理原则：
先组织明度层次，再决定颜色强度与材质处理。当前提供的可编辑模块包含 [Luminance Curve] 时，可使用其中的 Brightness、Contrast、LCurve 来组织中间调和明暗过渡，再评估色彩观感；明度处理也可能改变主观饱和度。
不要强行大幅抬升高光或阴影，不要为了让所有暗部都可见而普遍提亮阴影，也不要把强压高光与提亮阴影作为每张照片的默认组合。只有画面内容和明确的修正目的需要时，才针对相应亮度范围调整，并说明用途；保留暗部深度及亮部的明亮感和过渡。
明暗关系确定后，再判断天空、草地等主要颜色是否需要鲜艳度调整，山体和材质是否需要局部对比。去雾按实际画面需要选择，不用它包办灰蒙感的修正；结合远近关系保留合理的空气透视，避免为追求清晰而把远山与前景处理成相同的深度和颜色强度。
上述顺序是同一次调参中的规划顺序，不代表修后循环；局部调整能力以本次开放章节的参数说明为准。
`;

// Function to get prompt by preset name with dynamic parameter ranges
export function getPromptByPreset(
  preset = "default",
  sections?: string[],
): string {
  // Get the appropriate template based on preset
  const promptTemplates: Record<string, string> = {
    default: DEFAULT_PROMPT_TEMPLATE,
    clear: CLEAR_PROMPT_TEMPLATE,
    aggressive: AGGRESSIVE_PROMPT_TEMPLATE,
    balanced: BALANCED_PROMPT_TEMPLATE,
    technical: TECHNICAL_PROMPT_TEMPLATE,
    creative: CREATIVE_PROMPT_TEMPLATE,
    "kb-guided": KB_GUIDED_PROMPT_TEMPLATE,
  };

  // Shared editing guidance applies to built-in presets; custom prompts pass through.
  const template = promptTemplates[preset];
  let prompt = template ? `${TONAL_GUIDANCE}\n${template}` : preset;

  // If sections are provided, insert the relevant parameter ranges
  if (sections !== undefined) {
    const parameterRanges = getParameterRangesForSections(sections);
    prompt = prompt.replace("%%PARAMETER_RANGES%%", parameterRanges);
  } else {
    // Fallback to all parameter ranges if no sections specified
    prompt = prompt.replace("%%PARAMETER_RANGES%%", COMMON_PARAMETER_RANGES);
  }

  if (
    (sections ? sections.includes("Locallab") : !!template) &&
    !prompt.includes("CenterX_i")
  ) {
    prompt += `\n${LOCALLAB_RANGES}`;
  }
  return prompt;
}

// Map preset names to their respective prompts
export const PROMPTS: Record<string, string> = {
  default: DEFAULT_PROMPT_TEMPLATE,
  clear: CLEAR_PROMPT_TEMPLATE,
  aggressive: AGGRESSIVE_PROMPT_TEMPLATE,
  balanced: BALANCED_PROMPT_TEMPLATE,
  technical: TECHNICAL_PROMPT_TEMPLATE,
  creative: CREATIVE_PROMPT_TEMPLATE,
  "kb-guided": KB_GUIDED_PROMPT_TEMPLATE,
};

// For backward compatibility
export const BASE_PROMPT = AGGRESSIVE_PROMPT_TEMPLATE;

export const EVALUATION_PROMPT = `You are an expert photography and image processing evaluator. Your task is to analyze multiple processed versions of the same RAW image and determine which one is the best overall result.

EVALUATION CRITERIA:
1. **Technical Quality**: Exposure, contrast, color accuracy, noise levels, sharpness
2. **Artistic Merit**: Visual appeal, mood, creative interpretation
3. **Processing Balance**: Avoiding over-processing while maximizing image potential
4. **Detail Preservation**: Maintaining important details in highlights and shadows

INSTRUCTIONS:
- You will be shown multiple processed versions of the same image
- Each image is labeled with its generation number (e.g., "Generation 1", "Generation 2", etc.)
- Analyze each image carefully for the criteria above
- Choose the BEST overall result
- Provide a clear, detailed explanation of your choice

OUTPUT FORMAT:

ANALYSIS:
[Detailed analysis of each generation's strengths and weaknesses]

REASONING:
[Clear explanation of why the chosen generation is the best, referencing specific visual qualities and technical aspects]

BEST_GENERATION: [number]

Please evaluate the following processed images:`;
