class NetworkManager {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.roomId = null;
        this.playerIndex = -1;
        this.serverState = null;
        this.initialStateReceived = false;

        this.onRoomCreated = null;
        this.onGameStart = null;
        this.onStateUpdate = null;
        this.onPlayerDisconnected = null;
        this.onError = null;
    }

    connect(host, port) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(`ws://${host}:${port}`);
            } catch (e) {
                reject(e);
                return;
            }

            this.ws.onopen = () => {
                this.connected = true;
                resolve();
            };

            this.ws.onerror = () => {
                reject(new Error('Connection failed'));
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.handleMessage(msg);
                } catch (e) {
                    console.error('NetworkManager: invalid message', e);
                }
            };

            this.ws.onclose = () => {
                this.connected = false;
                if (this.onPlayerDisconnected) {
                    this.onPlayerDisconnected();
                }
            };
        });
    }

    createRoom() {
        this.send({ type: 'create_room' });
    }

    joinRoom(roomId) {
        this.send({ type: 'join_room', roomId });
    }

    sendInput(localTank, input) {
        if (!this.connected || !localTank) return;
        const controls = localTank.controls;
        const actions = [];
        if (input.isKeyDown(controls.up)) actions.push('up');
        if (input.isKeyDown(controls.down)) actions.push('down');
        if (input.isKeyDown(controls.left)) actions.push('left');
        if (input.isKeyDown(controls.right)) actions.push('right');
        if (input.isKeyDown(controls.shoot)) actions.push('shoot');

        let skillPressed = false;
        if (input.isKeyDown(controls.skill) && !localTank.skillKeyWasPressed) {
            skillPressed = true;
        }

        this.send({ type: 'input', actions, skillJustPressed: skillPressed });
    }

    send(msg) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    handleMessage(msg) {
        switch (msg.type) {
            case 'room_created':
                this.roomId = msg.roomId;
                this.playerIndex = 0;
                if (this.onRoomCreated) this.onRoomCreated(msg.roomId);
                break;

            case 'game_start':
                this.playerIndex = msg.playerIndex;
                this.serverState = msg.initialState;
                this.initialStateReceived = true;
                if (this.onGameStart) this.onGameStart(msg.playerIndex, msg.initialState);
                break;

            case 'game_state':
                this.serverState = msg.state;
                if (this.onStateUpdate) this.onStateUpdate(msg.state);
                break;

            case 'player_disconnected':
                if (this.onPlayerDisconnected) this.onPlayerDisconnected();
                break;

            case 'error':
                if (this.onError) this.onError(msg.message);
                break;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.serverState = null;
        this.initialStateReceived = false;
    }
}
