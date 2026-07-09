import type { StateManager } from "../stateManager";

/**
 * Decorates file explorer entries with sync badges: a check for synced
 * files and an "M" for files modified since their last sync. Tracks the
 * set of locally dirty files.
 */
export class ExplorerDecorator {
  private dirtyFiles = new Set<string>();

  constructor(private readonly stateManager: StateManager) {}

  /** Mark a file as locally modified and refresh badges. */
  markDirty(path: string): void {
    this.dirtyFiles.add(path);
    this.refresh();
  }

  /** Clear the dirty flag for one file and refresh badges. */
  clearDirty(path: string): void {
    this.dirtyFiles.delete(path);
    this.refresh();
  }

  /** Clear dirty flags for many files (e.g. after a full sync). */
  clearDirtyMany(paths: Iterable<string>): void {
    for (const p of paths) {
      this.dirtyFiles.delete(p);
    }
    this.refresh();
  }

  /** Keep dirty tracking consistent across file renames. */
  renamePath(oldPath: string, newPath: string): void {
    if (this.dirtyFiles.has(oldPath)) {
      this.dirtyFiles.delete(oldPath);
      this.dirtyFiles.add(newPath);
    }
    this.refresh();
  }

  isDirty(path: string): boolean {
    return this.dirtyFiles.has(path);
  }

  /** Re-apply badges to all visible file explorer entries. */
  refresh(): void {
    const allMappings = this.stateManager.getAllFileMappings();

    activeDocument.querySelectorAll<HTMLElement>(".nav-file-title").forEach((el) => {
      const path = el.getAttribute("data-path");
      if (!path) return;

      const isSynced = path in allMappings;
      const isDirty = this.dirtyFiles.has(path);

      el.removeClass("notion-vault-sync-synced");
      el.removeClass("notion-vault-sync-modified");

      if (isSynced && isDirty) {
        el.addClass("notion-vault-sync-modified");
      } else if (isSynced && !isDirty) {
        el.addClass("notion-vault-sync-synced");
      }
    });
  }
}
