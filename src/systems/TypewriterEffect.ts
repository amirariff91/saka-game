import Phaser from 'phaser';

export class TypewriterEffect {
  private scene: Phaser.Scene;
  private textObject: Phaser.GameObjects.Text;
  private fullText = '';
  private currentIndex = 0;
  private timer?: Phaser.Time.TimerEvent;
  private onComplete?: () => void;
  private charDelay: number;
  private isSkipped = false;

  constructor(scene: Phaser.Scene, textObject: Phaser.GameObjects.Text, charDelay = 30) {
    this.scene = scene;
    this.textObject = textObject;
    this.charDelay = charDelay;
  }

  start(text: string, onComplete?: () => void): void {
    this.stop();
    this.fullText = text;
    this.currentIndex = 0;
    this.isSkipped = false;
    this.onComplete = onComplete;
    this.textObject.setText('');

    this.timer = this.scene.time.addEvent({
      delay: this.charDelay,
      callback: this.addChar,
      callbackScope: this,
      loop: true,
    });
  }

  private addChar(): void {
    if (this.currentIndex >= this.fullText.length) {
      this.complete();
      return;
    }
    this.currentIndex++;
    this.textObject.setText(this.fullText.substring(0, this.currentIndex));
  }

  skip(): void {
    if (this.isSkipped) return;
    this.isSkipped = true;
    this.currentIndex = this.fullText.length;
    this.textObject.setText(this.fullText);
    this.complete();
  }

  private complete(): void {
    if (this.timer) {
      this.timer.destroy();
      this.timer = undefined;
    }
    if (this.onComplete) {
      this.onComplete();
    }
  }

  stop(): void {
    if (this.timer) {
      this.timer.destroy();
      this.timer = undefined;
    }
  }

  isPlaying(): boolean {
    return this.timer !== undefined && !this.timer.hasDispatched;
  }

  isComplete(): boolean {
    return this.currentIndex >= this.fullText.length;
  }
}
