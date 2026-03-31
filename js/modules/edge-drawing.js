/**
 * Edge Drawing Module
 * Handles the logic for drawing along the edges of teaching tools (rulers and set squares)
 * When the pen touches the edge of a ruler or set square, it constrains drawing to that edge
 */

// Default edge tolerance in pixels for detecting edge proximity
const DEFAULT_EDGE_TOLERANCE = 15;
// Corner tolerance is larger to make it easier to hit corners when drawing
const DEFAULT_CORNER_TOLERANCE = 25;

class EdgeDrawingManager {
    constructor(teachingToolsManager, drawingEngine) {
        this.teachingToolsManager = teachingToolsManager;
        this.drawingEngine = drawingEngine;
        
        // Edge snapping state
        this.isSnappedToEdge = false;
        this.snappedTool = null;
        this.snappedEdge = null;
        this.edgeTolerance = DEFAULT_EDGE_TOLERANCE;
        this.cornerTolerance = DEFAULT_CORNER_TOLERANCE;
    }
    
    /**
     * Check if a point is near any tool edge and return snapping info
     * @param {number} x - X coordinate in canvas space
     * @param {number} y - Y coordinate in canvas space
     * @returns {Object|null} - Snapping info or null if not near any edge
     */
    checkEdgeProximity(x, y) {
        const tools = this.teachingToolsManager.tools;
        
        for (const tool of tools) {
            const edgeInfo = this.getEdgeAtPoint(x, y, tool);
            if (edgeInfo) {
                return {
                    tool: tool,
                    edge: edgeInfo.edge,
                    snappedPoint: edgeInfo.snappedPoint
                };
            }
        }
        return null;
    }
    
    /**
     * Get the edge of a tool that a point is near
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} tool - The teaching tool
     * @returns {Object|null} - Edge info with snapped point or null
     */
    getEdgeAtPoint(x, y, tool) {
        // Transform point to tool's local coordinate space
        const localPoint = this.transformToToolSpace(x, y, tool);
        
        if (tool.type === 'ruler') {
            return this.getRulerEdgeAtPoint(localPoint, tool, x, y);
        } else if (tool.type === 'setSquare') {
            return this.getSetSquareEdgeAtPoint(localPoint, tool, x, y);
        }
        return null;
    }
    
    /**
     * Check if a point is near a ruler edge
     * Rulers have 4 edges: top, bottom, left, right
     * All edges can be used for drawing straight lines
     */
    getRulerEdgeAtPoint(localPoint, tool, originalX, originalY) {
        const { x: tx, y: ty, width, height } = tool;
        const lx = localPoint.x;
        const ly = localPoint.y;
        
        // Check bottom edge (horizontal)
        const bottomY = ty + height;
        if (Math.abs(ly - bottomY) < this.edgeTolerance && lx >= tx - this.edgeTolerance && lx <= tx + width + this.edgeTolerance) {
            const snappedLocal = { x: Math.max(tx, Math.min(tx + width, lx)), y: bottomY };
            const snappedWorld = this.transformToWorldSpace(snappedLocal.x, snappedLocal.y, tool);
            return { edge: 'bottom', snappedPoint: snappedWorld };
        }
        
        // Check top edge (horizontal)
        if (Math.abs(ly - ty) < this.edgeTolerance && lx >= tx - this.edgeTolerance && lx <= tx + width + this.edgeTolerance) {
            const snappedLocal = { x: Math.max(tx, Math.min(tx + width, lx)), y: ty };
            const snappedWorld = this.transformToWorldSpace(snappedLocal.x, snappedLocal.y, tool);
            return { edge: 'top', snappedPoint: snappedWorld };
        }
        
        // Check left edge (vertical) - for drawing vertical lines along ruler edge
        if (Math.abs(lx - tx) < this.edgeTolerance && ly >= ty - this.edgeTolerance && ly <= ty + height + this.edgeTolerance) {
            const snappedLocal = { x: tx, y: Math.max(ty, Math.min(ty + height, ly)) };
            const snappedWorld = this.transformToWorldSpace(snappedLocal.x, snappedLocal.y, tool);
            return { edge: 'left', snappedPoint: snappedWorld };
        }
        
        // Check right edge (vertical) - for drawing vertical lines along ruler edge
        const rightX = tx + width;
        if (Math.abs(lx - rightX) < this.edgeTolerance && ly >= ty - this.edgeTolerance && ly <= ty + height + this.edgeTolerance) {
            const snappedLocal = { x: rightX, y: Math.max(ty, Math.min(ty + height, ly)) };
            const snappedWorld = this.transformToWorldSpace(snappedLocal.x, snappedLocal.y, tool);
            return { edge: 'right', snappedPoint: snappedWorld };
        }
        
        return null;
    }
    
