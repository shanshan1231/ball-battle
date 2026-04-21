/**
 * 战斗页面逻辑 - battle.js
 * 处理游戏渲染、WebSocket通信、战斗画面更新
 * 【新增】倍速功能、结束对局、音效事件处理
 */

// ==================== 常量定义 ====================

const ARENA_WIDTH = 704;
const ARENA_HEIGHT = 704;

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

// ==================== 状态管理 ====================

let ws = null;
let gameState = null;
let ballAClass = null;
let ballBClass = null;
let isPaused = false;
let currentSpeed = 1;  // 当前速度

// 李信图片
let lixinImage = new Image();
lixinImage.src = '../image/李信.png';

// 后羿图片
let houyiImage = new Image();
houyiImage.src = '../image/后羿.png';

// 西施图片
let xishiImage = new Image();
xishiImage.src = '../image/西施.png';

// ==================== Canvas渲染 ====================

const canvas = document.getElementById('battleCanvas');
const ctx = canvas.getContext('2d');

// ==================== DOM元素 ====================

const hpBarA = document.getElementById('hpBarA');
const hpBarB = document.getElementById('hpBarB');
const hpTextA = document.getElementById('hpTextA');
const hpTextB = document.getElementById('hpTextB');
const nameA = document.getElementById('nameA');
const nameB = document.getElementById('nameB');
const battleTip = document.getElementById('battleTip');
const loadingOverlay = document.getElementById('loadingOverlay');
const pauseBtn = document.getElementById('pauseBtn');
const logContent = document.getElementById('logContent');
const quitBtn = document.getElementById('quitBtn');

// ==================== 音效系统 ====================

// 【优化】音效URL - 本地文件优先
const SOUND_URLS = {
    game_start: '/sounds/start.mp3',
    melee_attack: '/sounds/melee.mp3',
    archer_attack: '/sounds/archer.mp3',
    shield_attack: '/sounds/shield.mp3',
    shield_block: '/sounds/block.mp3',
    mage_attack: '/sounds/mage.mp3',
    healer_attack: '/sounds/healer.mp3',
    heal: '/sounds/heal.mp3',
    hit: '/sounds/hit.mp3',
    death: '/sounds/death.mp3',
    collision: '/sounds/collision.mp3',
    bounce: '/sounds/bounce.mp3',
    // 李信专属音效
    lixin_charge: '/sounds/lixin_charge.mp3',
    lixin_dash: '/sounds/lixin_dash.mp3',
    lixin_hit: '/sounds/lixin_hit.mp3',
    lixin_attack: '/sounds/lixin_attack.mp3',
    // 西施专属音效
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

const soundCache = {};

// Web Audio API 上下文
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
 * 播放音效（优化版 - 本地优先，Web Audio备用）
 */
function playSound(type) {
    if (soundCache[type]) {
        soundCache[type].pause();
        soundCache[type].currentTime = 0;
    }

    const audio = new Audio();
    audio.src = SOUND_URLS[type] || SOUND_URLS.hit;
    audio.volume = 0.5;

    audio.oncanplaythrough = () => {
        audio.play().catch(() => {
            const soundType = type.replace('_attack', '').replace('_block', '').replace('_hit', '');
            playGeneratedSound(soundType);
        });
        soundCache[type] = audio;
    };

    audio.onerror = () => {
        const soundType = type.replace('_attack', '').replace('_block', '').replace('_hit', '');
        playGeneratedSound(soundType);
    };
}

/**
 * 预加载音效
 */
function preloadSounds() {
    Object.keys(SOUND_URLS).forEach(type => {
        const audio = new Audio();
        audio.src = SOUND_URLS[type];
        audio.preload = 'auto';
        soundCache[type] = audio;
    });
}

// ==================== 初始化 ====================

function init() {
    preloadSounds();

    // 检查URL参数（用于从结算页重启）
    const urlParams = new URLSearchParams(window.location.search);
    const restartParam = urlParams.get('restart');
    const ballAParam = urlParams.get('ballA');
    const ballBParam = urlParams.get('ballB');

    // 优先使用URL参数，否则使用sessionStorage
    if (ballAParam && ballBParam) {
        ballAClass = ballAParam;
        ballBClass = ballBParam;
        sessionStorage.setItem('ballAClass', ballAClass);
        sessionStorage.setItem('ballBClass', ballBClass);
    } else {
        ballAClass = sessionStorage.getItem('ballAClass') || 'melee';
        ballBClass = sessionStorage.getItem('ballBClass') || 'archer';
    }

    nameA.textContent = CLASS_NAMES[ballAClass];
    nameB.textContent = CLASS_NAMES[ballBClass];

    // 暂停按钮
    pauseBtn.addEventListener('click', togglePause);

    // 结束对局按钮
    quitBtn.addEventListener('click', quitGame);

    // 速度按钮
    document.querySelectorAll('.btn-speed').forEach(btn => {
        btn.addEventListener('click', () => {
            const speed = parseInt(btn.dataset.speed);
            setSpeed(speed);
        });
    });

    initWebSocket();
    requestAnimationFrame(gameLoop);
}

// ==================== 暂停控制 ====================

function togglePause() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'toggle_pause' }));
    }
}

