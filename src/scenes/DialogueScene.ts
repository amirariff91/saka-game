import Phaser from 'phaser';
import { DialogueEngine, type ChapterData, type DialogueLine } from '../systems/DialogueEngine';
import { TypewriterEffect } from '../systems/TypewriterEffect';
import { SakaSystem } from '../systems/SakaSystem';
import { SoundManager } from '../systems/SoundManager';
import { DaySystem } from '../systems/DaySystem';

export class DialogueScene extends Phaser.Scene {
  private engine!: DialogueEngine;
  private typewriter!: TypewriterEffect;
  private saka!: SakaSystem;
  private soundManager!: SoundManager;
  private daySystem!: DaySystem;
  private typewriterSound?: Phaser.Sound.BaseSound;
  private muteButton!: Phaser.GameObjects.Text;

  // Background system
  private backgroundContainer!: Phaser.GameObjects.Container;
  private currentBackground = '';
  private backgroundElements: Phaser.GameObjects.GameObject[] = [];

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
    this.soundManager.updateScene(this);
    this.daySystem = DaySystem.getInstance();

    // Dark atmospheric background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x0a1210, 0x0a1210, 1);
    bg.fillRect(0, 0, w, h);

    // Background container (60% of screen for atmospheric art)
    this.backgroundContainer = this.add.container(0, 0);
    this.createBackground('ppr-corridor'); // Default background
    
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

    // Update background if specified
    if ((line as any).background) {
      this.createBackground((line as any).background);
    }

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

    // Start typewriter sound (use game's global sound manager for mobile compatibility)
    try {
      if (!this.soundManager.isSoundMuted() && this.soundManager.isUnlocked()) {
        this.typewriterSound = this.sound.add('typewriter', { volume: 0.05, loop: true });
        this.typewriterSound.play();
      }
    } catch (error) {
      console.warn('[DialogueScene] Failed to play typewriter sound:', error);
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
          // Return to LocationMenuScene instead of ExploreScene
          const returnTo = (this.scene.settings.data as { returnTo?: string })?.returnTo ?? 'LocationMenuScene';
          this.scene.start(returnTo);
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

  private createBackground(backgroundId: string): void {
    if (this.currentBackground === backgroundId) return;
    
    // Clear existing background
    this.clearBackground();
    
    const w = this.scale.width;
    const h = this.scale.height;
    const bgHeight = h * 0.6; // Top 60% for background
    
    this.currentBackground = backgroundId;
    
    switch (backgroundId) {
      case 'ppr-corridor':
        this.createPPRCorridorBackground(w, bgHeight);
        break;
      case 'unit-9-4':
        this.createUnit94Background(w, bgHeight);
        break;
      case 'stairwell':
        this.createStairwellBackground(w, bgHeight);
        break;
      case 'rooftop':
        this.createRooftopBackground(w, bgHeight);
        break;
      case 'home':
        this.createHomeBackground(w, bgHeight);
        break;
      default:
        this.createPPRCorridorBackground(w, bgHeight);
        break;
    }
  }

  private clearBackground(): void {
    for (const element of this.backgroundElements) {
      element.destroy();
    }
    this.backgroundElements = [];
    this.backgroundContainer.removeAll();
  }

  private createPPRCorridorBackground(w: number, h: number): void {
    // Dark grey gradient for concrete walls
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2a2a2a, 0x2a2a2a, 0x1a1a1a, 0x1a1a1a, 1);
    bg.fillRect(0, 0, w, h);
    this.backgroundContainer.add(bg);
    this.backgroundElements.push(bg);

    // Vertical lines suggesting doors
    const doorGraphics = this.add.graphics();
    doorGraphics.lineStyle(2, 0x444444, 0.6);
    for (let i = 0; i < 4; i++) {
      const x = (w / 5) * (i + 1);
      doorGraphics.lineBetween(x, h * 0.3, x, h * 0.8);
      // Door frames
      doorGraphics.strokeRect(x - 15, h * 0.3, 30, h * 0.5);
    }
    this.backgroundContainer.add(doorGraphics);
    this.backgroundElements.push(doorGraphics);

    // Flickering light effect
    const light = this.add.graphics();
    light.fillStyle(0xffffaa, 0.3);
    light.fillCircle(w / 2, h * 0.2, 40);
    this.backgroundContainer.add(light);
    this.backgroundElements.push(light);

    // Flicker animation
    this.tweens.add({
      targets: light,
      alpha: { from: 0.1, to: 0.5 },
      duration: Phaser.Math.Between(100, 300),
      yoyo: true,
      repeat: -1,
      ease: 'Power2'
    });

    // Floor
    const floor = this.add.graphics();
    floor.fillStyle(0x333333, 1);
    floor.fillRect(0, h * 0.85, w, h * 0.15);
    this.backgroundContainer.add(floor);
    this.backgroundElements.push(floor);
  }

  private createUnit94Background(w: number, h: number): void {
    // Very dark room
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, w, h);
    this.backgroundContainer.add(bg);
    this.backgroundElements.push(bg);

    // Shelves suggested by horizontal lines
    const shelves = this.add.graphics();
    shelves.lineStyle(1, 0x2a2a2a, 0.8);
    for (let i = 0; i < 5; i++) {
      const y = h * 0.2 + i * (h * 0.12);
      shelves.lineBetween(w * 0.1, y, w * 0.9, y);
    }
    this.backgroundContainer.add(shelves);
    this.backgroundElements.push(shelves);

