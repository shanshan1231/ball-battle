/**
 * 游戏主逻辑 - Game.js
 * 负责游戏全局状态、物理碰撞、战斗判定
 * 移动规则：台球式匀速直线运动，只有撞墙才反弹
 */

const Ball = require('./Ball');

class Game {
    constructor(ballAClass, ballBClass, config) {
        // 保存配置
        this.config = config;
        this.heroConfigs = config ? config.heroes : {};

        // 场地配置
        this.arenaWidth = config && config.arena ? config.arena.width : 704;
        this.arenaHeight = config && config.arena ? config.arena.height : 704;

        // 游戏状态
        this.isOver = false;
        this.isPaused = false;
        this.winner = null;
        this.loser = null;
        this.gameOverCallback = null;
        this.logCallback = null;
        this.soundCallback = null;
        this.speed = 1;
        this.gameOverTime = 0;

        // 创建两个小球
        this.ballA = new Ball(ballAClass, 'A', this, this.heroConfigs);
        this.ballA.x = 200;
        this.ballA.y = this.arenaHeight / 2;

        this.ballB = new Ball(ballBClass, 'B', this, this.heroConfigs);
        this.ballB.x = this.arenaWidth - 200;
        this.ballB.y = this.arenaHeight / 2;

        this.ballA.setRandomDirection();
        this.ballB.setRandomDirection();

        // 投射物和特效
        this.projectiles = [];
        this.projectilePool = [];
        this.effects = [];
        this.maxProjectiles = 50;
        this.maxEffects = 100;
        this.maxActiveEffects = 30;

        // 物理参数
        this.ballRadius = 50;
        this.bounceElasticity = 1.0;
        this.collisionForce = 0.8;
        this.minSpeed = 1.5;

        this.log(`🎮 游戏创建: ${this.heroConfigs[ballAClass]?.name || ballAClass} VS ${this.heroConfigs[ballBClass]?.name || ballBClass}`);
    }

    /**
     * 【性能优化】获取投射物对象（对象池复用）
     */
    getProjectile() {
        if (this.projectilePool.length > 0) {
            return this.projectilePool.pop();
        }
        return {};
    }

    /**
     * 【性能优化】回收投射物到对象池
     */
    recycleProjectile(proj) {
        proj.active = false;
        if (this.projectilePool.length < this.maxProjectiles) {
            this.projectilePool.push(proj);
        }
    }

    setSpeed(speed) {
        this.speed = speed || 1;
    }

    onGameOver(callback) {
        this.gameOverCallback = callback;
    }

    onLog(callback) {
        this.logCallback = callback;
    }

    onSound(callback) {
        this.soundCallback = callback;
    }

    playSound(type) {
        if (this.soundCallback) {
            this.soundCallback(type);
        }
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        if (this.logCallback) {
            this.logCallback(logMessage);
        }
    }

    start() {
        this.isOver = false;
        this.isPaused = false;
        this.ballA.setPaused(false);
        this.ballB.setPaused(false);
        this.log('━━━━━━━━━━ 游戏开始！━━━━━━━━━━');
        this.playSound('game_start');
        this.logStatus();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.ballA.setPaused(this.isPaused);
        this.ballB.setPaused(this.isPaused);

        if (this.isPaused) {
            this.log('⏸️ 游戏已暂停');
        } else {
            this.log('▶️ 游戏继续');
        }

        return this.isPaused;
    }

    getPaused() {
        return this.isPaused;
    }

    logStatus() {
        const hpA = `${this.ballA.hp}/${this.ballA.maxHp}`;
        const hpB = `${this.ballB.hp}/${this.ballB.maxHp}`;
        this.log(`状态: A方[${hpA}] VS B方[${hpB}]`);
    }

    updateHitFlash() {
        if (!this.ballA.isDead && this.ballA.hitFlash > 0) {
            this.ballA.hitFlash--;
        }
        if (!this.ballB.isDead && this.ballB.hitFlash > 0) {
            this.ballB.hitFlash--;
        }
    }

