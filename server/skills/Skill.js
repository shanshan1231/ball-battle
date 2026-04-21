/**
 * 技能基类 - Skill.js
 * 所有职业技能的父类，定义通用接口
 */

class Skill {
    constructor(ball, game) {
        this.ball = ball;
        this.game = game;
    }

    /**
     * 每帧更新 - 返回是否处理了攻击
     */
    update(target) {
        return false;
    }

    /**
     * 获取技能状态（用于发送给客户端）
     */
    getState() {
        return {};
    }

    /**
     * 应用减速效果
     */
    applySlow(factor, duration) {
        this.ball.isSlowed = true;
        this.ball.speed = this.ball.baseSpeed * factor;
        const currentSpeed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
        if (currentSpeed > 0) {
            const ratio = (this.ball.baseSpeed * factor) / currentSpeed;
            this.ball.vx *= ratio;
            this.ball.vy *= ratio;
        }
        this.ball.slowEndTime = Date.now() + duration;
    }
}

module.exports = Skill;