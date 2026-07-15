import type { App, TFile } from "obsidian";
import type { NotionBlock, NotionBlockContent } from "./types";
import type { StateManager } from "./stateManager";
import { EMBED_PLACEHOLDER_PREFIX, errMsg } from "./utils";
import { AttachmentResolver } from "./attachments/attachmentResolver";
import { UploadClient } from "./attachments/uploadClient";
import { AttachmentBlockFactory } from "./attachments/attachmentBlockFactory";
import { isImageExtension } from "./attachments/fileTypes";

/**
 * Resolves Obsidian attachment embeds (![[file.png]]) in parsed blocks:
 * finds the file in the vault (AttachmentResolver), uploads it when an
 * endpoint is configured (UploadClient), and emits the matching Notion
 * block (AttachmentBlockFactory). Without an upload endpoint, embeds
 * become callout placeholders.
 */
export class AttachmentUploader {
  private readonly resolver: AttachmentResolver;
  private readonly uploader: UploadClient;
  private readonly blocks = new AttachmentBlockFactory();

  constructor(
    app: App,
    private readonly stateManager: StateManager,
    uploadUrl: string
  ) {
    this.resolver = new AttachmentResolver(app);
    this.uploader = new UploadClient(app, uploadUrl);
  }

  /** Update the upload URL when settings change */
  setUploadUrl(url: string): void {
    this.uploader.setUrl(url);
  }

  /**
   * Process a markdown file's parsed blocks and resolve attachment embeds.
   * Returns blocks with embeds resolved to image blocks where possible.
   */
  async processBlocks(
    blocks: NotionBlock[],
    sourceFilePath: string
  ): Promise<NotionBlock[]> {
    const processed: NotionBlock[] = [];

    for (const block of blocks) {
      // Check if this is an embed placeholder callout
      const calloutData = block.type === "callout" ? (block.callout as NotionBlockContent | undefined) : undefined;
      if (
        calloutData?.rich_text?.[0]?.text?.content?.startsWith(EMBED_PLACEHOLDER_PREFIX)
      ) {
        const filename = (calloutData.rich_text)[0].text?.content.replace(
          EMBED_PLACEHOLDER_PREFIX,
          ""
        );
        const resolved = await this.resolveEmbed(filename, sourceFilePath);
        processed.push(resolved);
      } else {
        processed.push(block);
      }
    }

    return processed;
  }

  /**
   * Resolve a single embed reference to a Notion block.
   */
  private async resolveEmbed(
    filename: string,
    sourceFilePath: string
  ): Promise<NotionBlock> {
    const file = this.resolver.find(filename, sourceFilePath);
    if (!file) {
      this.stateManager.addLog("warn", `Attachment not found: ${filename}`, sourceFilePath);
      console.warn(`[NotionSync][embed] not found: ${filename} (from ${sourceFilePath})`);
      return this.blocks.placeholder(filename, "File not found in vault");
    }

    console.log(`[NotionSync][embed] resolve ${filename} → ${file.path} (.${file.extension})`);

    const ext = file.extension.toLowerCase();

    if (isImageExtension(ext)) {
      return this.handleImage(file);
    }

    if (ext === "pdf") {
      return this.handlePdf(file);
    }

    return this.blocks.placeholder(filename, `Unsupported embed type: .${ext}`);
  }

  /**
   * Handle image embeds. If an upload URL is configured, upload the image
   * and return an external image block. Otherwise return a placeholder.
   */
  private async handleImage(file: TFile): Promise<NotionBlock> {
    if (this.uploader.configured) {
      try {
        const url = await this.uploader.upload(file);
        return this.blocks.image(url, file.name);
      } catch (error) {
        this.stateManager.addLog(
          "error",
          `Failed to upload ${file.name}: ${errMsg(error)}`,
          file.path
        );
      }
    }

    return this.blocks.placeholder(
      file.name,
      this.uploader.configured
        ? "Upload failed"
        : "Configure attachment upload URL in settings to sync images"
    );
  }

  /**
   * Handle PDF embeds similarly to images.
   */
  private async handlePdf(file: TFile): Promise<NotionBlock> {
    if (this.uploader.configured) {
      try {
        const url = await this.uploader.upload(file);
        return this.blocks.pdf(url, file.name);
      } catch (error) {
        this.stateManager.addLog(
          "error",
          `Failed to upload ${file.name}: ${errMsg(error)}`,
          file.path
        );
      }
    }

    return this.blocks.placeholder(file.name, "Configure upload URL for PDF embeds");
  }
}
