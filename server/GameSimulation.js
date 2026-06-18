class SimMap {
    constructor(mapType) {
        this.walls = [];
        if (mapType === 'classic') {
            this.walls = [
                { x: 200, y: 200, w: 50, h: 300 },
                { x: 800, y: 200, w: 50, h: 300 },
                { x: 400, y: 350, w: 250, h: 50 },
                { x: 100, y: 600, w: 200, h: 50 },
                { x: 700, y: 100, w: 200, h: 50 }
            ];
        }
    }

    checkCollision(circleOrRect) {
        const r = circleOrRect.radius || 1;
        for (const wall of this.walls) {
            const testX = Math.max(wall.x, Math.min(circleOrRect.x, wall.x + wall.w));
            const testY = Math.max(wall.y, Math.min(circleOrRect.y, wall.y + wall.h));
            const distX = circleOrRect.x - testX;
            const distY = circleOrRect.y - testY;
            if (Math.sqrt(distX * distX + distY * distY) <= r) return true;
        }
        return false;
    }

    getWallHit(x1, y1, x2, y2) {
        for (const wall of this.walls) {
            const hit = this.lineRectIntersection(x1, y1, x2, y2, wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
            if (hit) {
                let normalX = 0, normalY = 0;
                const dx = hit.x - (wall.x + wall.w / 2);
                const dy = hit.y - (wall.y + wall.h / 2);
                if (Math.abs(dx / (wall.w / 2)) > Math.abs(dy / (wall.h / 2))) {
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
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        if (maxX < rx1 || minX > rx2 || maxY < ry1 || minY > ry2) return null;
        return { x: Math.max(rx1, Math.min(x2, rx2)), y: Math.max(ry1, Math.min(y2, ry2)) };
    }

    findNearestWall(x, y) {
        let nearest = null, minDist = Infinity;
        for (const wall of this.walls) {
            const cx = wall.x + wall.w / 2, cy = wall.y + wall.h / 2;
            const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            if (d < minDist) { minDist = d; nearest = wall; }
        }
        return nearest;
    }

    rectIntersect(r1, r2) {
        return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
    }
}

class SimBullet {
    constructor(x, y, vx, vy, color, canBounce, canThroughWall, damageMultiplier, isInvisible) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.radius = 3;
        this.canBounce = canBounce;
        this.canThroughWall = canThroughWall;
        this.damageMultiplier = damageMultiplier || 1;
        this.isInvisible = isInvisible || false;
        this.bounceCount = 0;
        this.maxBounces = 6;
        this.markedForDeletion = false;
        this.angle = Math.atan2(vy, vx);
    }

    update(deltaTime, map) {
        const oldX = this.x, oldY = this.y;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        const w = 1024, h = 768;

        if (this.canBounce) {
            let bounced = false, bx = 0, by = 0;
            if (this.x - this.radius <= 0) { this.x = this.radius; bx = 1; bounced = true; }
            if (this.x + this.radius >= w) { this.x = w - this.radius; bx = -1; bounced = true; }
            if (this.y - this.radius <= 0) { this.y = this.radius; by = 1; bounced = true; }
            if (this.y + this.radius >= h) { this.y = h - this.radius; by = -1; bounced = true; }
            if (bounced) {
                if (bx) this.vx = bx * Math.abs(this.vx);
                if (by) this.vy = by * Math.abs(this.vy);
                this.angle = Math.atan2(this.vy, this.vx);
                this.bounceCount++;
                if (this.bounceCount >= this.maxBounces) { this.markedForDeletion = true; return true; }
                return false;
            }
        } else {
            if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
                this.markedForDeletion = true;
                return true;
            }
        }

        if (map.checkCollision({ x: this.x, y: this.y, radius: this.radius })) {
            if (this.canThroughWall) return false;
            if (this.canBounce && this.bounceCount < this.maxBounces) {
                const wallHit = map.getWallHit(oldX, oldY, this.x, this.y);
                if (wallHit) {
                    const dot = this.vx * wallHit.normalX + this.vy * wallHit.normalY;
                    this.vx -= 2 * dot * wallHit.normalX;
                    this.vy -= 2 * dot * wallHit.normalY;
                    this.x = wallHit.x + wallHit.normalX * (this.radius + 3);
                    this.y = wallHit.y + wallHit.normalY * (this.radius + 3);
                    this.angle = Math.atan2(this.vy, this.vx);
                    this.bounceCount++;
                    return false;
                } else {
                    const wall = map.findNearestWall(this.x, this.y);
                    if (wall) {
                        const cx = wall.x + wall.w / 2, cy = wall.y + wall.h / 2;
                        const dx = this.x - cx, dy = this.y - cy;
                        let nx = 0, ny = 0;
                        if (Math.abs(dx / (wall.w / 2)) >= Math.abs(dy / (wall.h / 2))) {
                            nx = dx > 0 ? 1 : -1;
                        } else {
                            ny = dy > 0 ? 1 : -1;
                        }
                        const len = Math.sqrt(nx * nx + ny * ny);
                        nx /= len; ny /= len;
                        const dot = this.vx * nx + this.vy * ny;
                        this.vx -= 2 * dot * nx;
                        this.vy -= 2 * dot * ny;
                        this.x += nx * (this.radius + 3);
                        this.y += ny * (this.radius + 3);
                        this.angle = Math.atan2(this.vy, this.vx);
                        this.bounceCount++;
                        return false;
                    }
                    this.vx = -this.vx;
                    this.x = oldX; this.y = oldY;
                    this.angle = Math.atan2(this.vy, this.vx);
                    this.bounceCount++;
                    return false;
                }
            }
            this.markedForDeletion = true;
            return true;
        }
        return false;
    }
}

class SimTank {
    constructor(x, y, color, skillId, sim) {
        this.sim = sim;
        this.x = x;
        this.y = y;
        this.color = color;
        this.rotation = 0;
        this.width = 40;
        this.height = 40;
        this.radius = 20;
        this.baseSpeed = 0.2;
        this.speed = 0.2;
        this.rotationSpeed = 0.003;
        this.health = 100;
        this.lastShotTime = 0;
        this.baseShootCooldown = 500;
        this.shootCooldown = 500;
        this.selectedSkill = skillId || 'none';

        this.skillCooldown = 0;
        this.skillActive = false;
        this.skillDuration = 0;
        this.skillKeyWasPressed = false;

        this.isShielded = false;
        this.damageMultiplier = 1;
        this.canBulletBounce = false;
        this.canBulletThroughWall = false;
        this.canTankThroughWall = false;
        this.canScatter = false;
        this.isInvisible = false;

        this.energyShields = [];
        this.clones = [];
        this.preWallPosition = null;

        this.isLaserActive = false;
        this.lastLaserTime = 0;
        this.laserCooldown = 500;
        this.laserStartX = 0;
        this.laserStartY = 0;
        this.laserEndX = 0;
        this.laserEndY = 0;
        this.laserDisplayTime = 0;

        this.skillCooldowns = {
            dash: 8000, speedUp: 10000, shield: 8000, doubleDamage: 10000,
            fastShoot: 8000, bounceBullet: 14000, bulletThroughWall: 12000,
            tankThroughWall: 15000, scatter: 13000, energyShield: 13000,
            invisibility: 14000, clone: 15000, laser: 13000, none: 0
        };
        this.skillDurations = {
            dash: 0, speedUp: 3000, shield: 3000, doubleDamage: 4000,
            fastShoot: 3000, bounceBullet: 5000, bulletThroughWall: 4000,
            tankThroughWall: 2000, scatter: 4000, energyShield: 0,
            invisibility: 5000, clone: 6000, laser: 4000, none: 0
        };
    }

    update(deltaTime, input, currentTime) {
        if (this.health <= 0) return;

        if (input.isKeyDown('left')) this.rotation -= this.rotationSpeed * deltaTime;
        if (input.isKeyDown('right')) this.rotation += this.rotationSpeed * deltaTime;

        const velocity = { x: 0, y: 0 };
        if (input.isKeyDown('up')) {
            velocity.x = Math.cos(this.rotation) * this.speed * deltaTime;
            velocity.y = Math.sin(this.rotation) * this.speed * deltaTime;
        }
        if (input.isKeyDown('down')) {
            velocity.x = -Math.cos(this.rotation) * this.speed * deltaTime;
            velocity.y = -Math.sin(this.rotation) * this.speed * deltaTime;
        }

        const newX = this.x + velocity.x;
        const newY = this.y + velocity.y;

        const bounds = { x: newX, y: newY, width: this.width, height: this.height, radius: this.radius };

        if (this.canTankThroughWall) {
            this.x = newX; this.y = newY;
        } else if (!this.sim.map.checkCollision(bounds)) {
            this.x = newX; this.y = newY;
        } else {
            if (!this.sim.map.checkCollision({ x: newX, y: this.y, width: this.width, height: this.height, radius: this.radius })) {
                this.x = newX;
            } else if (!this.sim.map.checkCollision({ x: this.x, y: newY, width: this.width, height: this.height, radius: this.radius })) {
                this.y = newY;
            }
        }

        this.x = Math.max(this.radius, Math.min(this.sim.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(this.sim.height - this.radius, this.y));

        if (input.isKeyDown('shoot')) {
            this.shoot(currentTime);
        }

        if (this.skillCooldown > 0) this.skillCooldown -= deltaTime;
        if (this.skillActive && this.skillDuration > 0) {
            this.skillDuration -= deltaTime;
            if (this.skillDuration <= 0) this.deactivateSkill();
        }

        if (this.laserDisplayTime > 0) this.laserDisplayTime -= deltaTime;

        this.energyShields = this.energyShields.filter(s => {
            s.x += Math.cos(s.rotation) * s.speed * deltaTime;
            s.y += Math.sin(s.rotation) * s.speed * deltaTime;
            return !(s.x < 0 || s.x > this.sim.width || s.y < 0 || s.y > this.sim.height);
        });

        this.updateClones(deltaTime);
    }

    updateClones(deltaTime) {
        this.clones = this.clones.filter(clone => {
            clone.duration -= deltaTime;
            if (clone.duration <= 0) return false;

            if (clone.phase === 'moving') {
                clone.moveTime += deltaTime;
                const nx = clone.x + Math.cos(clone.rotation) * clone.speed * deltaTime;
                const ny = clone.y + Math.sin(clone.rotation) * clone.speed * deltaTime;
                if (!this.checkCloneWallCollision(nx, ny)) { clone.x = nx; clone.y = ny; }
                if (clone.moveTime >= 500) {
                    clone.phase = 'active';
                    clone.randomMoveTimer = 0;
                    clone.randomMoveDir = Math.random() > 0.5 ? 1 : -1;
                }
            } else if (clone.phase === 'active') {
                const enemyTank = this.sim.tanks.find(t => t.color !== this.color && t.health > 0);
                if (enemyTank) {
                    const dx = enemyTank.x - clone.x, dy = enemyTank.y - clone.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const dxMain = this.x - clone.x, dyMain = this.y - clone.y;
                    const distMain = Math.sqrt(dxMain * dxMain + dyMain * dyMain);
                    const targetAngle = Math.atan2(dy, dx);
                    let rotDiff = targetAngle - clone.rotation;
                    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                    clone.rotation += rotDiff > 0 ? this.rotationSpeed * deltaTime * 0.6 : -this.rotationSpeed * deltaTime * 0.6;

                    const wallBetween = this.isWallBetween(clone.x, clone.y, enemyTank.x, enemyTank.y);

                    if (wallBetween && dist < 350) {
                        clone.randomMoveTimer += deltaTime;
                        if (clone.randomMoveTimer > 1500) {
                            clone.randomMoveDir = Math.random() > 0.5 ? 1 : -1;
                            clone.randomMoveTimer = 0;
                        }
                        const perpAngle = targetAngle + Math.PI / 2 * clone.randomMoveDir;
                        const px = clone.x + Math.cos(perpAngle) * this.speed * deltaTime * 0.8;
                        const py = clone.y + Math.sin(perpAngle) * this.speed * deltaTime * 0.8;
                        if (!this.checkCloneWallCollision(px, py)) { clone.x = px; clone.y = py; }
                        if (dist > 300) {
                            const fx = clone.x + Math.cos(clone.rotation) * this.speed * deltaTime * 0.5;
                            const fy = clone.y + Math.sin(clone.rotation) * this.speed * deltaTime * 0.5;
                            if (!this.checkCloneWallCollision(fx, fy)) { clone.x = fx; clone.y = fy; }
                        }
                    } else {
                        if (dist > 280) {
                            const fx = clone.x + Math.cos(clone.rotation) * this.speed * deltaTime * 0.9;
                            const fy = clone.y + Math.sin(clone.rotation) * this.speed * deltaTime * 0.9;
                            if (!this.checkCloneWallCollision(fx, fy)) { clone.x = fx; clone.y = fy; }
                        } else if (dist < 180) {
                            const fx = clone.x - Math.cos(clone.rotation) * this.speed * deltaTime * 0.8;
                            const fy = clone.y - Math.sin(clone.rotation) * this.speed * deltaTime * 0.8;
                            if (!this.checkCloneWallCollision(fx, fy)) { clone.x = fx; clone.y = fy; }
                        } else {
                            clone.randomMoveTimer += deltaTime;
                            if (clone.randomMoveTimer > 2000) {
                                clone.randomMoveDir = Math.random();
                                clone.randomMoveTimer = 0;
                            }
                            if (clone.randomMoveDir < 0.33) {
                                const sa = targetAngle + Math.PI / 2;
                                const sx = clone.x + Math.cos(sa) * this.speed * deltaTime * 0.6;
                                const sy = clone.y + Math.sin(sa) * this.speed * deltaTime * 0.6;
                                if (!this.checkCloneWallCollision(sx, sy)) { clone.x = sx; clone.y = sy; }
                            } else if (clone.randomMoveDir < 0.66) {
                                const sa = targetAngle - Math.PI / 2;
                                const sx = clone.x + Math.cos(sa) * this.speed * deltaTime * 0.6;
                                const sy = clone.y + Math.sin(sa) * this.speed * deltaTime * 0.6;
                                if (!this.checkCloneWallCollision(sx, sy)) { clone.x = sx; clone.y = sy; }
                            }
                        }
                    }

                    if (distMain < 100) {
                        const aa = Math.atan2(-dyMain, -dxMain);
                        const ax = clone.x + Math.cos(aa) * this.speed * deltaTime * 0.5;
                        const ay = clone.y + Math.sin(aa) * this.speed * deltaTime * 0.5;
                        if (!this.checkCloneWallCollision(ax, ay)) { clone.x = ax; clone.y = ay; }
                    }

                    if (dist < 450 && Math.abs(rotDiff) < 0.35) {
                        if (currentTime - clone.lastShotTime > clone.shootCooldown) {
                            const nl = 30;
                            const bx = clone.x + Math.cos(clone.rotation) * nl;
                            const by = clone.y + Math.sin(clone.rotation) * nl;
                            const speed = 0.5;
                            this.sim.addBullet(new SimBullet(bx, by,
                                Math.cos(clone.rotation) * speed, Math.sin(clone.rotation) * speed,
                                clone.color, clone.canBulletBounce, clone.canBulletThroughWall,
                                clone.damageMultiplier, false));
                            if (clone.canScatter) {
                                const sp = 0.3;
                                this.sim.addBullet(new SimBullet(bx, by,
                                    Math.cos(clone.rotation - sp) * speed, Math.sin(clone.rotation - sp) * speed,
                                    clone.color, clone.canBulletBounce, clone.canBulletThroughWall,
                                    clone.damageMultiplier, false));
                                this.sim.addBullet(new SimBullet(bx, by,
                                    Math.cos(clone.rotation + sp) * speed, Math.sin(clone.rotation + sp) * speed,
                                    clone.color, clone.canBulletBounce, clone.canBulletThroughWall,
                                    clone.damageMultiplier, false));
                            }
                            clone.lastShotTime = currentTime;
                        }
                    }
                }
            }
            return true;
        });
    }

    checkCloneWallCollision(x, y) {
        const bounds = { x: x - 15, y: y - 15, w: 30, h: 30 };
        for (const wall of this.sim.map.walls) {
            if (this.sim.map.rectIntersect(bounds, wall)) return true;
        }
        return false;
    }

    isWallBetween(x1, y1, x2, y2) {
        for (let i = 1; i < 20; i++) {
            const t = i / 20;
            const cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t;
            for (const wall of this.sim.map.walls) {
                if (cx >= wall.x && cx <= wall.x + wall.w && cy >= wall.y && cy <= wall.y + wall.h) return true;
            }
        }
        return false;
    }

    shoot(currentTime) {
        if (this.isLaserActive) {
            this.shootLaser(currentTime);
            return;
        }
        if (currentTime - this.lastShotTime > this.shootCooldown) {
            const nl = 30;
            const bx = this.x + Math.cos(this.rotation) * nl;
            const by = this.y + Math.sin(this.rotation) * nl;
            const speed = 0.5;

            this.sim.addBullet(new SimBullet(bx, by,
                Math.cos(this.rotation) * speed, Math.sin(this.rotation) * speed,
                this.color, this.canBulletBounce, this.canBulletThroughWall,
                this.damageMultiplier, false));

            if (this.canScatter) {
                const sp = 0.3;
                this.sim.addBullet(new SimBullet(bx, by,
                    Math.cos(this.rotation - sp) * speed, Math.sin(this.rotation - sp) * speed,
                    this.color, this.canBulletBounce, this.canBulletThroughWall,
                    this.damageMultiplier, false));
                this.sim.addBullet(new SimBullet(bx, by,
                    Math.cos(this.rotation + sp) * speed, Math.sin(this.rotation + sp) * speed,
                    this.color, this.canBulletBounce, this.canBulletThroughWall,
                    this.damageMultiplier, false));
            }

            this.lastShotTime = currentTime;
        }
    }

    activateSkill(currentTime) {
        if (!this.selectedSkill || this.selectedSkill === 'none' || this.skillCooldown > 0) return;
        if (this.selectedSkill === 'tankThroughWall' && !this.canTankThroughWall) {
            this.preWallPosition = { x: this.x, y: this.y };
        }
        this.skillCooldown = this.skillCooldowns[this.selectedSkill];
        this.skillActive = true;
        this.skillDuration = this.skillDurations[this.selectedSkill];

        switch (this.selectedSkill) {
            case 'dash': this.activateDash(); break;
            case 'speedUp': this.activateSpeedUp(); break;
            case 'shield': this.activateShield(); break;
            case 'doubleDamage': this.activateDoubleDamage(); break;
            case 'fastShoot': this.activateFastShoot(); break;
            case 'bounceBullet': this.activateBounceBullet(); break;
            case 'bulletThroughWall': this.activateBulletThroughWall(); break;
            case 'tankThroughWall': this.activateTankThroughWall(); break;
            case 'scatter': this.activateScatter(); break;
            case 'energyShield': this.activateEnergyShield(); break;
            case 'invisibility': this.activateInvisibility(); break;
            case 'clone': this.activateClone(currentTime); break;
            case 'laser': this.activateLaser(); break;
        }
    }

    activateDash() {
        const dist = 80;
        const nx = this.x + Math.cos(this.rotation) * dist;
        const ny = this.y + Math.sin(this.rotation) * dist;
        if (!this.sim.map.checkCollision({ x: nx, y: ny, width: this.width, height: this.height, radius: this.radius })) {
            this.x = nx; this.y = ny;
        }
        this.sim.addExplosion(this.x, this.y, this.color);
    }

    activateSpeedUp() { this.speed = this.baseSpeed * 1.5; }
    activateShield() { this.isShielded = true; }
    activateDoubleDamage() { this.damageMultiplier = 2; }
    activateFastShoot() { this.shootCooldown = this.baseShootCooldown / 1.8; }
    activateBounceBullet() { this.canBulletBounce = true; }
    activateBulletThroughWall() { this.canBulletThroughWall = true; }
    activateTankThroughWall() { this.canTankThroughWall = true; }
    activateScatter() { this.canScatter = true; }

    activateEnergyShield() {
        const nl = 30;
        this.energyShields.push({
            x: this.x + Math.cos(this.rotation) * nl,
            y: this.y + Math.sin(this.rotation) * nl,
            rotation: this.rotation,
            speed: 0.15,
            color: this.color,
            width: 80, height: 15
        });
    }

    activateInvisibility() { this.isInvisible = true; }

    activateClone(currentTime) {
        const cx = this.x - Math.cos(this.rotation) * 50;
        const cy = this.y - Math.sin(this.rotation) * 50;
        this.clones.push({
            x: cx, y: cy, rotation: this.rotation + Math.PI, color: this.color,
            speed: 0.15, health: 2, lastShotTime: 0, shootCooldown: this.shootCooldown,
            canBulletBounce: this.canBulletBounce, canBulletThroughWall: this.canBulletThroughWall,
            damageMultiplier: this.damageMultiplier, canScatter: this.canScatter,
            duration: 6000, phase: 'moving', moveTime: 0, randomMoveTimer: 0,
            randomMoveDir: 0, isInvisible: this.isInvisible
        });
    }

    activateLaser() {
        this.isLaserActive = true;
        this.lastLaserTime = 0;
        this.laserCooldown = this.baseShootCooldown;
    }

    shootLaser(currentTime) {
        if (currentTime - this.lastLaserTime < this.laserCooldown) return;
        const nl = 30;
        const sx = this.x + Math.cos(this.rotation) * nl;
        const sy = this.y + Math.sin(this.rotation) * nl;
        const dx = Math.cos(this.rotation), dy = Math.sin(this.rotation);
        let ex = sx, ey = sy;

        for (let step = 0; step < 800; step++) {
            ex = sx + dx * 2 * step;
            ey = sy + dy * 2 * step;
            if (this.sim.map.checkCollision({ x: ex, y: ey, radius: 2 })) { ex -= dx * 5; ey -= dy * 5; break; }
            if (ex < 0 || ex > this.sim.width || ey < 0 || ey > this.sim.height) { ex -= dx * 5; ey -= dy * 5; break; }
        }

        this.laserStartX = sx; this.laserStartY = sy;
        this.laserEndX = ex; this.laserEndY = ey;
        this.laserDisplayTime = 150;

        this.sim.tanks.forEach(tank => {
            if (tank !== this && tank.health > 0) {
                if (this.isPointOnLaserSegment(sx, sy, ex, ey, tank.x, tank.y, 20)) {
                    tank.takeDamage(10 * this.damageMultiplier);
                    this.sim.addExplosion(tank.x, tank.y, '#ff0000');
                }
            }
        });

        this.lastLaserTime = currentTime;
    }

    isPointOnLaserSegment(x1, y1, x2, y2, px, py, tolerance) {
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) <= tolerance;
        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const nx = x1 + t * dx, ny = y1 + t * dy;
        return Math.sqrt((px - nx) ** 2 + (py - ny) ** 2) <= tolerance;
    }

    deactivateSkill() {
        this.skillActive = false;
        this.isShielded = false;
        this.speed = this.baseSpeed;
        this.shootCooldown = this.baseShootCooldown;
        this.damageMultiplier = 1;
        this.canBulletBounce = false;
        this.canBulletThroughWall = false;
        this.isInvisible = false;
        this.isLaserActive = false;
        if (this.canTankThroughWall) {
            this.canTankThroughWall = false;
            this.moveToSafePosition();
        }
        this.canScatter = false;
    }

    moveToSafePosition() {
        if (this.preWallPosition && !this.sim.map.checkCollision({
            x: this.preWallPosition.x, y: this.preWallPosition.y,
            width: this.width, height: this.height, radius: this.radius
        })) {
            this.x = this.preWallPosition.x;
            this.y = this.preWallPosition.y;
            this.preWallPosition = null;
            return;
        }
        const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI, Math.PI * 5 / 4, Math.PI * 3 / 2, Math.PI * 7 / 4];
        for (const dist of [50, 100, 150, 200, 250]) {
            for (const angle of angles) {
                const tx = this.x + Math.cos(angle) * dist;
                const ty = this.y + Math.sin(angle) * dist;
                if (tx >= this.radius && tx <= this.sim.width - this.radius &&
                    ty >= this.radius && ty <= this.sim.height - this.radius &&
                    !this.sim.map.checkCollision({ x: tx, y: ty, width: this.width, height: this.height, radius: this.radius })) {
                    this.x = tx; this.y = ty;
                    this.preWallPosition = null;
                    return;
                }
            }
        }
        this.preWallPosition = null;
    }

    takeDamage(amount) {
        if (this.isShielded) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.sim.addExplosion(this.x, this.y, this.color);
        }
    }

    isPointOnLaserLine(x1, y1, x2, y2, px, py) {
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) < 5;
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
        const nx = x1 + t * dx, ny = y1 + t * dy;
        return Math.sqrt((px - nx) ** 2 + (py - ny) ** 2) < 15;
    }
}

