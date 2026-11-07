// Section manipulation functionality extracted from agent.ts
import { SectionChange } from "../pp3-parser.js";
import { splitContentIntoSections } from "./section-parser.js";
import camelcase from "camelcase";
import { applyLocalAdjustments } from "./local-adjustments.js";

/**
 * Creates a map of section names to section content
 */
export function createSectionMap(sections: string[]): Map<string, string> {
  const sectionMap = new Map<string, string>();

  for (const section of sections) {
    const sectionHeaderMatch = /^\[(.*?)\]/.exec(section);
    if (sectionHeaderMatch) {
      const sectionName = sectionHeaderMatch[1];
      sectionMap.set(sectionName, section);
    }
  }

  return sectionMap;
}

/**
 * Applies changes to sections in the section map
 */
export function applySectionChanges(
  sectionMap: Map<string, string>,
  sectionChanges: SectionChange[],
  verbose: boolean,
): void {
  for (const change of sectionChanges) {
    const { sectionName, parameters } = change;

    if (verbose) {
      console.log(`Applying changes to section [${sectionName}]`);
    }

    // Get the original section content
    const originalSection = sectionMap.get(sectionName);
    if (!originalSection) {
      if (verbose) {
        console.warn(`Section [${sectionName}] not found in original content`);
      }
      continue;
    }

    // Apply parameter changes to the section
    const updatedSection = applyParameterChanges(
      originalSection,
      parameters,
      sectionName,
      verbose,
    );

    // Update the section in the map
    sectionMap.set(sectionName, updatedSection);
  }
}

/**
 * Applies parameter changes to a section
 */
export function applyParameterChanges(
  sectionContent: string,
  parameters: Map<string, string>,
  sectionName: string,
  verbose: boolean,
): string {
  const sectionLines = sectionContent.split("\n");
  const updatedLines = [...sectionLines];

  for (const [parameterName, parameterLine] of parameters.entries()) {
    const parameterRegex = new RegExp(`^\\s*${parameterName}\\s*=.*$`, "m");
    const parameterLineIndex = sectionLines.findIndex((line) =>
      parameterRegex.test(line),
    );

    const indexOfAssignment = parameterLine.indexOf("=");

    if (
      parameterLineIndex !== -1 &&
      camelcase(updatedLines[parameterLineIndex].slice(indexOfAssignment)) !==
        camelcase(parameterLine).slice(indexOfAssignment)
    ) {
      // Replace the parameter line
      updatedLines[parameterLineIndex] = parameterLine;

      if (verbose) {
        console.log(
          `  Changed: ${sectionLines[parameterLineIndex]} -> ${parameterLine}`,
        );
      }
    } else if (verbose) {
      console.warn(
        `  Parameter ${parameterName} not found in section [${sectionName}]`,
      );
    }
  }

  return updatedLines.join("\n");
}

/**
 * Reconstructs content from section map preserving original order
 */
export function reconstructContent(
  sectionOrders: string[],
  sectionMap: Map<string, string>,
): string {
  return sectionOrders
    .map((sectionName) => sectionMap.get(sectionName) ?? "")
    .filter(Boolean)
    .join("\n");
}

/**
 * Reconstructs PP3 content from various section arrays
 */
export function reconstructPP3Content(
  sectionOrders: string[],
  editedSections: string[],
  includedSections: string[],
  excludedSections: string[],
): string {
  return sectionOrders
    .map((sectionName) => {
      return (
        editedSections.find((section) =>
          section.startsWith(`[${sectionName}]`),
        ) ??
        includedSections.find((section) =>
          section.startsWith(`[${sectionName}]`),
        ) ??
        excludedSections.find((section) =>
          section.startsWith(`[${sectionName}]`),
        ) ??
        ""
      );
    })
    .join("\n");
}

/**
 * Applies direct section changes to PP3 content
 * @param content - The original PP3 content
 * @param sectionChanges - Array of section changes to apply
 * @param verbose - Whether to log verbose information
 * @returns Updated PP3 content with changes applied
 */
export function applyDirectSectionChanges(
  content: string,
  sectionChanges: SectionChange[],
  verbose: boolean,
  allowedSections?: string[],
): string {
  if (sectionChanges.length === 0) {
    if (verbose) console.log("No section changes to apply");
    return content;
  }
  if (
    sectionChanges.every(
      (c) => c.sectionName === "Locallab" && c.parameters.size === 0,
    )
  )
    return content;

  const localChanges = sectionChanges.filter(
    (c) => c.sectionName === "Locallab",
  );
  if (
    localChanges.length &&
    allowedSections &&
    !allowedSections.includes("Locallab")
  ) {
    throw new Error(
      "Locallab: section excluded by sections; changes were not applied",
    );
  }
  // Split content into sections for easier manipulation
  const { sections, sectionOrders } = splitContentIntoSections(content);
  const sectionMap = createSectionMap(sections);

  // Apply changes to each section
  applySectionChanges(
    sectionMap,
    sectionChanges.filter((c) => c.sectionName !== "Locallab"),
    verbose,
  );

  // Reconstruct the content preserving the original section order
  const updated = reconstructContent(sectionOrders, sectionMap);
  // Guard both the baseline and resulting geometry (including same-response edits).
  if (localChanges.length) {
    applyLocalAdjustments(content, localChanges);
    return applyLocalAdjustments(updated, localChanges);
  }
  return updated;
}