    // Bottles with faint glow
    const bottleContainer = this.add.container(0, 0);
    for (let i = 0; i < 12; i++) {
      const bottleX = w * 0.15 + (w * 0.7 / 12) * i;
      const bottleY = h * 0.25 + Phaser.Math.Between(-10, 40);
      
      const bottle = this.add.graphics();
      const color = Phaser.Math.RND.pick([0x2dd4a8, 0xd4a82d, 0x8a4d8a]);
      bottle.fillStyle(color, 0.4);
      bottle.fillCircle(bottleX, bottleY, 3);
      
      // Pulse animation
      this.tweens.add({
        targets: bottle,
        alpha: { from: 0.2, to: 0.6 },
        scaleX: { from: 0.8, to: 1.2 },
        scaleY: { from: 0.8, to: 1.2 },
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
      
      bottleContainer.add(bottle);
    }
    this.backgroundContainer.add(bottleContainer);
    this.backgroundElements.push(bottleContainer);
  }

  private createStairwellBackground(w: number, h: number): void {
    // Dark stairwell
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a1a, 0x1a1a1a, 0x0a0a0a, 0x0a0a0a, 1);
    bg.fillRect(0, 0, w, h);
    this.backgroundContainer.add(bg);
    this.backgroundElements.push(bg);

    // Diagonal lines suggesting stairs
    const stairs = this.add.graphics();
    stairs.lineStyle(2, 0x333333, 0.7);
    for (let i = 0; i < 8; i++) {
      const y = h * 0.9 - i * (h * 0.1);
      const x1 = w * 0.1 + i * (w * 0.1);
      const x2 = x1 + w * 0.8;
      stairs.lineBetween(x1, y, x2, y);
      // Vertical risers
      if (i < 7) {
        stairs.lineBetween(x2, y, x2, y - h * 0.1);
      }
    }
    this.backgroundContainer.add(stairs);
    this.backgroundElements.push(stairs);

    // Light from above
    const light = this.add.graphics();
    light.fillGradientStyle(0xffffcc, 0xffffcc, 0x000000, 0x000000, 0.4, 0, 0.8, 0);
    light.fillRect(w * 0.3, 0, w * 0.4, h * 0.5);
    this.backgroundContainer.add(light);
    this.backgroundElements.push(light);
  }

  private createRooftopBackground(w: number, h: number): void {
    // Dark sky gradient
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x001133, 0x001133, 0x000000, 0x000000, 1);
    sky.fillRect(0, 0, w, h * 0.7);
    this.backgroundContainer.add(sky);
    this.backgroundElements.push(sky);

    // City lights below (tiny dots)
    const cityLights = this.add.graphics();
    cityLights.fillStyle(0xffffaa, 0.6);
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = h * 0.7 + Phaser.Math.Between(0, h * 0.3);
      cityLights.fillCircle(x, y, 1);
    }
    this.backgroundContainer.add(cityLights);
    this.backgroundElements.push(cityLights);

    // Water tank silhouette
    const tank = this.add.graphics();
    tank.fillStyle(0x1a1a1a, 1);
    tank.fillRoundedRect(w * 0.7, h * 0.3, w * 0.25, h * 0.25, 5);
    // Tank legs
    tank.fillRect(w * 0.72, h * 0.55, 4, h * 0.15);
    tank.fillRect(w * 0.91, h * 0.55, 4, h * 0.15);
    this.backgroundContainer.add(tank);
    this.backgroundElements.push(tank);

    // Concrete floor
    const floor = this.add.graphics();
    floor.fillStyle(0x2a2a2a, 1);
    floor.fillRect(0, h * 0.85, w, h * 0.15);
    this.backgroundContainer.add(floor);
    this.backgroundElements.push(floor);
  }

  private createHomeBackground(w: number, h: number): void {
    // Warmer background with slight brown tint
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1612, 1);
    bg.fillRect(0, 0, w, h);
    this.backgroundContainer.add(bg);
    this.backgroundElements.push(bg);

    // TV glow (flickering blue rectangle)
    const tv = this.add.graphics();
    tv.fillStyle(0x4488cc, 0.3);
    tv.fillRoundedRect(w * 0.1, h * 0.3, w * 0.3, h * 0.2, 5);
    this.backgroundContainer.add(tv);
    this.backgroundElements.push(tv);

    // TV flicker
    this.tweens.add({
      targets: tv,
      alpha: { from: 0.2, to: 0.5 },
      duration: Phaser.Math.Between(300, 800),
      yoyo: true,
      repeat: -1
    });

    // Window light
    const window = this.add.graphics();
    window.fillStyle(0xffffaa, 0.1);
    window.fillRect(w * 0.7, h * 0.1, w * 0.25, h * 0.4);
    // Window frame
    window.lineStyle(2, 0x444444, 0.6);
    window.strokeRect(w * 0.7, h * 0.1, w * 0.25, h * 0.4);
    // Cross pattern
    window.lineBetween(w * 0.825, h * 0.1, w * 0.825, h * 0.5);
    window.lineBetween(w * 0.7, h * 0.3, w * 0.95, h * 0.3);
    this.backgroundContainer.add(window);
    this.backgroundElements.push(window);

    // Furniture silhouettes
    const furniture = this.add.graphics();
    furniture.fillStyle(0x2a2a2a, 1);
    // Table
    furniture.fillRect(w * 0.4, h * 0.6, w * 0.4, w * 0.05);
    // Chair
    furniture.fillRect(w * 0.45, h * 0.5, w * 0.1, h * 0.15);
    furniture.fillRect(w * 0.45, h * 0.4, w * 0.1, w * 0.05);
    this.backgroundContainer.add(furniture);
    this.backgroundElements.push(furniture);
  }

  update(): void {
    this.updateHungerBar();
  }
}
