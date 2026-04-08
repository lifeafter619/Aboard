const LINK_PLACEHOLDER_PATTERN = /%%ABOARD_LINK_(\d+)%%/g;

function hasUnbalancedTrailingParenthesis(url) {
  const openingCount = (url.match(/\(/g) || []).length;
  const closingCount = (url.match(/\)/g) || []).length;
  return closingCount > openingCount;
}

function splitLinkSuffix(candidate) {
  let url = candidate;
  let suffix = '';

  while (url) {
    const closingTagMatch = url.match(/(\[\/(?:color|size)\])$/i);
    if (closingTagMatch) {
      suffix = `${closingTagMatch[1]}${suffix}`;
      url = url.slice(0, -closingTagMatch[1].length);
      continue;
    }

    if (url.endsWith('**') || url.endsWith('__')) {
      const delimiter = url.slice(-2);
      suffix = `${delimiter}${suffix}`;
      url = url.slice(0, -2);
      continue;
    }

    const trailingChar = url.slice(-1);
    if (trailingChar === ')') {
      if (!hasUnbalancedTrailingParenthesis(url)) {
        break;
      }
      suffix = `${trailingChar}${suffix}`;
      url = url.slice(0, -1);
      continue;
    }

    if (/[,.!?;:]/.test(trailingChar)) {
      suffix = `${trailingChar}${suffix}`;
      url = url.slice(0, -1);
      continue;
    }

    break;
  }

  return { url, suffix };
}

function linkifyEscapedText(text) {
  const links = [];

  const withPlaceholders = text.replace(/https?:\/\/[^\s<>"']+/g, (candidate) => {
    const { url, suffix } = splitLinkSuffix(candidate);
    if (!url) {
      return candidate;
    }

    const placeholder = `%%ABOARD_LINK_${links.length}%%`;
    links.push(url);
    return `${placeholder}${suffix}`;
  });

  return withPlaceholders.replace(LINK_PLACEHOLDER_PATTERN, (_, indexText) => {
    const url = links[Number(indexText)];
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--theme-color, #007AFF); text-decoration: none;">${url}</a>`;
  });
}

export class RichTextParser {
  static parse(text) {
    if (!text) return '';

    if (Array.isArray(text)) {
      text = text.join('\n');
    }

    let result = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    result = linkifyEscapedText(result);
    result = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    result = result.replace(/__(.*?)__/g, '<u>$1</u>');
    result = result.replace(/\[color=([^\]]+)\](.*?)\[\/color\]/g, (_, color, text) => {
      const sanitized = color.replace(/[^a-zA-Z0-9#(),.\s%-]/g, '');
      return `<span style="color:${sanitized}">${text}</span>`;
    });
    result = result.replace(/\[size=([^\]]+)\](.*?)\[\/size\]/g, (_, size, text) => {
      const sanitized = size.replace(/[^a-zA-Z0-9.%-]/g, '');
      return `<span style="font-size:${sanitized}">${text}</span>`;
    });

    if (result.includes('\n')) {
      result = result.split('\n').map((line) => {
        if (!line.trim()) return '<br>';
        if (line.trim().match(/^\d+\./)) {
          return `<div style="margin-bottom:4px; font-weight:bold;">${line}</div>`;
        }
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          return `<div style="margin-bottom:4px; padding-left:10px;">${line}</div>`;
        }
        return `<div>${line}</div>`;
      }).join('');
    }

    return result;
  }
}

export function registerRichTextParserGlobal(win = window) {
  win.RichTextParser = RichTextParser;
  return RichTextParser;
}
