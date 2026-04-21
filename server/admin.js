/**
 * 管理员API - admin.js
 * 提供配置管理接口
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config.json');

// 读取配置
function readConfig() {
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[Admin] 读取配置失败:', e);
        return null;
    }
}

// 写入配置
function writeConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[Admin] 写入配置失败:', e);
        return false;
    }
}

// 获取所有配置
router.get('/config', (req, res) => {
    const config = readConfig();
    if (config) {
        res.json({ success: true, data: config });
    } else {
        res.status(500).json({ success: false, message: '读取配置失败' });
    }
});

// 更新英雄配置
router.put('/hero/:heroId', (req, res) => {
    const { heroId } = req.params;
    const heroData = req.body;

    const config = readConfig();
    if (!config) {
        return res.status(500).json({ success: false, message: '读取配置失败' });
    }

    if (!config.heroes[heroId]) {
        return res.status(404).json({ success: false, message: '英雄不存在' });
    }

    // 更新英雄配置
    config.heroes[heroId] = { ...config.heroes[heroId], ...heroData };

    if (writeConfig(config)) {
        res.json({ success: true, message: '英雄配置更新成功' });
    } else {
        res.status(500).json({ success: false, message: '保存配置失败' });
    }
});

// 更新音效配置
router.put('/sound/:soundId', (req, res) => {
    const { soundId } = req.params;
    const { url } = req.body;

    const config = readConfig();
    if (!config) {
        return res.status(500).json({ success: false, message: '读取配置失败' });
    }

    if (!config.sounds[soundId]) {
        return res.status(404).json({ success: false, message: '音效不存在' });
    }

    config.sounds[soundId] = url;

    if (writeConfig(config)) {
        res.json({ success: true, message: '音效配置更新成功' });
    } else {
        res.status(500).json({ success: false, message: '保存配置失败' });
    }
});

// 获取所有音效列表
router.get('/sounds', (req, res) => {
    const config = readConfig();
    if (config) {
        res.json({ success: true, data: config.sounds });
    } else {
        res.status(500).json({ success: false, message: '读取配置失败' });
    }
});

// 重置配置到默认
router.post('/reset', (req, res) => {
    const defaultConfig = {
        heroes: {
            melee: {
                name: "近战刀战士",
                description: "近身自动寻敌，刀系近战斩击攻击，伤害高、血量偏高、攻击范围小",
                color: "#e74c3c",
                hp: 1100,
                attack: 22,
                attackRange: 75,
                attackCooldown: 750,
                speed: 4,
                radius: 55,
                weaponEmoji: "🗡️",
                sound: "melee_attack",
                enabled: true
            },
            archer: {
                name: "远程弓手",
                description: "自动发射弓箭远程攻击，保持距离拉扯AI行为，伤害中等、血量中等",
                color: "#27ae60",
                hp: 850,
                attack: 20,
                attackRange: 250,
                attackCooldown: 1000,
                speed: 3.5,
                radius: 55,
                weaponEmoji: "🏹",
                sound: "archer_attack",
                enabled: true
            },
            shield: {
                name: "盾牌手",
                description: "自带盾牌，可格挡并反弹所有远程弹道攻击，血量高、防御最强",
                color: "#3498db",
                hp: 1200,
                attack: 18,
                attackRange: 90,
                attackCooldown: 900,
                speed: 2.8,
                radius: 60,
                weaponEmoji: "🛡️",
                sound: "shield_attack",
                enabled: true
            },
            mage: {
                name: "法师",
                description: "远程释放法术法球技能，带有法术特效，爆发高、血量中等",
                color: "#9b59b6",
                hp: 800,
                attack: 22,
                attackRange: 220,
                attackCooldown: 1300,
                speed: 3,
                radius: 55,
                weaponEmoji: "🔮",
                sound: "mage_attack",
                enabled: true
            },
            healer: {
                name: "奶妈",
                description: "拥有基础小额攻击能力，战斗中自动回血，自身续航能力强",
                color: "#e91e63",
                hp: 950,
                attack: 15,
                attackRange: 110,
                attackCooldown: 600,
                speed: 3.2,
                radius: 55,
                weaponEmoji: "💚",
                sound: "healer_attack",
                enabled: true
            },
            lixin: {
                name: "李信",
                description: "王者荣耀英雄！蓄力位移突进，位移命中敌人造成伤害，之后获得远程平A",
                color: "#8e44ad",
                hp: 950,
                attack: 35,
                attackRange: 180,
                attackCooldown: 2500,
                speed: 3.5,
                radius: 55,
                weaponEmoji: "⚔️",
                sound: "melee_attack",
                chargeTime: 1200,
                dashDistance: 250,
                dashSpeed: 12,
                cooldownTime: 2500,
                enabled: true
            },
            houyi: {
                name: "后羿",
                description: "平A射出三连箭矢，伤害高但血量较低，每秒可发射一次三连箭",
                color: "#e6a21a",
                hp: 850,
                attack: 14,
                attackRange: 280,
                attackCooldown: 1200,
                speed: 3.5,
                radius: 55,
                weaponEmoji: "🏹",
                sound: "archer_attack",
                enabled: true
            },
            xishi: {
                name: "西施",
                description: "释放法球攻击敌人，法球飞行一段距离后停止，停留4秒并持续造成伤害",
                color: "#3498db",
                hp: 850,
                attack: 100,
                attackRange: 230,
                attackCooldown: 4000,
                speed: 3,
                radius: 55,
                weaponEmoji: "✨",
                sound: "mage_attack",
                xishiBallDamage: 100,
                xishiBallTickDamage: 10,
                xishiBallTickInterval: 500,
                xishiBallRadius: 40,
                xishiBallDuration: 4000,
                xishiBallExplosionDamage: 150,
                enabled: true
            }
        },
        sounds: {
            melee_attack: "/sounds/melee.mp3",
            archer_attack: "/sounds/archer.mp3",
            shield_attack: "/sounds/shield.mp3",
            shield_block: "/sounds/block.mp3",
            mage_attack: "/sounds/mage.mp3",
            healer_attack: "/sounds/healer.mp3",
            heal: "/sounds/heal.mp3",
            hit: "/sounds/hit.mp3",
            death: "/sounds/death.mp3",
            game_start: "/sounds/start.mp3",
            collision: "/sounds/collision.mp3",
            bounce: "/sounds/bounce.mp3",
            lixin_charge: "/sounds/lixin_charge.mp3",
            lixin_dash: "/sounds/lixin_dash.mp3",
            lixin_hit: "/sounds/lixin_hit.mp3",
            lixin_attack: "/sounds/lixin_attack.mp3",
            xishi_explosion: "/sounds/xishi_explosion.mp3"
        },
        arena: {
            width: 704,
            height: 704
        }
    };

    if (writeConfig(defaultConfig)) {
        res.json({ success: true, message: '配置已重置为默认' });
    } else {
        res.status(500).json({ success: false, message: '重置配置失败' });
    }
});

module.exports = router;
