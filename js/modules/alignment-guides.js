// Smart alignment guides.
// Pure geometry: given the bounds being dragged and the bounds of every other
// object on the page, work out the snap offset and the guide lines to draw.
// No DOM and no canvas access, so the whole behaviour is unit-testable.

(function initAlignmentGuides(globalScope) {
    'use strict';

    // Two positions count as coinciding within this many canvas units. Snapping
    // is exact, so the epsilon only absorbs float drift from the offset maths.
    const COINCIDENCE_EPSILON = 0.01;

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function normalizeBounds(bounds) {
        if (!bounds) {
            return null;
        }
        const x = Number(bounds.x);
        const y = Number(bounds.y);
        const width = Number(bounds.width);
        const height = Number(bounds.height);
        if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(width) || !isFiniteNumber(height)) {
            return null;
        }
        // Negative extents would invert the edge order and produce guides that
        // point the wrong way; fold them into a positive rectangle first.
        return {
            x: width < 0 ? x + width : x,
            y: height < 0 ? y + height : y,
            width: Math.abs(width),
            height: Math.abs(height)
        };
    }

    // Edge positions along one axis, in the order they should be preferred when
    // two candidates tie: outer edges first, then the centre.
    function axisPositions(bounds, axis) {
        if (axis === 'x') {
            return [
                { key: 'start', value: bounds.x },
                { key: 'end', value: bounds.x + bounds.width },
                { key: 'center', value: bounds.x + bounds.width / 2 }
            ];
        }
        return [
            { key: 'start', value: bounds.y },
            { key: 'end', value: bounds.y + bounds.height },
            { key: 'center', value: bounds.y + bounds.height / 2 }
        ];
    }

    function bestAxisOffset(movingBounds, targets, axis, threshold) {
        const movingPositions = axisPositions(movingBounds, axis);
        let best = 0;
        let bestDistance = Infinity;

        for (const target of targets) {
            const targetPositions = axisPositions(target.bounds, axis);
            for (const movingPosition of movingPositions) {
                for (const targetPosition of targetPositions) {
                    const offset = targetPosition.value - movingPosition.value;
                    const distance = Math.abs(offset);
                    if (distance > threshold || distance >= bestDistance) {
                        continue;
                    }
                    bestDistance = distance;
                    best = offset;
                }
            }
        }

        return best;
    }

    // Every guide that is genuinely coincident once the offset is applied, so a
    // row of aligned objects all light up rather than only the nearest one.
    function collectGuides(movedBounds, targets, axis) {
        const guides = [];
        const movingPositions = axisPositions(movedBounds, axis);

        for (const target of targets) {
            const targetPositions = axisPositions(target.bounds, axis);
            for (const movingPosition of movingPositions) {
                for (const targetPosition of targetPositions) {
                    if (Math.abs(targetPosition.value - movingPosition.value) > COINCIDENCE_EPSILON) {
                        continue;
                    }

                    // The guide spans both objects so it reads as a link between
                    // them, except for full-canvas references which span it all.
                    const crossAxis = axis === 'x' ? 'y' : 'x';
                    const crossSize = crossAxis === 'y' ? 'height' : 'width';
                    const from = Math.min(movedBounds[crossAxis], target.bounds[crossAxis]);
                    const to = Math.max(
                        movedBounds[crossAxis] + movedBounds[crossSize],
                        target.bounds[crossAxis] + target.bounds[crossSize]
                    );

                    guides.push({
                        axis,
                        position: targetPosition.value,
                        start: target.spansCanvas ? target.bounds[crossAxis] : from,
                        end: target.spansCanvas
                            ? target.bounds[crossAxis] + target.bounds[crossSize]
                            : to,
                        movingEdge: movingPosition.key,
                        targetEdge: targetPosition.key,
                        spansCanvas: target.spansCanvas === true
                    });
                }
            }
        }

        return dedupeGuides(guides);
    }

    // One line per distinct position and span; a centre-to-centre and an
    // edge-to-edge match at the same coordinate must not double-draw.
    function dedupeGuides(guides) {
        const seen = new Map();
        for (const guide of guides) {
            const key = [
                guide.axis,
                guide.position.toFixed(2),
                guide.start.toFixed(2),
                guide.end.toFixed(2)
            ].join('|');
            const existing = seen.get(key);
            if (!existing) {
                seen.set(key, guide);
                continue;
            }
            // Prefer the widest span so the longer line wins.
            if (guide.end - guide.start > existing.end - existing.start) {
                seen.set(key, guide);
            }
        }
        return [...seen.values()];
    }

    /**
     * @param {{x:number,y:number,width:number,height:number}} movingBounds
     *   Bounds of the dragged selection at its unsnapped position.
     * @param {Array<{bounds:object, spansCanvas?:boolean}>} targets
     *   Static reference bounds. Pass the canvas rect with spansCanvas so its
     *   guides run the full width/height.
     * @param {{threshold?:number}} [options]
     * @returns {{dx:number, dy:number, guides:Array<object>}}
     */
    function computeAlignment(movingBounds, targets, options = {}) {
        const empty = { dx: 0, dy: 0, guides: [] };
        const moving = normalizeBounds(movingBounds);
        if (!moving || !Array.isArray(targets) || targets.length === 0) {
            return empty;
        }

        const threshold = isFiniteNumber(options.threshold) && options.threshold > 0
            ? options.threshold
            : 6;

        const normalizedTargets = targets
            .map((target) => {
                const bounds = normalizeBounds(target?.bounds ?? target);
                return bounds ? { bounds, spansCanvas: target?.spansCanvas === true } : null;
            })
            .filter(Boolean);

        if (normalizedTargets.length === 0) {
            return empty;
        }

        const dx = bestAxisOffset(moving, normalizedTargets, 'x', threshold);
        const dy = bestAxisOffset(moving, normalizedTargets, 'y', threshold);

        const movedBounds = {
            x: moving.x + dx,
            y: moving.y + dy,
            width: moving.width,
            height: moving.height
        };

        const guides = [
            ...collectGuides(movedBounds, normalizedTargets, 'x'),
            ...collectGuides(movedBounds, normalizedTargets, 'y')
        ];

        // A snap that produced no coincident guide is not a snap worth keeping;
        // reporting the offset without a visible line would move the object for
        // no reason the user can see.
        if (guides.length === 0) {
            return empty;
        }

        return { dx, dy, guides };
    }

    // WCAG 2.2 SC 1.4.11 non-text contrast. A guide the teacher cannot see on
    // a chalkboard background is the same as no guide at all.
    const MIN_GUIDE_CONTRAST = 3;
    const CASING_LIGHT = '#ffffff';
    const CASING_DARK = '#111827';

    function relativeLuminance(rgb) {
        const toLinear = (component) => {
            const channel = Math.max(0, Math.min(255, component)) / 255;
            return channel <= 0.04045
                ? channel / 12.92
                : ((channel + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * toLinear(rgb[0])
            + 0.7152 * toLinear(rgb[1])
            + 0.0722 * toLinear(rgb[2]);
    }

    function parseColor(value) {
        if (Array.isArray(value)) {
            return value.length >= 3 && value.slice(0, 3).every(isFiniteNumber)
                ? [value[0], value[1], value[2]]
                : null;
        }
        if (typeof value !== 'string') return null;
        const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
        if (hex) {
            const digits = hex[1].length === 3
                ? hex[1].split('').map((c) => c + c).join('')
                : hex[1];
            return [
                parseInt(digits.slice(0, 2), 16),
                parseInt(digits.slice(2, 4), 16),
                parseInt(digits.slice(4, 6), 16)
            ];
        }
        const rgb = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(value);
        return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
    }

    function contrastRatio(colorA, colorB) {
        const a = parseColor(colorA);
        const b = parseColor(colorB);
        if (!a || !b) return 1;
        const la = relativeLuminance(a);
        const lb = relativeLuminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    /**
     * Casing colour to stroke *under* the guide so it stays visible on any
     * background. Returns null when the guide colour already clears
     * MIN_GUIDE_CONTRAST on its own, so light and dark boards keep the plain
     * single-pixel line they have today.
     */
    function pickGuideCasing(guideColor, backgroundColor) {
        const background = parseColor(backgroundColor);
        if (!background) return null;
        if (contrastRatio(guideColor, background) >= MIN_GUIDE_CONTRAST) {
            return null;
        }
        const light = contrastRatio(CASING_LIGHT, background);
        const dark = contrastRatio(CASING_DARK, background);
        return light >= dark ? CASING_LIGHT : CASING_DARK;
    }

    const api = {
        computeAlignment,
        pickGuideCasing,
        contrastRatio,
        relativeLuminance,
        parseColor,
        MIN_GUIDE_CONTRAST,
        COINCIDENCE_EPSILON
    };

    if (globalScope) {
        globalScope.AboardAlignmentGuides = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : undefined);
