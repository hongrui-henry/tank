class AudioManager {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
        this.masterVolume = 0.2; // 降低音量
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    playButton() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc1.type = 'square';
        osc2.type = 'sawtooth';
        
        osc1.frequency.setValueAtTime(1200, now);
        osc1.frequency.exponentialRampToValueAtTime(800, now + 0.03);
        osc1.frequency.exponentialRampToValueAtTime(1600, now + 0.06);
        
        osc2.frequency.setValueAtTime(600, now);
        osc2.frequency.exponentialRampToValueAtTime(400, now + 0.03);
        osc2.frequency.exponentialRampToValueAtTime(800, now + 0.06);
        
        gain.gain.setValueAtTime(0.15 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc1.start(now);
        osc1.stop(now + 0.08);
        osc2.start(now);
        osc2.stop(now + 0.08);
    }

    playShoot() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.15, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;
        
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(200, now);
        noiseFilter.Q.setValueAtTime(1, now);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noiseGain.gain.setValueAtTime(0.08 * this.masterVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        noise.start(now);
        noise.stop(now + 0.15);
        
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.audioContext.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        
        oscGain.gain.setValueAtTime(0.12 * this.masterVolume, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }

    playExplosion() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.5, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;

        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();

        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(2000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.5);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);

        noiseGain.gain.setValueAtTime(0.4 * this.masterVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        noise.start(now);
        noise.stop(now + 0.5);

        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.audioContext.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);

        oscGain.gain.setValueAtTime(0.3 * this.masterVolume, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc.start(now);
        osc.stop(now + 0.6);
    }

    playHit() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(300, now);
        osc2.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        
        gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        
        osc.start(now);
        osc.stop(now + 0.18);
        osc2.start(now);
        osc2.stop(now + 0.15);
    }

    playDash() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        
        gain.gain.setValueAtTime(0.3 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playSpeedUp() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc1.type = 'sine';
        osc2.type = 'triangle';
        
        osc1.frequency.setValueAtTime(300, now);
        osc1.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        
        osc2.frequency.setValueAtTime(450, now);
        osc2.frequency.exponentialRampToValueAtTime(900, now + 0.15);
        
        gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        osc1.start(now);
        osc1.stop(now + 0.2);
        osc2.start(now);
        osc2.stop(now + 0.2);
    }

    playShield() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        
        gain.gain.setValueAtTime(0.3 * this.masterVolume, now);
        gain.gain.linearRampToValueAtTime(0.35 * this.masterVolume, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        osc.start(now);
        osc.stop(now + 0.4);
    }

    playDoubleDamage() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc1.type = 'square';
        osc2.type = 'sawtooth';
        
        osc1.frequency.setValueAtTime(200, now);
        osc1.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        osc1.frequency.setValueAtTime(200, now + 0.1);
        osc1.frequency.exponentialRampToValueAtTime(400, now + 0.18);
        
        osc2.frequency.setValueAtTime(300, now);
        osc2.frequency.exponentialRampToValueAtTime(600, now + 0.08);
        osc2.frequency.setValueAtTime(300, now + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(600, now + 0.18);
        
        gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc1.start(now);
        osc1.stop(now + 0.25);
        osc2.start(now);
        osc2.stop(now + 0.25);
    }

    playFastShoot() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        
        gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        osc.start(now);
        osc.stop(now + 0.12);
    }

    playBounceBullet() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        for (let i = 0; i < 3; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800 + i * 200, now + i * 0.05);
            osc.frequency.exponentialRampToValueAtTime(400 + i * 100, now + i * 0.05 + 0.1);
            
            gain.gain.setValueAtTime(0.15 * this.masterVolume, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.1);
            
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.1);
        }
    }

    playBulletThroughWall() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;
        
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2000, now);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noiseGain.gain.setValueAtTime(0.15 * this.masterVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        noise.start(now);
        noise.stop(now + 0.2);
    }

    playTankThroughWall() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.3);
        
        gain.gain.setValueAtTime(0.3 * this.masterVolume, now);
        gain.gain.linearRampToValueAtTime(0.35 * this.masterVolume, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        
        osc.start(now);
        osc.stop(now + 0.35);
    }

    playScatter() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        for (let i = 0; i < 3; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(300 + i * 100, now);
            osc.frequency.exponentialRampToValueAtTime(150 + i * 50, now + 0.1);
            
            gain.gain.setValueAtTime(0.12 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            
            osc.start(now);
            osc.stop(now + 0.12);
        }
    }

    playEnergyShield() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sine';
        osc2.type = 'triangle';
        
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.setValueAtTime(1200, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        
        osc2.frequency.setValueAtTime(1500, now);
        osc2.frequency.setValueAtTime(1800, now + 0.1);
        osc2.frequency.setValueAtTime(1200, now + 0.2);
        
        gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
        gain.gain.linearRampToValueAtTime(0.3 * this.masterVolume, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        
        osc.start(now);
        osc.stop(now + 0.35);
        osc2.start(now);
        osc2.stop(now + 0.35);
    }

    playInvisibility() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
        
        gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        
        osc.start(now);
        osc.stop(now + 0.6);
    }

    playClone() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        
        osc1.frequency.setValueAtTime(400, now);
        osc1.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        osc1.frequency.exponentialRampToValueAtTime(600, now + 0.2);
        
        osc2.frequency.setValueAtTime(600, now);
        osc2.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(900, now + 0.2);
        
        gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc1.start(now);
        osc1.stop(now + 0.3);
        osc2.start(now);
        osc2.stop(now + 0.3);
    }

    playPause() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.setValueAtTime(400, now + 0.1);
        
        gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playGameOver() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        const notes = [400, 350, 300, 250];
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            
            gain.gain.setValueAtTime(0.3 * this.masterVolume, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
            
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.3);
        });
    }

    playLaser() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sine';
        osc2.type = 'sawtooth';
        
        osc.frequency.setValueAtTime(1500, now);
        osc.frequency.exponentialRampToValueAtTime(2500, now + 0.2);
        
        osc2.frequency.setValueAtTime(300, now);
        osc2.frequency.exponentialRampToValueAtTime(500, now + 0.2);
        
        gain.gain.setValueAtTime(0.3 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.start(now);
        osc.stop(now + 0.25);
        osc2.start(now);
        osc2.stop(now + 0.25);
    }

    playLaserShot() {
        if (!this.initialized) this.init();
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
        
        gain.gain.setValueAtTime(0.15 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.start(now);
        osc.stop(now + 0.08);
    }
}