    update() {
        this.updateHitFlash();

        if (this.isPaused) return;

        if (!this.ballA.isDead) this.ballA.update();
        if (!this.ballB.isDead) this.ballB.update();

        if (!this.ballA.isDead) this.checkWallCollision(this.ballA);
        if (!this.ballB.isDead) this.checkWallCollision(this.ballB);

        this.checkBallCollision();

        if (!this.ballA.isDead) this.ballA.tryAttack(this.ballB);
        if (!this.ballB.isDead) this.ballB.tryAttack(this.ballA);

        this.updateProjectiles();

        this.updateEffects();

        if (!this.ballA.isDead) this.ballA.applyHealing();
        if (!this.ballB.isDead) this.ballB.applyHealing();

        this.checkDeath();
    }

    checkWallCollision(ball) {
        if (ball.isCharging) return;

        const radius = ball.radius;
        let bounced = false;

        if (ball.x - radius < 0) {
            ball.x = radius;
            ball.vx = Math.abs(ball.vx) * this.bounceElasticity;
            bounced = true;
        }

        if (ball.x + radius > this.arenaWidth) {
            ball.x = this.arenaWidth - radius;
            ball.vx = -Math.abs(ball.vx) * this.bounceElasticity;
            bounced = true;
        }

        if (ball.y - radius < 0) {
            ball.y = radius;
            ball.vy = Math.abs(ball.vy) * this.bounceElasticity;
            bounced = true;
        }

        if (ball.y + radius > this.arenaHeight) {
            ball.y = this.arenaHeight - radius;
            ball.vy = -Math.abs(ball.vy) * this.bounceElasticity;
            bounced = true;
        }

        if (bounced) {
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed < this.minSpeed) {
                const angle = Math.random() * Math.PI * 2;
                ball.vx = Math.cos(angle) * ball.baseSpeed;
                ball.vy = Math.sin(angle) * ball.baseSpeed;
            }
            if (Math.random() < 0.3) {
                this.playSound('bounce');
            }
        }
    }

    checkBallCollision() {
        const ball1 = this.ballA;
        const ball2 = this.ballB;

        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = ball1.radius + ball2.radius;

        if (distance < minDist && distance > 0) {
            const nx = dx / distance;
            const ny = dy / distance;

            const dvx = ball1.vx - ball2.vx;
            const dvy = ball1.vy - ball2.vy;
            const dvn = dvx * nx + dvy * ny;

            if (dvn > 0) {
                const impulse = dvn * this.collisionForce;

                ball1.vx -= impulse * nx;
                ball1.vy -= impulse * ny;
                ball2.vx += impulse * nx;
                ball2.vy += impulse * ny;

                const overlap = minDist - distance;
                ball1.x -= overlap * nx * 0.5;
                ball1.y -= overlap * ny * 0.5;
                ball2.x += overlap * nx * 0.5;
                ball2.y += overlap * ny * 0.5;

                const midX = (ball1.x + ball2.x) / 2;
                const midY = (ball1.y + ball2.y) / 2;
                this.addEffect('collision', midX, midY);
                this.playSound('collision');
            }
        }
    }

    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            if (!proj.active) {
                this.projectiles.splice(i, 1);
                continue;
            }

            if (proj.owner === 'A' && this.ballA.isDead) {
                this.recycleProjectile(proj);
                this.projectiles.splice(i, 1);
                continue;
            }
            if (proj.owner === 'B' && this.ballB.isDead) {
                this.recycleProjectile(proj);
                this.projectiles.splice(i, 1);
                continue;
            }

            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.life--;

            if (proj.type === 'xishi_ball') {
                this.updateXishiBall(proj, i);
                continue;
            }

            if (proj.x < 0 || proj.x > this.arenaWidth ||
                proj.y < 0 || proj.y > this.arenaHeight ||
                proj.life <= 0) {
                this.recycleProjectile(proj);
                this.projectiles.splice(i, 1);
                continue;
            }

            const target = proj.owner === 'A' ? this.ballB : this.ballA;
            const dx = target.x - proj.x;
            const dy = target.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < target.radius + proj.radius) {
                this.handleProjectileHit(proj, target);
                this.recycleProjectile(proj);
                this.projectiles.splice(i, 1);
                continue;
            }

            if (target.classType === 'shield' && !proj.reflected) {
                const targetDist = Math.sqrt(
                    Math.pow(target.x - proj.x, 2) +
                    Math.pow(target.y - proj.y, 2)
                );
                if (targetDist < target.radius + 20) {
                    proj.vx = -proj.vx;
                    proj.vy = -proj.vy;
                    proj.owner = target.side;
                    proj.reflected = true;
                    proj.color = '#00ffff';

                    this.addEffect('shield_block', target.x, target.y);
                    this.playSound('shield_block');
                    this.log(`🛡️ ${this.heroConfigs[target.classType]?.name || target.classType}反弹了${proj.type === 'arrow' ? '箭矢' : '法球'}！`);
                }
            }
        }
    }

    updateXishiBall(proj, index) {
        const owner = proj.owner === 'A' ? this.ballA : this.ballB;
        const target = proj.owner === 'A' ? this.ballB : this.ballA;

        if (owner.isDead) {
            this.recycleProjectile(proj);
            this.projectiles.splice(index, 1);
            return;
        }

        if (proj.hasExploded) {
            // 法球爆炸后直接移除，不再释放新法球
            this.recycleProjectile(proj);
            this.projectiles.splice(index, 1);
            return;
        }

        if (!proj.isStationary) {
            proj.life--;

            // 计算飞行距离
            const travelDx = proj.x - proj.startX;
            const travelDy = proj.y - proj.startY;
            proj.travelDistance = Math.sqrt(travelDx * travelDx + travelDy * travelDy);

            // 检测是否撞到目标
            const dx = target.x - proj.x;
            const dy = target.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 撞到人或者飞行距离达到50%擂台宽度则停止
            if (dist < target.radius + proj.radius || proj.travelDistance >= proj.maxTravelDistance) {
                proj.isStationary = true;
                proj.stationaryTime = 0;
                proj.startTime = Date.now();
                // 撞到人的话就在撞击位置停止并造成伤害，否则在最大飞行距离位置停止
                if (dist < target.radius + proj.radius) {
                    // 撞到人，造成撞击伤害
                    if (!target.isDead) {
                        target.takeDamage(proj.damage, 'xishi_ball');
                        this.log(`💥 西施法球撞击造成${proj.damage}伤害！`);
                    }
                } else {
                    // 没撞到人，在最大距离位置停止
                    const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
                    if (speed > 0) {
                        proj.x = proj.startX + (proj.vx / speed) * proj.maxTravelDistance;
                        proj.y = proj.startY + (proj.vy / speed) * proj.maxTravelDistance;
                    }
                }
                proj.vx = 0;
                proj.vy = 0;
                proj.life = 999;
                return;
            }

            // 超出边界则移除
            if (proj.x < 0 || proj.x > this.arenaWidth ||
                proj.y < 0 || proj.y > this.arenaHeight ||
                proj.life <= 0) {
                this.recycleProjectile(proj);
                this.projectiles.splice(index, 1);
                return;
            }
        } else {
            const now = Date.now();
            proj.stationaryTime = now - proj.startTime;

            if (now - proj.lastTick > proj.tickInterval) {
                this.handleXishiAreaDamage(proj, target);
                proj.lastTick = now;
            }

            if (proj.stationaryTime >= proj.duration) {
                proj.hasExploded = true;
                this.addEffect('xishi_explosion', proj.x, proj.y);
                this.log(`💥 ${owner.side}方西施法球爆炸！造成${proj.explosionDamage}伤害！`);
                this.handleXishiExplosionDamage(proj, target);
            }
        }
    }

    handleXishiAreaDamage(proj, target) {
        if (target.isDead) return;

        const dx = target.x - proj.x;
        const dy = target.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < proj.radius + target.radius) {
            target.takeDamage(proj.tickDamage, 'xishi_ball');
            this.log(`✨ 西施法球持续伤害：${proj.tickDamage}点！`);
        }
    }

    handleXishiExplosionDamage(proj, target) {
        if (target.isDead) return;

        const dx = target.x - proj.x;
        const dy = target.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < proj.radius * 2 + target.radius) {
            target.takeDamage(proj.explosionDamage, 'xishi_ball');
            this.log(`💥 西施法球爆炸造成${proj.explosionDamage}伤害！`);
            this.playSound('xishi_explosion');
        }
    }

    handleProjectileHit(proj, target) {
        if (proj.owner === 'A' && this.ballA.isDead) return;
        if (proj.owner === 'B' && this.ballB.isDead) return;
        if (target.isDead) return;

        target.takeDamage(proj.damage, proj.type);
        this.addEffect('hit', target.x, target.y, proj.type);
        this.playSound('hit');

        if (proj.type === 'arrow') {
            this.playSound('archer_attack');
        } else if (proj.type === 'magic_ball') {
            this.playSound('mage_attack');
        } else if (proj.type === 'lixin_blade') {
            this.playSound('lixin_attack');
        }
    }

    /**
     * 处理李信攻击（因为李信有特殊的蓄力位移机制）
     */
    handleLixinAttack(ball, target) {
        // 李信攻击已在 Ball.js 的 tryAttack 中处理
        // 这里留空，因为李信的特殊逻辑在 Ball.js 的 attackLixin 方法中
    }

    /**
     * 处理西施攻击
     */
    handleXishiAttack(ball, target) {
        if (ball.isDead || ball.isPaused) return;

        const angle = Math.atan2(target.y - ball.y, target.x - ball.x);
        ball.fireXishiBall(target, angle);
        this.log(`✨ ${ball.side}方西施释放法球！`);
    }

    updateEffects() {
        // 【性能优化】限制特效数组大小
        while (this.effects.length > this.maxEffects) {
            this.effects.shift();
        }

        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].life--;
            if (this.effects[i].life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }

    addEffect(type, x, y, subtype = '', value = 0) {
        // 【性能优化】如果特效已过多，替换最老的
        if (this.effects.length >= this.maxActiveEffects) {
            this.effects.shift();
        }

        let effectLife = 15;
        if (type === 'death') effectLife = 60;
        if (type === 'damage_number') effectLife = 40;

        this.effects.push({
            type: type,
            x: x,
            y: y,
            life: effectLife,
            maxLife: effectLife,
            subtype: subtype,
            value: value
        });
    }

    checkDeath() {
        if (this.ballA.hp <= 0 && !this.isOver) {
            this.endGame(this.ballB, this.ballA);
        } else if (this.ballB.hp <= 0 && !this.isOver) {
            this.endGame(this.ballA, this.ballB);
        }
    }

    endGame(winner, loser) {
        this.isOver = true;
        this.gameOverTime = Date.now();
        this.winner = winner;
        this.loser = loser;

        this.playSound('death');

        this.log('═══════════════════════════════════');
        this.log(`🏆 游戏结束！胜利者: ${this.heroConfigs[winner.classType]?.name || winner.classType}(${winner.side}方)`);
        this.log(`💀 失败者: ${this.heroConfigs[loser.classType]?.name || loser.classType}(${loser.side}方)`);
        this.log('═══════════════════════════════════');

        if (this.gameOverCallback) {
            this.gameOverCallback(winner, loser);
        }
    }

    /**
     * 【新增】保存战斗到历史记录
     */
    saveToHistory(winner, loser) {
        try {
            const history = JSON.parse(localStorage.getItem('battleHistory') || '[]');
            const record = {
                id: Date.now(),
                timestamp: new Date().toLocaleString(),
                winner: {
                    classType: winner.classType,
                    name: this.heroConfigs[winner.classType]?.name || winner.classType,
                    side: winner.side,
                    hp: winner.hp,
                    maxHp: winner.maxHp
                },
                loser: {
                    classType: loser.classType,
                    name: this.heroConfigs[loser.classType]?.name || loser.classType,
                    side: loser.side,
                    hp: loser.hp,
                    maxHp: loser.maxHp
                },
                ballA: {
                    classType: this.ballA.classType,
                    name: this.heroConfigs[this.ballA.classType]?.name || this.ballA.classType
                },
                ballB: {
                    classType: this.ballB.classType,
                    name: this.heroConfigs[this.ballB.classType]?.name || this.ballB.classType
                }
            };
            history.unshift(record);
            // 只保留最近20条记录
            if (history.length > 20) {
                history.pop();
            }
            localStorage.setItem('battleHistory', JSON.stringify(history));
        } catch (e) {
            console.warn('无法保存战斗历史:', e);
        }
    }

    getState() {
        return {
            ballA: this.ballA.getState(),
            ballB: this.ballB.getState(),
            projectiles: this.projectiles,
            effects: this.effects,
            isPaused: this.isPaused,
            speed: this.speed
        };
    }
}

module.exports = Game;