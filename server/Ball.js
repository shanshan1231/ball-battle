/**
 * 小球基类 - Ball.js
 * 所有职业小球的父类，包含基础属性和通用方法
 */

// 各职业配置
const CLASS_CONFIGS = {
    // ==================== 近战刀战士 ====================
    melee: {
        name: '近战刀战士',
        color: '#e74c3c',           // 红色
        hp: 1100,                    // 【可调节】血量（下调100）
        attack: 22,                  // 【可调节】攻击力（上调2）
        attackRange: 75,            // 【可调节】攻击范围（近身）
        attackCooldown: 750,        // 【可调节】攻击冷却(ms)
        speed: 4,                   // 【可调节】移动速度
        radius: 55,                 // 【可调节】碰撞半径
        weaponEmoji: '🗡️',          // 武器标识
        sound: 'melee_attack'       // 攻击音效类型
    },

    // ==================== 远程弓手 ====================
    archer: {
        name: '远程弓手',
        color: '#27ae60',          // 绿色
        hp: 850,                     // 【可调节】血量（上调50）
        attack: 20,                 // 【可调节】攻击力（下调2）
        attackRange: 250,           // 【可调节】远程攻击范围
        attackCooldown: 1000,       // 【可调节】攻击冷却(ms)（加快）
        speed: 3.5,                 // 【可调节】移动速度
        radius: 55,                 // 【可调节】碰撞半径
        weaponEmoji: '🏹',          // 武器标识
        sound: 'archer_attack'      // 攻击音效类型
    },

    // ==================== 盾牌手 ====================
    shield: {
        name: '盾牌手',
        color: '#3498db',          // 蓝色
        hp: 1200,                    // 【可调节】血量（下调300，与战士持平）
        attack: 18,                 // 【可调节】攻击力（下调4）
        attackRange: 90,           // 【可调节】攻击范围
        attackCooldown: 900,       // 【可调节】攻击冷却(ms)
        speed: 2.8,                 // 【可调节】移速
        radius: 60,                // 【可调节】碰撞半径
        weaponEmoji: '🛡️',          // 武器标识
        sound: 'shield_attack'     // 攻击音效类型
    },

    // ==================== 法师 ====================
    mage: {
        name: '法师',
        color: '#9b59b6',          // 紫色
        hp: 800,                     // 【可调节】血量（上调100）
        attack: 22,                 // 【可调节】攻击力（下调3，更平衡）
        attackRange: 220,          // 【可调节】远程范围（缩小30）
        attackCooldown: 1300,      // 【可调节】技能冷却（加快）
        speed: 3,                   // 【可调节】移动速度
        radius: 55,                 // 【可调节】碰撞半径（缩小）
        weaponEmoji: '🔮',          // 武器标识
        sound: 'mage_attack'       // 攻击音效类型
    },

    // ==================== 奶妈 ====================
    healer: {
        name: '奶妈',
        color: '#e91e63',          // 粉色
        hp: 950,                     // 【可调节】血量（上调50）
        attack: 15,                 // 【可调节】攻击力（上调50%）
        attackRange: 110,          // 【可调节】攻击范围
        attackCooldown: 600,       // 【可调节】攻击冷却（较快）
        speed: 3.2,                 // 【可调节】移动速度
        radius: 55,                 // 【可调节】碰撞半径
        weaponEmoji: '💚',          // 武器标识
        sound: 'healer_attack'      // 攻击音效类型
    },

    // ==================== 李信（王者荣耀） ====================
    // 技能：蓄力位移，位移碰到敌人造成攻击，位移后获得远程平A
    lixin: {
        name: '李信',
        color: '#8e44ad',          // 深紫色
        hp: 950,                    // 血量（下调50）
        attack: 35,                  // 位移撞击伤害 + 平A伤害（下调15）
        attackRange: 180,           // 远程平A范围（下调20）
        attackCooldown: 2500,       // 蓄力+位移+平A完整周期约2.5秒（延长）
        speed: 3.5,                 // 移动速度
        radius: 55,                 // 碰撞半径
        weaponEmoji: '⚔️',          // 武器标识
        sound: 'melee_attack',      // 攻击音效
        // 李信专属属性
        chargeTime: 1200,          // 蓄力时间(ms)（缩短）
        dashDistance: 250,          // 位移距离（减少50）
        dashSpeed: 12,             // 位移速度（减缓）
        cooldownTime: 2500,        // 冷却时间(ms)（延长）
        hasRangedAttack: false      // 是否拥有远程普攻
    },

    // ==================== 后羿 ====================
    // 特色：平A射出三连箭矢，血量较低
    houyi: {
        name: '后羿',
        color: '#e6a21a',          // 金色
        hp: 850,                     // 血量（上调50）
        attack: 14,                  // 每次箭矢伤害（下调2）
        attackRange: 280,           // 远程攻击范围（减少20）
        attackCooldown: 1200,       // 攻击冷却1.2秒（延长）
        speed: 3.5,                 // 移动速度
        radius: 55,                 // 碰撞半径
        weaponEmoji: '🏹',          // 武器标识
        sound: 'archer_attack'      // 攻击音效
    },

    // ==================== 西施 ====================
    // 技能：释放法球攻击敌人，法球飞行一段距离后停止，停留4秒并持续造成伤害
    xishi: {
        name: '西施',
        color: '#3498db',          // 蓝色
        hp: 850,                     // 血量
        attack: 100,                // 撞击伤害
        attackRange: 230,          // 攻击范围
        attackCooldown: 4000,       // 技能周期4秒
        speed: 3,                   // 移动速度
        radius: 55,                 // 碰撞半径
        weaponEmoji: '✨',          // 武器标识
        sound: 'mage_attack',        // 攻击音效
        // 西施专属属性
        xishiBallDamage: 100,       // 撞击伤害
        xishiBallTickDamage: 10,     // 持续伤害
        xishiBallTickInterval: 500, // 持续伤害间隔（ms）
        xishiBallRadius: 40,        // 法球影响范围
        xishiBallDuration: 4000,    // 法球停留时间（4秒）
        xishiBallExplosionDamage: 150 // 爆炸伤害
    }
};

