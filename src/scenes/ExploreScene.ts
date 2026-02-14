import Phaser from 'phaser';

export class ExploreScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ExploreScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 40;
    const safeBottom = 20;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x0d1a16, 0x0d1a16, 1);
    bg.fillRect(0, 0, w, h);

    // Title
    const titleSize = Math.max(28, Math.floor(w * 0.1));
    this.add.text(w / 2, h * 0.35, 'EXPLORE', {
      fontFamily: 'Georgia, serif',
      fontSize: `${titleSize}px`,
      color: '#2dd4a8',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    const subSize = Math.max(14, Math.floor(w * 0.04));
    this.add.text(w / 2, h * 0.35 + titleSize * 0.8, 'PPR Top-Down Exploration', {
      fontFamily: 'Georgia, serif',
      fontSize: `${subSize}px`,
      color: '#4a6a5e',
    }).setOrigin(0.5);

    // Coming soon
    const comingSize = Math.max(12, Math.floor(w * 0.035));
    this.add.text(w / 2, h * 0.35 + titleSize * 0.8 + subSize * 2.5, 'Coming Soon', {
      fontFamily: 'Georgia, serif',
      fontSize: `${comingSize}px`,
      color: '#2a3a34',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Back button — touch friendly
    this.createBackButton(w, h, safeBottom);

    // Scan-line overlay
    const scanlines = this.add.graphics();
    scanlines.lineStyle(1, 0x000000, 0.15);
    for (let y = 0; y < h; y += 3) {
      scanlines.lineBetween(0, y, w, y);
    }
    scanlines.setAlpha(0.04);
    scanlines.setDepth(1000);

    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  private createBackButton(w: number, h: number, safeBottom: number): void {
    const btnSize = Math.max(14, Math.floor(w * 0.042));
    const backBtn = this.add.text(w / 2, h * 0.65, '← Kembali', {
      fontFamily: 'Georgia, serif',
      fontSize: `${btnSize}px`,
      color: '#6b8f82',
      padding: { x: 24, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#2dd4a8'));
    backBtn.on('pointerout', () => {
      backBtn.setColor('#6b8f82');
      backBtn.setScale(1.0);
    });
    backBtn.on('pointerdown', () => backBtn.setScale(0.95));
    backBtn.on('pointerup', () => {
      backBtn.setScale(1.0);
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => this.scene.start('MenuScene'));
    });
  }
}
