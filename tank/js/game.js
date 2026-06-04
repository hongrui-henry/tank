class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 1024;
        this.height = 768;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.input = new InputHandler();
        this.lastTime = 0;

        this.audioManager = new AudioManager();

        this.currentMapType = 'classic';
        this.map = new Map(this.width, this.height, this.currentMapType);
        this.tanks = [];
        this.bullets = [];
        this.explosions = [];
        this.ais = [];

        this.gameState = 'MENU';
        this.currentMode = null;
        this.selectedSkills = { p1: null, p2: null, ai: null };
        this.aiDifficulty = 'medium';

        this.keyBindings = {
            p1: {
                up: 'KeyW',
                down: 'KeyS',
                left: 'KeyA',
                right: 'KeyD',
                shoot: 'Space',
                skill: 'KeyQ'
            },
            p2: {
                up: 'ArrowUp',
                down: 'ArrowDown',
                left: 'ArrowLeft',
                right: 'ArrowRight',
                shoot: 'Enter',
                skill: 'Backslash'
            }
        };

        this.skillList = [
            { id: 'none', name: '无技能', desc: '不装备任何技能', cooldown: '无' },
            { id: 'random', name: '随机技能', desc: '随机选择一个技能', cooldown: '随机' },
            { id: 'dash', name: '冲刺', desc: '瞬间向前冲刺一段距离', cooldown: '8秒' },
            { id: 'speedUp', name: '加速', desc: '移动速度提升50%', cooldown: '12秒' },
            { id: 'shield', name: '护盾', desc: '获得3秒无敌时间', cooldown: '15秒' },
            { id: 'doubleDamage', name: '双倍伤害', desc: '子弹伤害翻倍', cooldown: '10秒' },
            { id: 'fastShoot', name: '快速射击', desc: '射速提升80%', cooldown: '8秒' },
            { id: 'bounceBullet', name: '反弹子弹', desc: '子弹可反弹6次', cooldown: '14秒' },
            { id: 'bulletThroughWall', name: '子弹穿墙', desc: '子弹可穿过墙壁', cooldown: '12秒' },
            { id: 'tankThroughWall', name: '坦克穿墙', desc: '坦克可穿过墙壁', cooldown: '15秒' },
            { id: 'scatter', name: '散射', desc: '发射三发散射子弹', cooldown: '13秒' },
            { id: 'energyShield', name: '能量盾', desc: '发射横向能量盾，无限抵挡', cooldown: '13秒' },
            { id: 'invisibility', name: '隐身', desc: '隐身5秒，敌人看不见你', cooldown: '14秒' },
            { id: 'clone', name: '镜像分身', desc: '发射镜像坦克，持续6秒', cooldown: '15秒' },
            { id: 'laser', name: '激光', desc: '发射激光，无限射程不可穿墙', cooldown: '13秒' }
        ];

        this.tooltip = document.getElementById('tooltip');
        this.currentBindingInput = null;

        this.editorCanvas = document.getElementById('editorCanvas');
        this.editorCtx = this.editorCanvas.getContext('2d');
        this.editorCanvas.width = this.width;
        this.editorCanvas.height = this.height;
        this.editorMode = 'build';
        this.editorStartPos = null;
        this.editorCurrentWall = null;

        this.notificationTimer = null;
        this.isPaused = false;

        this.initUI();
        this.loadKeyBindings();
        this.updateKeyBindingDisplay();
        this.initESCListener();
        this.loop(0);
    }

    initESCListener() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this.audioManager.playPause();
                if (this.gameState === 'PLAYING' && !this.isPaused) {
                    this.togglePause();
                } else if (this.gameState === 'PLAYING' && this.isPaused) {
                    this.resumeGame();
                } else if (this.gameState === 'SKILL_SELECT') {
                    this.cancelSkillSelect();
                } else if (this.gameState === 'MENU') {
                    this.showMenu();
                }
            }
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            document.getElementById('pause-menu').classList.remove('hidden');
        } else {
            document.getElementById('pause-menu').classList.add('hidden');
        }
    }

    resumeGame() {
        this.isPaused = false;
        document.getElementById('pause-menu').classList.add('hidden');
    }

    resumeFromPauseMenu() {
        this.isPaused = false;
        document.getElementById('pause-menu').classList.add('hidden');
    }

    cancelSkillSelect() {
        this.gameState = 'MENU';
        this.input.keys.clear();
        document.getElementById('skill-select').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    }

    showNotification(message, type = 'default', duration = 3000) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification ' + type;
        
        if (this.notificationTimer) {
            clearTimeout(this.notificationTimer);
        }
        
        setTimeout(() => {
            notification.className = 'notification ' + type;
        }, 10);
        
        this.notificationTimer = setTimeout(() => {
            notification.className = 'notification hidden';
        }, duration);
    }

    initUI() {
        document.getElementById('btn-pve').addEventListener('click', () => {
            this.audioManager.playButton();
            this.showSkillSelect('PVE');
        });
        document.getElementById('btn-pvp').addEventListener('click', () => {
            this.audioManager.playButton();
            this.showSkillSelect('PVP');
        });
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.audioManager.playButton();
            this.startGame(this.currentMode);
        });
        document.getElementById('btn-menu').addEventListener('click', () => {
            this.audioManager.playButton();
            this.showMenu();
        });
        document.getElementById('btn-settings').addEventListener('click', () => {
            this.audioManager.playButton();
            this.showSettings();
        });
        document.getElementById('btn-settings-back').addEventListener('click', () => {
            this.audioManager.playButton();
            this.hideSettings();
        });
        document.getElementById('btn-skill-confirm').addEventListener('click', () => {
            this.audioManager.playButton();
            this.confirmSkillSelection();
        });

        document.getElementById('btn-resume').addEventListener('click', () => {
            this.audioManager.playButton();
            this.resumeGame();
        });

        document.getElementById('btn-pause-menu').addEventListener('click', () => {
            this.audioManager.playButton();
            this.showMenu();
        });

        document.getElementById('map-classic').addEventListener('click', () => {
            this.audioManager.playButton();
            this.selectMap('classic');
        });
        document.getElementById('map-open').addEventListener('click', () => {
            this.audioManager.playButton();
            this.selectMap('open');
        });
        document.getElementById('map-custom').addEventListener('click', () => {
            this.audioManager.playButton();
            this.openMapEditor();
        });

        document.getElementById('editor-build').addEventListener('click', () => {
            this.audioManager.playButton();
            this.setEditorMode('build');
        });
        document.getElementById('editor-delete').addEventListener('click', () => {
            this.audioManager.playButton();
            this.setEditorMode('delete');
        });
        document.getElementById('editor-clear').addEventListener('click', () => {
            this.audioManager.playButton();
            this.clearEditorMap();
        });
        document.getElementById('editor-apply').addEventListener('click', () => {
            this.audioManager.playButton();
            this.applyEditorMap();
        });
        document.getElementById('editor-back').addEventListener('click', () => {
            this.audioManager.playButton();
            this.closeMapEditor();
        });

        this.skillList.forEach(skill => {
            const btn = document.getElementById(`skill-p1-${skill.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.audioManager.playButton();
                    this.selectSkill(1, skill.id);
                });
                btn.addEventListener('mouseenter', (e) => this.showTooltip(e, skill));
                btn.addEventListener('mouseleave', () => this.hideTooltip());
                btn.addEventListener('mousemove', (e) => this.moveTooltip(e));
            }
        });

        this.skillList.forEach(skill => {
            const btn = document.getElementById(`skill-p2-${skill.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.audioManager.playButton();
                    this.selectSkill(2, skill.id);
                });
                btn.addEventListener('mouseenter', (e) => this.showTooltip(e, skill));
                btn.addEventListener('mouseleave', () => this.hideTooltip());
                btn.addEventListener('mousemove', (e) => this.moveTooltip(e));
            }
        });

        const aiSkills = this.skillList.concat([{ id: 'random', name: '随机技能', desc: '随机选择一个技能', cooldown: '随机' }]);
        aiSkills.forEach(skill => {
            const btn = document.getElementById(`skill-ai-${skill.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.audioManager.playButton();
                    this.selectAISkill(skill.id);
                });
                btn.addEventListener('mouseenter', (e) => this.showTooltip(e, skill));
                btn.addEventListener('mouseleave', () => this.hideTooltip());
                btn.addEventListener('mousemove', (e) => this.moveTooltip(e));
            }
        });

        document.querySelectorAll('#ai-difficulty .skill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.audioManager.playButton();
                this.selectAIDifficulty(btn.dataset.difficulty);
            });
        });

        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.audioManager.masterVolume = volume;
                document.getElementById('volume-value').textContent = e.target.value + '%';
            });
        }

        this.initKeyBindingInputs();
        this.initMapEditorEvents();
    }

    initKeyBindingInputs() {
        const bindings = [
            { player: 'p1', action: 'up', inputId: 'p1-key-up' },
            { player: 'p1', action: 'down', inputId: 'p1-key-down' },
            { player: 'p1', action: 'left', inputId: 'p1-key-left' },
            { player: 'p1', action: 'right', inputId: 'p1-key-right' },
            { player: 'p1', action: 'shoot', inputId: 'p1-key-shoot' },
            { player: 'p1', action: 'skill', inputId: 'p1-key-skill' },
            { player: 'p2', action: 'up', inputId: 'p2-key-up' },
            { player: 'p2', action: 'down', inputId: 'p2-key-down' },
            { player: 'p2', action: 'left', inputId: 'p2-key-left' },
            { player: 'p2', action: 'right', inputId: 'p2-key-right' },
            { player: 'p2', action: 'shoot', inputId: 'p2-key-shoot' },
            { player: 'p2', action: 'skill', inputId: 'p2-key-skill' }
        ];

        bindings.forEach(binding => {
            const input = document.getElementById(binding.inputId);
            if (input) {
                input.addEventListener('focus', () => {
                    this.currentBindingInput = { player: binding.player, action: binding.action, input: input };
                });
                input.addEventListener('blur', () => {
                    this.currentBindingInput = null;
                });
            }
        });

        window.addEventListener('keydown', (e) => {
            if (this.currentBindingInput) {
                e.preventDefault();
                const { player, action, input } = this.currentBindingInput;

                const conflictingBinding = this.findConflictingBinding(player, action, e.code);
                if (conflictingBinding) {
                    const oldCode = this.keyBindings[player][action];
                    this.keyBindings[player][action] = e.code;
                    this.updateConflictingBinding(conflictingBinding.player, conflictingBinding.action, oldCode);
                } else {
                    this.keyBindings[player][action] = e.code;
                }

                input.value = this.formatKeyCode(e.code);
                this.currentBindingInput = null;
                this.saveKeyBindings();
            }
        });
    }

    initMapEditorEvents() {
        this.editorCanvas.addEventListener('mousedown', (e) => this.editorMouseDown(e));
        this.editorCanvas.addEventListener('mousemove', (e) => this.editorMouseMove(e));
        this.editorCanvas.addEventListener('mouseup', (e) => this.editorMouseUp(e));
        this.editorCanvas.addEventListener('mouseleave', (e) => this.editorMouseUp(e));
    }

    editorMouseDown(e) {
        const rect = this.editorCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.editorMode === 'build') {
            this.editorStartPos = { x, y };
            this.editorCurrentWall = { x, y, w: 0, h: 0 };
        } else if (this.editorMode === 'delete') {
            this.map.removeWallAtPosition(x, y);
            this.drawEditor();
        }
    }

    editorMouseMove(e) {
        if (this.editorMode === 'build' && this.editorStartPos) {
            const rect = this.editorCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.editorCurrentWall.w = x - this.editorStartPos.x;
            this.editorCurrentWall.h = y - this.editorStartPos.y;

            this.drawEditor();
        }
    }

    editorMouseUp(e) {
        if (this.editorMode === 'build' && this.editorCurrentWall) {
            const w = Math.abs(this.editorCurrentWall.w);
            const h = Math.abs(this.editorCurrentWall.h);
            
            if (w > 10 && h > 10) {
                const x = Math.min(this.editorStartPos.x, this.editorStartPos.x + this.editorCurrentWall.w);
                const y = Math.min(this.editorStartPos.y, this.editorStartPos.y + this.editorCurrentWall.h);
                this.map.addWall(x, y, w, h);
            }
            
            this.editorStartPos = null;
            this.editorCurrentWall = null;
            this.drawEditor();
        }
    }

    drawEditor() {
        this.editorCtx.fillStyle = '#0a0a0a';
        this.editorCtx.fillRect(0, 0, this.width, this.height);

        this.drawGrid(this.editorCtx);
        this.map.drawEditor(this.editorCtx);

        if (this.editorCurrentWall) {
            this.editorCtx.save();
            this.editorCtx.fillStyle = 'rgba(0, 243, 255, 0.3)';
            this.editorCtx.strokeStyle = '#00f3ff';
            this.editorCtx.lineWidth = 2;
            this.editorCtx.setLineDash([5, 5]);
            
            const x = this.editorCurrentWall.x;
            const y = this.editorCurrentWall.y;
            const w = this.editorCurrentWall.w;
            const h = this.editorCurrentWall.h;
            
            this.editorCtx.fillRect(x, y, w, h);
            this.editorCtx.strokeRect(x, y, w, h);
            
            this.editorCtx.restore();
        }
    }

    drawGrid(ctx) {
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        const gridSize = 64;

        for (let x = 0; x <= this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }

        for (let y = 0; y <= this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    }

    setEditorMode(mode) {
        this.editorMode = mode;
        document.querySelectorAll('.editor-btn').forEach(btn => btn.classList.remove('selected'));
        document.getElementById(`editor-${mode}`).classList.add('selected');
        
        this.editorCanvas.style.cursor = mode === 'build' ? 'crosshair' : 'pointer';
    }

    clearEditorMap() {
        this.map.clearWalls();
        this.drawEditor();
    }

    applyEditorMap() {
        if (this.map.walls.length === 0) {
            this.showNotification('地图没有墙壁，请先绘制！', 'error');
            return;
        }
        this.map.saveToStorage();
        this.currentMapType = 'custom';
        localStorage.setItem('selectedMap', 'custom');
        this.showNotification('自定义地图已保存并应用！', 'success');
        document.getElementById('map-editor').classList.add('hidden');
        document.getElementById('settings').classList.remove('hidden');
    }

    openMapEditor() {
        document.getElementById('settings').classList.add('hidden');
        document.getElementById('map-editor').classList.remove('hidden');
        
        this.map = new Map(this.width, this.height, 'custom');
        const loaded = this.map.loadFromStorage();
        if (!loaded) {
            this.map.clearWalls();
        }
        this.drawEditor();
    }

    closeMapEditor() {
        document.getElementById('map-editor').classList.add('hidden');
        document.getElementById('settings').classList.remove('hidden');
    }

    selectMap(mapType) {
        if (mapType === 'custom') {
            const saved = localStorage.getItem('customMap');
            if (!saved) {
                this.showNotification('请先在地图编辑器中创建并保存自定义地图！', 'error');
                return;
            }
            try {
                const parsed = JSON.parse(saved);
                if (!Array.isArray(parsed) || parsed.length === 0) {
                    this.showNotification('自定义地图没有墙壁，请先创建！', 'error');
                    return;
                }
            } catch (e) {
                this.showNotification('自定义地图数据损坏，请重新创建！', 'error');
                return;
            }
        }
        this.currentMapType = mapType;
        localStorage.setItem('selectedMap', mapType);
        this.showNotification(`已选择${mapType === 'classic' ? '经典地图' : mapType === 'open' ? '无障碍地图' : '自定义地图'}`, 'success');
    }

    findConflictingBinding(player, action, newCode) {
        for (const p in this.keyBindings) {
            for (const a in this.keyBindings[p]) {
                if (this.keyBindings[p][a] === newCode && !(p === player && a === action)) {
                    return { player: p, action: a };
                }
            }
        }
        return null;
    }

    updateConflictingBinding(player, action, newCode) {
        this.keyBindings[player][action] = newCode;
        const inputId = `${player}-key-${action}`;
        const input = document.getElementById(inputId);
        if (input) {
            input.value = this.formatKeyCode(newCode);
        }
    }

    formatKeyCode(code) {
        const keyNames = {
            'Space': '空格',
            'ArrowUp': '上',
            'ArrowDown': '下',
            'ArrowLeft': '左',
            'ArrowRight': '右',
            'Enter': '回车',
            'Backslash': '\\',
            'KeyW': 'W',
            'KeyA': 'A',
            'KeyS': 'S',
            'KeyD': 'D',
            'KeyQ': 'Q',
            'KeyE': 'E',
            'KeyR': 'R'
        };

        if (keyNames[code]) return keyNames[code];
        if (code.startsWith('Key')) return code.substring(3);
        if (code.startsWith('Digit')) return code.substring(5);
        return code;
    }

    saveKeyBindings() {
        localStorage.setItem('tankGameKeyBindings', JSON.stringify(this.keyBindings));
    }

    loadKeyBindings() {
        const saved = localStorage.getItem('tankGameKeyBindings');
        if (saved) {
            try {
                this.keyBindings = JSON.parse(saved);
            } catch (e) {
                console.log('Failed to load key bindings');
            }
        }
        
        const savedMap = localStorage.getItem('selectedMap');
        if (savedMap) {
            this.currentMapType = savedMap;
        }
    }

    updateKeyBindingDisplay() {
        const displayMap = {
            'p1-key-up': this.keyBindings.p1.up,
            'p1-key-down': this.keyBindings.p1.down,
            'p1-key-left': this.keyBindings.p1.left,
            'p1-key-right': this.keyBindings.p1.right,
            'p1-key-shoot': this.keyBindings.p1.shoot,
            'p1-key-skill': this.keyBindings.p1.skill,
            'p2-key-up': this.keyBindings.p2.up,
            'p2-key-down': this.keyBindings.p2.down,
            'p2-key-left': this.keyBindings.p2.left,
            'p2-key-right': this.keyBindings.p2.right,
            'p2-key-shoot': this.keyBindings.p2.shoot,
            'p2-key-skill': this.keyBindings.p2.skill
        };

        for (const [id, code] of Object.entries(displayMap)) {
            const input = document.getElementById(id);
            if (input) {
                input.value = this.formatKeyCode(code);
            }
        }
    }

    showTooltip(e, skill) {
        let desc = skill.desc;
        if (skill.id !== 'none' && skill.id !== 'random' && skill.cooldown !== '无') {
            desc += ` (冷却: ${skill.cooldown})`;
        }
        this.tooltip.textContent = desc;
        this.tooltip.classList.remove('hidden');
        this.moveTooltip(e);
    }

    hideTooltip() {
        this.tooltip.classList.add('hidden');
    }

    moveTooltip(e) {
        const container = document.getElementById('game-container');
        const rect = container.getBoundingClientRect();
        let x = e.clientX - rect.left + 15;
        let y = e.clientY - rect.top + 15;

        if (x + 250 > rect.width) {
            x = e.clientX - rect.left - 260;
        }
        if (y + 50 > rect.height) {
            y = e.clientY - rect.top - 50;
        }

        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = y + 'px';
    }

    showSettings() {
        this.updateKeyBindingDisplay();
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('settings').classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settings').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    }

    showSkillSelect(mode) {
        this.currentMode = mode;
        this.gameState = 'SKILL_SELECT';
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('skill-select').classList.remove('hidden');

        this.selectedSkills = { p1: null, p2: null, ai: null };
        document.querySelectorAll('#p1-skills .skill-btn, #p2-skills .skill-btn, #ai-skills .skill-btn').forEach(btn => btn.classList.remove('selected'));

        if (mode === 'PVE') {
            document.getElementById('p2-skill-section').classList.add('hidden');
            document.getElementById('ai-skill-section').classList.remove('hidden');
            document.getElementById('ai-difficulty-section').classList.remove('hidden');
        } else {
            document.getElementById('p2-skill-section').classList.remove('hidden');
            document.getElementById('ai-skill-section').classList.add('hidden');
            document.getElementById('ai-difficulty-section').classList.add('hidden');
        }
    }

    selectSkill(player, skillId) {
        if (player === 1) {
            this.selectedSkills.p1 = skillId;
            document.querySelectorAll('#p1-skills .skill-btn').forEach(btn => btn.classList.remove('selected'));
            const btn = document.getElementById(`skill-p1-${skillId}`);
            if (btn) btn.classList.add('selected');
        } else {
            this.selectedSkills.p2 = skillId;
            document.querySelectorAll('#p2-skills .skill-btn').forEach(btn => btn.classList.remove('selected'));
            const btn = document.getElementById(`skill-p2-${skillId}`);
            if (btn) btn.classList.add('selected');
        }
    }

    selectAISkill(skillId) {
        this.selectedSkills.ai = skillId;
        document.querySelectorAll('#ai-skills .skill-btn').forEach(btn => btn.classList.remove('selected'));
        const btn = document.getElementById(`skill-ai-${skillId}`);
        if (btn) btn.classList.add('selected');
    }

    selectAIDifficulty(difficulty) {
        this.aiDifficulty = difficulty;
        document.querySelectorAll('#ai-difficulty .skill-btn').forEach(btn => btn.classList.remove('selected'));
        const btn = document.getElementById(`difficulty-${difficulty}`);
        if (btn) btn.classList.add('selected');
    }

    confirmSkillSelection() {
        if (this.currentMode === 'PVE') {
            if (!this.selectedSkills.p1) {
                this.showNotification('请选择Player 1的技能！', 'error');
                return;
            }
            if (!this.selectedSkills.ai) {
                this.selectedSkills.ai = 'none';
            }
            this.startGame(this.currentMode);
        }
        if (this.currentMode === 'PVP') {
            if (!this.selectedSkills.p1 || !this.selectedSkills.p2) {
                this.showNotification('请选择两个玩家的技能！', 'error');
                return;
            }
            this.startGame(this.currentMode);
        }
    }

    showMenu() {
        this.gameState = 'MENU';
        this.isPaused = false;
        this.input.keys.clear();
        document.getElementById('main-menu').classList.remove('hidden');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('skill-select').classList.add('hidden');
        document.getElementById('settings').classList.add('hidden');
        document.getElementById('map-editor').classList.add('hidden');
        document.getElementById('pause-menu').classList.add('hidden');

        this.tanks = [];
        this.bullets = [];
        this.explosions = [];
        this.ais = [];
    }

    startGame(mode) {
        this.currentMode = mode;
        this.gameState = 'PLAYING';
        this.isPaused = false;
        this.input.keys.clear();

        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('skill-select').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');

        this.tanks = [];
        this.bullets = [];
        this.explosions = [];
        this.ais = [];

        this.map = new Map(this.width, this.height, this.currentMapType);
        if (this.currentMapType === 'custom') {
            this.map.loadFromStorage();
        }

        const skills = ['dash', 'speedUp', 'shield', 'doubleDamage', 'fastShoot', 'bounceBullet', 'bulletThroughWall', 'tankThroughWall', 'scatter', 'energyShield', 'invisibility', 'clone', 'laser'];

        const p1Controls = this.keyBindings.p1;
        const p1Tank = new Tank(100, 100, '#00f3ff', p1Controls, this);
        let p1Skill = this.selectedSkills.p1 || 'none';
        if (p1Skill === 'random') {
            p1Skill = skills[Math.floor(Math.random() * skills.length)];
        }
        p1Tank.selectedSkill = p1Skill;
        this.tanks.push(p1Tank);

        if (mode === 'PVP') {
            const p2Controls = this.keyBindings.p2;
            const p2Tank = new Tank(900, 600, '#ff00ff', p2Controls, this);
            let p2Skill = this.selectedSkills.p2 || 'none';
            if (p2Skill === 'random') {
                p2Skill = skills[Math.floor(Math.random() * skills.length)];
            }
            p2Tank.selectedSkill = p2Skill;
            this.tanks.push(p2Tank);
        } else {
            const aiControls = { up: 'up', down: 'down', left: 'left', right: 'right', shoot: 'shoot', skill: 'skill' };
            const aiTank = new Tank(900, 600, '#ff00ff', aiControls, this);
            
            let aiSkill = this.selectedSkills.ai || 'none';
            if (aiSkill === 'random') {
                aiSkill = skills[Math.floor(Math.random() * skills.length)];
            }
            aiTank.selectedSkill = aiSkill;
            
            this.tanks.push(aiTank);
            this.ais.push(new AIController(aiTank, this.tanks[0], this.map, this.aiDifficulty));
        }
    }

    addBullet(bullet) {
        this.bullets.push(bullet);
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.explosions.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1.0,
                color
            });
        }
        this.audioManager.playExplosion();
    }

    update(deltaTime) {
        if (this.gameState !== 'PLAYING' || this.isPaused) return;

        this.bullets = this.bullets.filter(b => !b.markedForDeletion);
        this.explosions = this.explosions.filter(e => e.life > 0);

        this.ais.forEach(ai => {
            const controls = ai.update(deltaTime);
            const mockInput = { isKeyDown: (code) => controls[code] === true || (code === 'shoot' && controls.shoot) };
            ai.tank.update(deltaTime, mockInput);
            
            if (controls.skill) {
                ai.tank.activateSkill();
            }
        });

        this.tanks.forEach((tank, index) => {
            if (this.ais.find(ai => ai.tank === tank)) return;

            tank.update(deltaTime, this.input);

            if (this.input.isKeyDown(tank.controls.skill)) {
                if (!tank.skillKeyWasPressed) {
                    tank.activateSkill();
                    tank.skillKeyWasPressed = true;
                }
            } else {
                tank.skillKeyWasPressed = false;
            }
        });

        this.bullets.forEach(bullet => {
            const hitWall = bullet.update(deltaTime, this.map);
            if (!hitWall) {
                this.tanks.forEach(tank => {
                    const dx = bullet.x - tank.x;
                    const dy = bullet.y - tank.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < tank.radius + bullet.radius) {
                        if (bullet.color !== tank.color) {
                            const damage = 10 * (bullet.damageMultiplier || 1);
                            tank.takeDamage(damage);
                            bullet.markedForDeletion = true;
                            this.createExplosion(bullet.x, bullet.y, '#fff');
                        }
                    }

                    tank.clones.forEach((clone, cloneIndex) => {
                        const dx = bullet.x - clone.x;
                        const dy = bullet.y - clone.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 20 + bullet.radius) {
                            if (bullet.color !== clone.color) {
                                clone.health--;
                                bullet.markedForDeletion = true;
                                this.createExplosion(bullet.x, bullet.y, clone.color);
                                
                                if (clone.health <= 0) {
                                    this.createExplosion(clone.x, clone.y, clone.color);
                                }
                            }
                        }
                    });
                });

                this.tanks.forEach(tank => {
                    tank.energyShields.forEach((shield, shieldIndex) => {
                        const localX = bullet.x - shield.x;
                        const localY = bullet.y - shield.y;

                        const rotatedX = localX * Math.cos(-shield.rotation) - localY * Math.sin(-shield.rotation);
                        const rotatedY = localX * Math.sin(-shield.rotation) + localY * Math.cos(-shield.rotation);

                        const halfWidth = shield.width / 2;
                        const halfHeight = shield.height / 2;

                        if (Math.abs(rotatedX) <= halfWidth + bullet.radius &&
                            Math.abs(rotatedY) <= halfHeight + bullet.radius &&
                            bullet.color !== shield.color) {
                            bullet.markedForDeletion = true;
                            this.createExplosion(bullet.x, bullet.y, '#00ffff');
                        }
                    });
                });
            } else {
                this.createExplosion(bullet.x, bullet.y, '#fff');
            }
        });

        this.explosions.forEach(e => {
            e.x += e.vx;
            e.y += e.vy;
            e.life -= 0.05;
        });

        if (this.tanks.some(t => t.health <= 0)) {
            const winnerIndex = this.tanks.findIndex(t => t.health > 0);
            const winner = winnerIndex === 0 ? 'Player 1' : (this.currentMode === 'PVP' ? 'Player 2' : 'Computer');
            this.endGame(winner);
        }

        if (this.tanks[0]) {
            document.getElementById('p1-health').innerText = this.tanks[0].health;
            const p1Cooldown = document.getElementById('p1-skill-cooldown');
            if (p1Cooldown) {
                if (this.tanks[0].skillCooldown > 0) {
                    p1Cooldown.innerText = Math.ceil(this.tanks[0].skillCooldown / 1000) + 's';
                } else {
                    p1Cooldown.innerText = 'Ready';
                }
            }
        }
        if (this.tanks[1]) {
            document.getElementById('p2-health').innerText = this.tanks[1].health;
            const p2Cooldown = document.getElementById('p2-skill-cooldown');
            if (p2Cooldown) {
                if (this.tanks[1].skillCooldown > 0) {
                    p2Cooldown.innerText = Math.ceil(this.tanks[1].skillCooldown / 1000) + 's';
                } else {
                    p2Cooldown.innerText = 'Ready';
                }
            }
        }
    }

    endGame(winner) {
        this.gameState = 'GAMEOVER';
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('winner-text').innerText = `${winner} WINS!`;
        this.audioManager.playGameOver();
    }

    draw() {
        this.ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawGrid(this.ctx);

        this.map.draw(this.ctx);

        if (this.gameState === 'PLAYING' || this.gameState === 'GAMEOVER') {
            this.tanks.forEach(t => t.draw(this.ctx));
            
            this.bullets.forEach(b => {
                if (!b.isInvisible) {
                    b.draw(this.ctx);
                }
            });

            this.explosions.forEach(e => {
                this.ctx.globalAlpha = e.life;
                this.ctx.fillStyle = e.color;
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            });
        }
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }
}

window.onload = () => {
    new Game();
};
