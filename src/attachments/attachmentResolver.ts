import { TFile } from "obsidian";
import type { App } from "obsidian";

/**
 * Locates attachment files in the vault, mirroring how Obsidian resolves
 * embed links relative to the source note.
 */
export class AttachmentResolver {
  constructor(private readonly app: App) {}

  find(filename: string, sourceFilePath: string): TFile | null {
    // Try resolving via Obsidian's link resolution
    const resolved = this.app.metadataCache.getFirstLinkpathDest(
      filename,
      sourceFilePath
    );

    if (resolved) return resolved;

    // Fallback: avoid enumerating the entire vault. Try common locations:
    // 1) same folder as source file
    // 2) an "attachments" subfolder next to the source file
    // 3) a top-level "attachments" folder
    // 4) filename at repo root
    const tryPaths: string[] = [];
    const sourceFolder = sourceFilePath.includes("/")
      ? sourceFilePath.slice(0, sourceFilePath.lastIndexOf("/"))
      : "";

    if (sourceFolder) {
      tryPaths.push(`${sourceFolder}/${filename}`);
      tryPaths.push(`${sourceFolder}/attachments/${filename}`);
    }

    tryPaths.push(`attachments/${filename}`);
    tryPaths.push(filename);

    for (const p of tryPaths) {
      const abstract = this.app.vault.getAbstractFileByPath(p);
      if (abstract instanceof TFile) {
        return abstract;
      }
    }

    return null;
  }
}
