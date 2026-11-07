import { PreviewSettings, OutputSettings } from "./types.js";

export const DEFAULT_VISION_MODEL = "gpt-6.1-sol";

export const DEFAULT_EDITABLE_SECTIONS = [
  "Locallab",
  "Exposure",
  "Luminance Curve",
  "Local Contrast",
  "Vibrance",
  "White Balance",
  "Color appearance",
  "Shadows & Highlights",
  "RGB Curves",
  "ColorToning",
  "ToneEqualizer",
  "Sharpening",
  "Dehaze",
  "Directional Pyramid Denoising",
  "Channel Mixer",
];

export const PREVIEW_SETTINGS: PreviewSettings = {
  quality: 80,
};

export const OUTPUT_SETTINGS: OutputSettings = {
  quality: 100,
};
