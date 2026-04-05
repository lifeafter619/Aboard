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

    result = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    result = result.replace(/__(.*?)__/g, '<u>$1</u>');
    result = result.replace(/\[color=([^\]]+)\](.*?)\[\/color\]/g, '<span style="color:$1">$2</span>');
    result = result.replace(/\[size=([^\]]+)\](.*?)\[\/size\]/g, '<span style="font-size:$1">$2</span>');

    result = result.replace(/(https?:\/\/[^\s]+)/g, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--theme-color, #007AFF); text-decoration: none;">${url}</a>`;
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
