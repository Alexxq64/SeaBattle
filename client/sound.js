// sound.js - управление звуками

class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = false;
    }

load(name, url, volume = 0.5) {
    const audio = new Audio(url);
    audio.volume = volume;
    this.sounds[name] = audio;
}

    play(name) {
        console.log('🔊 play() вызван для:', name);
        if (!this.enabled) return;
        const sound = this.sounds[name];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Audio error:', e));
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        return this.enabled;
    }
}

export const sound = new SoundManager();