class GameSimulation {
    constructor(mapType, p1Skill, p2Skill) {
        this.width = 1024;
        this.height = 768;
        this.map = new SimMap(mapType);
        this.time = 0;
        this.tanks = [];
        this.bullets = [];
        this.explosions = [];
        this.gameOver = false;
        this.winner = null;

        const skills = ['dash', 'speedUp', 'shield', 'doubleDamage', 'fastShoot', 'bounceBullet', 'bulletThroughWall', 'tankThroughWall', 'scatter', 'energyShield', 'invisibility', 'clone', 'laser'];

        const p1s = p1Skill === 'random' ? skills[Math.floor(Math.random() * skills.length)] : (p1Skill || 'none');
        const p2s = p2Skill === 'random' ? skills[Math.floor(Math.random() * skills.length)] : (p2Skill || 'none');

        const p1 = new SimTank(100, 100, '#00f3ff', p1s, this);
        const p2 = new SimTank(900, 600, '#ff00ff', p2s, this);
        this.tanks = [p1, p2];
    }

    addBullet(b) { this.bullets.push(b); }

    addExplosion(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.explosions.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1.0, color
            });
        }
    }

    update(deltaTime, inputs) {
        if (this.gameOver) return;

        this.time += deltaTime;

        this.bullets = this.bullets.filter(b => !b.markedForDeletion);
        this.explosions = this.explosions.filter(e => e.life > 0);

        this.tanks.forEach((tank, index) => {
            const input = inputs[index] || { actions: [], skillJustPressed: false };
            const mockInput = {
                isKeyDown: (action) => input.actions.includes(action)
            };

            tank.update(deltaTime, mockInput, this.time);

            if (input.skillJustPressed && !tank.skillKeyWasPressed) {
                tank.activateSkill(this.time);
                tank.skillKeyWasPressed = true;
            }
            if (!input.skillJustPressed) {
                tank.skillKeyWasPressed = false;
            }
        });

        this.bullets.forEach(bullet => {
            const hitWall = bullet.update(deltaTime, this.map);

            if (!hitWall) {
                this.tanks.forEach(tank => {
                    const dx = bullet.x - tank.x, dy = bullet.y - tank.y;
                    if (Math.sqrt(dx * dx + dy * dy) < tank.radius + bullet.radius) {
                        if (bullet.color !== tank.color) {
                            const dmg = 10 * (bullet.damageMultiplier || 1);
                            tank.takeDamage(dmg);
                            bullet.markedForDeletion = true;
                            this.addExplosion(bullet.x, bullet.y, '#fff');
                        }
                    }

                    tank.clones.forEach(clone => {
                        const dx2 = bullet.x - clone.x, dy2 = bullet.y - clone.y;
                        if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < 20 + bullet.radius) {
                            if (bullet.color !== clone.color) {
                                clone.health--;
                                bullet.markedForDeletion = true;
                                this.addExplosion(bullet.x, bullet.y, clone.color);
                            }
                        }
                    });
                });

                this.tanks.forEach(tank => {
                    tank.energyShields.forEach(shield => {
                        const lx = bullet.x - shield.x, ly = bullet.y - shield.y;
                        const rx = lx * Math.cos(-shield.rotation) - ly * Math.sin(-shield.rotation);
                        const ry = lx * Math.sin(-shield.rotation) + ly * Math.cos(-shield.rotation);
                        if (Math.abs(rx) <= shield.width / 2 + bullet.radius &&
                            Math.abs(ry) <= shield.height / 2 + bullet.radius &&
                            bullet.color !== shield.color) {
                            bullet.markedForDeletion = true;
                            this.addExplosion(bullet.x, bullet.y, '#00ffff');
                        }
                    });
                });
            } else {
                this.addExplosion(bullet.x, bullet.y, '#fff');
            }
        });

        this.explosions.forEach(e => {
            e.x += e.vx;
            e.y += e.vy;
            e.life -= 0.05;
        });

        if (this.tanks.some(t => t.health <= 0)) {
            this.gameOver = true;
            this.winner = this.tanks.findIndex(t => t.health > 0);
        }
    }

    getState() {
        return {
            time: this.time,
            gameOver: this.gameOver,
            winner: this.winner,
            tanks: this.tanks.map(t => ({
                x: t.x, y: t.y, rotation: t.rotation, health: t.health,
                color: t.color, selectedSkill: t.selectedSkill,
                skillCooldown: t.skillCooldown,
                skillActive: t.skillActive, skillDuration: t.skillDuration,
                isShielded: t.isShielded, damageMultiplier: t.damageMultiplier,
                canBulletBounce: t.canBulletBounce,
                canBulletThroughWall: t.canBulletThroughWall,
                canScatter: t.canScatter,
                isInvisible: t.isInvisible,
                isLaserActive: t.isLaserActive,
                laserDisplayTime: t.laserDisplayTime,
                laserStartX: t.laserStartX, laserStartY: t.laserStartY,
                laserEndX: t.laserEndX, laserEndY: t.laserEndY,
                energyShields: t.energyShields.map(s => ({
                    x: s.x, y: s.y, rotation: s.rotation,
                    color: s.color, width: s.width, height: s.height
                })),
                clones: t.clones.map(c => ({
                    x: c.x, y: c.y, rotation: c.rotation, color: c.color,
                    health: c.health, isInvisible: c.isInvisible
                }))
            })),
            bullets: this.bullets.map(b => ({
                x: b.x, y: b.y, vx: b.vx, vy: b.vy,
                color: b.color, radius: b.radius,
                canBounce: b.canBounce, canThroughWall: b.canThroughWall,
                damageMultiplier: b.damageMultiplier,
                isInvisible: b.isInvisible,
                angle: b.angle
            })),
            explosions: this.explosions.map(e => ({
                x: e.x, y: e.y, vx: e.vx, vy: e.vy,
                life: e.life, color: e.color
            }))
        };
    }
}

module.exports = GameSimulation;
