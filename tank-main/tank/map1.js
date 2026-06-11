class Map {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.walls = [];
        this.generateMap();
    }

    generateMap() {
        // Create some simple walls
        // Outer boundaries are handled by game logic, but we can add inner walls
        this.walls = [
            { x: 200, y: 200, w: 50, h: 300 },
            { x: 800, y: 200, w: 50, h: 300 },
            { x: 400, y: 350, w: 250, h: 50 },
            { x: 100, y: 600, w: 200, h: 50 },
            { x: 700, y: 100, w: 200, h: 50 }
        ];
    }

    checkCollision(circleOrRect) {
        // Simplified circle-AABB or point-AABB collision
        // entity: { x, y, radius } or { x, y, width, height } (center based for tanks? actually Tanks are center based x,y)

        // Let's assume input is coordinate (x,y) and radius/size
        // Tanks pass x,y as center.

        const r = circleOrRect.radius || 1;

        for (const wall of this.walls) {
            // Check if circle (x,y,r) overlaps with rectangle (wall.x, wall.y, wall.w, wall.h)
            // Find closest point on rectangle to circle center
            const testX = Math.max(wall.x, Math.min(circleOrRect.x, wall.x + wall.w));
            const testY = Math.max(wall.y, Math.min(circleOrRect.y, wall.y + wall.h));

            const distX = circleOrRect.x - testX;
            const distY = circleOrRect.y - testY;
            const distance = Math.sqrt((distX * distX) + (distY * distY));

            if (distance <= r) {
                return true;
            }
        }
        return false;
    }

    getWallHit(x1, y1, x2, y2) {
        for (const wall of this.walls) {
            // Simple AABB line intersection
            const hit = this.lineRectIntersection(x1, y1, x2, y2, 
                wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
            if (hit) {
                // Calculate normal based on which side was hit
                let normalX = 0, normalY = 0;
                
                // Determine which face was hit
                const dx = hit.x - (wall.x + wall.w / 2);
                const dy = hit.y - (wall.y + wall.h / 2);
                
                const halfW = wall.w / 2;
                const halfH = wall.h / 2;
                
                // Check which face is closest
                const nx = Math.abs(dx / halfW);
                const ny = Math.abs(dy / halfH);
                
                if (nx > ny) {
                    normalX = dx > 0 ? 1 : -1;
                } else {
                    normalY = dy > 0 ? 1 : -1;
                }
                
                return { x: hit.x, y: hit.y, normalX, normalY };
            }
        }
        return null;
    }

    lineRectIntersection(x1, y1, x2, y2, rx1, ry1, rx2, ry2) {
        // Line from (x1,y1) to (x2,y2)
        // Rectangle from (rx1,ry1) to (rx2,ry2)
        
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        // Quick reject
        if (maxX < rx1 || minX > rx2 || maxY < ry1 || minY > ry2) {
            return null;
        }
        
        // Find closest point on rectangle to the line segment
        const closestX = Math.max(rx1, Math.min(x2, rx2));
        const closestY = Math.max(ry1, Math.min(y2, ry2));
        
        return { x: closestX, y: closestY };
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#1a1a1a';
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f3ff';

        for (const wall of this.walls) {
            ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
            ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
        }
        ctx.restore();
    }
}
