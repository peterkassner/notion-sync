import { requestUrl } from "obsidian";
import type { App, TFile } from "obsidian";

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
    const resp = await requestUrl({
      url: this.uploadUrl,
      method: "POST",
      contentType: "application/octet-stream",
      body: arrayBuffer,
      throw: false,
    });

    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`Upload failed: HTTP ${resp.status}`);
    }

    const data = resp.json as Record<string, unknown>;
    if (!data.url) {
      throw new Error("Upload response missing 'url' field");
    }

    return data.url as string;
  }
}