// ==================== 速度控制 ====================

function setSpeed(speed) {
    currentSpeed = speed;

    // 更新按钮样式
    document.querySelectorAll('.btn-speed').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.speed) === speed) {
            btn.classList.add('active');
        }
    });

    // 发送速度设置到服务器
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'set_speed', speed: speed }));
    }
}

// ==================== 结束对局 ====================

function quitGame() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'quit_game' }));
    } else {
        window.location.href = 'index.html';
    }
}

// ==================== 战况日志 ====================

function addLog(message, type = '') {
    if (!logContent) return;

    const entry = document.createElement('div');
    entry.className = 'log-entry ' + type;
    entry.textContent = message;
    logContent.appendChild(entry);

    logContent.scrollTop = logContent.scrollHeight;

    while (logContent.children.length > 100) {
        logContent.removeChild(logContent.firstChild);
    }
}

// ==================== WebSocket ====================

function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[客户端] WebSocket已连接');
            loadingOverlay.classList.add('hidden');

            if (ballAClass && ballBClass) {
                ws.send(JSON.stringify({
                    type: 'start_game',
                    ballAClass: ballAClass,
                    ballBClass: ballBClass
                }));
            }
        };

        ws.onclose = () => {
            console.log('[客户端] WebSocket已断开');
        };

        ws.onerror = (error) => {
            console.error('[错误] WebSocket错误:', error);
            loadingOverlay.querySelector('p').textContent = '连接失败，请刷新页面重试';
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        };
    } catch (e) {
        console.error('[错误] WebSocket连接失败:', e);
        loadingOverlay.querySelector('p').textContent = '连接失败，请确保服务器已启动';
    }
}

function handleServerMessage(data) {
    switch (data.type) {
        case 'game_start':
            gameState = data;
            updateHPBars(data.ballA, data.ballB);
            battleTip.textContent = '战斗开始！';
            addLog('━━━━━━━━ 游戏开始 ━━━━━━━━', '');
            setSpeed(data.speed || 1);
            setTimeout(() => { battleTip.textContent = '观战中...'; }, 2000);
            break;

        case 'game_state':
            gameState = data;
            // 同步速度显示
            if (data.speed && data.speed !== currentSpeed) {
                setSpeed(data.speed);
            }
            break;

        case 'pause_state':
            isPaused = data.isPaused;
            updatePauseButton();
            battleTip.textContent = isPaused ? '⏸️ 已暂停' : '▶️ 继续';
            addLog(isPaused ? '⏸️ 游戏暂停' : '▶️ 游戏继续', '');
            break;

        case 'speed_changed':  // 速度变更同步（不打印日志）
            setSpeed(data.speed);
            break;

        case 'battle_log':
            addLog(data.message, getLogType(data.message));
            break;

        case 'play_sound':  // 【修复】服务器触发音效
            playSound(data.sound);
            break;

        case 'go_to_select':  // 结束对局，返回选角
            window.location.href = 'index.html';
            break;

        case 'game_over':
            battleTip.textContent = '对战结束！';
            addLog('═══════════════════════════', 'death');
            addLog(`🏆 胜利者: ${data.winnerName}`, 'death');
            addLog(`💀 失败者: ${data.loserName}`, 'death');
            addLog('═══════════════════════════', 'death');

            sessionStorage.setItem('winner', data.winner);
            sessionStorage.setItem('loser', data.loser);
            sessionStorage.setItem('winnerName', data.winnerName);
            sessionStorage.setItem('loserName', data.loserName);

            setTimeout(() => {
                window.location.href = 'result.html';
            }, 3000);
            break;
    }
}

