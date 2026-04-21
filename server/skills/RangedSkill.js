/**
 * 远程技能 - RangedSkill.js
 * 适用于：远程弓手、法师
 */

const Skill = require('./Skill');

class RangedSkill extends Skill {
    constructor(ball, game) {
        super(ball, game);
    }

    update(target) {
        if (this.ball.isPaused || this.ball.isDead || target.isDead) {
            return false;
        }

        const now = Date.now();

        // 检查攻击冷却
        if (now - this.ball.lastAttackTime < this.ball.attackCooldown) {
            return false;
        }

        this.performAttack(target);
        this.ball.lastAttackTime = now;
        return true;
    }

    performAttack(target) {
        // 子类重写此方法实现具体攻击
        const dx = target.x - this.ball.x;
        const dy = target.y - this.ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.ball.fireProjectile(target, this.getProjectileType());
        this.game.log(`${this.getLogEmoji()} ${this.ball.side}方${this.ball.classType}发射弹道！`);
    }

    getProjectileType() {
        return 'arrow';
    }

    getLogEmoji() {
        return '🏹';
    }
}

module.exports = RangedSkill;