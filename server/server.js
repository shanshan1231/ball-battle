/**
 * 小球对战擂台 - 主服务器
 * Node.js + Express + WebSocket
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const Game = require('./Game');

// ==================== 服务器初始化 ====================

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, '../public')));
app.use('/image', express.static(path.join(__dirname, '../image')));

// ==================== WebSocket 通信 ====================

let currentGame = null;
let gameLoopInterval = null;
let gameSpeed = 1;  // 【新增】游戏速度倍数

wss.on('connection', (ws) => {
    console.log('[服务器] 客户端已连接');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(data, ws);
        } catch (e) {
            console.error('[错误] 消息解析失败:', e);
        }
    });

    ws.on('close', () => {
        console.log('[服务器] 客户端已断开');
        // 不清除游戏状态，允许重新连接后继续
        // 如果游戏正在进行，清除游戏循环
        if (gameLoopInterval) {
            clearInterval(gameLoopInterval);
            gameLoopInterval = null;
        }
    });

    ws.on('error', (error) => {
        console.error('[错误] WebSocket错误:', error);
    });
});

function handleMessage(data, ws) {
    switch (data.type) {
        case 'start_game':
            startNewGame(data.ballAClass, data.ballBClass);
            break;

        case 'restart':
            if (currentGame) {
                startNewGame(
                    currentGame.ballA.classType,
                    currentGame.ballB.classType
                );
            }
            break;

        case 'restart_with_new_chars':
            sendToClient({ type: 'go_to_select' });
            break;

        case 'quit_game':  // 【新增】结束对局，返回主页
            if (gameLoopInterval) {
                clearInterval(gameLoopInterval);
                gameLoopInterval = null;
            }
            currentGame = null;
            sendToClient({ type: 'go_to_select' });
            break;

        case 'toggle_pause':
            if (currentGame) {
                const isPaused = currentGame.togglePause();
                sendToClient({ type: 'pause_state', isPaused: isPaused });
            }
            break;

        case 'set_speed':  // 【新增】设置游戏速度
            gameSpeed = data.speed || 1;
            if (currentGame) {
                currentGame.setSpeed(gameSpeed);
            }
            sendToClient({ type: 'speed_changed', speed: gameSpeed });
            break;

        default:
            console.log('[服务器] 未知消息类型:', data.type);
    }
}

function startNewGame(ballAClass, ballBClass) {
    // 清除旧的游戏循环
    if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
        gameLoopInterval = null;
    }

    currentGame = new Game(ballAClass, ballBClass);
    currentGame.setSpeed(gameSpeed);  // 应用当前速度

    // 游戏结束回调
    currentGame.onGameOver((winner, loser) => {
        sendToClient({
            type: 'game_over',
            winner: winner.classType,
            loser: loser.classType,
            winnerName: getClassName(winner.classType),
            loserName: getClassName(loser.classType)
        });
    });

    // 日志回调
    currentGame.onLog((message) => {
        sendToClient({ type: 'battle_log', message: message });
    });

    // 音效回调
    currentGame.onSound((soundType) => {
        sendToClient({ type: 'play_sound', sound: soundType });
    });

    currentGame.start();

    sendToClient({
        type: 'game_start',
        ballA: currentGame.ballA.getState(),
        ballB: currentGame.ballB.getState(),
        speed: gameSpeed
    });

    // 游戏循环
    const baseInterval = 1000 / 60;  // 60fps基础
    gameLoopInterval = setInterval(() => {
        if (!currentGame || currentGame.isOver) {
            clearInterval(gameLoopInterval);
            gameLoopInterval = null;
            return;
        }

        // 根据速度倍数更新多次（保持物理逻辑正确）
        for (let i = 0; i < gameSpeed; i++) {
            currentGame.update();
        }

        sendToClient({
            type: 'game_state',
            ballA: currentGame.ballA.getState(),
            ballB: currentGame.ballB.getState(),
            projectiles: currentGame.projectiles,
            effects: currentGame.effects,
            isPaused: currentGame.isPaused,
            speed: gameSpeed
        });
    }, baseInterval);
}

function sendToClient(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function getClassName(classType) {
    const names = {
        'melee': '近战刀战士',
        'archer': '远程弓手',
        'shield': '盾牌手',
        'mage': '法师',
        'healer': '奶妈',
        'lixin': '李信',
        'houyi': '后羿',
        'xishi': '西施'
    };
    return names[classType] || classType;
}

// ==================== 启动服务器 ====================

const PORT = 3000;
server.listen(PORT, () => {
    console.log('========================================');
    console.log('  小球对战擂台 - 服务器已启动');
    console.log('  本地访问: http://localhost:' + PORT);
    console.log('  按 Ctrl+C 停止服务器');
    console.log('========================================');
});
