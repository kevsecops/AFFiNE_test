import {
  type MarkdownAdapterPreprocessor,
  MarkdownPreprocessorExtension,
} from '@blocksuite/affine-shared/adapters';

// Check if a URL is already encoded with encodeURIComponent
function isEncoded(uri: string): boolean {
  try {
    // If decoding produces a different result than the original,
    // then the URI contains encoded characters
    return uri !== decodeURIComponent(uri);
  } catch {
    // If decoding fails, the URI contains invalid percent-encoding
    return true;
  }
}

// Format footnote definition with consistent spacing
function formatFootnoteDefinition(reference: string, data: object): string {
  return `[^${reference}]: ${JSON.stringify(data)}`;
}

/**
 * Preprocessor for footnote url
 * We should encode url in footnote definition to avoid markdown link parsing
 *
 * Example of footnote definition:
 * [^ref]: {"type":"url","url":"https://example.com"}
 */
export function footnoteUrlPreprocessor(content: string): string {
  // Match footnote definitions with any reference (not just numbers)
  // Format: [^reference]: {json_content}
  return content.replace(
    /\[\^([^\]]+)\]:\s*({[\s\S]*?})/g,
    (match, reference, jsonContent) => {
      try {
        const footnoteData = JSON.parse(jsonContent.trim());
        // Basic validation checks
        if (typeof footnoteData !== 'object') {
          return match;
        }

        if (!footnoteData.url) {
          return match;
        }

        // Check if URLs are already encoded
        const isUrlEncoded = isEncoded(footnoteData.url);
        const hasIcon = !!footnoteData.favicon;
        const isIconEncoded = hasIcon && isEncoded(footnoteData.favicon);

        // If both URL and icon (if present) are already encoded, return original
        if (isUrlEncoded && (!hasIcon || isIconEncoded)) {
          return match;
        }

        // Create processed data with encoded URLs
        const processedData = {
          ...footnoteData,
          url: isUrlEncoded
            ? footnoteData.url
            : encodeURIComponent(footnoteData.url),
        };

        // Add encoded favicon if present
        if (hasIcon) {
          processedData.favicon = isIconEncoded
            ? footnoteData.favicon
            : encodeURIComponent(footnoteData.favicon);
        }

        return formatFootnoteDefinition(reference, processedData);
      } catch {
        // Keep original content if JSON parsing fails
        return match;
      }
    }
  );
}

const bookmarkBlockPreprocessor: MarkdownAdapterPreprocessor = {
  name: 'bookmark-block',
  levels: ['block', 'slice', 'doc'],
  preprocess: footnoteUrlPreprocessor,
};

export const BookmarkBlockMarkdownPreprocessorExtension =
  MarkdownPreprocessorExtension(bookmarkBlockPreprocessor);
