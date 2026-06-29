/**
 * Rich Text Parser Module
 * Parses custom rich text syntax into HTML with sanitization.
 * Supported syntax:
 * - Bold: **text**
 * - Underline: __text__
 * - Color: [color=red]text[/color] or [color=#ff0000]text[/color]
 * - Size: [size=20px]text[/size]
 * - URLs: Auto-converted to links
 * - Newlines: Converted to line breaks or divs
 */
class RichTextParser {
    static isSafeColorValue(value) {
        const color = String(value || '').trim();
        return /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?$/.test(color)
            || /^[a-zA-Z]+$/.test(color);
    }

    static isSafeSizeValue(value) {
        const size = String(value || '').trim();
        return /^(?:0|[1-9]\d{0,2})(?:\.\d+)?(?:px|em|rem|%)$/.test(size);
    }

    static parse(text) {
        if (!text) return '';

        // Handle array input (common in localization files for multiline content)
        if (Array.isArray(text)) {
            text = text.join('\n');
        }

        // Escape HTML first to prevent XSS
        let result = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // Auto-link URLs
        result = result.replace(/(https?:\/\/[^\s<>"'\[]+)/g, (match) => {
            let url = match;
            let suffix = '';
            while (url.endsWith('**') || url.endsWith('__')) {
                suffix = url.slice(-2) + suffix;
                url = url.slice(0, -2);
            }
            while (/[.,!?;:]$/.test(url)) {
                suffix = url.slice(-1) + suffix;
                url = url.slice(0, -1);
            }
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--theme-color, #007AFF); text-decoration: none;">${url}</a>${suffix}`;
        });

        // 3. Apply Custom Syntax
        // Bold
        result = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        // Underline
        result = result.replace(/__(.*?)__/g, '<u>$1</u>');
        // Color
        result = result.replace(/\[color=([^\]]+)\](.*?)\[\/color\]/g, (_match, color, content) => {
            const safeColor = String(color || '').trim();
            return RichTextParser.isSafeColorValue(safeColor)
                ? `<span style="color:${safeColor}">${content}</span>`
                : content;
        });
        // Size
        result = result.replace(/\[size=([^\]]+)\](.*?)\[\/size\]/g, (_match, size, content) => {
            const safeSize = String(size || '').trim();
            return RichTextParser.isSafeSizeValue(safeSize)
                ? `<span style="font-size:${safeSize}">${content}</span>`
                : content;
        });

        // 4. Handle Newlines
        if (result.includes('\n')) {
            result = result.split('\n').map(line => {
                if (!line.trim()) return '<br>';
                // Check for lists
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

// Export for use
window.RichTextParser = RichTextParser;
