class Map {
    constructor(width, height, mapType = 'classic') {
        this.width = width;
        this.height = height;
        this.walls = [];
        this.mapType = mapType;
        this.generateMap();
    }

    generateMap() {
        switch (this.mapType) {
            case 'classic':
                this.generateClassicMap();
                break;
            case 'open':
                this.generateOpenMap();
                break;
            case 'custom':
                this.walls = [];
                break;
            default:
                this.generateClassicMap();
        }
    }

    generateClassicMap() {
        this.walls = [
            { x: 200, y: 200, w: 50, h: 300 },
            { x: 800, y: 200, w: 50, h: 300 },
            { x: 400, y: 350, w: 250, h: 50 },
            { x: 100, y: 600, w: 200, h: 50 },
            { x: 700, y: 100, w: 200, h: 50 }
        ];
    }

    generateOpenMap() {
        this.walls = [];
    }

    setWalls(walls) {
        this.walls = walls;
    }

    findNearestWall(x, y) {
        let nearestWall = null;
        let minDistance = Infinity;

        for (const wall of this.walls) {
            const wallCenterX = wall.x + wall.w / 2;
            const wallCenterY = wall.y + wall.h / 2;
            
            const dx = x - wallCenterX;
            const dy = y - wallCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                nearestWall = wall;
            }
        }

        return nearestWall;
    }

    checkCollision(circleOrRect) {
        const r = circleOrRect.radius || 1;

        for (const wall of this.walls) {
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
            const hit = this.lineRectIntersection(x1, y1, x2, y2, 
                wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
            if (hit) {
                let normalX = 0, normalY = 0;
                
                const dx = hit.x - (wall.x + wall.w / 2);
                const dy = hit.y - (wall.y + wall.h / 2);
                
                const halfW = wall.w / 2;
                const halfH = wall.h / 2;
                
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
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        if (maxX < rx1 || minX > rx2 || maxY < ry1 || minY > ry2) {
            return null;
        }
        
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

    drawEditor(ctx) {
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

    addWall(x, y, w, h) {
        this.walls.push({ x, y, w, h });
    }

    removeWallAtPosition(x, y) {
        for (let i = this.walls.length - 1; i >= 0; i--) {
            const wall = this.walls[i];
            if (x >= wall.x && x <= wall.x + wall.w &&
                y >= wall.y && y <= wall.y + wall.h) {
                this.walls.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    clearWalls() {
        this.walls = [];
    }

    saveToStorage() {
        localStorage.setItem('customMap', JSON.stringify(this.walls));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('customMap');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    this.walls = parsed;
                    return true;
                }
            } catch (e) {
                return false;
            }
        }
        this.walls = [];
        return false;
    }
}
