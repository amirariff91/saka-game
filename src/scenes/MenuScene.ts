import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Graphics[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private glowTimer = 0;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background gradient overlay
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x0d1f1a, 0x0d1f1a, 1);
    bg.fillRect(0, 0, width, height);

    // Floating particle effects — spirit dust
    for (let i = 0; i < 40; i++) {
      const particle = this.add.graphics();
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.4);
      particle.fillStyle(0x2dd4a8, alpha);
      particle.fillCircle(0, 0, size);
      particle.setPosition(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height)
      );
      particle.setData('speed', Phaser.Math.FloatBetween(0.1, 0.5));
      particle.setData('drift', Phaser.Math.FloatBetween(-0.3, 0.3));
      this.particles.push(particle);
    }

    // Subtitle — above the title
    this.add.text(width / 2, height / 2 - 100, 'Yang dilupa masih ada.', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#3a6b5a',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // SAKA title with glow
    this.titleText = this.add.text(width / 2, height / 2 - 30, 'S A K A', {
      fontFamily: 'Georgia, serif',
      fontSize: '96px',
      color: '#2dd4a8',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 2 + 50, 'Warisan yang tidak diminta.', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#4a7a6a',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // New Game button
    const newGameBtn = this.add.text(width / 2, height / 2 + 140, '▶  Mula Baru', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#6b8f82',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    newGameBtn.on('pointerover', () => {
      newGameBtn.setColor('#2dd4a8');
      newGameBtn.setScale(1.05);
    });
    newGameBtn.on('pointerout', () => {
      newGameBtn.setColor('#6b8f82');
      newGameBtn.setScale(1.0);
    });
    newGameBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, () => {
        this.scene.start('DialogueScene', { chapter: 'chapter1' });
      });
    });

    // Continue button (disabled placeholder)
    this.add.text(width / 2, height / 2 + 190, '◆  Sambung', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#2a3a34',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5);

    // Version
    this.add.text(width - 10, height - 10, 'v0.1.0 — Arc 1: The Awakening', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#1a2a24',
    }).setOrigin(1, 1);

    // Fade in
    this.cameras.main.fadeIn(1500, 0, 0, 0);
  }

  update(_time: number, delta: number): void {
    const { width, height } = this.cameras.main;

    // Animate particles — floating upward like spirit dust
    for (const p of this.particles) {
      const speed = p.getData('speed') as number;
      const drift = p.getData('drift') as number;
      p.y -= speed * (delta / 16);
      p.x += drift * (delta / 16);
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Phaser.Math.Between(0, width);
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
    }

    // Pulsing glow on title
    this.glowTimer += delta * 0.002;
    const glowAlpha = 0.6 + Math.sin(this.glowTimer) * 0.4;
    this.titleText.setAlpha(glowAlpha);
  }
}
