# Neon Tank Battle

霓虹风格的坦克对战游戏，支持单机 AI、本地双人和局域网联机。

## 游戏模式

| 模式 | 说明 |
|------|------|
| 单人闯关 (AI) | 与 AI 对战，可选难度和技能 |
| 双人对战 (PvP) | 同一键盘双人对抗 |
| LAN 联机 | 通过局域网与另一台电脑对战 |

## 局域网联机

### 架构

采用**服务端权威**（Server-Authoritative）模式：
- Node.js WebSocket 服务器 (`server/`) 负责房间管理、游戏模拟和状态同步
- 服务端运行完整的游戏逻辑（坦克移动、射击、碰撞检测、技能效果等），以 30fps 频率向双方客户端广播状态
- 客户端为"瘦客户端"，只发送操作指令（↑↓←→/射击/技能）、接收服务端状态并渲染
- 双方看到完全一致的游戏画面，不存在同步问题

### 一键启动

**macOS**: 双击 `start.command`
**Windows**: 双击 `start.bat`

或者命令行：
```bash
cd server
npm install   # 仅首次
npm start
```

服务端启动后自动打开浏览器进入游戏 (`http://localhost:3000`)。

### 联机流程

1. 主机点击 **LAN 创建房间** → 自动连接本地服务端 → 生成4位房间码
2. 客机点击 **LAN 加入房间** → 自动显示局域网发现的服务器 → 选择并输入房间码加入
3. 双方技能随机分配

### 通信协议

所有消息为 JSON 格式：

| 方向 | 类型 | 说明 |
|------|------|------|
| C → S | `create_room` | 创建房间 |
| C → S | `join_room` | 加入房间 |
| C → S | `input` | 发送操作指令 (`actions: ["up","shoot"]`) |
| S → C | `room_created` | 房间创建成功，返回房间码 |
| S → C | `game_start` | 双方已就绪，附带初始状态 |
| S → C | `game_state` | 服务端权威游戏状态快照（30fps） |
| S → C | `player_disconnected` | 对方断线 |

## 技术栈

- **渲染**: HTML5 Canvas 2D API
- **网络**: Node.js + `ws` WebSocket 库
- **音效**: Web Audio API 程序化合成
- **存储**: localStorage（键位绑定、自定义地图）

## 项目结构

```
tank/
├── tank1.html              # 游戏入口
├── style.css               # 样式
├── js/
│   ├── Game.js             # 主游戏逻辑
│   ├── Tank.js             # 坦克类
│   ├── Bullet.js           # 子弹类
│   ├── Map.js              # 地图/墙壁
│   ├── InputHandler.js     # 键盘输入
│   ├── NetworkManager.js   # WebSocket 网络客户端
│   ├── AIController.js     # AI 控制
│   └── AudioManager.js     # 音效
server/
├── package.json
├── index.js                # WebSocket 服务端
└── GameSimulation.js       # 服务端游戏模拟（坦克、子弹、碰撞、技能）
```
