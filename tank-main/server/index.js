const WebSocket = require('ws');
const GameSimulation = require('./GameSimulation');

const PORT = 3000;
const TICK_RATE = 33;
const STATE_RATE = 33;

const wss = new WebSocket.Server({ port: PORT });
const rooms = {};

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

function broadcast(roomId, message, exclude) {
    const room = rooms[roomId];
    if (!room) return;
    room.players.forEach(p => {
        if (p !== exclude && p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify(message));
        }
    });
}

function startSimulation(roomId, room) {
    const sim = new GameSimulation('classic', 'random', 'random');
    room.simulation = sim;
    room.lastInputs = [{ actions: [], skillJustPressed: false }, { actions: [], skillJustPressed: false }];

    room.players.forEach((p, i) => {
        p.send(JSON.stringify({
            type: 'game_start',
            playerIndex: i,
            initialState: sim.getState()
        }));
    });

    room.tickInterval = setInterval(() => {
        if (!rooms[roomId]) return;
        sim.update(TICK_RATE, room.lastInputs);
        room.players.forEach(p => {
            if (p.readyState === WebSocket.OPEN) {
                p.send(JSON.stringify({
                    type: 'game_state',
                    state: sim.getState()
                }));
            }
        });
        if (sim.gameOver) {
            clearInterval(room.tickInterval);
            room.tickInterval = null;
        }
    }, STATE_RATE);

    console.log(`Simulation started for room ${roomId}`);
}

wss.on('connection', (ws) => {
    ws.roomId = null;
    ws.playerIndex = -1;

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            handleMessage(ws, msg);
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        if (ws.roomId && rooms[ws.roomId]) {
            const room = rooms[ws.roomId];
            if (room.tickInterval) {
                clearInterval(room.tickInterval);
            }
            broadcast(ws.roomId, { type: 'player_disconnected' }, ws);
            delete rooms[ws.roomId];
            console.log(`Room ${ws.roomId} closed`);
        }
    });
});

function handleMessage(ws, msg) {
    switch (msg.type) {
        case 'create_room': {
            const roomId = generateRoomId();
            rooms[roomId] = { players: [ws] };
            ws.roomId = roomId;
            ws.playerIndex = 0;
            ws.send(JSON.stringify({ type: 'room_created', roomId }));
            console.log(`Room created: ${roomId}`);
            break;
        }

        case 'join_room': {
            const room = rooms[msg.roomId];
            if (!room) {
                ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
                return;
            }
            if (room.players.length >= 2) {
                ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
                return;
            }
            room.players.push(ws);
            ws.roomId = msg.roomId;
            ws.playerIndex = 1;
            startSimulation(msg.roomId, room);
            break;
        }

        case 'input': {
            if (ws.roomId && rooms[ws.roomId]) {
                const room = rooms[ws.roomId];
                if (room.lastInputs) {
                    room.lastInputs[ws.playerIndex] = {
                        actions: msg.actions || [],
                        skillJustPressed: msg.skillJustPressed || false
                    };
                }
            }
            break;
        }
    }
}

console.log(`=== Neon Tank Battle LAN Server ===`);
console.log(`Server running on port ${PORT}`);
console.log(`Connect from game clients using this machine's IP address`);