    /**
     * Check if a point is near a set square edge
     * Set squares are right triangles with three drawable edges:
     * Top edge: horizontal edge at the top
     * Left edge: vertical edge on the left side
     * Hypotenuse: diagonal edge from top-right to bottom-left
     * Corners use a larger tolerance for easier angle drawing
     */
    getSetSquareEdgeAtPoint(localPoint, tool, originalX, originalY) {
        const { x: tx, y: ty, width, height } = tool;
        const lx = localPoint.x;
        const ly = localPoint.y;
        
        // Triangle vertices in local space:
        // Top-left (right angle vertex): (tx, ty)
        // Top-right: (tx + width, ty)
        // Bottom-left: (tx, ty + height)
        const topLeft = { x: tx, y: ty };
        const topRight = { x: tx + width, y: ty };
        const bottomLeft = { x: tx, y: ty + height };
        
        // Calculate distance to each vertex for corner tolerance
        const distToTopLeft = Math.sqrt((lx - topLeft.x) ** 2 + (ly - topLeft.y) ** 2);
        const distToTopRight = Math.sqrt((lx - topRight.x) ** 2 + (ly - topRight.y) ** 2);
        const distToBottomLeft = Math.sqrt((lx - bottomLeft.x) ** 2 + (ly - bottomLeft.y) ** 2);
        
        // Use larger corner tolerance near vertices
        const isNearTopLeft = distToTopLeft < this.cornerTolerance;
        const isNearTopRight = distToTopRight < this.cornerTolerance;
        const isNearBottomLeft = distToBottomLeft < this.cornerTolerance;
        
        // Determine effective tolerance based on proximity to corners
        const effectiveTolerance = (isNearTopLeft || isNearTopRight || isNearBottomLeft) 
            ? this.cornerTolerance 
            : this.edgeTolerance;
        
        // Check top edge (horizontal) - from top-left to top-right
        // Use distance to segment which already handles bounds correctly
        const distToTop = this.distanceToSegment(lx, ly, topLeft.x, topLeft.y, topRight.x, topRight.y);
        if (distToTop < effectiveTolerance) {
            // Snap to the nearest point on the edge, clamped to edge bounds
            const snappedLocal = { x: Math.max(tx, Math.min(tx + width, lx)), y: ty };
            const snappedWorld = this.transformToWorldSpace(snappedLocal.x, snappedLocal.y, tool);
            return { edge: 'top', snappedPoint: snappedWorld };
        }
        
        // Check left edge (vertical) - from top-left to bottom-left
        const distToLeft = this.distanceToSegment(lx, ly, topLeft.x, topLeft.y, bottomLeft.x, bottomLeft.y);
        if (distToLeft < effectiveTolerance) {
            // Snap to the nearest point on the edge, clamped to edge bounds
            const snappedLocal = { x: tx, y: Math.max(ty, Math.min(ty + height, ly)) };
            const snappedWorld = this.transformToWorldSpace(snappedLocal.x, snappedLocal.y, tool);
            return { edge: 'left', snappedPoint: snappedWorld };
        }
        
        // Check hypotenuse (diagonal) - from top-right to bottom-left
        const distToHypotenuse = this.distanceToSegment(lx, ly, topRight.x, topRight.y, bottomLeft.x, bottomLeft.y);
        if (distToHypotenuse < effectiveTolerance) {
            // Project point onto the hypotenuse line segment (already clamped by projectPointOnSegment)
            const snappedLocal = this.projectPointOnSegment(lx, ly, topRight.x, topRight.y, bottomLeft.x, bottomLeft.y);
            const snappedWorld = this.transformToWorldSpace(snappedLocal.x, snappedLocal.y, tool);
            return { edge: 'hypotenuse', snappedPoint: snappedWorld };
        }
        
        return null;
    }
    
    /**
     * Check if a point is inside the tool area (not on edge)
     * Used to block drawing inside the tool
     */
    isPointInsideTool(x, y, tool) {
        const localPoint = this.transformToToolSpace(x, y, tool);
        
        if (tool.type === 'ruler') {
            return this.isPointInsideRuler(localPoint, tool);
        } else if (tool.type === 'setSquare') {
            return this.isPointInsideSetSquare(localPoint, tool);
        }
        return false;
    }
    
    isPointInsideRuler(localPoint, tool) {
        const { x: tx, y: ty, width, height } = tool;
        const margin = this.edgeTolerance; // Add margin for edge detection area
        return localPoint.x > tx + margin && 
               localPoint.x < tx + width - margin && 
               localPoint.y > ty + margin && 
               localPoint.y < ty + height - margin;
    }
    