function getLogType(message) {
    if (message.includes('伤害')) return 'damage';
    if (message.includes('回') && message.includes('血')) return 'heal';
    if (message.includes('反弹') || message.includes('撞墙')) return 'bounce';
    if (message.includes('发动') || message.includes('释放') || message.includes('发射')) return 'attack';
    if (message.includes('反弹了')) return 'block';
    if (message.includes('胜利') || message.includes('失败') || message.includes('结束')) return 'death';
    return '';
}

function updatePauseButton() {
    if (isPaused) {
        pauseBtn.textContent = '▶️ 继续';
        pauseBtn.classList.add('paused');
    } else {
        pauseBtn.textContent = '⏸️ 暂停';
        pauseBtn.classList.remove('paused');
    }
}

// ==================== UI更新 ====================

function updateHPBars(ballA, ballB) {
    if (!ballA || !ballB) return;

    const hpPercentA = (ballA.hp / ballA.maxHp) * 100;
    hpBarA.style.width = `${hpPercentA}%`;
    hpTextA.textContent = `${Math.max(0, ballA.hp)}/${ballA.maxHp}`;

    hpBarA.classList.remove('warning', 'danger');
    if (hpPercentA <= 25) {
        hpBarA.classList.add('danger');
    } else if (hpPercentA <= 50) {
        hpBarA.classList.add('warning');
    }

    const hpPercentB = (ballB.hp / ballB.maxHp) * 100;
    hpBarB.style.width = `${hpPercentB}%`;
    hpTextB.textContent = `${Math.max(0, ballB.hp)}/${ballB.maxHp}`;

    hpBarB.classList.remove('warning', 'danger');
    if (hpPercentB <= 25) {
        hpBarB.classList.add('danger');
    } else if (hpPercentB <= 50) {
        hpBarB.classList.add('warning');
    }
}

// ==================== 渲染 ====================

function gameLoop() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    drawArena();

    if (gameState && gameState.ballA && gameState.ballB) {
        updateHPBars(gameState.ballA, gameState.ballB);
        drawEffects(gameState.effects);
        drawProjectiles(gameState.projectiles);
        drawBall(gameState.ballA);
        drawBall(gameState.ballB);
    }

    requestAnimationFrame(gameLoop);
}

function drawArena() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, ARENA_WIDTH - 4, ARENA_HEIGHT - 4);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(ARENA_WIDTH / 2, 0);
    ctx.lineTo(ARENA_WIDTH / 2, ARENA_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 100, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();
}

