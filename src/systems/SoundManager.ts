import Phaser from 'phaser';

export class SoundManager {
  private static instance: SoundManager;
  private game: Phaser.Game | null = null;
  private isMuted = false;
  private bgmVolume = 0.15;
  private sfxVolume = 0.7;
  private currentBGM: Phaser.Sound.BaseSound | null = null;
  private audioUnlocked = false;
  private pendingQueue: Array<{ type: 'bgm' | 'sfx'; key: string; volume: number; loop?: boolean }> = [];

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Initialize with the game reference (call once from BootScene).
   * Also call updateScene() from each scene's create() to keep the reference fresh.
   */
  public initialize(scene: Phaser.Scene): void {
    this.game = scene.game;
    this.setupAudioUnlock(scene);
  }

  /**
   * Update the game reference from any active scene.
   * Call this in every scene's create() method.
   */
  public updateScene(scene: Phaser.Scene): void {
    this.game = scene.game;
    // Re-setup unlock listener if audio still locked
    if (!this.audioUnlocked) {
      this.setupAudioUnlock(scene);
    }
  }

  private setupAudioUnlock(scene: Phaser.Scene): void {
    // Phaser's Web Audio context needs user gesture to unlock on mobile
    const soundManager = scene.sound;
    
    if (soundManager && 'context' in soundManager) {
      const webAudio = soundManager as Phaser.Sound.WebAudioSoundManager;
      const ctx = webAudio.context;
      
      if (ctx && ctx.state === 'suspended') {
        console.log('[SoundManager] Audio context suspended, waiting for user gesture...');
        
        const unlockAudio = () => {
          ctx.resume().then(() => {
            console.log('[SoundManager] Audio context resumed!');
            this.audioUnlocked = true;
            this.flushPendingQueue();
            // Remove listeners after unlock
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('touchend', unlockAudio);
            document.removeEventListener('click', unlockAudio);
          }).catch((err: Error) => {
            console.warn('[SoundManager] Failed to resume audio context:', err);
          });
        };

        document.addEventListener('touchstart', unlockAudio, { once: false });
        document.addEventListener('touchend', unlockAudio, { once: false });
        document.addEventListener('click', unlockAudio, { once: false });
      } else {
        this.audioUnlocked = true;
      }
    } else {
      // HTML5 Audio — generally works without unlock
      this.audioUnlocked = true;
    }

    // Also listen for Phaser's built-in unlock event
    if (soundManager && 'once' in soundManager) {
      soundManager.once('unlocked', () => {
        console.log('[SoundManager] Phaser audio unlocked!');
        this.audioUnlocked = true;
        this.flushPendingQueue();
      });
    }
  }

  private flushPendingQueue(): void {
    while (this.pendingQueue.length > 0) {
      const pending = this.pendingQueue.shift()!;
      if (pending.type === 'bgm') {
        this.playBGM(pending.key, pending.loop ?? true);
      } else {
        this.playSFX(pending.key, pending.volume);
      }
    }
  }

  private getSoundManager(): Phaser.Sound.BaseSoundManager | null {
    if (!this.game) return null;
    return this.game.sound;
  }

  public playBGM(key: string, loop = true): void {
    if (this.isMuted) return;
    
    const sm = this.getSoundManager();
    if (!sm) {
      console.warn('[SoundManager] No game reference, cannot play BGM:', key);
      return;
    }

    // Queue if audio not yet unlocked
    if (!this.audioUnlocked) {
      this.pendingQueue.push({ type: 'bgm', key, volume: this.bgmVolume, loop });
      console.log('[SoundManager] Audio locked, queued BGM:', key);
      return;
    }

    // Stop current BGM if playing
    this.stopBGM();

    try {
      this.currentBGM = sm.add(key, {
        loop,
        volume: this.bgmVolume,
      });
      this.currentBGM.play();
    } catch (error) {
      console.warn(`[SoundManager] Failed to play BGM: ${key}`, error);
    }
  }

  public stopBGM(): void {
    if (this.currentBGM) {
      try {
        this.currentBGM.stop();
        this.currentBGM.destroy();
      } catch (error) {
        console.warn('[SoundManager] Error stopping BGM:', error);
      }
      this.currentBGM = null;
    }
  }

  public playSFX(key: string, volume?: number): void {
    if (this.isMuted) return;

    const sm = this.getSoundManager();
    if (!sm) {
      console.warn('[SoundManager] No game reference, cannot play SFX:', key);
      return;
    }

    // Queue if audio not yet unlocked
    if (!this.audioUnlocked) {
      const sfxVolume = volume !== undefined ? volume : this.sfxVolume;
      this.pendingQueue.push({ type: 'sfx', key, volume: sfxVolume });
      return;
    }

    try {
      const sfxVolume = volume !== undefined ? volume : this.sfxVolume;
      const sound = sm.add(key, {
        volume: sfxVolume,
      });
      sound.play();
      
      // Auto-destroy after playing to prevent memory leaks
      sound.once('complete', () => {
        sound.destroy();
      });
      
      // Fallback cleanup for sounds that never fire 'complete' (e.g. very short clips)
      if ('duration' in sound) {
        const duration = (sound as any).duration || 5;
        setTimeout(() => {
          try {
            if (!sound.isPaused && !(sound as any).isPlaying) {
              sound.destroy();
            }
          } catch (_) { /* already destroyed */ }
        }, (duration + 1) * 1000);
      }
    } catch (error) {
      console.warn(`[SoundManager] Failed to play SFX: ${key}`, error);
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopBGM();
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public setBGMVolume(volume: number): void {
    this.bgmVolume = Phaser.Math.Clamp(volume, 0, 1);
    if (this.currentBGM && 'setVolume' in this.currentBGM) {
      (this.currentBGM as any).setVolume(this.bgmVolume);
    }
  }

  public setSFXVolume(volume: number): void {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
  }

  public getBGMVolume(): number {
    return this.bgmVolume;
  }

  public getSFXVolume(): number {
    return this.sfxVolume;
  }

  public isUnlocked(): boolean {
    return this.audioUnlocked;
  }
}