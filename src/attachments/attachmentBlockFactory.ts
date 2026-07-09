import type { NotionBlock } from "../types";

/**
 * Builds the Notion blocks that represent attachments: external images,
 * external PDFs, and callout placeholders for unresolved embeds.
 */
export class AttachmentBlockFactory {
  image(url: string, caption: string): NotionBlock {
    return {
      type: "image",
      image: {
        type: "external",
        external: { url },
        caption: [
          { type: "text", text: { content: caption } },
        ],
      },
    };
  }

  pdf(url: string, caption: string): NotionBlock {
    return {
      type: "pdf",
      pdf: {
        type: "external",
        external: { url },
        caption: [
          { type: "text", text: { content: caption } },
        ],
      },
    };
  }

  placeholder(filename: string, reason: string): NotionBlock {
    return {
      type: "callout",
      callout: {
        rich_text: [
          {
            type: "text",
            text: {
              content: `\u{1F4CE} ${filename}\n${reason}`,
            },
          },
        ],
        icon: { type: "emoji", emoji: "\u{1F4CE}" },
        color: "gray_background",
      },
    };
  }
}
