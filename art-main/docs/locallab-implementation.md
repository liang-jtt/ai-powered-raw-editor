# Locallab implementation record

Approved scope: the user handoff in this chat. Reuse PP3 section responses, parser, AI generation and CLI; no new service or dependencies.

Plan (TDD):
- [x] Add parser-to-writer tests for controlled spot creation, append/edit, validation, preservation, sections permissions and geometry guards; observe failures.
- [x] Add pp3-sections/local-adjustments.ts for the verified 5.13 schema/defaults and atomic writes. Existing generic writer only delegates Locallab.
- [x] Integrate the production response path, allowed-section/geometry context and all built-in prompts without aesthetic changes.
- [x] Test complete mocked AI request/response path (no network); run suite and TypeScript.
- [x] Render textured synthetic controls and workspace RAWs locally; retain timestamped PP3s, comparisons, measurements and sources.
- [x] Review code against the handoff, fix findings, rerun affected checks.

Native coordinate contract: center fraction = 0.5 + Center/2000. Extents = Loc/2000 along each axis. No pixel coordinates. Preview resize preserves the frame. Unsupported crop/manual geometry must not silently apply local edits. Default camera orientation must be checked against actual RAW renders.

Completed: tests and tsc passed, native schemas/coordinates verified, local CLI renders and manual image QA retained. Review found and fixed header-free legacy bypass and corner intersection validation. See locallab.md and timestamped VALIDATION.md.
