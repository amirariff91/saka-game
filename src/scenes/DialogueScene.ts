import Phaser from 'phaser';
import { DialogueEngine, type ChapterData, type DialogueLine } from '../systems/DialogueEngine';
import { TypewriterEffect } from '../systems/TypewriterEffect';
import { SakaSystem } from '../systems/SakaSystem';
import { SoundManager } from '../systems/SoundManager';

export class DialogueScene extends Phaser.Scene {
  private engine!: DialogueEngine;
  private typewriter!: TypewriterEffect;
  private saka!: SakaSystem;
  private soundManager!: SoundManager;
  private typewriterSound?: Phaser.Sound.BaseSound;
  private muteButton!: Phaser.GameObjects.Text;

  // UI elements
  private dialogueBox!: Phaser.GameObjects.Graphics;
  private speakerText!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private continueIndicator!: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Text[] = [];
  private choiceBorders: Phaser.GameObjects.Graphics[] = [];
  private hungerBar!: Phaser.GameObjects.Graphics;
  private hungerLabel!: Phaser.GameObjects.Text;
  private chapterTitle!: Phaser.GameObjects.Text;
  private scanlines!: Phaser.GameObjects.Graphics;

  private waitingForInput = false;
  private isTyping = false;

  constructor() {
    super({ key: 'DialogueScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 44;
    const safeBottom = 24;
    const pad = 16;

    this.engine = new DialogueEngine();
    this.saka = new SakaSystem(this, 0.3);
    this.soundManager = SoundManager.getInstance();

    // Dark atmospheric background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x0a1210, 0x0a1210, 1);
    bg.fillRect(0, 0, w, h);

    // Vignette overlay
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.3);
    vignette.fillRect(0, 0, w, safeTop + 40);

    // Dialogue box — full width with padding, at bottom
    const boxHeight = Math.max(160, h * 0.28);
    const boxY = h - boxHeight - safeBottom;
    const boxX = pad;
    const boxW = w - pad * 2;

    this.dialogueBox = this.add.graphics();
    this.dialogueBox.fillStyle(0x0d1a16, 0.92);
    this.dialogueBox.fillRoundedRect(boxX, boxY, boxW, boxHeight, 8);
    this.dialogueBox.lineStyle(1, 0x2dd4a8, 0.3);
    this.dialogueBox.strokeRoundedRect(boxX, boxY, boxW, boxHeight, 8);
    
    // Add subtle breathing effect to dialogue box border
    this.tweens.add({
      targets: this.dialogueBox,
      alpha: { from: 0.8, to: 1.0 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Speaker name — 14px on mobile
    this.speakerText = this.add.text(boxX + 12, boxY - 20, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#2dd4a8',
      fontStyle: 'bold',
      backgroundColor: '#0d1a16',
      padding: { x: 10, y: 3 },
    });

    // Dialogue text — 16px, comfortable reading
    this.dialogueText = this.add.text(boxX + 16, boxY + 20, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#d4d4c8',
      wordWrap: { width: boxW - 32 },
      lineSpacing: 8,
    });

    this.typewriter = new TypewriterEffect(this, this.dialogueText, 28);

    // Continue indicator — bottom-right of dialogue box
    this.continueIndicator = this.add.text(
      boxX + boxW - 24,
      boxY + boxHeight - 24,
      '▼',
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#2dd4a8',
      }
    ).setAlpha(0);

    // Blinking continue indicator
    this.tweens.add({
      targets: this.continueIndicator,
      alpha: { from: 0.3, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Hunger bar (top-right, safe area)
    const barW = Math.min(100, w * 0.3);
    this.hungerLabel = this.add.text(w - barW - pad, safeTop + 8, 'SAKA', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#2dd4a8',
    });

    this.hungerBar = this.add.graphics();
    this.updateHungerBar();

    // Chapter title display — safe area
    const chTitleSize = Math.max(11, Math.floor(w * 0.033));
    this.chapterTitle = this.add.text(w / 2, safeTop + 12, '', {
      fontFamily: 'Georgia, serif',
      fontSize: `${chTitleSize}px`,
      color: '#3a5a4e',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Mute toggle button (top-left safe area) - hide during typing
    this.muteButton = this.add.text(16, safeTop, '🔊', {
      fontSize: '20px',
    }).setInteractive({ useHandCursor: true });

    this.muteButton.on('pointerdown', () => {
      const isMuted = this.soundManager.toggleMute();
      this.muteButton.setText(isMuted ? '🔇' : '🔊');
      this.soundManager.playSFX('ui-click');
    });

    // Scan-line overlay
    this.scanlines = this.add.graphics();
    this.scanlines.lineStyle(1, 0x000000, 0.15);
    for (let y = 0; y < h; y += 3) {
      this.scanlines.lineBetween(0, y, w, y);
    }
    this.scanlines.setAlpha(0.04);
    this.scanlines.setDepth(1000);

    // Load chapter data
    const chapterKey = (this.scene.settings.data as { chapter?: string })?.chapter ?? 'chapter1';
    const chapterData = this.cache.json.get(chapterKey) as ChapterData;

    if (chapterData) {
      this.engine.loadChapter(chapterData);
      this.chapterTitle.setText(`${this.engine.getChapterTitleMalay()} — ${this.engine.getChapterTitle()}`);
      const firstLine = this.engine.start();
      if (firstLine) {
        this.showLine(firstLine);
      }
    }

    // Input handling — touch anywhere to advance
    this.input.on('pointerdown', () => this.handleInput());
    this.input.keyboard?.on('keydown-SPACE', () => this.handleInput());
    this.input.keyboard?.on('keydown-ENTER', () => this.handleInput());

    // Saka events
    this.events.on('saka:hungry', () => {
      this.cameras.main.shake(200, 0.002);
    });

    this.saka.start();
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private showLine(line: DialogueLine): void {
    // Clear choices
    this.clearChoices();

    // Speaker
    if (line.speaker) {
      this.speakerText.setText(line.speaker);
      this.speakerText.setVisible(true);
    } else {
      this.speakerText.setText('');
      this.speakerText.setVisible(false);
    }

    // Effects
    if (line.effect === 'shake') {
      this.cameras.main.shake(600, 0.015); // Stronger shake
    } else if (line.effect === 'flash') {
      this.cameras.main.flash(300, 255, 255, 255); // Brief camera flash
    } else if (line.effect === 'fadeout') {
      this.cameras.main.fade(500, 0, 0, 0);
    }

    // Typewriter
    this.isTyping = true;
    this.waitingForInput = false;
    this.continueIndicator.setAlpha(0);
    this.muteButton.setAlpha(0.3); // Hide mute button during typing

    // Start typewriter sound
    this.typewriterSound = this.sound.add('typewriter', { volume: 0.05, loop: true });
    if (!this.soundManager.isSoundMuted()) {
      this.typewriterSound.play();
    }

    this.typewriter.start(line.text, () => {
      this.isTyping = false;
      this.muteButton.setAlpha(1); // Show mute button again
      
      // Stop typewriter sound
      if (this.typewriterSound) {
        this.typewriterSound.stop();
        this.typewriterSound.destroy();
        this.typewriterSound = undefined;
      }

      if (line.choices && line.choices.length > 0) {
        this.showChoices(line);
      } else {
        this.waitingForInput = true;
        this.continueIndicator.setAlpha(1);
      }
    });
  }

  private showChoices(line: DialogueLine): void {
    if (!line.choices) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const pad = 16;
    const safeBottom = 20;

    const boxHeight = Math.max(160, h * 0.28);
    const boxY = h - boxHeight - safeBottom;

    const btnHeight = 48;
    const btnGap = 8;
    const totalHeight = line.choices.length * btnHeight + (line.choices.length - 1) * btnGap;
    const startY = boxY - totalHeight - 16;

    line.choices.forEach((choice, index) => {
      const btnY = startY + index * (btnHeight + btnGap);
      const btnW = w - pad * 2;

      // Button background with left teal border
      const btnBg = this.add.graphics();
      btnBg.fillStyle(0x0d1a16, 0.95);
      btnBg.fillRoundedRect(pad, btnY, btnW, btnHeight, 6);
      btnBg.lineStyle(1, 0x2dd4a8, 0.2);
      btnBg.strokeRoundedRect(pad, btnY, btnW, btnHeight, 6);
      this.choiceBorders.push(btnBg);

      const btn = this.add.text(pad + 20, btnY + btnHeight / 2, `◈  ${choice.text}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#6b8f82',
        wordWrap: { width: btnW - 40 },
      }).setOrigin(0, 0.5).setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(-20, -btnHeight / 2, btnW, btnHeight),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      });

      btn.on('pointerover', () => {
        btn.setColor('#2dd4a8');
        // Redraw with teal left border highlight
        btnBg.clear();
        btnBg.fillStyle(0x112a22, 0.95);
        btnBg.fillRoundedRect(pad, btnY, btnW, btnHeight, 6);
        btnBg.fillStyle(0x2dd4a8, 1);
        btnBg.fillRoundedRect(pad, btnY, 3, btnHeight, { tl: 6, bl: 6, tr: 0, br: 0 });
        btnBg.lineStyle(1, 0x2dd4a8, 0.4);
        btnBg.strokeRoundedRect(pad, btnY, btnW, btnHeight, 6);
      });
      btn.on('pointerout', () => {
        btn.setColor('#6b8f82');
        btn.setScale(1.0);
        btnBg.clear();
        btnBg.fillStyle(0x0d1a16, 0.95);
        btnBg.fillRoundedRect(pad, btnY, btnW, btnHeight, 6);
        btnBg.lineStyle(1, 0x2dd4a8, 0.2);
        btnBg.strokeRoundedRect(pad, btnY, btnW, btnHeight, 6);
      });
      btn.on('pointerdown', () => {
        btn.setScale(0.95);
      });
      btn.on('pointerup', () => {
        btn.setScale(1.0);
        this.soundManager.playSFX('ui-click'); // Play UI click on choice selection
        this.selectChoice(index);
      });

      this.choiceButtons.push(btn);
    });
  }

  private selectChoice(index: number): void {
    const nextLine = this.engine.choose(index);
    if (nextLine) {
      this.showLine(nextLine);
    }
  }

  private clearChoices(): void {
    for (const btn of this.choiceButtons) {
      btn.destroy();
    }
    for (const bg of this.choiceBorders) {
      bg.destroy();
    }
    this.choiceButtons = [];
    this.choiceBorders = [];
  }

  private handleInput(): void {
    if (this.isTyping) {
      this.typewriter.skip();
      return;
    }

    if (this.engine.hasChoices()) {
      return; // waiting for choice click
    }

    if (this.waitingForInput) {
      this.waitingForInput = false;
      this.continueIndicator.setAlpha(0);

      if (this.engine.isEnd()) {
        // End of chapter - play subtle whoosh
        this.soundManager.playSFX('bayang-activate', 0.3);
        
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.time.delayedCall(800, () => {
          this.saka.stop();
          // Return to ExploreScene instead of MenuScene
          this.scene.start('ExploreScene');
        });
        return;
      }

      const nextLine = this.engine.advance();
      if (nextLine) {
        this.showLine(nextLine);
      }
    }
  }

  private updateHungerBar(): void {
    const w = this.scale.width;
    const pad = 16;
    const safeTop = 40;
    const barWidth = Math.min(100, w * 0.3);
    const barHeight = 8;
    const x = w - barWidth - pad;
    const y = safeTop + 26;

    this.hungerBar.clear();
    // Background
    this.hungerBar.fillStyle(0x1a1a1a, 1);
    this.hungerBar.fillRoundedRect(x, y, barWidth, barHeight, 2);
    // Fill
    const hunger = this.saka.getHunger();
    const color = hunger > 50 ? 0x2dd4a8 : hunger > 20 ? 0xd4a82d : 0xd42d2d;
    this.hungerBar.fillStyle(color, 1);
    this.hungerBar.fillRoundedRect(x, y, barWidth * (hunger / 100), barHeight, 2);
  }

  update(): void {
    this.updateHungerBar();
  }
}