/**
 * 小球类
 * 每个玩家/AI控制的单位
 * 移动规则：台球式匀速直线运动，只有撞墙才反弹
 */
class Ball {
    /**
     * 构造函数
     * @param {string} classType - 职业类型
     * @param {string} side - 阵营 ('A' 或 'B')
     * @param {Game} game - 所属游戏实例
     */
    constructor(classType, side, game) {
        this.classType = classType;
        this.side = side;
        this.game = game;
        this.classConfig = CLASS_CONFIGS[classType] || CLASS_CONFIGS.melee;

        // ==================== 基础属性 ====================
        this.x = 0;
        this.y = 0;
        this.vx = 0;  // X方向速度
        this.vy = 0;  // Y方向速度
        this.baseSpeed = this.classConfig.speed;

        // ==================== 战斗属性 ====================
        this.maxHp = this.classConfig.hp;
        this.hp = this.classConfig.hp;
        this.attack = this.classConfig.attack;
        this.attackRange = this.classConfig.attackRange;
        this.attackCooldown = this.classConfig.attackCooldown;
        this.speed = this.classConfig.speed;
        this.radius = this.classConfig.radius;
        this.color = this.classConfig.color;
        this.weaponEmoji = this.classConfig.weaponEmoji;

        // ==================== 状态 ====================
        this.lastAttackTime = 0;
        this.isSlowed = false;
        this.slowEndTime = 0;
        this.lastHealTime = 0;
        this.hitFlash = 0;
        this.isPaused = false;
        this.isDead = false;
        this.lastTimeInMeleeRange = 0;

        // ==================== AI行为增强：追击状态 ====================
        this.isChasing = false;       // 是否在追击目标
        this.lastTargetX = 0;         // 上次目标位置
        this.lastTargetY = 0;
        this.chaseStartTime = 0;      // 开始追击时间
        this.lastHitTime = 0;         // 上次命中目标时间（用于背击判定）

        // ==================== 李信专属状态 ====================
        this.isCharging = false;       // 是否正在蓄力
        this.chargeStartTime = 0;      // 蓄力开始时间
        this.chargeTargetRef = null;   // 蓄力目标引用
        this.dashHit = false;          // 位移是否已撞击
        this.isDashing = false;        // 是否正在位移
        this.dashTargetX = 0;          // 位移目标X
        this.dashTargetY = 0;          // 位移目标Y
        this.dashStartX = 0;           // 位移起始X
        this.dashStartY = 0;           // 位移起始Y
        this.dashProgress = 0;         // 位移进度
        this.hasRangedAttack = false;  // 是否拥有远程普攻
        this.isInCooldown = false;     // 是否处于冷却期
        this.cooldownEndTime = 0;      // 冷却结束时间
    }

