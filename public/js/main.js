/**
 * 选角页面逻辑 - main.js
 * 处理角色选择、UI更新、WebSocket连接、音效测试
 */

// ==================== 常量定义 ====================

const CLASS_NAMES = {
    melee: '近战刀战士',
    archer: '远程弓手',
    shield: '盾牌手',
    mage: '法师',
    healer: '奶妈',
    lixin: '李信',
    houyi: '后羿',
    xishi: '西施'
};

const CLASS_COLORS = {
    melee: '#e74c3c',
    archer: '#27ae60',
    shield: '#3498db',
    mage: '#9b59b6',
    healer: '#e91e63',
    lixin: '#8e44ad',
    houyi: '#e6a21a',
    xishi: '#3498db'
};

// 【优化】音效URL - 本地文件优先，CDN作为备用
const SOUND_URLS = {
    // 本地路径（优先级）
    melee_attack: '/sounds/melee.mp3',
    archer_attack: '/sounds/archer.mp3',
    shield_attack: '/sounds/shield.mp3',
    shield_block: '/sounds/block.mp3',
    mage_attack: '/sounds/mage.mp3',
    healer_attack: '/sounds/healer.mp3',
    heal: '/sounds/heal.mp3',
    hit: '/sounds/hit.mp3',
    death: '/sounds/death.mp3',
    game_start: '/sounds/start.mp3',
    collision: '/sounds/collision.mp3',
    bounce: '/sounds/bounce.mp3',
    lixin_charge: '/sounds/lixin_charge.mp3',
    lixin_dash: '/sounds/lixin_dash.mp3',
    lixin_hit: '/sounds/lixin_hit.mp3',
    lixin_attack: '/sounds/lixin_attack.mp3',
    xishi_explosion: '/sounds/xishi_explosion.mp3'
};

// Web Audio API 生成的简单音效（备用）
const GENERATED_SOUNDS = {
    melee: { freq: 200, type: 'sawtooth', duration: 0.1 },
    archer: { freq: 400, type: 'sine', duration: 0.15 },
    shield: { freq: 150, type: 'square', duration: 0.2 },
    mage: { freq: 600, type: 'sine', duration: 0.3 },
    heal: { freq: 800, type: 'sine', duration: 0.5 },
    hit: { freq: 100, type: 'sawtooth', duration: 0.1 },
    death: { freq: 80, type: 'sawtooth', duration: 0.8 }
};

// 音效缓存
const soundCache = {};

// ==================== 状态管理 ====================

let selectedA = null;
let selectedB = null;
let currentSelectSide = 'A';
let ws = null;

// ==================== DOM元素 ====================

const heroCards = document.querySelectorAll('.hero-card');
const startBattleBtn = document.getElementById('startBattleBtn');
const soundTestBtn = document.getElementById('soundTestBtn');
const slotA = document.getElementById('slotA');
const slotB = document.getElementById('slotB');

// ==================== 初始化 ====================

function init() {
    startBattleBtn.addEventListener('click', startBattle);

    // 音效测试按钮
    soundTestBtn.addEventListener('click', testAllSounds);

    // 绑定选择标签点击事件
    heroCards.forEach(card => {
        const badges = card.querySelectorAll('.select-badge');

        badges.forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                const side = badge.classList.contains('A') ? 'A' : 'B';
                const classType = card.dataset.class;
                selectHero(side, classType);
            });
        });
    });

    // 卡片点击选择当前阵营
    heroCards.forEach(card => {
        card.addEventListener('click', () => {
            const classType = card.dataset.class;
            selectHero(currentSelectSide, classType);
        });
    });

    initWebSocket();
}

// ==================== 音效系统 ====================

// Web Audio API 上下文（延迟初始化）
let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * 使用 Web Audio API 生成简单音效
 */
function playGeneratedSound(type) {
    try {
        const ctx = getAudioContext();
        const config = GENERATED_SOUNDS[type];
        if (!config) return;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = config.type || 'sine';
        oscillator.frequency.setValueAtTime(config.freq || 440, ctx.currentTime);

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + config.duration);
    } catch (e) {
        console.warn('[音效生成] 失败:', e);
    }
}

/**
 * 播放音效（优化版 - 本地优先，Web Audio备用，CDN兜底）
 */
