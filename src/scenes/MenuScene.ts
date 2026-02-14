import Phaser from 'phaser';
import { SoundManager } from '../systems/SoundManager';
import { DaySystem } from '../systems/DaySystem';
import { QuestSystem } from '../systems/QuestSystem';

export class MenuScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Graphics[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private glowTimer = 0;
  private scanlines!: Phaser.GameObjects.Graphics;
  private fogLayer!: Phaser.GameObjects.Graphics;
  private soundManager!: SoundManager;
  private daySystem!: DaySystem;
  private questSystem!: QuestSystem;
  private muteButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 44;
    const safeBottom = 24;

    // Initialize sound manager, day system, and quest system
    this.soundManager = SoundManager.getInstance();
    this.soundManager.updateScene(this);
    this.daySystem = DaySystem.getInstance();
    this.questSystem = QuestSystem.getInstance();

    // Dark flat background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, w, h);

    // Fog layer (kept for reference but minimal)
    this.fogLayer = this.add.graphics();
    this.fogLayer.setAlpha(0);

    // Mute toggle button (top-left safe area)
    this.createMuteButton(safeTop);

    // Delay before showing particles (cinematic feel)
    this.time.delayedCall(800, () => {
      this.createParticles(w, h);
    });

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

    // SAKA title with glow — larger with text shadow
    const titleFontSize = Math.max(50, Math.floor(w * 0.24));
    
    // Text shadow
    const titleShadow = this.add.text(w / 2 + 3, centerY + 3, 'S A K A', {
      fontFamily: 'Georgia, serif',
      fontSize: `${titleFontSize}px`,
      color: '#0a1a16',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.8);

    // Main title with glow effect
    this.titleText = this.add.text(w / 2, centerY, 'S A K A', {
      fontFamily: 'Georgia, serif',
      fontSize: `${titleFontSize}px`,
      color: '#2dd4a8',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Glow effect
    this.titleText.setStyle({
      fontFamily: 'Georgia, serif',
      fontSize: `${titleFontSize}px`,
      color: '#2dd4a8',
      fontStyle: 'bold',
      stroke: '#4af7c7',
      strokeThickness: 1,
    });

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
        this.daySystem.newGame(); // Reset game state
        this.questSystem.newGame(); // Reset quest state
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.time.delayedCall(800, () => {
          this.scene.start('LocationMenuScene');
        });
      }
    );

    // Continue button
    const hasSaveData = this.daySystem.hasSaveData();
    if (hasSaveData) {
      this.createButton(
        w / 2, btnY + btnGap,
        '◆  Sambung',
        Math.max(14, Math.floor(w * 0.045)),
        '#6b8f82',
        () => {
          this.cameras.main.fadeOut(800, 0, 0, 0);
          this.time.delayedCall(800, () => {
            this.scene.start('LocationMenuScene');
          });
        }
      );
    } else {
      // Disabled continue button
      this.add.text(w / 2, btnY + btnGap, '◆  Sambung', {
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(14, Math.floor(w * 0.045))}px`,
        color: '#2a3a34',
        padding: { x: 20, y: 14 },
      }).setOrigin(0.5);
    }

    // Story button (for people who just want to read)
    this.createButton(
      w / 2, btnY + btnGap * 2,
      '📖  Cerita',
      Math.max(14, Math.floor(w * 0.045)),
      '#6b8f82',
      () => {
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.time.delayedCall(800, () => {
          this.scene.start('DialogueScene', { 
            chapter: 'chapter1',
            returnTo: 'MenuScene'
          });
        });
      }
    );

    // Version — bottom safe area
    const verFontSize = Math.max(9, Math.floor(w * 0.028));
    this.add.text(w / 2, h - safeBottom - 10, 'v0.1.0 — Arc 1: The Awakening', {
      fontFamily: 'monospace',
      fontSize: `${verFontSize}px`,
      color: '#1a2a24',
    }).setOrigin(0.5);

    // Scanlines removed — clean look
    this.scanlines = this.add.graphics();
    this.scanlines.setAlpha(0);

    // Fade in with consistent transition
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Handle resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createFogLayer(w: number, h: number): void {
    const fogHeight = h * 0.3;
    
    // Create misty fog effect at bottom
    this.fogLayer.fillGradientStyle(
      0x2dd4a8, 0x2dd4a8, 0x4af7c7, 0x4af7c7, 0, 0.1, 0.05, 0
    );
    this.fogLayer.fillRect(0, h - fogHeight, w, fogHeight);
    
    // Add some wavy texture
    for (let x = 0; x < w; x += 20) {
      const waveY = Math.sin(x * 0.02) * 10;
      this.fogLayer.fillCircle(x, h - fogHeight * 0.3 + waveY, 15);
    }
  }

  private createParticles(w: number, h: number): void {
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
  }

  private createMuteButton(safeTop: number): void {
    this.muteButton = this.add.text(16, safeTop, '🔊', {
      fontSize: '24px',
    }).setInteractive({ useHandCursor: true });

    this.muteButton.on('pointerdown', () => {
      const isMuted = this.soundManager.toggleMute();
      this.muteButton.setText(isMuted ? '🔇' : '🔊');
      this.soundManager.playSFX('ui-click');
    });
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
      // Play UI click sound
      this.soundManager.playSFX('ui-click');
      
      // Button press animation - scale to 0.92 with bounce back
      this.tweens.add({
        targets: btn,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 100,
        yoyo: true,
        ease: 'Power2',
        onComplete: () => {
          this.tweens.add({
            targets: btn,
            scaleX: 1.03,
            scaleY: 1.03,
            duration: 150,
            yoyo: true,
            ease: 'Back.easeOut',
            onComplete: () => {
              btn.setScale(1.0);
            }
          });
        }
      });
      
      // Touch ripple effect
      this.createRipple(x, y);
    });
    btn.on('pointerup', () => {
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