    /**
     * 设置随机初始移动方向（仅在开局调用一次）
     */
    setRandomDirection() {
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.baseSpeed;
        this.vy = Math.sin(angle) * this.baseSpeed;
    }

    /**
     * 每帧更新 - 台球式匀速直线运动
     */
    update() {
        if (this.isPaused) return;

        // 处理减速状态
        if (this.isSlowed && Date.now() > this.slowEndTime) {
            this.isSlowed = false;
            this.speed = this.baseSpeed;
        }

        // 更新AI追击状态
        this.updateAIState();

        // 李信蓄力/位移/冷却时不移动
        if (this.classType === 'lixin') {
            if (this.isCharging || this.isDashing || this.isInCooldown) {
                this.updateLixin();
            }
            // 蓄力时完全不动
            if (this.isCharging) {
                return;
            }
            // 位移时不走平时路线
            if (this.isDashing) {
                return;
            }
        }

        // 匀速直线运动
        this.x += this.vx;
        this.y += this.vy;

        // 受击闪烁递减
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }
    }

    /**
     * 更新AI状态（追击、绕后等）
     */
    updateAIState() {
        const target = this.game.ballA === this ? this.game.ballB : this.game.ballA;
        if (!target || target.isDead) return;

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 记录目标位置
        this.lastTargetX = target.x;
        this.lastTargetY = target.y;

        // 远程职业保持距离，近战职业追击
        if (this.classType === 'archer' || this.classType === 'mage' || this.classType === 'houyi' || this.classType === 'xishi') {
            // 远程职业：如果太近则后退
            if (distance < this.attackRange * 0.6) {
                this.isChasing = false;
                // 向后移动（减速并反向）
                const angle = Math.atan2(-dy, -dx);
                this.vx = Math.cos(angle) * this.speed * 0.5;
                this.vy = Math.sin(angle) * this.speed * 0.5;
            }
        } else {
            // 近战职业：追击目标
            if (distance < 300) {
                this.isChasing = true;
                this.chaseStartTime = Date.now();
            }
        }
    }

    /**
     * 撞墙反弹时更新速度方向
     */
    bounce(axis, newSpeed) {
        if (axis === 'x') {
            this.vx = newSpeed;
        } else {
            this.vy = newSpeed;
        }
    }

    /**
     * AI尝试攻击目标
     */
    tryAttack(target) {
        if (this.isPaused || this.isDead || target.isDead) return;

        const now = Date.now();
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 近战职业攻击逻辑
        if (this.classType === 'melee' || this.classType === 'shield' || this.classType === 'healer') {
            this.handleMeleeAttack(target, distance, now);
            return;
        }

        // 远程职业攻击逻辑
        if (now - this.lastAttackTime < this.attackCooldown) return;

        switch (this.classType) {
            case 'archer':
                this.attackArcher(target);
                break;
            case 'mage':
                this.attackMage(target);
                break;
            case 'lixin':
                // 李信蓄力位移
                if (this.isCharging || this.isDashing || this.isInCooldown) return;
                this.attackLixin(target);
                break;
            case 'houyi':
                this.attackHouyi(target);
                break;
            case 'xishi':
                this.game.handleXishiAttack(this, target);
                break;
        }

        this.lastAttackTime = now;
    }

    /**
     * 近战职业攻击处理
     */
    handleMeleeAttack(target, distance, now) {
        if (distance < 200) {
            this.lastTimeInMeleeRange = now;
        }

        if (now - this.lastAttackTime < this.attackCooldown) return;

        if (now - this.lastTimeInMeleeRange < 500) {
            // 【AI增强】检测背击
            const isBackAttack = this.checkBackAttack(target);
            const damageMultiplier = isBackAttack ? 1.3 : 1;

            switch (this.classType) {
                case 'melee':
                    this.attackMelee(target, damageMultiplier);
                    break;
                case 'shield':
                    this.attackShield(target, damageMultiplier);
                    break;
                case 'healer':
                    this.attackHealer(target, damageMultiplier);
                    break;
            }
            this.lastAttackTime = now;
        }
    }

    /**
     * 检测背击（目标没有面向我方）
     */
    checkBackAttack(target) {
        if (Date.now() - target.lastHitTime > 1000) return false;
        // 简单判定：如果目标刚被攻击过，且我方在侧面或背面
        const dx = target.lastTargetX - target.x;
        const dy = target.lastTargetY - target.y;
        // 目标移动方向与我方位置点积
        const dot = dx * (this.x - target.x) + dy * (this.y - target.y);
        return dot < 0; // 负值表示在我方攻击到了目标背后
    }

    /**
     * 近战刀战士攻击
     */
    attackMelee(target, damageMultiplier = 1) {
        const damage = Math.floor(this.attack * damageMultiplier);
        target.takeDamage(damage, 'melee');
        this.game.addEffect('melee_slash', target.x, target.y);
        this.game.playSound('melee_attack');
        this.lastHitTime = Date.now();
        this.game.log(`⚔️ ${this.side}方近战刀战士发动斩击！${damageMultiplier > 1 ? '背击！' : ''}造成${damage}伤害`);
    }

    /**
     * 远程弓手攻击
     */
    attackArcher(target) {
        this.fireProjectile(target, 'arrow');
        this.game.log(`🏹 ${this.side}方弓手发射箭矢！`);
    }

    /**
     * 盾牌手攻击
     */
    attackShield(target, damageMultiplier = 1) {
        const damage = Math.floor(this.attack * damageMultiplier);
        target.takeDamage(damage, 'shield');
        this.game.addEffect('shield_hit', target.x, target.y);
        this.game.playSound('shield_attack');
        this.lastHitTime = Date.now();
        this.game.log(`🛡️ ${this.side}方盾牌手发动撞击！造成${damage}伤害`);
    }

    /**
     * 法师攻击
     */
    attackMage(target) {
        this.fireProjectile(target, 'magic_ball');
        this.game.log(`✨ ${this.side}方法师释放法球！`);
    }

    /**
     * 奶妈攻击
     */
    attackHealer(target, damageMultiplier = 1) {
        const damage = Math.floor(this.attack * damageMultiplier);
        target.takeDamage(damage, 'healer');
        this.game.addEffect('healer_attack', target.x, target.y);
        this.game.playSound('healer_attack');
        this.lastHitTime = Date.now();
        this.game.log(`💚 ${this.side}方奶妈发动普攻！造成${damage}伤害`);
    }

    /**
     * 李信攻击 - 蓄力位移
     * 蓄力1.2秒后朝目标方向位移，位移碰到敌人造成攻击
     * 位移后获得远程平A，然后进入冷却
     */
    attackLixin(target) {
        const now = Date.now();
        const config = this.classConfig;

        // 开始蓄力
        this.isCharging = true;
        this.chargeStartTime = now;
        this.chargeTargetRef = target;
        this.dashHit = false;

        this.game.log(`⚡ ${this.side}方李信开始蓄力！`);
        this.game.playSound('lixin_charge');

        // 蓄力结束后执行位移
        const chargeTime = config.chargeTime || 1200;
        setTimeout(() => {
            if (this.isPaused || !this.chargeTargetRef) {
                this.isCharging = false;
                return;
            }

            const currentTarget = this.chargeTargetRef;
            const dx = currentTarget.x - this.x;
            const dy = currentTarget.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                this.isCharging = false;
                this.isDashing = true;
                this.dashTargetX = this.x + (dx / dist) * (config.dashDistance || 250);
                this.dashTargetY = this.y + (dy / dist) * (config.dashDistance || 250);
                this.dashStartX = this.x;
                this.dashStartY = this.y;
                this.dashProgress = 0;

                this.game.log(`⚡ ${this.side}方李信位移！`);
                this.game.playSound('lixin_dash');
            } else {
                this.isCharging = false;
            }
        }, chargeTime);
    }

    /**
     * 后羿攻击 - 连续射出三连箭矢
     */
    attackHouyi(target) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);

        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (this.hp <= 0) return;
                this.fireProjectileAtAngle(target, 'arrow', angle);
                this.game.log(`🏹 ${this.side}方后羿发射第${i + 1}支箭矢！`);
            }, i * 150);
        }
    }

    /**
     * 发射投射物
     */
    fireProjectile(target, type) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let speed = 10;
        let color = '#2ecc71';
        let radius = 12;

        if (type === 'arrow') {
            speed = 12;
            color = '#2ecc71';
            radius = 12;
        } else if (type === 'magic_ball') {
            speed = 8;
            color = '#9b59b6';
            radius = 20;
        } else if (type === 'lixin_blade') {
            speed = 14;
            color = '#8e44ad';
            radius = 16;
        }

        const projectile = this.game.getProjectile();
        projectile.x = this.x;
        projectile.y = this.y;
        projectile.vx = (dx / dist) * speed;
        projectile.vy = (dy / dist) * speed;
        projectile.owner = this.side;
        projectile.type = type;
        projectile.damage = this.attack;
        projectile.radius = radius;
        projectile.life = 200;
        projectile.color = color;
        projectile.reflected = false;
        projectile.active = true;

        this.game.projectiles.push(projectile);
    }

    /**
     * 向指定角度发射投射物
     */
    fireProjectileAtAngle(target, type, angle) {
        let speed = 12;
        let color = '#ffd700';
        let radius = 8;

        const projectile = this.game.getProjectile();
        projectile.x = this.x;
        projectile.y = this.y;
        projectile.vx = Math.cos(angle) * speed;
        projectile.vy = Math.sin(angle) * speed;
        projectile.owner = this.side;
        projectile.type = type;
        projectile.damage = this.attack;
        projectile.radius = radius;
        projectile.life = 200;
        projectile.color = color;
        projectile.reflected = false;
        projectile.active = true;

        this.game.projectiles.push(projectile);
    }

    /**
     * 发射西施法球
     */
    fireXishiBall(target, angle) {
        const config = CLASS_CONFIGS.xishi;
        const speed = 8;

        const projectile = this.game.getProjectile();
        projectile.x = this.x;
        projectile.y = this.y;
        projectile.vx = Math.cos(angle) * speed;
        projectile.vy = Math.sin(angle) * speed;
        projectile.owner = this.side;
        projectile.type = 'xishi_ball';
        projectile.damage = config.xishiBallDamage;
        projectile.radius = config.xishiBallRadius;
        projectile.color = '#3498db';
        projectile.life = 300;
        projectile.reflected = false;
        projectile.active = true;
        // 西施法球专属属性
        projectile.isStationary = false;
        projectile.stationaryTime = 0;
        projectile.startTime = Date.now();
        projectile.hasExploded = false;
        projectile.tickDamage = config.xishiBallTickDamage;
        projectile.tickInterval = config.xishiBallTickInterval;
        projectile.lastTick = 0;
        projectile.explosionDamage = config.xishiBallExplosionDamage;
        projectile.duration = config.xishiBallDuration;
        // 记录起始位置，用于计算飞行距离
        projectile.startX = this.x;
        projectile.startY = this.y;
        // 最大飞行距离：擂台宽度的30%
        projectile.maxTravelDistance = this.game.arenaWidth * 0.5;
        projectile.travelDistance = 0;

        this.game.projectiles.push(projectile);
    }

    /**
     * 受到伤害
     */
    takeDamage(damage, source) {
        this.hp -= damage;
        this.hitFlash = 10;

        this.applySlow(0.5, 500);

        this.game.addEffect('hit', this.x, this.y, source);
        this.game.addEffect('damage_number', this.x, this.y - this.radius - 20, source, damage);

        this.game.log(`💥 ${this.side}方(${CLASS_CONFIGS[this.classType].name})受到${damage}伤害！剩余血量:${Math.max(0, this.hp)}/${this.maxHp}`);

        if (this.isSlowed) {
            this.game.log(`⏱️ ${this.side}方移速降低50%，持续500ms`);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            this.lastHitTime = 0;
            this.game.log(`💀 ${this.side}方彻底阵亡！`);
        }
    }

    /**
     * 应用减速效果
     */
    applySlow(factor, duration) {
        this.isSlowed = true;
        this.speed = this.baseSpeed * factor;
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > 0) {
            const ratio = (this.baseSpeed * factor) / currentSpeed;
            this.vx *= ratio;
            this.vy *= ratio;
        }
        this.slowEndTime = Date.now() + duration;
    }

    /**
     * 更新李信位移和远程普攻
     */
    updateLixin() {
        const target = this.game.ballA === this ? this.game.ballB : this.game.ballA;
        if (!target) return;

        const config = this.classConfig;

        // 处理冷却状态
        if (this.isInCooldown && Date.now() > this.cooldownEndTime) {
            this.isInCooldown = false;
            this.game.log(`⚡ ${this.side}方李信冷却结束！`);
        }

        // 位移更新
        if (this.isDashing) {
            this.updateDash(target);
        }

        // 远程普攻更新
        if (this.hasRangedAttack && !this.isDashing) {
            this.fireProjectile(target, 'lixin_blade');
            this.game.log(`⚔️ ${this.side}方李信远程平A！`);
            this.hasRangedAttack = false;
            this.startCooldown();
        }
    }

    /**
     * 更新李信位移
     */
    updateDash(target) {
        const config = this.classConfig;
        const dashSpeed = config.dashSpeed || 12;
        const dashDistance = config.dashDistance || 250;

        this.dashProgress += dashSpeed;

        if (this.dashProgress >= dashDistance) {
            // 位移结束
            this.x = this.dashTargetX;
            this.y = this.dashTargetY;
            this.isDashing = false;

            // 无论是否撞击到敌人，都触发远程普攻
            this.hasRangedAttack = true;
            this.game.log(`⚡ ${this.side}方李信位移结束，获得远程普攻！`);
            this.game.addEffect('lixin_ready', this.x, this.y);
            return;
        }

        // 插值计算当前位置
        const t = this.dashProgress / dashDistance;
        this.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * t;
        this.y = this.dashStartY + (this.dashTargetY - this.dashStartY) * t;

        // 检查位移路径上是否撞到目标
        this.checkDashHit(target);
    }

    /**
     * 检查李信位移是否撞到目标
     */
    checkDashHit(target) {
        if (!this.isDashing || this.dashHit) return;

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.radius + target.radius + 20) {
            // 计算伤害：基础伤害 * (1 + (1 - 血量百分比))
            const hpPercent = target.hp / target.maxHp;
            const damageMultiplier = 1 + (1 - hpPercent);
            const finalDamage = Math.floor(this.attack * damageMultiplier);

            target.takeDamage(finalDamage, 'lixin');
            this.game.addEffect('lixin_hit', target.x, target.y);
            this.game.playSound('lixin_hit');
            this.game.log(`⚡ ${this.side}方李信位移撞击！对${target.side}方造成${finalDamage}伤害！(血量${Math.floor(hpPercent*100)}%=${damageMultiplier.toFixed(1)}倍)`);

            this.dashHit = true;
        }
    }

    /**
     * 开始李信冷却时间
     */
    startCooldown() {
        const config = this.classConfig;
        this.isInCooldown = true;
        this.cooldownEndTime = Date.now() + (config.cooldownTime || 2500);
        this.game.log(`⏱️ ${this.side}方李信进入冷却时间${(config.cooldownTime || 2500)/1000}秒`);
    }

    /**
     * 应用回血效果（奶妈职业）
     */
    applyHealing() {
        if (this.classType !== 'healer' || this.isPaused) return;

        const now = Date.now();
        const healInterval = 5000 / 3;
        const healAmount = 10;

        if (now - this.lastHealTime > healInterval) {
            if (this.hp < this.maxHp) {
                this.hp = Math.min(this.hp + healAmount, this.maxHp);
                this.game.addEffect('heal', this.x, this.y);
                this.game.playSound('heal');
                this.game.log(`💚 ${this.side}方奶妈回复${healAmount}血量！当前:${this.hp}/${this.maxHp}`);
            }

            this.lastHealTime = now;
        }
    }

    /**
     * 暂停/恢复
     */
    setPaused(paused) {
        this.isPaused = paused;
    }

    /**
     * 获取状态（用于发送给客户端）
     */
    getState() {
        return {
            side: this.side,
            classType: this.classType,
            className: CLASS_CONFIGS[this.classType].name,
            color: this.color,
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            hp: this.hp,
            maxHp: this.maxHp,
            radius: this.radius,
            isSlowed: this.isSlowed,
            hitFlash: this.hitFlash,
            weaponEmoji: this.weaponEmoji,
            attackCooldown: this.attackCooldown,
            lastAttackTime: this.lastAttackTime,
            isChasing: this.isChasing || false,
            // 李信专属状态
            isCharging: this.isCharging || false,
            isDashing: this.isDashing || false,
            chargeProgress: (this.isCharging && this.chargeStartTime > 0)
                ? Math.min(1, (Date.now() - this.chargeStartTime) / (this.classConfig.chargeTime || 1200))
                : 0,
            hasRangedAttack: this.hasRangedAttack || false
        };
    }
}

// 导出职业配置常量
Ball.CLASS_CONFIGS = CLASS_CONFIGS;

module.exports = Ball;