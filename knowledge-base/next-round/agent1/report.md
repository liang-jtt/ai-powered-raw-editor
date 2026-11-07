# Agent 1 RawTherapee mapping report

## Completed

- Mapped 13 RawTherapee semantic actions to observed PP3 sections/fields or explicitly marked the field unknown.
- Covered Exposure, White Balance, Noise Reduction, Wavelet, Sharpening, and Local Adjustments.
- Classified 11 Lightroom-derived actions: 1 directly supported, 6 approximate mappings, 2 conceptual-only, and 2 unsupported.
- Identified three project-local RAW + PP3 + JPEG candidate bundles; none satisfies the complete-case requirements due to unknown provenance/license, missing documented process, and missing independent before output.

## Counts

| Item | Count |
|---|---:|
| Mapping records | 13 |
| Verified-rule records | 12 |
| Compatibility records | 11 |
| Directly supported | 1 |
| Approximate mappings | 7 |
| Conceptual-only | 1 |
| Unsupported | 2 |
| Pending/blocking validations | 9 |
| Complete cases confirmed | 0 |

## Main risks and blockers

- `rawtherapee-cli` is unavailable from PATH, so configuration application was not tested.
- PP3 field names are observed in 5.11/5.13 sample files, but their accepted ranges and UI serialization must be tested.
- No populated Locallab PP3 was available; RT-spot Scope, Transition, and color-mask parameter mappings remain unknown.
- Local example asset licensing/provenance is unknown; they are candidates, not legally confirmed downloadable cases.

## Next step

Run isolated GUI-to-PP3 diffs and copied-RAW CLI renders with a version-matched RawTherapee installation. Promote only mappings whose output changes and version behavior are captured in the validation log.
