import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 40;

    // Dark background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, w, h);

    // Loading text
    const fontSize = Math.max(14, Math.floor(w * 0.05));
    const loadingText = this.add.text(w / 2, h / 2 - 50, 'Membuka pintu...', {
      fontFamily: 'Georgia, serif',
      fontSize: `${fontSize}px`,
      color: '#2dd4a8',
    }).setOrigin(0.5);

    // Subtitle
    const subSize = Math.max(10, Math.floor(w * 0.03));
    const subText = this.add.text(w / 2, h / 2 - 20, 'Yang dilupa masih ada.', {
      fontFamily: 'Georgia, serif',
      fontSize: `${subSize}px`,
      color: '#3a5a4e',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Progress bar
    const barWidth = Math.min(280, w - 80);
    const barHeight = 4;
    const barX = w / 2 - barWidth / 2;
    const barY = h / 2 + 10;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1a2a24, 0.8);
    progressBox.fillRoundedRect(barX, barY, barWidth, barHeight, 2);

    const progressBar = this.add.graphics();

    // Percentage text
    const pctText = this.add.text(w / 2, barY + 24, '0%', {
      fontFamily: 'monospace',
      fontSize: `${Math.max(10, Math.floor(w * 0.028))}px`,
      color: '#2dd4a8',
    }).setOrigin(0.5).setAlpha(0.6);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x2dd4a8, 1);
      progressBar.fillRoundedRect(barX, barY, barWidth * value, barHeight, 2);
      pctText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      subText.destroy();
      pctText.destroy();
    });

    // Load chapter data as JSON
    this.load.json('chapter1', 'data/chapters/chapter1.json');
    this.load.json('spirits', 'data/spirits.json');
  }

  create(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
