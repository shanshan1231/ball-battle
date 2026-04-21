# 小球对战擂台 - AI自动对战游戏

一款单人单机AI小球观战对战游戏，玩家选择两个英雄，观看AI自动战斗。

## 游戏特色

- **5大职业小球**：近战刀战士、远程弓手、盾牌手、法师、奶妈
- **全自动化战斗**：选择角色后全程AI自动对战，纯观战体验
- **物理碰撞系统**：小球碰撞、墙壁反弹、挤压效果
- **丰富特效**：攻击特效、受击反馈、死亡消散动画
- **音效系统**：各职业独特音效

## 本地运行

### 步骤1：安装Node.js

确保已安装 Node.js（建议版本16.x或更高）

验证安装：
```bash
node --version
npm --version
```

### 步骤2：安装依赖

进入项目目录，运行：

```bash
cd ball-battle
npm install
```

### 步骤3：启动服务器

```bash
npm start
```

或直接运行：

```bash
node server/server.js
```

### 步骤4：开始游戏

服务器启动后，浏览器打开：

```
http://localhost:3000
```

## 游戏玩法

1. **选角页面**：点击「选A」选择第一位英雄，再点击「选B」选择第二位英雄
2. **战斗页面**：观看两个AI自动对战，实时血条显示
3. **结算页面**：查看胜负结果，可选择重新对战或重新选角色

## 职业介绍

| 职业 | 血量 | 特点 |
|------|------|------|
| 近战刀战士 | 120 | 高伤害、近身斩击、攻击范围小 |
| 远程弓手 | 80 | 远程弓箭、保持距离、血量较低 |
| 盾牌手 | 150 | 可反弹远程攻击、防御最强 |
| 法师 | 70 | 法球范围伤害、爆发高、冷却长 |
| 奶妈 | 90 | 自动回血、续航强、攻击较弱 |

## 数值调整

所有关键数值在代码中有【可调节】标注，方便自行修改：

### server/Ball.js
- 各职业基础血量、攻击力、攻击范围、冷却时间、移动速度

### server/Game.js
- 擂台尺寸、碰撞弹性系数、减速时长

## 技术栈

- **后端**：Node.js + Express + WebSocket (ws)
- **前端**：HTML5 + CSS3 + Canvas 2D + 原生JavaScript
- **通信**：WebSocket实时同步

## 目录结构

```
ball-battle/
├── server/
│   ├── server.js      # Express + WebSocket 服务器
│   ├── Game.js        # 游戏主逻辑
│   └── Ball.js        # 小球类（各职业技能）
├── public/
│   ├── index.html     # 选角页面
│   ├── battle.html    # 战斗页面
│   ├── result.html     # 结算页面
│   ├── css/
│   │   └── style.css  # 样式文件
│   └── js/
│       ├── main.js    # 选角逻辑
│       ├── battle.js  # 战斗渲染
│       └── result.js  # 结算逻辑
├── package.json
├── SPEC.md            # 项目规范
└── README.md
```

## 服务器部署

部署到云服务器时，只需修改端口配置：

编辑 `server/server.js`：

```javascript
const PORT = 3000;  // 可改为 80 或其他端口
// const HOST = '0.0.0.0';  // 取消注释以允许外部访问
```

然后：

```bash
npm install
npm start
```

## 常见问题

**Q: 启动报错 "Cannot find module 'express'"**
A: 运行 `npm install` 安装依赖

**Q: 浏览器打开显示空白**
A: 检查控制台是否有错误，确保使用 http://localhost:3000 而非直接打开html文件

**Q: 音效无法播放**
A: 部分浏览器需要用户交互后才能播放音效，这是浏览器限制

## License

MIT
