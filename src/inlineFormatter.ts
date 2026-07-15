import type { NotionRichText } from "./types";

/** Max characters per Notion rich text segment */
const MAX_RICH_TEXT_LENGTH = 2000;

/**
 * Converts inline markdown formatting into Notion rich_text arrays.
 * Handles: **bold**, *italic*, ~~strikethrough~~, `code`,
 *          [links](url), [[internal links]]
 */
export class InlineFormatter {
  format(text: string): NotionRichText[] {
    if (!text) return [{ type: "text", text: { content: "" } }];

    const segments: NotionRichText[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      // Inline code: `text`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        segments.push(this.richText(codeMatch[1], { code: true }));
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Bold + italic: ***text*** or ___text___
      const boldItalicMatch = remaining.match(
        /^(\*{3}|_{3})(.+?)\1/
      );
      if (boldItalicMatch) {
        segments.push(
          this.richText(boldItalicMatch[2], { bold: true, italic: true })
        );
        remaining = remaining.slice(boldItalicMatch[0].length);
        continue;
      }

      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(\*{2}|_{2})(.+?)\1/);
      if (boldMatch) {
        segments.push(this.richText(boldMatch[2], { bold: true }));
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)(.+?)\1/);
      if (italicMatch) {
        segments.push(this.richText(italicMatch[2], { italic: true }));
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Strikethrough: ~~text~~
      const strikeMatch = remaining.match(/^~~(.+?)~~/);
      if (strikeMatch) {
        segments.push(this.richText(strikeMatch[1], { strikethrough: true }));
        remaining = remaining.slice(strikeMatch[0].length);
        continue;
      }

      // Markdown link: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        segments.push({
          type: "text",
          text: { content: linkMatch[1], link: { url: linkMatch[2] } },
        });
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Obsidian internal link with alias: [[target|display]]
      const wikiLinkAliasMatch = remaining.match(
        /^\[\[([^\]|]+)\|([^\]]+)\]\]/
      );
      if (wikiLinkAliasMatch) {
        // Store as bold text with a marker — resolved later by linkResolver
        segments.push(
          this.richText(wikiLinkAliasMatch[2], { bold: true })
        );
        remaining = remaining.slice(wikiLinkAliasMatch[0].length);
        continue;
      }

      // Obsidian internal link: [[target]]
      const wikiLinkMatch = remaining.match(/^\[\[([^\]]+)\]\]/);
      if (wikiLinkMatch) {
        segments.push(this.richText(wikiLinkMatch[1], { bold: true }));
        remaining = remaining.slice(wikiLinkMatch[0].length);
        continue;
      }

      // Inline image: ![alt](url) — within paragraph, just add as text link
      const inlineImgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (inlineImgMatch) {
        const linkUrl = inlineImgMatch[2];
        if (!/^https?:\/\//i.test(linkUrl)) {
          console.warn(
            `[NotionSync][parse] inline image link is not a public URL (Notion may reject): ${linkUrl}`
          );
        } else {
          console.log(`[NotionSync][parse] inline image link → ${linkUrl}`);
        }
        segments.push({
          type: "text",
          text: {
            content: inlineImgMatch[1] || "image",
            link: { url: linkUrl },
          },
        });
        remaining = remaining.slice(inlineImgMatch[0].length);
        continue;
      }

      // Plain text: consume until next formatting marker
      const nextMarker = remaining.search(
        /[`*_~[!]|\[\[/
      );
      if (nextMarker === -1) {
        // No more markers — rest is plain text
        segments.push(this.richText(remaining));
        break;
      } else if (nextMarker === 0) {
        // Marker didn't match any pattern — consume single char
        segments.push(this.richText(remaining[0]));
        remaining = remaining.slice(1);
      } else {
        segments.push(this.richText(remaining.slice(0, nextMarker)));
        remaining = remaining.slice(nextMarker);
      }
    }

    // Merge adjacent segments with same formatting and enforce length limits
    return this.normalize(segments);
  }

  /** Split text longer than MAX_RICH_TEXT_LENGTH into multiple segments */
  splitLongText(text: string): NotionRichText[] {
    const segments: NotionRichText[] = [];
    for (let i = 0; i < text.length; i += MAX_RICH_TEXT_LENGTH) {
      segments.push({
        type: "text",
        text: { content: text.slice(i, i + MAX_RICH_TEXT_LENGTH) },
      });
    }
    return segments.length > 0
      ? segments
      : [{ type: "text", text: { content: "" } }];
  }

  private richText(
    content: string,
    annotations?: Partial<NotionRichText["annotations"]>
  ): NotionRichText {
    const rt: NotionRichText = {
      type: "text",
      text: { content },
    };
    if (annotations && Object.values(annotations).some(Boolean)) {
      rt.annotations = {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: "default",
        ...annotations,
      };
    }
    return rt;
  }

  /** Merge adjacent plain-text segments and split any that exceed length limit */
  private normalize(segments: NotionRichText[]): NotionRichText[] {
    const result: NotionRichText[] = [];

    for (const seg of segments) {
      const content = seg.text.content;
      if (content.length <= MAX_RICH_TEXT_LENGTH) {
        result.push(seg);
      } else {
        for (let i = 0; i < content.length; i += MAX_RICH_TEXT_LENGTH) {
          result.push({
            ...seg,
            text: {
              ...seg.text,
              content: content.slice(i, i + MAX_RICH_TEXT_LENGTH),
            },
          });
        }
      }
    }

    return result.length > 0
      ? result
      : [{ type: "text", text: { content: "" } }];
  }
}
