class AIController {
    constructor(tank, target, map, difficulty = 'medium') {
        this.tank = tank;
        this.target = target;
        this.map = map;
        this.difficulty = difficulty;

        this.state = 'CHASE';
        this.lastStateChange = 0;
        this.stateDuration = 2000;

        this.randomMoveDir = null;
        this.randomMoveTime = 0;

        this.lastPos = { x: 0, y: 0 };
        this.stuckTimer = 0;
        this.isStuck = false;
        this.stuckResolveTime = 0;

        this.lastSkillUse = 0;
        this.skillUseInterval = 2000;

        this.avoidTimer = 0;
        this.avoidDir = null;

        this.setDifficultyParams();
    }

    setDifficultyParams() {
        switch (this.difficulty) {
            case 'easy':
                this.aimThreshold = 0.35;
                this.reactionDelay = 150;
                this.skillUseInterval = 4000;
                this.optimalDistance = 400;
                this.stuckThreshold = 800;
                break;
            case 'medium':
                this.aimThreshold = 0.2;
                this.reactionDelay = 50;
                this.skillUseInterval = 2000;
                this.optimalDistance = 350;
                this.stuckThreshold = 400;
                break;
            case 'hard':
                this.aimThreshold = 0.08;
                this.reactionDelay = 0;
                this.skillUseInterval = 1000;
                this.optimalDistance = 300;
                this.stuckThreshold = 300;
                break;
        }
    }

    update(deltaTime) {
        const now = Date.now();
        const controls = { up: false, down: false, left: false, right: false, shoot: false, skill: false };

        const moveDist = Math.sqrt(Math.pow(this.tank.x - this.lastPos.x, 2) + Math.pow(this.tank.y - this.lastPos.y, 2));
        if (moveDist < 0.3 && (controls.up || controls.down)) {
            this.stuckTimer += deltaTime;
        } else {
            this.stuckTimer = Math.max(0, this.stuckTimer - deltaTime);
        }
        this.lastPos = { x: this.tank.x, y: this.tank.y };

        if (this.stuckTimer > this.stuckThreshold) {
            this.isStuck = true;
            this.stuckResolveTime = 800;
            this.stuckTimer = 0;
            this.randomMoveDir = Math.random() > 0.5 ? 'left' : 'right';
        }

        if (this.isStuck) {
            this.stuckResolveTime -= deltaTime;
            if (this.stuckResolveTime <= 0) {
                this.isStuck = false;
            } else {
                controls.down = true;
                controls[this.randomMoveDir] = true;
                
                if (this.tank.selectedSkill === 'tankThroughWall' && this.tank.skillCooldown <= 0) {
                    controls.skill = true;
                }
                
                return controls;
            }
        }

        if (this.avoidTimer > 0) {
            this.avoidTimer -= deltaTime;
            if (this.avoidDir === 'left') controls.left = true;
            else if (this.avoidDir === 'right') controls.right = true;
            controls.up = true;
            this.considerSkillUse(controls, now);
            return controls;
        }

        if (this.target.isInvisible) {
            if (Math.random() < 0.02) {
                this.avoidTimer = 500;
                this.avoidDir = Math.random() > 0.5 ? 'left' : 'right';
            }
            this.considerSkillUse(controls, now);
            return controls;
        }

        const dx = this.target.x - this.tank.x;
        const dy = this.target.y - this.tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const targetAngle = Math.atan2(dy, dx);

        let diff = targetAngle - this.tank.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const isAiming = Math.abs(diff) < this.aimThreshold;
        const facingAway = Math.abs(diff) > Math.PI * 0.8;

        if (Math.abs(diff) > this.aimThreshold) {
            if (diff > 0) controls.right = true;
            else controls.left = true;
        }

        if (isAiming) {
            if (this.canShootToTarget()) {
                controls.shoot = true;
            } else {
                if (Math.random() < 0.05) {
                    this.avoidTimer = 400;
                    this.avoidDir = Math.random() > 0.5 ? 'left' : 'right';
                }
            }
        }

        if (distance > this.optimalDistance) {
            if (!this.canShootToTarget() && Math.random() < 0.1) {
                this.avoidTimer = 400;
                this.avoidDir = Math.random() > 0.5 ? 'left' : 'right';
            }
            controls.up = true;
        } else if (distance < 120) {
            if (!facingAway) {
                controls.down = true;
            } else {
                controls.up = true;
            }
        } else {
            if (!this.canShootToTarget() && Math.random() < 0.05) {
                this.avoidTimer = 300;
                this.avoidDir = Math.random() > 0.5 ? 'left' : 'right';
            }
        }

        if (now - this.lastStateChange > this.stateDuration) {
            this.lastStateChange = now;
            this.stateDuration = 800 + Math.random() * 1500;
        }

        this.considerSkillUse(controls, now);

        return controls;
    }

    considerSkillUse(controls, now) {
        if (!this.tank.selectedSkill || this.tank.selectedSkill === 'none') return;
        if (this.tank.skillCooldown > 0) return;
        if (now - this.lastSkillUse < this.skillUseInterval) return;

        const dx = this.target.x - this.tank.x;
        const dy = this.target.y - this.tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angleToTarget = Math.atan2(dy, dx);
        let rotationDiff = Math.abs(angleToTarget - this.tank.rotation);
        while (rotationDiff > Math.PI) rotationDiff = Math.abs(rotationDiff - Math.PI * 2);
        const isAiming = rotationDiff < 0.3;

        switch (this.tank.selectedSkill) {
            case 'dash':
                if (distance > 250 && isAiming) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 6000 + Math.random() * 4000;
                } else if (distance < 100 && !isAiming) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 5000 + Math.random() * 3000;
                }
                break;

