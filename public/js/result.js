/**
 * 结算页面逻辑 - result.js
 * 处理胜负显示、重新开始功能
 */

const CLASS_COLORS = {
    melee: '#e74c3c',
    archer: '#27ae60',
    shield: '#3498db',
    mage: '#9b59b6',
    healer: '#e91e63'
};

const VICTORY_SOUND_URL = 'https://cdn.freesound.org/previews/434/434947_4921277-lq.mp3';

const resultTitle = document.getElementById('resultTitle');
const winnerBall = document.getElementById('winnerBall');
const winnerName = document.getElementById('winnerName');
const loserBall = document.getElementById('loserBall');
const loserName = document.getElementById('loserName');
const restartBtn = document.getElementById('restartBtn');
const selectNewBtn = document.getElementById('selectNewBtn');

let ws = null;

function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[客户端] WebSocket已连接');
            // 连接成功后再绑定按钮事件
            restartBtn.onclick = restartBattle;
            selectNewBtn.onclick = selectNewCharacters;
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

function init() {
    const winner = sessionStorage.getItem('winner');
    const loser = sessionStorage.getItem('loser');
    const winnerNameStr = sessionStorage.getItem('winnerName');
    const loserNameStr = sessionStorage.getItem('loserName');

    winnerName.textContent = winnerNameStr || winner;
    if (winner) {
        winnerBall.style.background = createBallGradient(CLASS_COLORS[winner] || '#888');
    }

    loserName.textContent = loserNameStr || loser;
    if (loser) {
        loserBall.style.background = createBallGradient(CLASS_COLORS[loser] || '#666');
        loserBall.style.opacity = '0.6';
    }

    // 预绑定按钮事件（备用）
    restartBtn.onclick = () => {
        const ballA = sessionStorage.getItem('ballAClass');
        const ballB = sessionStorage.getItem('ballBClass');
        window.location.href = `battle.html?restart=true&ballA=${ballA}&ballB=${ballB}`;
    };

    selectNewBtn.onclick = () => {
        window.location.href = 'index.html';
    };

    initWebSocket();
    playVictorySound();
}

function createBallGradient(color) {
    const lighter = lightenColor(color, 30);
    const darker = darkenColor(color, 30);
    return `radial-gradient(circle at 30% 30%, ${lighter}, ${color}, ${darker})`;
}

function restartBattle() {
    const ballA = sessionStorage.getItem('ballAClass');
    const ballB = sessionStorage.getItem('ballBClass');

    // 直接跳转，让battle.html处理开始游戏
    window.location.href = `battle.html?restart=true&ballA=${ballA}&ballB=${ballB}`;
}

function selectNewCharacters() {
    window.location.href = 'index.html';
}

function playVictorySound() {
    try {
        const audio = new Audio();
        audio.src = VICTORY_SOUND_URL;
        audio.volume = 0.5;

        audio.oncanplaythrough = () => {
            audio.play().catch(() => {});
        };

        audio.onerror = () => {
            console.warn('[音效] 胜利音效加载失败');
        };
    } catch (e) {
        console.warn('[音效] 胜利音效播放异常:', e);
    }
}

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

document.addEventListener('DOMContentLoaded', init);
