import type { StateManager } from "../stateManager";
import { formatTimeAgo } from "../utils";

export type StatusBarState = "idle" | "syncing" | "error";

/**
 * Owns the plugin's status bar item: renders the current sync state and
 * the time of the last full sync.
 */
export class StatusBarController {
  constructor(
    private readonly el: HTMLElement,
    private readonly stateManager: StateManager
  ) {}

  update(state: StatusBarState): void {
    this.el.removeClass("notion-vault-sync-status-error");

    switch (state) {
      case "idle": {
        const lastSync = this.stateManager.lastFullSync;
        if (lastSync > 0) {
          this.el.setText(`☁ Synced ${formatTimeAgo(lastSync)}`);
        } else {
          this.el.setText("☁ ready");
        }
        break;
      }
      case "syncing":
        this.el.setText("⟳ syncing...");
        break;
      case "error":
        this.el.setText("⚠ sync error");
        this.el.addClass("notion-vault-sync-status-error");
        break;
    }
  }
}
