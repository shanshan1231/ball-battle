/**
 * 李信技能 - LixinSkill.js
 * 技能：蓄力位移，位移碰到敌人造成攻击，位移后获得远程平A
 */

const Skill = require('./Skill');

class LixinSkill extends Skill {
    constructor(ball, game) {
        super(ball, game);
        this.isCharging = false;
        this.chargeStartTime = 0;
        this.chargeProgress = 0;
        this.isDashing = false;
        this.dashTargetX = 0;
        this.dashTargetY = 0;
        this.dashStartX = 0;
        this.dashStartY = 0;
        this.dashProgress = 0;
        this.hasRangedAttack = false;
        this.rangedAttackTimer = 0;
        this.lastRangedAttackTime = 0;
        this.isInCooldown = false;
        this.cooldownEndTime = 0;
        this.chargeTargetRef = null;
        this.dashHit = false;
    }

    update(target) {
        if (this.ball.isPaused || this.ball.isDead) {
            return false;
        }

        const now = Date.now();
        const config = this.ball.classConfig || {};

        // 处理冷却状态
        if (this.isInCooldown && now > this.cooldownEndTime) {
            this.isInCooldown = false;
            this.game.log(`⚡ ${this.ball.side}方李信冷却结束！`);
        }

        // 如果正在位移，更新位移
        if (this.isDashing) {
            this.updateDash(target);
            return true;
        }

        // 检查攻击冷却
        if (now - this.ball.lastAttackTime < this.ball.attackCooldown) {
            // 如果有远程普攻机会，发射
            if (this.hasRangedAttack) {
                this.performRangedAttack(target);
            }
            return false;
        }

        // 开始蓄力
        this.startCharge(target);
        this.ball.lastAttackTime = now;
        return true;
    }

    startCharge(target) {
        const now = Date.now();
        this.isCharging = true;
        this.chargeStartTime = now;
        this.chargeTargetRef = target;
        this.dashHit = false;

        this.game.log(`⚡ ${this.ball.side}方李信开始蓄力！`);
        this.game.playSound('lixin_charge');

        // 蓄力结束后执行位移
        const chargeTime = (this.ball.classConfig && this.ball.classConfig.chargeTime) || 1200;
        setTimeout(() => {
            if (this.ball.isPaused || !this.chargeTargetRef) {
                this.isCharging = false;
                return;
            }

            const currentTarget = this.chargeTargetRef;
            const dx = currentTarget.x - this.ball.x;
            const dy = currentTarget.y - this.ball.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                this.isCharging = false;
                this.isDashing = true;
                const config = this.ball.classConfig || {};
                this.dashTargetX = this.ball.x + (dx / dist) * (config.dashDistance || 250);
                this.dashTargetY = this.ball.y + (dy / dist) * (config.dashDistance || 250);
                this.dashStartX = this.ball.x;
                this.dashStartY = this.ball.y;
                this.dashProgress = 0;

                this.game.log(`⚡ ${this.ball.side}方李信位移！`);
                this.game.playSound('lixin_dash');
            } else {
                this.isCharging = false;
            }
        }, chargeTime);
    }

    updateDash(target) {
        const config = this.ball.classConfig || {};
        const dashSpeed = config.dashSpeed || 12;
        this.dashProgress += dashSpeed;

        const dashDistance = config.dashDistance || 250;

        if (this.dashProgress >= dashDistance) {
            // 位移结束
            this.ball.x = this.dashTargetX;
            this.ball.y = this.dashTargetY;
            this.isDashing = false;

            // 无论是否撞击到敌人，都触发远程普攻
            this.hasRangedAttack = true;
            this.game.log(`⚡ ${this.ball.side}方李信位移结束，获得远程普攻！`);
            this.game.addEffect('lixin_ready', this.ball.x, this.ball.y);
            return;
        }

        // 插值计算当前位置
        const t = this.dashProgress / dashDistance;
        this.ball.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * t;
        this.ball.y = this.dashStartY + (this.dashTargetY - this.dashStartY) * t;

        // 检查位移路径上是否撞到目标
        this.checkDashHit(target);
    }

    checkDashHit(target) {
        if (!this.isDashing || this.dashHit) return false;

        const dx = target.x - this.ball.x;
        const dy = target.y - this.ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.ball.radius + target.radius + 20) {
            // 计算伤害：基础伤害 * (1 + (1 - 血量百分比))
            const hpPercent = target.hp / target.maxHp;
            const damageMultiplier = 1 + (1 - hpPercent);
            const finalDamage = Math.floor(this.ball.attack * damageMultiplier);

            target.takeDamage(finalDamage, 'lixin');
            this.game.addEffect('lixin_hit', target.x, target.y);
            this.game.playSound('lixin_hit');
            this.game.log(`⚡ ${this.ball.side}方李信位移撞击！对${target.side}方造成${finalDamage}伤害！(血量${Math.floor(hpPercent*100)}%=${damageMultiplier.toFixed(1)}倍)`);

            this.dashHit = true;
            return true;
        }

        return false;
    }

    performRangedAttack(target) {
        this.ball.fireProjectile(target, 'lixin_blade');
        this.game.log(`⚔️ ${this.ball.side}方李信远程平A！`);
        this.hasRangedAttack = false;
        this.startCooldown();
    }

    startCooldown() {
        const config = this.ball.classConfig || {};
        this.isInCooldown = true;
        this.cooldownEndTime = Date.now() + (config.cooldownTime || 2500);
        this.game.log(`⏱️ ${this.ball.side}方李信进入冷却时间${(config.cooldownTime || 2500)/1000}秒`);
    }

    getState() {
        return {
            isCharging: this.isCharging || false,
            isDashing: this.isDashing || false,
            chargeProgress: (this.isCharging && this.chargeStartTime > 0)
                ? Math.min(1, (Date.now() - this.chargeStartTime) / ((this.ball.classConfig && this.ball.classConfig.chargeTime) || 1200))
                : 0,
            hasRangedAttack: this.hasRangedAttack || false
        };
    }
}

module.exports = LixinSkill;