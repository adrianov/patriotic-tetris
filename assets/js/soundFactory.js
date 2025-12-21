// Sound Factory - Creates synthesized sound effects for the game
export class SoundFactory {
    constructor(contextManager, audioEngine) {
        this.contextManager = contextManager;
        this.audioEngine = audioEngine;
    }

    playSound(soundType, params = {}) {
        if (!this.contextManager.canPlay) return;

        switch (soundType) {
            case 'move':
                this.createMoveSound();
                break;
            case 'rotate':
                this.createRotateSound();
                break;
            case 'drop':
                this.createDropSound();
                break;
            case 'hardDrop':
                this.createHardDropSound();
                break;
            case 'lineClear':
                this.createLineClearSound(params.lines || 1);
                break;
            case 'gameOver':
                this.createGameOverSound();
                break;
            case 'highScore':
                this.createHighScoreSound();
                break;
            case 'backgroundMusic':
                this.createBackgroundMusic();
                break;
        }
    }

    createMoveSound() {
        this.audioEngine.createOscillator(1046.50, { dur: 0.02, vol: 0.4 }); // C6
    }

    createRotateSound() {
        this.audioEngine.createOscillator(1318.51, { dur: 0.018, vol: 0.5 }); // E6
    }

    createDropSound() {
        this.audioEngine.createOscillator(783.99, { dur: 0.04, vol: 0.6 }); // G5
    }

    createHardDropSound() {
        this.audioEngine.createOscillator(523.25, { dur: 0.06, vol: 0.7 }); // C5
    }

    createLineClearSound(lines) {
        const chords = [
            [523.25, 659.25, 783.99], [587.33, 739.99, 880.00],
            [659.25, 830.61, 987.77], [783.99, 987.77, 1174.66]
        ];

        for (let i = 0; i < lines; i++) {
            const chord = chords[i % chords.length];
            setTimeout(() => {
                chord.forEach((freq, idx) => {
                    setTimeout(() => {
                        this.audioEngine.createOscillator(freq, { type: 'triangle', dur: 0.4, vol: 0.7 });
                        this.audioEngine.createOscillator(freq * 0.89, { dur: 0.3, vol: 0.4 });
                    }, idx * 30);
                });
            }, i * 150);
        }
    }

    createGameOverSound() {
        const melody = [
            { freq: 1046.50, dur: 0.3 }, { freq: 880.00, dur: 0.2 }, { freq: 783.99, dur: 0.4 },
            { freq: 622.25, dur: 0.2 }, { freq: 523.25, dur: 0.5 }, { freq: 392.00, dur: 0.3 },
            { freq: 349.23, dur: 0.4 }, { freq: 261.63, dur: 0.8 }
        ];

        let t = 0;
        melody.forEach((n, i) => {
            setTimeout(() => {
                this.audioEngine.createOscillator(n.freq, { type: i % 2 === 0 ? 'triangle' : 'sine', dur: n.dur, vol: 0.7 });
                if (i % 2 === 0) this.audioEngine.createOscillator(n.freq * 0.75, { dur: n.dur * 0.8, vol: 0.4 });
            }, t * 1000);
            t += n.dur * 0.8;
        });
    }

    createHighScoreSound() {
        const notes = [
            { freq: 523.25, dur: 0.12 }, { freq: 659.25, dur: 0.12 }, { freq: 783.99, dur: 0.14 },
            { freq: 1046.50, dur: 0.20 }, { freq: 987.77, dur: 0.14 }, { freq: 1046.50, dur: 0.28 }
        ];

        let t = 0;
        notes.forEach((n, i) => {
            setTimeout(() => {
                this.audioEngine.createOscillator(n.freq, { type: 'triangle', dur: n.dur, vol: 0.7 });
                if (i >= 2) this.audioEngine.createOscillator(n.freq * 2, { dur: Math.max(0.08, n.dur * 0.8), vol: 0.25 });
                if (i >= notes.length - 2) this.audioEngine.createOscillator(n.freq * 0.75, { dur: n.dur * 0.9, vol: 0.25 });
            }, t * 1000);
            t += n.dur * 0.9;
        });
    }

    createBackgroundMusic() {
        const melody = [
            { freq: 261.63, dur: 0.4 }, { freq: 311.13, dur: 0.2 }, { freq: 329.63, dur: 0.3 },
            { freq: 392.00, dur: 0.2 }, { freq: 466.16, dur: 0.3 }, { freq: 523.25, dur: 0.8 },
            { freq: 392.00, dur: 0.3 }, { freq: 349.23, dur: 0.2 }, { freq: 329.63, dur: 0.3 },
            { freq: 261.63, dur: 0.6 }
        ];

        let t = 0.05;
        melody.forEach(n => {
            this.audioEngine.createOscillator(n.freq, { type: 'triangle', start: t, dur: n.dur });
            t += n.dur;
        });
    }
}