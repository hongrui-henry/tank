class Bullet {
    constructor(x, y, angle, color, canBounce = false, canThroughWall = false, damageMultiplier = 1, isInvisible = false) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.speed = 0.5;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.angle = angle;
        this.radius = 3;
        this.markedForDeletion = false;
        this.canBounce = canBounce;
        this.canThroughWall = canThroughWall;
        this.damageMultiplier = damageMultiplier;
        this.isInvisible = isInvisible;
        this.bounceCount = 0;
        this.maxBounces = 6;
        this.width = 1024;
        this.height = 768;
        this.wallCollisionFrame = 0;
    }

    update(deltaTime, map) {
        const oldX = this.x;
        const oldY = this.y;

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        if (this.canBounce) {
            let bounced = false;
            let bounceX = 0, bounceY = 0;

            if (this.x - this.radius <= 0) {
                this.x = this.radius;
                bounceX = 1;
                bounced = true;
            }
            if (this.x + this.radius >= this.width) {
                this.x = this.width - this.radius;
                bounceX = -1;
                bounced = true;
            }
            if (this.y - this.radius <= 0) {
                this.y = this.radius;
                bounceY = 1;
                bounced = true;
            }
            if (this.y + this.radius >= this.height) {
                this.y = this.height - this.radius;
                bounceY = -1;
                bounced = true;
            }

            if (bounced) {
                if (bounceX !== 0) {
                    this.vx = bounceX * Math.abs(this.vx);
                }
                if (bounceY !== 0) {
                    this.vy = bounceY * Math.abs(this.vy);
                }
                this.angle = Math.atan2(this.vy, this.vx);
                this.bounceCount++;
                if (this.bounceCount >= this.maxBounces) {
                    this.markedForDeletion = true;
                    return true;
                }
            }
        } else {
            if (this.x < 0 || this.x > this.width ||
                this.y < 0 || this.y > this.height) {
                this.markedForDeletion = true;
                return true;
            }
        }

        if (map.checkCollision({ x: this.x, y: this.y, radius: this.radius })) {
            if (this.canThroughWall) {
                return false;
            } else if (this.canBounce && this.bounceCount < this.maxBounces) {
                const wallHit = map.getWallHit(oldX, oldY, this.x, this.y);

                if (wallHit) {
                    const dotProduct = this.vx * wallHit.normalX + this.vy * wallHit.normalY;
                    this.vx -= 2 * dotProduct * wallHit.normalX;
                    this.vy -= 2 * dotProduct * wallHit.normalY;

                    this.x = wallHit.x + wallHit.normalX * (this.radius + 3);
                    this.y = wallHit.y + wallHit.normalY * (this.radius + 3);

                    this.angle = Math.atan2(this.vy, this.vx);
                    this.bounceCount++;
                    return false;
                } else {
                    const wall = map.findNearestWall(this.x, this.y);
                    if (wall) {
                        const normal = this.calculateWallNormal(wall, this.x, this.y);
                        
                        const dotProduct = this.vx * normal.x + this.vy * normal.y;
                        this.vx -= 2 * dotProduct * normal.x;
                        this.vy -= 2 * dotProduct * normal.y;

                        const pushDistance = this.radius + 3;
                        this.x = this.x + normal.x * pushDistance;
                        this.y = this.y + normal.y * pushDistance;

                        this.angle = Math.atan2(this.vy, this.vx);
                        this.bounceCount++;
                        return false;
                    } else {
                        const dotProduct = this.vx * (-1) + this.vy * 0;
                        this.vx -= 2 * dotProduct * (-1);
                        this.vy -= 2 * dotProduct * 0;

                        this.x = oldX;
                        this.y = oldY;
                        this.angle = Math.atan2(this.vy, this.vx);
                        this.bounceCount++;
                        return false;
                    }
                }
            }
            this.markedForDeletion = true;
            return true;
        }

        return false;
    }

    calculateWallNormal(wall, x, y) {
        const wallCenterX = wall.x + wall.w / 2;
        const wallCenterY = wall.y + wall.h / 2;
        
        const dx = x - wallCenterX;
        const dy = y - wallCenterY;
        
        const halfWidth = wall.w / 2;
        const halfHeight = wall.h / 2;
        
        const nx = dx / halfWidth;
        const ny = dy / halfHeight;
        
        const maxComponent = Math.max(Math.abs(nx), Math.abs(ny));
        
        let normalX = 0, normalY = 0;
        
        if (Math.abs(nx) >= Math.abs(ny)) {
            normalX = nx > 0 ? 1 : -1;
        } else {
            normalY = ny > 0 ? 1 : -1;
        }
        
        const length = Math.sqrt(normalX * normalX + normalY * normalY);
        return { x: normalX / length, y: normalY / length };
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        if (this.canBounce) {
            ctx.fillStyle = '#ffaa00';
        } else if (this.canThroughWall) {
            ctx.fillStyle = '#aa00ff';
        } else {
            ctx.fillStyle = '#fff';
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        if (this.canBounce) {
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 1;
            const trailLength = 15;
            const prevX = this.x - Math.cos(this.angle) * trailLength;
            const prevY = this.y - Math.sin(this.angle) * trailLength;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
        }

        if (this.damageMultiplier > 1) {
            ctx.fillStyle = '#ff0000';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('x' + this.damageMultiplier, this.x, this.y - 8);
        }

        ctx.restore();
    }
}