            case 'speedUp':
                if (distance > 200) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 8000 + Math.random() * 4000;
                } else if (distance < 100) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 6000 + Math.random() * 3000;
                }
                break;

            case 'shield':
                if (this.tank.health < 80) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 10000 + Math.random() * 5000;
                } else if (distance < 80) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 8000 + Math.random() * 4000;
                } else if (this.willBeHit()) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 5000 + Math.random() * 3000;
                }
                break;

            case 'doubleDamage':
                if (isAiming && distance < 300) {
                    if (Math.random() < 0.15) {
                        controls.skill = true;
                        this.lastSkillUse = now;
                        this.skillUseInterval = 7000 + Math.random() * 3000;
                    }
                }
                break;

            case 'fastShoot':
                if (isAiming && distance < 400) {
                    if (Math.random() < 0.03) {
                        controls.skill = true;
                        this.lastSkillUse = now;
                        this.skillUseInterval = 5000 + Math.random() * 3000;
                    }
                }
                break;

            case 'bounceBullet':
                if (this.map.walls.length > 0) {
                    if (isAiming && distance > 200) {
                        controls.skill = true;
                        this.lastSkillUse = now;
                        this.skillUseInterval = 10000 + Math.random() * 4000;
                    }
                }
                break;

            case 'bulletThroughWall':
                if (this.isWallBetween()) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 8000 + Math.random() * 4000;
                } else if (isAiming && distance > 150) {
                    if (Math.random() < 0.05) {
                        controls.skill = true;
                        this.lastSkillUse = now;
                        this.skillUseInterval = 8000 + Math.random() * 4000;
                    }
                }
                break;

            case 'tankThroughWall':
                if (this.isNearWall() && distance < 150) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 10000 + Math.random() * 5000;
                } else if (this.isStuck) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 8000 + Math.random() * 4000;
                }
                break;

            case 'scatter':
                if (isAiming && distance < 200) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 8000 + Math.random() * 5000;
                } else if (distance < 100) {
                    controls.skill = true;
                    this.lastSkillUse = now;
                    this.skillUseInterval = 6000 + Math.random() * 4000;
                }
                break;

            case 'energyShield':
                if (distance < 200) {
                    if (Math.random() < 0.12) {
                        controls.skill = true;
                        this.lastSkillUse = now;
                        this.skillUseInterval = 10000 + Math.random() * 5000;
                    }
                }
                break;

            case 'invisibility':
                if (distance < 300 || this.tank.health < 70) {
                    if (Math.random() < 0.1) {
                        controls.skill = true;
                        this.lastSkillUse = now;
                        this.skillUseInterval = 12000 + Math.random() * 4000;
                    }
                }
                break;

            case 'clone':
                if (distance > 150 && !this.tank.clones.length) {
                    if (Math.random() < 0.08) {
                        controls.skill = true;
                        this.lastSkillUse = now;
                        this.skillUseInterval = 15000 + Math.random() * 5000;
                    }
                }
                break;

            case 'laser':
                if (isAiming && distance < 400 && !this.isWallBetween()) {
                    if (Math.random() < 0.1) {
                        controls.skill = true;
                        this.lastSkillUse = now;
                        this.skillUseInterval = 12000 + Math.random() * 5000;
                    }
                }
                break;

            case 'random':
                break;
        }
    }

    willBeHit() {
        const dx = this.target.x - this.tank.x;
        const dy = this.target.y - this.tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 300) return false;
        
        const angleToTarget = Math.atan2(dy, dx);
        let rotationDiff = Math.abs(angleToTarget - this.target.rotation);
        while (rotationDiff > Math.PI) rotationDiff = Math.abs(rotationDiff - Math.PI * 2);
        
        return rotationDiff < 0.5 && distance < 200;
    }

    canShootToTarget() {
        if (this.tank.canBulletThroughWall) return true;
        if (this.tank.canBulletBounce) return true;
        return !this.isWallBetween();
    }

    isWallBetween() {
        for (const wall of this.map.walls) {
            if (this.lineIntersectsRect(this.tank.x, this.tank.y, this.target.x, this.target.y, wall)) {
                return true;
            }
        }
        return false;
    }

    isNearWall() {
        const checkRadius = 40;
        for (const wall of this.map.walls) {
            const closestX = Math.max(wall.x, Math.min(this.tank.x, wall.x + wall.w));
            const closestY = Math.max(wall.y, Math.min(this.tank.y, wall.y + wall.h));
            const dist = Math.sqrt(Math.pow(this.tank.x - closestX, 2) + Math.pow(this.tank.y - closestY, 2));
            if (dist < checkRadius) {
                return true;
            }
        }
        return false;
    }

    lineIntersectsRect(x1, y1, x2, y2, rect) {
        const rx1 = rect.x, ry1 = rect.y;
        const rx2 = rect.x + rect.w, ry2 = rect.y + rect.h;

        const inside1 = x1 >= rx1 && x1 <= rx2 && y1 >= ry1 && y1 <= ry2;
        const inside2 = x2 >= rx1 && x2 <= rx2 && y2 >= ry1 && y2 <= ry2;

        if (inside1 && inside2) return true;

        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        if (maxX < rx1 || minX > rx2 || maxY < ry1 || minY > ry2) {
            return false;
        }

        return true;
    }
}