function drawBall(ball) {
    const { x, y, radius, color, hitFlash, isSlowed, classType, weaponEmoji, side, hp, maxHp, isCharging, isDashing, chargeProgress, hasRangedAttack } = ball;

    // 血量 <= 0 时不绘制（死亡移除）
    if (hp <= 0) return;

    ctx.save();

    // 绘制头顶血条
    const hpBarWidth = radius * 2;
    const hpBarHeight = 8;
    const hpBarY = y - radius - 20;
    const hpPercent = Math.max(0, hp / maxHp);

    // 血条背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - hpBarWidth / 2, hpBarY, hpBarWidth, hpBarHeight);

    // 血条颜色
    let hpColor = '#2ecc71';
    if (hpPercent <= 0.25) hpColor = '#e74c3c';
    else if (hpPercent <= 0.5) hpColor = '#f39c12';

    // 血条填充
    ctx.fillStyle = hpColor;
    ctx.fillRect(x - hpBarWidth / 2, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

    // 血条边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - hpBarWidth / 2, hpBarY, hpBarWidth, hpBarHeight);

    // 血量数字
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.max(0, hp)}/${maxHp}`, x, hpBarY + hpBarHeight + 10);

    if (isSlowed) {
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 20;
    }

    switch (classType) {
        case 'melee':
            drawMeleeBall(x, y, radius, color, hitFlash);
            break;
        case 'archer':
            drawArcherBall(x, y, radius, color, hitFlash);
            break;
        case 'shield':
            drawShieldBall(x, y, radius, color, hitFlash);
            break;
        case 'mage':
            drawMageBall(x, y, radius, color, hitFlash);
            break;
        case 'healer':
            drawHealerBall(x, y, radius, color, hitFlash);
            break;
        case 'lixin':
            drawLixinBall(ball);
            break;
        case 'houyi':
            drawHouyiBall(ball);
            break;
        case 'xishi':
            drawXishiBall(ball);
            break;
        default:
            drawDefaultBall(x, y, radius, color);
    }

    // 受击红色滤镜效果
    if (hitFlash > 0) {
        // 重置阴影，避免被之前的阴影影响
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        const alpha = hitFlash / 10 * 0.5;  // 0~0.5的透明度
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawMeleeBall(x, y, radius, color, hitFlash) {
    ctx.shadowColor = '#ff5722';
    ctx.shadowBlur = 20;

    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    gradient.addColorStop(0, '#ff8a80');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, '#b71c1c');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ff5722';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = `${radius * 0.6}px Arial`;
    ctx.fillText('🗡️', x, y);
}

function drawArcherBall(x, y, radius, color, hitFlash) {
    ctx.shadowColor = '#4caf50';
    ctx.shadowBlur = 20;

    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    gradient.addColorStop(0, '#81c784');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, '#1b5e20');

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);

    ctx.beginPath();
    const r = radius * 0.85;
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();

    ctx.font = `${radius * 0.5}px Arial`;
    ctx.fillText('🏹', x, y);
}

function drawShieldBall(x, y, radius, color, hitFlash) {
    ctx.shadowColor = '#2196f3';
    ctx.shadowBlur = 20;

    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    gradient.addColorStop(0, '#64b5f6');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, '#1565c0');

    ctx.beginPath();
    ctx.moveTo(x, y - radius * 0.9);
    ctx.lineTo(x + radius * 0.8, y - radius * 0.4);
    ctx.lineTo(x + radius * 0.8, y + radius * 0.3);
    ctx.lineTo(x, y + radius * 0.9);
    ctx.lineTo(x - radius * 0.8, y + radius * 0.3);
    ctx.lineTo(x - radius * 0.8, y - radius * 0.4);
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = `${radius * 0.6}px Arial`;
    ctx.fillText('🛡️', x, y);
}

function drawMageBall(x, y, radius, color, hitFlash) {
    ctx.shadowColor = '#ab47bc';
    ctx.shadowBlur = 25;

    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    gradient.addColorStop(0, '#ce93d8');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, '#4a148c');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ab47bc';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(171, 71, 188, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * radius * 1.3, y + Math.sin(angle) * radius * 1.3);
        ctx.stroke();
    }

    ctx.font = `${radius * 0.5}px Arial`;
    ctx.fillText('🔮', x, y);
}

function drawHealerBall(x, y, radius, color, hitFlash) {
    ctx.shadowColor = '#ec407a';
    ctx.shadowBlur = 20;

    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    gradient.addColorStop(0, '#f48fb1');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, '#880e4f');

    ctx.beginPath();
    ctx.moveTo(x, y + radius * 0.3);
    ctx.bezierCurveTo(x - radius, y - radius * 0.3, x - radius, y - radius * 0.8, x, y - radius * 0.4);
    ctx.bezierCurveTo(x + radius, y - radius * 0.8, x + radius, y - radius * 0.3, x, y + radius * 0.3);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ec407a';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = `${radius * 0.4}px Arial`;
    ctx.fillText('💚', x, y - radius * 0.2);
}

function drawLixinBall(ball) {
    const { x, y, radius, color, hitFlash, isCharging, isDashing, chargeProgress = 0, hasRangedAttack } = ball;

    // 防御：确保数值有效
    const progress = (typeof chargeProgress === 'number' && !isNaN(chargeProgress)) ? chargeProgress : 0;
    const safeRadius = (typeof radius === 'number' && !isNaN(radius)) ? radius : 50;

    ctx.save();

    // 蓄力时显示蓄力圈
    if (isCharging) {
        ctx.shadowColor = '#8e44ad';
        ctx.shadowBlur = 30;

        // 蓄力进度圈
        ctx.beginPath();
        ctx.arc(x, y, safeRadius * 1.5, 0, Math.PI * 2 * progress);
        ctx.strokeStyle = `rgba(142, 68, 173, ${0.5 + progress * 0.5})`;
        ctx.lineWidth = 6;
        ctx.stroke();

        // 蓄力能量波纹
        const waveRadius = safeRadius * (1 + progress * 0.5);
        ctx.beginPath();
        ctx.arc(x, y, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(155, 89, 182, ${(1 - progress) * 0.5})`;
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    // 位移时显示冲刺轨迹
    if (isDashing) {
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 40;
    }

    // 绘制李信图片（圆形裁剪）
    ctx.beginPath();
    ctx.arc(x, y, safeRadius, 0, Math.PI * 2);
    ctx.clip();

    // 绘制图片
    if (lixinImage.complete && lixinImage.naturalWidth > 0) {
        ctx.drawImage(lixinImage, x - safeRadius, y - safeRadius, safeRadius * 2, safeRadius * 2);
    } else {
        // 图片未加载完成时显示占位紫色圆形
        ctx.fillStyle = color || '#8e44ad';
        ctx.fill();
    }

    ctx.restore();

    // 远程普攻激活时显示剑刃环绕
    if (hasRangedAttack) {
        ctx.save();
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Date.now() * 0.003;
            const bladeX = x + Math.cos(angle) * safeRadius * 1.4;
            const bladeY = y + Math.sin(angle) * safeRadius * 1.4;
            ctx.beginPath();
            ctx.moveTo(bladeX - 10, bladeY - 10);
            ctx.lineTo(bladeX + 10, bladeY + 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bladeX + 10, bladeY - 10);
            ctx.lineTo(bladeX - 10, bladeY + 10);
            ctx.stroke();
        }
        ctx.restore();
    }
}