function playSound(type) {
    return new Promise((resolve) => {
        // 1. 尝试从缓存播放
        if (soundCache[type]) {
            soundCache[type].pause();
            soundCache[type].currentTime = 0;
        }

        const audio = new Audio();
        audio.src = SOUND_URLS[type];
        audio.volume = 0.5;

        // 本地文件加载成功则播放
        audio.oncanplaythrough = () => {
            audio.play().then(() => {
                soundCache[type] = audio;
                resolve();
            }).catch(() => {
                // 播放失败，尝试 Web Audio API
                playGeneratedSound(type);
                resolve();
            });
        };

        // 本地文件加载失败
        audio.onerror = () => {
            console.warn(`[音效] ${type} 本地加载失败，尝试生成...`);
            // 尝试 Web Audio API 生成
            const soundType = type.replace('_attack', '').replace('_block', '').replace('_hit', '');
            playGeneratedSound(soundType);
            resolve();
        };

        // 超时处理（3秒）
        setTimeout(resolve, 3000);
    });
}

/**
 * 音效测试 - 依次播放所有音效
 */
async function testAllSounds() {
    soundTestBtn.disabled = true;
    soundTestBtn.textContent = '🔊 播放中...';

    const soundNames = Object.keys(SOUND_URLS);

    for (let i = 0; i < soundNames.length; i++) {
        const name = soundNames[i];
        console.log(`[音效测试] 播放: ${name}`);
        await playSound(name);
        await sleep(300);  // 间隔播放
    }

    soundTestBtn.disabled = false;
    soundTestBtn.textContent = '🔊 音效测试';

    alert('音效测试完成！如无法播放请检查网络或浏览器设置。');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== WebSocket ====================

function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[客户端] WebSocket已连接');
        };

        ws.onclose = () => {
            console.log('[客户端] WebSocket已断开');
        };

        ws.onerror = (error) => {
            console.error('[错误] WebSocket错误:', error);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        };
    } catch (e) {
        console.error('[错误] WebSocket连接失败:', e);
    }
}

function handleServerMessage(data) {
    switch (data.type) {
        case 'game_start':
            sessionStorage.setItem('ballAClass', data.ballA.classType);
            sessionStorage.setItem('ballBClass', data.ballB.classType);
            window.location.href = 'battle.html';
            break;

        case 'go_to_select':
            window.location.href = 'index.html';
            break;
    }
}

// ==================== 选择逻辑 ====================

function selectHero(side, classType) {
    if (side === 'A') {
        selectedA = classType;
        currentSelectSide = 'B';
    } else {
        selectedB = classType;
        currentSelectSide = 'A';
    }

    updateUI();
    checkCanStart();
}

function updateUI() {
    heroCards.forEach(card => {
        const classType = card.dataset.class;
        card.classList.remove('selected');

        if (classType === selectedA || classType === selectedB) {
            card.classList.add('selected');
        }
    });

    if (selectedA) {
        slotA.classList.add('filled');
        slotA.querySelector('.slot-content').innerHTML = `
            <div class="slot-ball" style="background: radial-gradient(circle at 30% 30%, ${lightenColor(CLASS_COLORS[selectedA], 30)}, ${CLASS_COLORS[selectedA]}, ${darkenColor(CLASS_COLORS[selectedA], 20)});"></div>
            <span style="color: ${CLASS_COLORS[selectedA]};">${CLASS_NAMES[selectedA]}</span>
        `;
    } else {
        slotA.classList.remove('filled');
        slotA.querySelector('.slot-content').innerHTML = '<span class="placeholder">请选择</span>';
    }

    if (selectedB) {
        slotB.classList.add('filled');
        slotB.querySelector('.slot-content').innerHTML = `
            <div class="slot-ball" style="background: radial-gradient(circle at 30% 30%, ${lightenColor(CLASS_COLORS[selectedB], 30)}, ${CLASS_COLORS[selectedB]}, ${darkenColor(CLASS_COLORS[selectedB], 20)});"></div>
            <span style="color: ${CLASS_COLORS[selectedB]};">${CLASS_NAMES[selectedB]}</span>
        `;
    } else {
        slotB.classList.remove('filled');
        slotB.querySelector('.slot-content').innerHTML = '<span class="placeholder">请选择</span>';
    }
}

function checkCanStart() {
    startBattleBtn.disabled = !(selectedA && selectedB);
}

function startBattle() {
    if (!selectedA || !selectedB) return;

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'start_game',
            ballAClass: selectedA,
            ballBClass: selectedB
        }));
    } else {
        sessionStorage.setItem('ballAClass', selectedA);
        sessionStorage.setItem('ballBClass', selectedB);
        alert('WebSocket未连接，正在跳转...');
        window.location.href = 'battle.html';
    }
}

// ==================== 工具函数 ====================

function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// 启动
document.addEventListener('DOMContentLoaded', init);
