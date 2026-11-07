# Validation log

Date: 2026-08-31

## Read-only evidence collected

- Read the existing guidance, validation report, and the required Guidance 1/2 records.
- Reviewed official RawPedia pages already recorded for Exposure, White Balance, Noise Reduction, Sharpening, and Local Adjustments.
- Inspected `art-main/output/DSC00906.pp3` (`AppVersion=5.13`) and example PP3 files (`AppVersion=5.11`). Exact section/key presence was recorded in `rt-mapping.yaml`.
- Confirmed candidate local bundles containing RAW + PP3 + rendered JPEG under `art-main/examples/`.

## Execution checks

- `Get-Command rawtherapee-cli,rawtherapee` returned no command. No GUI or CLI render was run.
- No source RAW, PP3, JPEG, or `art-main` source file was modified.
- Therefore no record is marked `cli_reproducible: true`, and PP3 field presence is not treated as rendered-behavior proof.

## Required next validation

1. Use a matching RawTherapee 5.13 executable on copied assets.
2. Save isolated GUI changes for Exposure, WB, Denoise, Sharpening, and a populated Locallab RT-spot.
3. Diff the PP3 files and render each with `rawtherapee-cli`; retain commands, outputs, and logs.
