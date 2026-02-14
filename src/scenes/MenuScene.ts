import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Graphics[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private glowTimer = 0;
  private scanlines!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 40;
    const safeBottom = 20;

    // Background gradient overlay
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x0d1f1a, 0x0d1f1a, 1);
    bg.fillRect(0, 0, w, h);

    // Floating particle effects — spirit dust (20 for mobile perf)
    for (let i = 0; i < 20; i++) {
      const particle = this.add.graphics();
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.4);
      particle.fillStyle(0x2dd4a8, alpha);
      particle.fillCircle(0, 0, size);
      particle.setPosition(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h)
      );
      particle.setData('speed', Phaser.Math.FloatBetween(0.1, 0.5));
      particle.setData('drift', Phaser.Math.FloatBetween(-0.3, 0.3));
      this.particles.push(particle);
    }

    // Center point for vertical layout
    const centerY = h * 0.38;

    // Subtitle — above the title
    const subFontSize = Math.max(12, Math.floor(w * 0.04));
    this.add.text(w / 2, centerY - Math.floor(w * 0.22), 'Yang dilupa masih ada.', {
      fontFamily: 'Georgia, serif',
      fontSize: `${subFontSize}px`,
      color: '#3a6b5a',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // SAKA title with glow — responsive font size
    const titleFontSize = Math.max(40, Math.floor(w * 0.2));
    this.titleText = this.add.text(w / 2, centerY, 'S A K A', {
      fontFamily: 'Georgia, serif',
      fontSize: `${titleFontSize}px`,
      color: '#2dd4a8',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle below title
    const sub2FontSize = Math.max(11, Math.floor(w * 0.035));
    this.add.text(w / 2, centerY + Math.floor(w * 0.15), 'Warisan yang tidak diminta.', {
      fontFamily: 'Georgia, serif',
      fontSize: `${sub2FontSize}px`,
      color: '#4a7a6a',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Buttons area
    const btnFontSize = Math.max(16, Math.floor(w * 0.055));
    const btnY = h * 0.62;
    const btnGap = Math.max(56, Math.floor(h * 0.08));

    // New Game button
    const newGameBtn = this.createButton(
      w / 2, btnY,
      '▶  Mula Baru',
      btnFontSize,
      '#6b8f82',
      () => {
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.time.delayedCall(1000, () => {
          this.scene.start('ExploreScene');
        });
      }
    );

    // Continue button (disabled placeholder)
    const contFontSize = Math.max(14, Math.floor(w * 0.045));
    this.add.text(w / 2, btnY + btnGap, '◆  Sambung', {
      fontFamily: 'Georgia, serif',
      fontSize: `${contFontSize}px`,
      color: '#2a3a34',
      padding: { x: 20, y: 14 },
    }).setOrigin(0.5);

    // Version — bottom safe area
    const verFontSize = Math.max(9, Math.floor(w * 0.028));
    this.add.text(w / 2, h - safeBottom - 10, 'v0.1.0 — Arc 1: The Awakening', {
      fontFamily: 'monospace',
      fontSize: `${verFontSize}px`,
      color: '#1a2a24',
    }).setOrigin(0.5);

    // Scan-line overlay (horror aesthetic)
    this.scanlines = this.add.graphics();
    this.drawScanlines(w, h);
    this.scanlines.setAlpha(0.04);
    this.scanlines.setDepth(1000);

    // Fade in
    this.cameras.main.fadeIn(1500, 0, 0, 0);

    // Handle resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createButton(
    x: number, y: number, label: string,
    fontSize: number, color: string,
    callback: () => void
  ): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, label, {
      fontFamily: 'Georgia, serif',
      fontSize: `${fontSize}px`,
      color,
      padding: { x: 24, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Ensure minimum 48px touch target
    const hitArea = new Phaser.Geom.Rectangle(
      -btn.width / 2 - 10, -Math.max(24, btn.height / 2),
      btn.width + 20, Math.max(48, btn.height)
    );

    btn.on('pointerover', () => {
      btn.setColor('#2dd4a8');
    });
    btn.on('pointerout', () => {
      btn.setColor(color);
      btn.setScale(1.0);
    });
    btn.on('pointerdown', () => {
      btn.setScale(0.95);
      // Touch ripple effect
      this.createRipple(x, y);
    });
    btn.on('pointerup', () => {
      btn.setScale(1.0);
      callback();
    });

    return btn;
  }

  private createRipple(x: number, y: number): void {
    const ripple = this.add.graphics();
    ripple.lineStyle(2, 0x2dd4a8, 0.4);
    ripple.strokeCircle(0, 0, 10);
    ripple.setPosition(x, y);

    this.tweens.add({
      targets: ripple,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => ripple.destroy(),
    });
  }

  private drawScanlines(w: number, h: number): void {
    this.scanlines.clear();
    this.scanlines.lineStyle(1, 0x000000, 0.15);
    for (let y = 0; y < h; y += 3) {
      this.scanlines.lineBetween(0, y, w, y);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    // On resize, restart the scene to re-layout
    this.scale.off('resize', this.handleResize, this);
    this.scene.restart();
  }

  update(_time: number, delta: number): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // Animate particles — floating upward like spirit dust
    for (const p of this.particles) {
      const speed = p.getData('speed') as number;
      const drift = p.getData('drift') as number;
      p.y -= speed * (delta / 16);
      p.x += drift * (delta / 16);
      if (p.y < -10) {
        p.y = h + 10;
        p.x = Phaser.Math.Between(0, w);
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
    }

    // Pulsing glow on title
    this.glowTimer += delta * 0.002;
    const glowAlpha = 0.6 + Math.sin(this.glowTimer) * 0.4;
    this.titleText.setAlpha(glowAlpha);
  }
}
