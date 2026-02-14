import Phaser from 'phaser';

export interface SakaState {
  hunger: number;        // 0-100, ticks down. 0 = blackout
  balance: number;       // 0-100, 50 = balanced. <25 = saka starving, >75 = saka overfed
  spiritsCaptured: number;
  lastFeedTime: number;
}

export class SakaSystem {
  private state: SakaState;
  private scene: Phaser.Scene;
  private tickTimer?: Phaser.Time.TimerEvent;
  private hungerRate: number;

  constructor(scene: Phaser.Scene, hungerRate = 0.5) {
    this.scene = scene;
    this.hungerRate = hungerRate;
    this.state = {
      hunger: 80,
      balance: 50,
      spiritsCaptured: 0,
      lastFeedTime: Date.now(),
    };
  }

  start(): void {
    // Hunger ticks down every 2 seconds
    this.tickTimer = this.scene.time.addEvent({
      delay: 2000,
      callback: this.tick,
      callbackScope: this,
      loop: true,
    });
  }

  stop(): void {
    if (this.tickTimer) {
      this.tickTimer.destroy();
      this.tickTimer = undefined;
    }
  }

  private tick(): void {
    this.state.hunger = Math.max(0, this.state.hunger - this.hungerRate);
    if (this.state.hunger <= 0) {
      this.scene.events.emit('saka:blackout');
    } else if (this.state.hunger <= 20) {
      this.scene.events.emit('saka:hungry');
    }
  }

  feed(amount: number): void {
    this.state.hunger = Math.min(100, this.state.hunger + amount);
    this.state.balance = Math.min(100, this.state.balance + amount * 0.3);
    this.state.lastFeedTime = Date.now();
    this.scene.events.emit('saka:fed', this.state);
  }

  captureSpirit(): void {
    this.state.spiritsCaptured++;
    this.feed(15);
    this.scene.events.emit('saka:capture', this.state);
  }

  getHunger(): number {
    return this.state.hunger;
  }

  getBalance(): number {
    return this.state.balance;
  }

  getState(): Readonly<SakaState> {
    return { ...this.state };
  }

  isStarving(): boolean {
    return this.state.hunger <= 20;
  }

  isOverfed(): boolean {
    return this.state.balance > 75;
  }
}
