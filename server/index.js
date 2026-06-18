const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const dgram = require('dgram');
const os = require('os');
const { exec } = require('child_process');

const PORT = 3000;
const UDP_PORT = 3001;
const MULTICAST_ADDR = '239.255.0.1';
const TICK_RATE = 33;
const STATE_RATE = 33;

const GameSimulation = require('./GameSimulation');

// --- LAN discovery via UDP multicast ---
const discoveredServers = new Map();

function getLocalIPs() {
    const ips = [];
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

function startUDPDiscovery() {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    socket.on('message', (msg, rinfo) => {
        try {
            const data = JSON.parse(msg.toString());
            if (data.type === 'beacon') {
                const key = `${data.host}:${data.port}`;
                // Don't add ourselves
                if (key !== `${getLocalIPs()[0] || '127.0.0.1'}:${PORT}`) {
                    discoveredServers.set(key, {
                        name: data.name,
                        host: data.host,
                        port: data.port,
                        roomCount: data.roomCount || 0,
                        lastSeen: Date.now()
                    });
                }
            }
        } catch (e) { /* ignore invalid messages */ }
    });

    socket.on('error', (err) => {
        console.log('UDP discovery warning:', err.message);
    });

    socket.bind(UDP_PORT, () => {
        socket.addMembership(MULTICAST_ADDR);
        socket.setMulticastTTL(2);
    });

    // Send periodic beacon
    setInterval(() => {
        const roomCount = Object.keys(rooms).length;
        const ips = getLocalIPs();
        if (ips.length === 0) return;
        const beacon = JSON.stringify({
            type: 'beacon',
            name: 'Neon Tank Battle',
            host: ips[0],
            port: PORT,
            roomCount
        });
        socket.send(beacon, 0, beacon.length, UDP_PORT, MULTICAST_ADDR);
    }, 2000);

    // Clean up stale servers
    setInterval(() => {
        const now = Date.now();
        for (const [key, server] of discoveredServers) {
            if (now - server.lastSeen > 15000) {
                discoveredServers.delete(key);
            }
        }
    }, 5000);

    return socket;
}

// --- HTTP server for static files + API ---
const gameDir = path.join(__dirname, '..', 'tank');
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.url === '/api/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            name: 'Neon Tank Battle',
            host: getLocalIPs()[0] || '127.0.0.1',
            port: PORT,
            roomCount: Object.keys(rooms).length
        }));
        return;
    }

    if (req.url === '/api/servers') {
        const servers = [];
        for (const [, s] of discoveredServers) {
            servers.push({ name: s.name, host: s.host, port: s.port, roomCount: s.roomCount });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(servers));
        return;
    }

    let filePath = path.join(gameDir, req.url === '/' ? 'tank1.html' : req.url);
    filePath = path.normalize(filePath);

    if (!filePath.startsWith(gameDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

function openBrowser(url) {
    try {
        const platform = process.platform;
        if (platform === 'darwin') {
            exec(`open "${url}"`, { timeout: 3000 });
        } else if (platform === 'win32') {
            exec(`start "" "${url}"`, { timeout: 3000 });
        } else {
            exec(`xdg-open "${url}"`, { timeout: 3000 });
        }
    } catch (e) {
        // ignore browser open errors
    }
}

// --- WebSocket server ---
const wss = new WebSocket.Server({ server: httpServer });
const rooms = {};

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
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
                p.send(JSON.stringify({ type: 'game_state', state: sim.getState() }));
            }
        });
        if (sim.gameOver) {
            clearInterval(room.tickInterval);
            room.tickInterval = null;
        }
    }, STATE_RATE);
}

wss.on('connection', (ws) => {
    ws.roomId = null;
    ws.playerIndex = -1;

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
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
                        rooms[ws.roomId].lastInputs[ws.playerIndex] = {
                            actions: msg.actions || [],
                            skillJustPressed: msg.skillJustPressed || false
                        };
                    }
                    break;
                }
            }
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
        }
    });

    ws.on('close', () => {
        if (ws.roomId && rooms[ws.roomId]) {
            const room = rooms[ws.roomId];
            if (room.tickInterval) clearInterval(room.tickInterval);
            room.players.forEach(p => {
                if (p !== ws && p.readyState === WebSocket.OPEN) {
                    p.send(JSON.stringify({ type: 'player_disconnected' }));
                }
            });
            delete rooms[ws.roomId];
            console.log(`Room ${ws.roomId} closed`);
        }
    });
});

// --- Start ---
const udpSocket = startUDPDiscovery();

httpServer.listen(PORT, () => {
    const ips = getLocalIPs();
    console.log('========================================');
    console.log('  Neon Tank Battle LAN Server');
    console.log('========================================');
    console.log(`  Local:   http://localhost:${PORT}`);
    ips.forEach(ip => console.log(`  LAN:     http://${ip}:${PORT}`));
    console.log('========================================');
    console.log('  Room codes are shown in the game UI');
    console.log('  Other players will see this server');
    console.log('  automatically in their game list');
    console.log('========================================');

    // Auto-open browser
    openBrowser(`http://localhost:${PORT}`);
});
