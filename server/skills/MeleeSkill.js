/**
 * 近战技能 - MeleeSkill.js
 * 适用于：近战刀战士、盾牌手、奶妈
 */

const Skill = require('./Skill');

class MeleeSkill extends Skill {
    constructor(ball, game) {
        super(ball, game);
        this.lastTimeInMeleeRange = 0;
    }

    update(target) {
        if (this.ball.isPaused || this.ball.isDead || target.isDead) {
            return false;
        }

        const now = Date.now();
        const dx = target.x - this.ball.x;
        const dy = target.y - this.ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 只要距离够近，就更新最近接触时间
        if (distance < 200) {
            this.lastTimeInMeleeRange = now;
        }

        // 检查攻击冷却
        if (now - this.ball.lastAttackTime < this.ball.attackCooldown) {
            return false;
        }

        // 近战：只在最近500ms内接触过目标时才攻击
        if (now - this.lastTimeInMeleeRange < 500) {
            this.performAttack(target, distance);
            this.ball.lastAttackTime = now;
            return true;
        }

        return false;
    }

    performAttack(target, distance) {
        // 子类重写此方法实现具体攻击
        target.takeDamage(this.ball.attack, this.ball.classType);
        this.game.addEffect('melee_slash', target.x, target.y);
        this.game.playSound('melee_attack');
        this.game.log(`⚔️ ${this.ball.side}方近战刀战士发动斩击！命中造成${this.ball.attack}伤害`);
    }
}

module.exports = MeleeSkill;