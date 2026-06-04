class Tank {
    constructor(x, y, color, controls, game) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.width = 40;
        this.height = 40;
        this.rotation = 0;
        this.baseSpeed = 0.2;
        this.speed = this.baseSpeed;
        this.rotationSpeed = 0.003;
        this.controls = controls;
        this.lastShotTime = 0;
        this.baseShootCooldown = 500;
        this.shootCooldown = this.baseShootCooldown;
        this.health = 100;
        this.radius = 20;

        this.selectedSkill = null;
        this.skillCooldown = 0;
        this.skillActive = false;
        this.skillDuration = 0;

        this.isShielded = false;
        this.damageMultiplier = 1;
        this.canBulletBounce = false;
        this.canBulletThroughWall = false;
        this.canTankThroughWall = false;
        this.canScatter = false;
        this.isInvisible = false;

        this.energyShields = [];
        this.clones = [];

        this.skillCooldowns = {
            dash: 8000,
            speedUp: 10000,
            shield: 8000,
            doubleDamage: 10000,
            fastShoot: 8000,
            bounceBullet: 14000,
            bulletThroughWall: 12000,
            tankThroughWall: 15000,
            scatter: 13000,
            energyShield: 13000,
            invisibility: 14000,
            clone: 15000,
            laser: 13000,
            none: 0
        };

        this.skillDurations = {
            dash: 0,
            speedUp: 3000,
            shield: 3000,
            doubleDamage: 4000,
            fastShoot: 3000,
            bounceBullet: 5000,
            bulletThroughWall: 4000,
            tankThroughWall: 2000,
            scatter: 4000,
            energyShield: 0,
            invisibility: 5000,
            clone: 6000,
            laser: 4000,
            none: 0
        };

        this.preWallPosition = null;
    }

    update(deltaTime, input) {
        if (this.health <= 0) return;

        if (input.isKeyDown(this.controls.left)) {
            this.rotation -= this.rotationSpeed * deltaTime;
        }
        if (input.isKeyDown(this.controls.right)) {
            this.rotation += this.rotationSpeed * deltaTime;
        }

        const velocity = { x: 0, y: 0 };
        if (input.isKeyDown(this.controls.up)) {
            velocity.x = Math.cos(this.rotation) * this.speed * deltaTime;
            velocity.y = Math.sin(this.rotation) * this.speed * deltaTime;
        }
        if (input.isKeyDown(this.controls.down)) {
            velocity.x = -Math.cos(this.rotation) * this.speed * deltaTime;
            velocity.y = -Math.sin(this.rotation) * this.speed * deltaTime;
        }

        const newX = this.x + velocity.x;
        const newY = this.y + velocity.y;

        if (this.canTankThroughWall) {
            this.x = newX;
            this.y = newY;
        } else if (!this.game.map.checkCollision({
            x: newX, y: newY, width: this.width, height: this.height, radius: this.radius
        })) {
            this.x = newX;
            this.y = newY;
        } else {
            if (!this.game.map.checkCollision({
                x: newX, y: this.y, width: this.width, height: this.height, radius: this.radius
            })) {
                this.x = newX;
            } else if (!this.game.map.checkCollision({
                x: this.x, y: newY, width: this.width, height: this.height, radius: this.radius
            })) {
                this.y = newY;
            }
        }

        this.x = Math.max(this.radius, Math.min(this.game.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(this.game.height - this.radius, this.y));

        if (input.isKeyDown(this.controls.shoot)) {
            this.shoot(Date.now());
        }

        if (this.skillCooldown > 0) {
            this.skillCooldown -= deltaTime;
        }

        if (this.skillActive && this.skillDuration > 0) {
            this.skillDuration -= deltaTime;
            if (this.skillDuration <= 0) {
                this.deactivateSkill();
            }
        }

        // 递减激光显示时间
        if (this.laserDisplayTime && this.laserDisplayTime > 0) {
            this.laserDisplayTime -= deltaTime;
        }

        this.energyShields = this.energyShields.filter(shield => {
            shield.x += Math.cos(shield.rotation) * shield.speed * deltaTime;
            shield.y += Math.sin(shield.rotation) * shield.speed * deltaTime;

            if (shield.x < 0 || shield.x > this.game.width ||
                shield.y < 0 || shield.y > this.game.height) {
                return false;
            }

            return true;
        });

        this.clones = this.clones.filter(clone => {
            clone.duration -= deltaTime;
            if (clone.duration <= 0) {
                return false;
            }

            if (clone.phase === 'moving') {
                clone.moveTime += deltaTime;
                const nextX = clone.x + Math.cos(clone.rotation) * clone.speed * deltaTime;
                const nextY = clone.y + Math.sin(clone.rotation) * clone.speed * deltaTime;
                
                if (!this.checkCloneWallCollision(nextX, nextY)) {
                    clone.x = nextX;
                    clone.y = nextY;
                }

                if (clone.moveTime >= 500) {
                    clone.phase = 'active';
                    clone.randomMoveTimer = 0;
                    clone.randomMoveDir = Math.random() > 0.5 ? 1 : -1;
                }
            } else if (clone.phase === 'active') {
                const enemyTank = this.game.tanks.find(t => t.color !== this.color && t.health > 0);
                
                if (enemyTank) {
                    const dx = enemyTank.x - clone.x;
                    const dy = enemyTank.y - clone.y;
                    const distanceToEnemy = Math.sqrt(dx * dx + dy * dy);
                    
                    const dxToMain = this.x - clone.x;
                    const dyToMain = this.y - clone.y;
                    const distanceToMain = Math.sqrt(dxToMain * dxToMain + dyToMain * dyToMain);
                    
                    const targetAngle = Math.atan2(dy, dx);
                    let rotDiff = targetAngle - clone.rotation;
                    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                    
                    clone.rotation += rotDiff > 0 ? 
                        this.rotationSpeed * deltaTime * 0.6 : 
                        -this.rotationSpeed * deltaTime * 0.6;
                    
                    const wallBetween = this.isWallBetween(clone.x, clone.y, enemyTank.x, enemyTank.y);
                    
                    if (wallBetween && distanceToEnemy < 350) {
                        clone.randomMoveTimer += deltaTime;
                        if (clone.randomMoveTimer > 1500) {
                            clone.randomMoveDir = Math.random() > 0.5 ? 1 : -1;
                            clone.randomMoveTimer = 0;
                        }
                        const perpAngle = targetAngle + Math.PI / 2 * clone.randomMoveDir;
                        const nextX = clone.x + Math.cos(perpAngle) * this.speed * deltaTime * 0.8;
                        const nextY = clone.y + Math.sin(perpAngle) * this.speed * deltaTime * 0.8;
                        if (!this.checkCloneWallCollision(nextX, nextY)) {
                            clone.x = nextX;
                            clone.y = nextY;
                        }
                        
                        if (distanceToEnemy > 300) {
                            const nextX2 = clone.x + Math.cos(clone.rotation) * this.speed * deltaTime * 0.5;
                            const nextY2 = clone.y + Math.sin(clone.rotation) * this.speed * deltaTime * 0.5;
                            if (!this.checkCloneWallCollision(nextX2, nextY2)) {
                                clone.x = nextX2;
                                clone.y = nextY2;
                            }
                        }
                    } else {
                        if (distanceToEnemy > 280) {
                            const nextX = clone.x + Math.cos(clone.rotation) * this.speed * deltaTime * 0.9;
                            const nextY = clone.y + Math.sin(clone.rotation) * this.speed * deltaTime * 0.9;
                            if (!this.checkCloneWallCollision(nextX, nextY)) {
                                clone.x = nextX;
                                clone.y = nextY;
                            }
                        } else if (distanceToEnemy < 180) {
                            const nextX = clone.x - Math.cos(clone.rotation) * this.speed * deltaTime * 0.8;
                            const nextY = clone.y - Math.sin(clone.rotation) * this.speed * deltaTime * 0.8;
                            if (!this.checkCloneWallCollision(nextX, nextY)) {
                                clone.x = nextX;
                                clone.y = nextY;
                            }
                        } else {
                            clone.randomMoveTimer += deltaTime;
                            if (clone.randomMoveTimer > 2000) {
                                clone.randomMoveDir = Math.random();
                                clone.randomMoveTimer = 0;
                            }
                            
                            if (clone.randomMoveDir < 0.33) {
                                const strafeAngle = targetAngle + Math.PI / 2;
                                const nextX = clone.x + Math.cos(strafeAngle) * this.speed * deltaTime * 0.6;
                                const nextY = clone.y + Math.sin(strafeAngle) * this.speed * deltaTime * 0.6;
                                if (!this.checkCloneWallCollision(nextX, nextY)) {
                                    clone.x = nextX;
                                    clone.y = nextY;
                                }
                            } else if (clone.randomMoveDir < 0.66) {
                                const strafeAngle = targetAngle - Math.PI / 2;
                                const nextX = clone.x + Math.cos(strafeAngle) * this.speed * deltaTime * 0.6;
                                const nextY = clone.y + Math.sin(strafeAngle) * this.speed * deltaTime * 0.6;
                                if (!this.checkCloneWallCollision(nextX, nextY)) {
                                    clone.x = nextX;
                                    clone.y = nextY;
                                }
                            }
                        }
                    }
                    
                    if (distanceToMain < 100) {
                        const awayAngle = Math.atan2(-dyToMain, -dxToMain);
                        const nextX = clone.x + Math.cos(awayAngle) * this.speed * deltaTime * 0.5;
                        const nextY = clone.y + Math.sin(awayAngle) * this.speed * deltaTime * 0.5;
                        if (!this.checkCloneWallCollision(nextX, nextY)) {
                            clone.x = nextX;
                            clone.y = nextY;
                        }
                    }
                    
                    if (distanceToEnemy < 450 && Math.abs(rotDiff) < 0.35) {
                        if (Date.now() - clone.lastShotTime > clone.shootCooldown) {
                            const nozzleLength = 30;
                            const bulletX = clone.x + Math.cos(clone.rotation) * nozzleLength;
                            const bulletY = clone.y + Math.sin(clone.rotation) * nozzleLength;

                            let bullet = new Bullet(bulletX, bulletY, clone.rotation, clone.color,
                                clone.canBulletBounce, clone.canBulletThroughWall, clone.damageMultiplier, false);

                            if (clone.canScatter) {
                                const spreadAngle = 0.3;
                                this.game.addBullet(new Bullet(bulletX, bulletY, clone.rotation - spreadAngle, clone.color,
                                    clone.canBulletBounce, clone.canBulletThroughWall, clone.damageMultiplier, false));
                                this.game.addBullet(new Bullet(bulletX, bulletY, clone.rotation + spreadAngle, clone.color,
                                    clone.canBulletBounce, clone.canBulletThroughWall, clone.damageMultiplier, false));
                            }

                            this.game.addBullet(bullet);
                            clone.lastShotTime = Date.now();
                        }
                    }
                }
            }

            return true;
        });
    }

    isWallBetween(x1, y1, x2, y2) {
        const steps = 20;
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const checkX = x1 + (x2 - x1) * t;
            const checkY = y1 + (y2 - y1) * t;
            
            for (let j = 0; j < this.game.map.walls.length; j++) {
                const wall = this.game.map.walls[j];
                if (checkX >= wall.x && checkX <= wall.x + wall.width &&
                    checkY >= wall.y && checkY <= wall.y + wall.height) {
                    return true;
                }
            }
        }
        return false;
    }

    checkCloneWallCollision(x, y) {
        const bounds = { x: x - 15, y: y - 15, width: 30, height: 30 };
        
        for (let i = 0; i < this.game.map.walls.length; i++) {
            const wall = this.game.map.walls[i];
            if (this.rectIntersect(bounds, wall)) {
                return true;
            }
        }
        return false;
    }

    rectIntersect(r1, r2) {
        return !(r2.x > r1.x + r1.width ||
                 r2.x + r2.width < r1.x ||
                 r2.y > r1.y + r1.height ||
                 r2.y + r2.height < r1.y);
    }

    shoot(currentTime) {
        if (this.isLaserActive) {
            this.shootLaser(currentTime);
            return;
        }

        if (currentTime - this.lastShotTime > this.shootCooldown) {
            const nozzleLength = 30;
            const bulletX = this.x + Math.cos(this.rotation) * nozzleLength;
            const bulletY = this.y + Math.sin(this.rotation) * nozzleLength;

            let bullet = new Bullet(bulletX, bulletY, this.rotation, this.color,
                this.canBulletBounce, this.canBulletThroughWall, this.damageMultiplier, false);

            if (this.canScatter) {
                const spreadAngle = 0.3;
                this.game.addBullet(new Bullet(bulletX, bulletY, this.rotation - spreadAngle, this.color,
                    this.canBulletBounce, this.canBulletThroughWall, this.damageMultiplier, false));
                this.game.addBullet(new Bullet(bulletX, bulletY, this.rotation + spreadAngle, this.color,
                    this.canBulletBounce, this.canBulletThroughWall, this.damageMultiplier, false));
            }

            this.game.addBullet(bullet);
            this.game.audioManager.playShoot();
            this.lastShotTime = currentTime;
        }
    }

    activateSkill() {
        if (!this.selectedSkill || this.selectedSkill === 'none' || this.skillCooldown > 0) return;

        if (this.selectedSkill === 'tankThroughWall' && !this.canTankThroughWall) {
            this.preWallPosition = { x: this.x, y: this.y };
        }

        this.skillCooldown = this.skillCooldowns[this.selectedSkill];
        this.skillActive = true;
        this.skillDuration = this.skillDurations[this.selectedSkill];

        switch (this.selectedSkill) {
            case 'dash':
                this.game.audioManager.playDash();
                this.activateDash();
                break;
            case 'speedUp':
                this.game.audioManager.playSpeedUp();
                this.activateSpeedUp();
                break;
            case 'shield':
                this.game.audioManager.playShield();
                this.activateShield();
                break;
            case 'doubleDamage':
                this.game.audioManager.playDoubleDamage();
                this.activateDoubleDamage();
                break;
            case 'fastShoot':
                this.game.audioManager.playFastShoot();
                this.activateFastShoot();
                break;
            case 'bounceBullet':
                this.game.audioManager.playBounceBullet();
                this.activateBounceBullet();
                break;
            case 'bulletThroughWall':
                this.game.audioManager.playBulletThroughWall();
                this.activateBulletThroughWall();
                break;
            case 'tankThroughWall':
                this.game.audioManager.playTankThroughWall();
                this.activateTankThroughWall();
                break;
            case 'scatter':
                this.game.audioManager.playScatter();
                this.activateScatter();
                break;
            case 'energyShield':
                this.game.audioManager.playEnergyShield();
                this.activateEnergyShield();
                break;
            case 'invisibility':
                this.game.audioManager.playInvisibility();
                this.activateInvisibility();
                break;
            case 'clone':
                this.game.audioManager.playClone();
                this.activateClone();
                break;
            case 'laser':
                this.game.audioManager.playLaser();
                this.activateLaser();
                break;
        }
    }

    activateLaser() {
        this.isLaserActive = true;
        this.lastLaserTime = 0;
        this.laserCooldown = this.baseShootCooldown; // 与普通子弹射速一致
        this.laserStartX = 0;
        this.laserStartY = 0;
        this.laserEndX = 0;
        this.laserEndY = 0;
    }

    shootLaser(currentTime) {
        if (currentTime - this.lastLaserTime < this.laserCooldown) return;

        const nozzleLength = 30;
        const startX = this.x + Math.cos(this.rotation) * nozzleLength;
        const startY = this.y + Math.sin(this.rotation) * nozzleLength;

        const laserSpeed = 2;
        const dx = Math.cos(this.rotation);
        const dy = Math.sin(this.rotation);

        let laserEndX = startX;
        let laserEndY = startY;

        for (let step = 0; step < 800; step++) {
            laserEndX = startX + dx * laserSpeed * step;
            laserEndY = startY + dy * laserSpeed * step;

            if (this.game.map.checkCollision({ x: laserEndX, y: laserEndY, radius: 2 })) {
                laserEndX -= dx * 5;
                laserEndY -= dy * 5;
                break;
            }

            if (laserEndX < 0 || laserEndX > this.game.width ||
                laserEndY < 0 || laserEndY > this.game.height) {
                laserEndX -= dx * 5;
                laserEndY -= dy * 5;
                break;
            }
        }

        this.laserStartX = startX;
        this.laserStartY = startY;
        this.laserEndX = laserEndX;
        this.laserEndY = laserEndY;
        this.laserDisplayTime = 150;

        this.game.tanks.forEach(tank => {
            if (tank !== this && tank.health > 0) {
                if (this.isPointOnLaserSegment(startX, startY, laserEndX, laserEndY, tank.x, tank.y, 20)) {
                    tank.takeDamage(10);
                    this.game.createExplosion(tank.x, tank.y, '#ff0000');
                }
            }
        });

        this.game.tanks.forEach(tank => {
            if (tank.clones) {
                tank.clones.forEach(clone => {
                    if (this.isPointOnLaserSegment(startX, startY, laserEndX, laserEndY, clone.x, clone.y, 20)) {
                        clone.health -= 1;
                        if (clone.health <= 0) {
                            this.game.createExplosion(clone.x, clone.y, '#ff0000');
                        }
                    }
                });
            }
        });

        this.game.audioManager.playLaserShot();
        this.lastLaserTime = currentTime;
    }

    isPointOnLaserSegment(x1, y1, x2, y2, px, py, tolerance) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;

        if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) <= tolerance;

        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));

        const nearestX = x1 + t * dx;
        const nearestY = y1 + t * dy;

        return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2) <= tolerance;
    }

    lineRectIntersection(x1, y1, x2, y2, rect) {
        const left = rect.x;
        const right = rect.x + rect.width;
        const top = rect.y;
        const bottom = rect.y + rect.height;

        const intersections = [];

        if (this.lineSegmentIntersection(x1, y1, x2, y2, left, top, left, bottom)) {
            intersections.push({ x: left, y: this.lineYAtX(x1, y1, x2, y2, left) });
        }
        if (this.lineSegmentIntersection(x1, y1, x2, y2, right, top, right, bottom)) {
            intersections.push({ x: right, y: this.lineYAtX(x1, y1, x2, y2, right) });
        }
        if (this.lineSegmentIntersection(x1, y1, x2, y2, left, top, right, top)) {
            intersections.push({ x: this.lineXAtY(x1, y1, x2, y2, top), y: top });
        }
        if (this.lineSegmentIntersection(x1, y1, x2, y2, left, bottom, right, bottom)) {
            intersections.push({ x: this.lineXAtY(x1, y1, x2, y2, bottom), y: bottom });
        }

        if (intersections.length === 0) return null;

        let closest = intersections[0];
        let minDist = Math.sqrt((closest.x - x1) ** 2 + (closest.y - y1) ** 2);

        for (let i = 1; i < intersections.length; i++) {
            const dist = Math.sqrt((intersections[i].x - x1) ** 2 + (intersections[i].y - y1) ** 2);
            if (dist < minDist) {
                minDist = dist;
                closest = intersections[i];
            }
        }

        return closest;
    }

    lineSegmentIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (denom === 0) return false;

        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    lineYAtX(x1, y1, x2, y2, x) {
        if (x2 === x1) return y1;
        return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
    }

    lineXAtY(x1, y1, x2, y2, y) {
        if (y2 === y1) return x1;
        return x1 + (x2 - x1) * (y - y1) / (y2 - y1);
    }

    isPointOnLine(x1, y1, x2, y2, px, py, tolerance) {
        const dist = Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) /
                     Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
        return dist <= tolerance;
    }

    getLineRectIntersection(x1, y1, x2, y2, rect) {
        const left = rect.x;
        const right = rect.x + rect.width;
        const top = rect.y;
        const bottom = rect.y + rect.height;

        const intersections = [];

        const edges = [
            { x3: left, y3: top, x4: left, y4: bottom },
            { x3: right, y3: top, x4: right, y4: bottom },
            { x3: left, y3: top, x4: right, y4: top },
            { x3: left, y3: bottom, x4: right, y4: bottom }
        ];

        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];

            const x3 = edge.x3, y3 = edge.y3;
            const x4 = edge.x4, y4 = edge.y4;

            const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
            if (Math.abs(denom) < 0.0001) continue;

            const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;

            let ix, iy;
            if (Math.abs(x2 - x1) > 0.0001) {
                ix = x1 + ua * (x2 - x1);
                iy = y1 + ua * (y2 - y1);
            } else {
                ix = x1;
                iy = y1 + ua * (y2 - y1);
            }

            if (ua < 0) continue;

            const onVerticalEdge = (Math.abs(x3 - left) < 0.0001 || Math.abs(x3 - right) < 0.0001);
            if (onVerticalEdge) {
                if (iy >= top && iy <= bottom) {
                    intersections.push({ x: ix, y: iy, dist: ua });
                }
            } else {
                if (ix >= left && ix <= right) {
                    intersections.push({ x: ix, y: iy, dist: ua });
                }
            }
        }

        if (intersections.length === 0) return null;

        let closest = intersections[0];
        for (let i = 1; i < intersections.length; i++) {
            if (intersections[i].dist < closest.dist) {
                closest = intersections[i];
            }
        }

        return { x: closest.x, y: closest.y };
    }

    isPointOnLaserLine(x1, y1, x2, y2, px, py) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;

        if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) < 5;

        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;

        const dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
        return dist < 15;
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
        if (this.preWallPosition && !this.game.map.checkCollision({
            x: this.preWallPosition.x, y: this.preWallPosition.y,
            width: this.width, height: this.height, radius: this.radius
        })) {
            this.x = this.preWallPosition.x;
            this.y = this.preWallPosition.y;
            this.preWallPosition = null;
            return;
        }

        const testPoints = [];
        const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI, Math.PI * 5 / 4, Math.PI * 3 / 2, Math.PI * 7 / 4];
        const distances = [50, 100, 150, 200, 250];

        for (const angle of angles) {
            for (const dist of distances) {
                const testX = this.x + Math.cos(angle) * dist;
                const testY = this.y + Math.sin(angle) * dist;

                if (testX >= this.radius && testX <= this.game.width - this.radius &&
                    testY >= this.radius && testY <= this.game.height - this.radius) {
                    testPoints.push({ x: testX, y: testY, dist: dist });
                }
            }
        }

        testPoints.sort((a, b) => a.dist - b.dist);

        for (const point of testPoints) {
            if (!this.game.map.checkCollision({
                x: point.x, y: point.y,
                width: this.width, height: this.height, radius: this.radius
            })) {
                this.x = point.x;
                this.y = point.y;
                break;
            }
        }

        this.preWallPosition = null;
    }

    activateDash() {
        const dashDistance = 80;
        const newX = this.x + Math.cos(this.rotation) * dashDistance;
        const newY = this.y + Math.sin(this.rotation) * dashDistance;

        if (!this.game.map.checkCollision({
            x: newX, y: newY, width: this.width, height: this.height, radius: this.radius
        })) {
            this.x = newX;
            this.y = newY;
        }
        this.game.createExplosion(this.x, this.y, this.color);
    }

    activateSpeedUp() {
        this.speed = this.baseSpeed * 1.5;
    }

    activateShield() {
        this.isShielded = true;
    }

    activateDoubleDamage() {
        this.damageMultiplier = 2;
    }

    activateFastShoot() {
        this.shootCooldown = this.baseShootCooldown / 1.8;
    }

    activateBounceBullet() {
        this.canBulletBounce = true;
    }

    activateBulletThroughWall() {
        this.canBulletThroughWall = true;
    }

    activateTankThroughWall() {
        this.canTankThroughWall = true;
    }

    activateScatter() {
        this.canScatter = true;
    }

    activateEnergyShield() {
        const nozzleLength = 30;
        const shieldX = this.x + Math.cos(this.rotation) * nozzleLength;
        const shieldY = this.y + Math.sin(this.rotation) * nozzleLength;

        this.energyShields.push({
            x: shieldX,
            y: shieldY,
            rotation: this.rotation,
            speed: 0.15,
            color: this.color,
            width: 80,
            height: 15
        });
    }

    activateInvisibility() {
        this.isInvisible = true;
    }

    activateClone() {
        const cloneX = this.x - Math.cos(this.rotation) * 50;
        const cloneY = this.y - Math.sin(this.rotation) * 50;
        
        const clone = {
            x: cloneX,
            y: cloneY,
            rotation: this.rotation + Math.PI,
            color: this.color,
            width: 40,
            height: 40,
            speed: 0.15,
            rotationSpeed: 0.003,
            health: 2,
            lastShotTime: 0,
            shootCooldown: this.shootCooldown,
            canBulletBounce: this.canBulletBounce,
            canBulletThroughWall: this.canBulletThroughWall,
            damageMultiplier: this.damageMultiplier,
            canScatter: this.canScatter,
            duration: 6000,
            phase: 'moving',
            moveTime: 0,
            isInvisible: this.isInvisible,
            originalTank: this
        };

        this.clones.push(clone);
    }

    draw(ctx) {
        if (this.health <= 0) return;

        if (this.isInvisible) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.isShielded) {
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00ff88';
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = '#000';

        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeRect(-15, -15, 30, 30);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        this.energyShields.forEach(shield => {
            ctx.save();
            ctx.translate(shield.x, shield.y);
            ctx.rotate(shield.rotation + Math.PI / 2);

            ctx.strokeStyle = '#00ffff';
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ffff';

            ctx.beginPath();
            const w = shield.width;
            const h = shield.height;
            ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        });

        this.clones.forEach(clone => {
            if (clone.isInvisible) {
                return;
            }
            ctx.save();
            ctx.translate(clone.x, clone.y);
            ctx.rotate(clone.rotation);

            ctx.shadowBlur = 15;
            ctx.shadowColor = clone.color;
            ctx.strokeStyle = clone.color;
            ctx.lineWidth = 2;
            ctx.fillStyle = '#000';

            ctx.fillRect(-15, -15, 30, 30);
            ctx.strokeRect(-15, -15, 30, 30);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(25, 0);
            ctx.stroke();

            ctx.fillStyle = clone.color;
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });

        // 绘制激光
        if (this.isLaserActive && this.laserDisplayTime && this.laserDisplayTime > 0) {
            ctx.save();
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#ff0000';
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(this.laserStartX, this.laserStartY);
            ctx.lineTo(this.laserEndX, this.laserEndY);
            ctx.stroke();
            ctx.restore();
        }
    }

    takeDamage(amount) {
        if (this.isShielded) return;
        this.health -= amount;
        this.game.audioManager.playHit();
        if (this.health <= 0) {
            this.game.createExplosion(this.x, this.y, this.color);
        }
    }

    getBounds() {
        return { x: this.x - 15, y: this.y - 15, width: 30, height: 30 };
    }
}