function drawHouyiBall(ball) {
    const { x, y, radius, color } = ball;

    ctx.save();

    // 绘制后羿图片（圆形裁剪）
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();

    // 绘制图片
    if (houyiImage.complete && houyiImage.naturalWidth > 0) {
        ctx.drawImage(houyiImage, x - radius, y - radius, radius * 2, radius * 2);
    } else {
        // 图片未加载完成时显示占位金色圆形
        const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(1, color || '#e6a21a');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    ctx.restore();
}

function drawXishiBall(ball) {
    const { x, y, radius, color } = ball;

    ctx.save();

    // 绘制西施图片（圆形裁剪）
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();

    // 绘制图片
    if (xishiImage.complete && xishiImage.naturalWidth > 0) {
        ctx.drawImage(xishiImage, x - radius, y - radius, radius * 2, radius * 2);
    } else {
        // 图片未加载完成时显示占位蓝色圆形
        const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
        gradient.addColorStop(0, '#87ceeb');
        gradient.addColorStop(1, color || '#3498db');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    ctx.restore();
}

function drawDefaultBall(x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    gradient.addColorStop(0, lightenColor(color, 40));
    gradient.addColorStop(1, color);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = darkenColor(color, 40);
    ctx.lineWidth = 3;
    ctx.stroke();
}

function drawProjectiles(projectiles) {
    if (!projectiles) return;

    const scale = 2;  // 投射物放大2倍

    projectiles.forEach(proj => {
        ctx.save();

        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 20;

        if (proj.type === 'arrow') {
            const angle = Math.atan2(proj.vy, proj.vx);
            ctx.translate(proj.x, proj.y);
            ctx.rotate(angle);

            const r = proj.radius * scale;
            const arrowColor = proj.color || '#4caf50';

            ctx.beginPath();
            ctx.moveTo(r + 8, 0);
            ctx.lineTo(-r, -r * 0.6);
            ctx.lineTo(-r, r * 0.6);
            ctx.closePath();
            ctx.fillStyle = proj.reflected ? '#00ffff' : arrowColor;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-r, -r * 0.4);
            ctx.lineTo(-r - 12, 0);
            ctx.lineTo(-r, r * 0.4);
            ctx.strokeStyle = proj.reflected ? '#00ffff' : arrowColor;
            ctx.lineWidth = 3;
            ctx.stroke();

        } else if (proj.type === 'magic_ball') {
            const r = proj.radius * scale;

            const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.3, proj.color);
            gradient.addColorStop(1, 'rgba(155, 89, 182, 0.3)');

            ctx.beginPath();
            ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(proj.x, proj.y, r * 1.8, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(155, 89, 182, ${proj.reflected ? 0.8 : 0.4})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (proj.type === 'lixin_blade') {
            // 李信穿透剑刃
            const r = proj.radius * scale * 1.5;
            const angle = Math.atan2(proj.vy, proj.vx);
            ctx.translate(proj.x, proj.y);
            ctx.rotate(angle);

            // 剑刃主体
            ctx.beginPath();
            ctx.moveTo(r * 1.5, 0);
            ctx.lineTo(-r * 0.5, -r * 0.4);
            ctx.lineTo(-r, 0);
            ctx.lineTo(-r * 0.5, r * 0.4);
            ctx.closePath();
            ctx.fillStyle = '#e74c3c';
            ctx.fill();

            // 剑刃光芒
            ctx.shadowColor = '#e74c3c';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (proj.type === 'xishi_ball') {
            // 西施法球 - 蓝色发光球体
            const r = proj.radius * scale;
            const pulseScale = proj.isStationary ? (1 + Math.sin(Date.now() * 0.01) * 0.2) : 1;

            // 外层光晕
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, r * 2 * pulseScale, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(52, 152, 219, ${proj.isStationary ? 0.3 : 0.15})`;
            ctx.fill();

            // 中层光环
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, r * 1.5 * pulseScale, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(52, 152, 219, ${proj.isStationary ? 0.5 : 0.25})`;
            ctx.fill();

            // 法球主体
            const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * pulseScale);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.4, '#3498db');
            gradient.addColorStop(1, 'rgba(52, 152, 219, 0.5)');

            ctx.beginPath();
            ctx.arc(proj.x, proj.y, r * pulseScale, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // 爆炸前的警告效果
            if (proj.isStationary && proj.stationaryTime > 2000) {
                const warningAlpha = (proj.stationaryTime - 2000) / 1000;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, r * 2.5, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(231, 76, 60, ${warningAlpha})`;
                ctx.lineWidth = 4;
                ctx.stroke();
            }
        }

        ctx.restore();
    });
}

function drawEffects(effects) {
    if (!effects) return;

    // 特效基础半径（放大2.5倍）
    const baseRadius = 125;

    effects.forEach(effect => {
        const { type, x, y, life, maxLife } = effect;
        const progress = life / maxLife;

        ctx.save();

        switch (type) {
            case 'hit':
                // 受击特效已移除，改为在drawBall中用红色滤镜显示
                break;

            case 'melee_slash':
                // 刀光斩击特效 - 放大3倍
                ctx.translate(x, y);
                ctx.rotate(progress * Math.PI * 2);
                ctx.beginPath();
                ctx.arc(0, 0, baseRadius * 0.8, -1, 1);
                ctx.strokeStyle = `rgba(255, 150, 50, ${progress})`;
                ctx.lineWidth = 15 * progress;
                ctx.stroke();

                // 刀光线条
                ctx.beginPath();
                ctx.moveTo(-baseRadius, -baseRadius * 0.4);
                ctx.lineTo(baseRadius, baseRadius * 0.4);
                ctx.strokeStyle = `rgba(255, 220, 100, ${progress})`;
                ctx.lineWidth = 10 * progress;
                ctx.stroke();
                break;

            case 'shield_block':
                // 盾牌格挡特效 - 放大3倍
                const shieldRadius = baseRadius * (1.5 - progress * 0.5);
                ctx.beginPath();
                ctx.arc(x, y, shieldRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(100, 200, 255, ${progress * 0.5})`;
                ctx.fill();
                ctx.strokeStyle = `rgba(255, 255, 255, ${progress})`;
                ctx.lineWidth = 6;
                ctx.stroke();

                // 内圈闪光
                ctx.beginPath();
                ctx.arc(x, y, shieldRadius * 0.6, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.5})`;
                ctx.lineWidth = 3;
                ctx.stroke();
                break;

            case 'healer_attack':
                // 奶妈攻击特效 - 放大3倍
                const healAtkRadius = baseRadius * (1 - progress * 0.7);
                ctx.beginPath();
                ctx.arc(x, y, healAtkRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(100, 255, 150, ${progress * 0.5})`;
                ctx.fill();
                ctx.strokeStyle = `rgba(100, 255, 150, ${progress * 0.3})`;
                ctx.lineWidth = 4;
                ctx.stroke();
                break;

            case 'heal':
                // 回血特效 - 放大3倍
                for (let i = 0; i < 6; i++) {
                    const particleY = y - (1 - progress) * baseRadius * 1.5 - i * 25;
                    const particleX = x + Math.sin(progress * Math.PI * 4 + i) * 30;
                    ctx.beginPath();
                    ctx.arc(particleX, particleY, 10 * progress, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(100, 255, 150, ${progress})`;
                    ctx.fill();
                }
                break;

            case 'collision':
                // 碰撞特效 - 放大
                ctx.beginPath();
                ctx.arc(x, y, 40 * (1 - progress * 0.7), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${progress * 0.6})`;
                ctx.fill();
                break;

            case 'death':
                // 死亡消散特效 - 放大
                for (let i = 0; i < 16; i++) {
                    const angle = (i / 16) * Math.PI * 2;
                    const particleDist = baseRadius * (1.5 - progress) * 1.2;
                    const px = x + Math.cos(angle) * particleDist;
                    const py = y + Math.sin(angle) * particleDist;
                    ctx.beginPath();
                    ctx.arc(px, py, 15 * progress, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(150, 150, 150, ${progress})`;
                    ctx.fill();
                }
                break;

            case 'bounce':
                // 反弹特效 - 稍大一点
                ctx.beginPath();
                ctx.arc(x, y, 15 * progress, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 200, 200, ${progress})`;
                ctx.fill();
                break;

            case 'lixin_charge':
                // 李信蓄力特效
                const chargeRadius = baseRadius * (0.5 + progress * 0.8);
                ctx.beginPath();
                ctx.arc(x, y, chargeRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(142, 68, 173, ${progress * 0.7})`;
                ctx.lineWidth = 8 * progress;
                ctx.stroke();

                // 蓄力闪电
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + progress * Math.PI;
                    const lightningLen = baseRadius * 0.6 * progress;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(
                        x + Math.cos(angle) * lightningLen,
                        y + Math.sin(angle) * lightningLen
                    );
                    ctx.strokeStyle = `rgba(155, 89, 182, ${progress})`;
                    ctx.lineWidth = 4 * progress;
                    ctx.stroke();
                }
                break;

            case 'lixin_hit':
                // 李信位移撞击特效
                const hitDist = baseRadius * (1 - progress) * 1.5;
                ctx.beginPath();
                ctx.arc(x, y, hitDist, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(231, 76, 60, ${progress})`;
                ctx.lineWidth = 12 * progress;
                ctx.stroke();

                // 冲击波
                ctx.beginPath();
                ctx.arc(x, y, hitDist * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(231, 76, 60, ${progress * 0.3})`;
                ctx.fill();
                break;

            case 'lixin_ready':
                // 李信远程就绪特效
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2 + Date.now() * 0.002;
                    const px = x + Math.cos(angle) * baseRadius * 0.8;
                    const py = y + Math.sin(angle) * baseRadius * 0.8;
                    ctx.beginPath();
                    ctx.arc(px, py, 8 * progress, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(231, 76, 60, ${progress})`;
                    ctx.fill();
                }
                break;

            case 'damage_number':
                // 伤害数字特效 - 向上飘动并逐渐消失
                const offsetY = (1 - progress) * -60;  // 向上飘60像素
                const alpha = progress;  // 逐渐消失
                const scale = 1 + (1 - progress) * 0.3;  // 稍微放大

                ctx.save();
                ctx.translate(x, y + offsetY);
                ctx.scale(scale, scale);
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;  // 白色文字
                ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;  // 黑色描边
                ctx.lineWidth = 3;
                ctx.strokeText(`-${effect.value}`, 0, 0);  // 黑色描边
                ctx.fillText(`-${effect.value}`, 0, 0);  // 白色数字
                ctx.restore();
                break;
        }

        ctx.restore();
    });
}

// ==================== 工具函数 ====================

function lightenColor(color, percent) {
    if (!color || color.startsWith('rgba')) return color;
    try {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    } catch (e) { return color; }
}

function darkenColor(color, percent) {
    if (!color || color.startsWith('rgba')) return color;
    try {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    } catch (e) { return color; }
}

// 启动
document.addEventListener('DOMContentLoaded', init);