    isPointInsideSetSquare(localPoint, tool) {
        const { x: tx, y: ty, width, height } = tool;
        const lx = localPoint.x;
        const ly = localPoint.y;
        
        // For set square: all three edges (top, left, hypotenuse) support edge drawing.
        // The bottom-right area (below the diagonal from top-right to bottom-left) 
        // should allow normal drawing without blocking.
        
        // Check if point is within the image bounds
        if (lx < tx || lx > tx + width || ly < ty || ly > ty + height) {
            return false; // Outside bounds, allow drawing
        }
        
        // Triangle vertices
        const topRight = { x: tx + width, y: ty };
        const bottomLeft = { x: tx, y: ty + height };
        
        // Check if point is in the bottom-right area (below the hypotenuse diagonal)
        // The diagonal goes from top-right (tx + width, ty) to bottom-left (tx, ty + height)
        // The equation of this line: (lx - tx) / width + (ly - ty) / height = 1
        // Points below/right of this line satisfy: (lx - tx) / width + (ly - ty) / height > 1
        const normalizedX = (lx - tx) / width;
        const normalizedY = (ly - ty) / height;
        if (normalizedX + normalizedY > 1) {
            // Point is in the bottom-right area (below the hypotenuse)
            // Allow free drawing here - don't block
            return false;
        }
        
        // Check distance from top edge - will snap to edge
        const distToTop = Math.abs(ly - ty);
        if (distToTop < this.edgeTolerance) {
            return false; // Near top edge, don't block
        }
        
        // Check distance from left edge - will snap to edge
        const distToLeft = Math.abs(lx - tx);
        if (distToLeft < this.edgeTolerance) {
            return false; // Near left edge, don't block
        }
        
        // Check distance from hypotenuse - will snap to edge
        const distToHypotenuse = this.distanceToSegment(lx, ly, topRight.x, topRight.y, bottomLeft.x, bottomLeft.y);
        if (distToHypotenuse < this.edgeTolerance) {
            return false; // Near hypotenuse, don't block
        }
        
        // Point is inside the set square area (upper-left triangle) and not near any edge
        // Only block if the point is truly in the interior of the upper-left triangle
        const interiorMargin = this.edgeTolerance * 2;
        const effectiveWidth = width - interiorMargin * 2;
        const effectiveHeight = height - interiorMargin * 2;
        
        // Guard against division by zero for very small tools
        if (effectiveWidth <= 0 || effectiveHeight <= 0) {
            return false; // Tool is too small to have a meaningful interior
        }
        
        if (lx > tx + interiorMargin && ly > ty + interiorMargin) {
            // Check if still within the upper-left triangle (accounting for margin)
            const marginNormalizedX = (lx - tx - interiorMargin) / effectiveWidth;
            const marginNormalizedY = (ly - ty - interiorMargin) / effectiveHeight;
            if (marginNormalizedX + marginNormalizedY < 0.8) {
                return true; // Block drawing in the interior
            }
        }
        
        return false;
    }
    
    /**
     * Process a drawing point - either snap to edge or return original
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} - { x, y, snapped: boolean, blocked: boolean }
     */
    processDrawingPoint(x, y) {
        // Check if point should be snapped to any edge
        const edgeInfo = this.checkEdgeProximity(x, y);
        
        if (edgeInfo) {
            this.isSnappedToEdge = true;
            this.snappedTool = edgeInfo.tool;
            this.snappedEdge = edgeInfo.edge;
            return {
                x: edgeInfo.snappedPoint.x,
                y: edgeInfo.snappedPoint.y,
                snapped: true,
                blocked: false
            };
        }
        
        // Check if point is inside any tool (should be blocked)
        for (const tool of this.teachingToolsManager.tools) {
            if (this.isPointInsideTool(x, y, tool)) {
                // Point is inside tool - don't allow drawing
                return {
                    x: x,
                    y: y,
                    snapped: false,
                    blocked: true
                };
            }
        }
        
        // Not near any edge or inside any tool - normal drawing
        this.isSnappedToEdge = false;
        this.snappedTool = null;
        this.snappedEdge = null;
        return {
            x: x,
            y: y,
            snapped: false,
            blocked: false
        };
    }
    
    /**
     * Reset snapping state
     */
    resetSnapping() {
        this.isSnappedToEdge = false;
        this.snappedTool = null;
        this.snappedEdge = null;
    }
    
    // Helper: Transform point to tool's local coordinate space (accounting for rotation)
    transformToToolSpace(x, y, tool) {
        const centerX = tool.x + tool.width / 2;
        const centerY = tool.y + tool.height / 2;
        return this.rotatePoint(x, y, centerX, centerY, -tool.rotation);
    }
    
    // Helper: Transform point from tool's local space to world space
    transformToWorldSpace(x, y, tool) {
        const centerX = tool.x + tool.width / 2;
        const centerY = tool.y + tool.height / 2;
        return this.rotatePoint(x, y, centerX, centerY, tool.rotation);
    }
    
    // Helper: Rotate a point around a center
    rotatePoint(px, py, cx, cy, angle) {
        const radians = (angle * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const nx = (cos * (px - cx)) - (sin * (py - cy)) + cx;
        const ny = (sin * (px - cx)) + (cos * (py - cy)) + cy;
        return { x: nx, y: ny };
    }
    
    // Helper: Calculate perpendicular distance from point to line segment
    distanceToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        }
        
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        
        return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
    }
    
    // Helper: Project a point onto a line segment
    projectPointOnSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            return { x: x1, y: y1 };
        }
        
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        return {
            x: x1 + t * dx,
            y: y1 + t * dy
        };
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.EdgeDrawingManager = EdgeDrawingManager;
    window.AboardEdgeDrawingManager = EdgeDrawingManager;
}
