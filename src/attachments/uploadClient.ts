import { requestUrl } from "obsidian";
import type { App, TFile } from "obsidian";

/** Redact query tokens so console logs stay safe to share. */
function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("token")) u.searchParams.set("token", "…");
    return u.toString();
  } catch {
    return url.replace(/([?&]token=)[^&]*/gi, "$1…");
  }
}

/**
 * Uploads vault files to the user-configured external endpoint.
 * Expects a POST endpoint that accepts the raw file body and returns
 * JSON with { url: string }.
 */
export class UploadClient {
  private uploadUrl: string;

  constructor(private readonly app: App, uploadUrl: string) {
    this.uploadUrl = uploadUrl;
  }

  setUrl(url: string): void {
    this.uploadUrl = url;
  }

  get configured(): boolean {
    return this.uploadUrl.length > 0;
  }

  async upload(file: TFile): Promise<string> {
    const arrayBuffer = await this.app.vault.readBinary(file);
    console.log(
      `[NotionSync][upload] POST ${redactUrl(this.uploadUrl)} ← ${file.path} (${arrayBuffer.byteLength} bytes)`
    );

    const resp = await requestUrl({
      url: this.uploadUrl,
      method: "POST",
      contentType: "application/octet-stream",
      body: arrayBuffer,
      throw: false,
    });

    if (resp.status < 200 || resp.status >= 300) {
      console.error(
        `[NotionSync][upload] failed HTTP ${resp.status} for ${file.path}:`,
        resp.text?.slice?.(0, 500) ?? resp.text
      );
      throw new Error(`Upload failed: HTTP ${resp.status}`);
    }

    let data: Record<string, unknown>;
    try {
      data = resp.json as Record<string, unknown>;
    } catch (e) {
      console.error(
        `[NotionSync][upload] non-JSON response for ${file.path}:`,
        resp.text?.slice?.(0, 500) ?? resp.text,
        e
      );
      throw new Error("Upload response was not JSON");
    }

    if (!data.url || typeof data.url !== "string") {
      console.error(`[NotionSync][upload] missing url field for ${file.path}:`, data);
      throw new Error("Upload response missing 'url' field");
    }

    console.log(`[NotionSync][upload] ok ${file.path} → ${data.url}`);
    return data.url;
  }
}
