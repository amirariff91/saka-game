import Phaser from 'phaser';

export class SoundManager {
  private static instance: SoundManager;
  private scene: Phaser.Scene | null = null;
  private isMuted = false;
  private bgmVolume = 0.15;
  private sfxVolume = 0.7;
  private currentBGM: Phaser.Sound.BaseSound | null = null;

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public initialize(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  public playBGM(key: string, loop = true): void {
    if (!this.scene || this.isMuted) return;

    // Stop current BGM if playing
    this.stopBGM();

    try {
      this.currentBGM = this.scene.sound.add(key, {
        loop,
        volume: this.bgmVolume,
      });
      this.currentBGM.play();
    } catch (error) {
      console.warn(`Failed to play BGM: ${key}`, error);
    }
  }

  public stopBGM(): void {
    if (this.currentBGM) {
      this.currentBGM.stop();
      this.currentBGM.destroy();
      this.currentBGM = null;
    }
  }

  public playSFX(key: string, volume?: number): void {
    if (!this.scene || this.isMuted) return;

    try {
      const sfxVolume = volume !== undefined ? volume : this.sfxVolume;
      const sound = this.scene.sound.add(key, {
        volume: sfxVolume,
      });
      sound.play();
      
      // Auto-destroy after playing to prevent memory leaks
      sound.once('complete', () => {
        sound.destroy();
      });
    } catch (error) {
      console.warn(`Failed to play SFX: ${key}`, error);
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
}