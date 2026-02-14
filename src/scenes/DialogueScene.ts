import Phaser from 'phaser';
import { DialogueEngine, type ChapterData, type DialogueLine } from '../systems/DialogueEngine';
import { TypewriterEffect } from '../systems/TypewriterEffect';
import { SakaSystem } from '../systems/SakaSystem';
import { SoundManager } from '../systems/SoundManager';
import { DaySystem } from '../systems/DaySystem';
import { QuestSystem } from '../systems/QuestSystem';

export class DialogueScene extends Phaser.Scene {
  private engine!: DialogueEngine;
  private typewriter!: TypewriterEffect;
  private saka!: SakaSystem;
  private soundManager!: SoundManager;
  private daySystem!: DaySystem;
  private questSystem!: QuestSystem;
  private typewriterSound?: Phaser.Sound.BaseSound;
  private muteButton!: Phaser.GameObjects.Text;

  // Background system
  private backgroundContainer!: Phaser.GameObjects.Container;
  private currentBackground = '';
  private backgroundElements: Phaser.GameObjects.GameObject[] = [];

  // Character portrait system (VN style)
  private portraitContainer!: Phaser.GameObjects.Container;
  private leftPortrait?: Phaser.GameObjects.Image;
  private rightPortrait?: Phaser.GameObjects.Image;
  private leftPortraitGlow?: Phaser.GameObjects.Graphics;
  private rightPortraitGlow?: Phaser.GameObjects.Graphics;
  private currentSpeakerSide: 'left' | 'right' | 'center' | 'none' = 'none';
  private lastSpeaker = '';

  // Speaker → sprite key mapping
  private readonly speakerSpriteMap: Record<string, { key: string; side: 'left' | 'right' }> = {
    'Syafiq': { key: 'syafiq-south', side: 'left' },
    'Dian': { key: 'dian-south', side: 'right' },
    'Zafri': { key: 'zafri-south', side: 'right' },
    'Mak': { key: 'mak-south', side: 'right' }, // No texture — handled gracefully
  };

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
    this.questSystem = QuestSystem.getInstance();
    this.questSystem.initialize(this);
    this.soundManager.updateScene(this);
    this.daySystem = DaySystem.getInstance();

    // Dark atmospheric background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x0a1210, 0x0a1210, 1);
    bg.fillRect(0, 0, w, h);

    // Background container (60% of screen for atmospheric art)
    this.backgroundContainer = this.add.container(0, 0);
    this.createBackground('ppr-corridor'); // Default background
    
    // Character portrait container (above dialogue box, below vignette)
    this.portraitContainer = this.add.container(0, 0);
    this.portraitContainer.setDepth(5);

    // Vignette overlay
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.3);
    vignette.fillRect(0, 0, w, safeTop + 40);
    vignette.setDepth(6);

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
    this.dialogueBox.setDepth(10);
    
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
    }).setDepth(11);

    // Dialogue text — 16px, comfortable reading
    this.dialogueText = this.add.text(boxX + 16, boxY + 20, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#d4d4c8',
      wordWrap: { width: boxW - 32 },
      lineSpacing: 8,
    }).setDepth(11);

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
    ).setAlpha(0).setDepth(11);

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

    // Speaker + VN portrait
    if (line.speaker) {
      this.speakerText.setText(line.speaker);
      this.speakerText.setVisible(true);
      this.updatePortrait(line.speaker);
    } else {
      this.speakerText.setText('');
      this.speakerText.setVisible(false);
      // Narration — dim both portraits
      this.dimAllPortraits();
    }

    // Show spirit sprite if line has enemy/spirit reference
    if ((line as any).enemy) {
      this.showSpiritPortrait((line as any).enemy);
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
      btnBg.setDepth(12);
      this.choiceBorders.push(btnBg);

      const btn = this.add.text(pad + 20, btnY + btnHeight / 2, `◈  ${choice.text}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#6b8f82',
        wordWrap: { width: btnW - 40 },
      }).setOrigin(0, 0.5).setDepth(12).setInteractive({
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
        // Check if this chapter ends with a battle
        const currentLine = this.engine.getCurrentLine();
        const battle = currentLine?.battle;
        
        this.soundManager.playSFX('bayang-activate', 0.3);
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.time.delayedCall(800, () => {
          this.saka.stop();
          if (battle) {
            // Transition to battle scene with enemy ID
            this.scene.start('BattleScene', { enemy: battle });
          } else {
            this.handleChapterCompletion();
          }
        });
        return;
      }

      const nextLine = this.engine.advance();
      if (nextLine) {
        this.showLine(nextLine);
      }
    }
  }

  // ===== VN PORTRAIT SYSTEM =====

  private updatePortrait(speaker: string): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const boxHeight = Math.max(160, h * 0.28);
    const safeBottom = 24;
    const portraitBottom = h - boxHeight - safeBottom - 10; // Just above dialogue box
    const portraitScale = 4; // Pixel art scaled up big
    const spriteInfo = this.speakerSpriteMap[speaker];

    if (!spriteInfo) {
      // Unknown speaker — show silhouette or nothing
      this.dimAllPortraits();
      return;
    }

    const { key, side } = spriteInfo;
    const hasTexture = this.textures.exists(key);

    if (side === 'left') {
      // Show/update left portrait
      if (!this.leftPortrait && hasTexture) {
        this.createPortrait('left', key, w, portraitBottom, portraitScale);
      } else if (this.leftPortrait && hasTexture) {
        // Already showing — just ensure it's bright
        if (this.leftPortrait.texture.key !== key) {
          this.leftPortrait.setTexture(key);
        }
      }
      // Activate left, dim right
      this.activatePortrait('left');
      this.dimPortrait('right');
    } else {
      // Show/update right portrait
      if (!this.rightPortrait && hasTexture) {
        this.createPortrait('right', key, w, portraitBottom, portraitScale);
      } else if (this.rightPortrait && hasTexture) {
        if (this.rightPortrait.texture.key !== key) {
          this.rightPortrait.setTexture(key);
        }
      }
      // Activate right, dim left
      this.activatePortrait('right');
      this.dimPortrait('left');
    }

    this.lastSpeaker = speaker;
  }

  private createPortrait(
    side: 'left' | 'right',
    textureKey: string,
    screenW: number,
    bottomY: number,
    scale: number
  ): void {
    const x = side === 'left' ? screenW * 0.22 : screenW * 0.78;

    // Glow behind sprite
    const glow = this.add.graphics();
    glow.fillStyle(0x2dd4a8, 0.15);
    glow.fillCircle(0, 0, 50);
    glow.setPosition(x, bottomY - 60);
    this.portraitContainer.add(glow);

    // Character sprite
    const portrait = this.add.image(x, bottomY, textureKey);
    portrait.setScale(scale);
    portrait.setOrigin(0.5, 1); // Bottom-center anchor so feet touch dialogue box area
    this.portraitContainer.add(portrait);

    // Fade in
    portrait.setAlpha(0);
    glow.setAlpha(0);
    this.tweens.add({
      targets: [portrait, glow],
      alpha: { from: 0, to: 1 },
      duration: 400,
      ease: 'Power2.easeOut'
    });

    // Subtle idle float
    this.tweens.add({
      targets: portrait,
      y: { from: bottomY - 2, to: bottomY + 2 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    if (side === 'left') {
      this.leftPortrait = portrait;
      this.leftPortraitGlow = glow;
    } else {
      this.rightPortrait = portrait;
      this.rightPortraitGlow = glow;
    }
  }

  private activatePortrait(side: 'left' | 'right'): void {
    const portrait = side === 'left' ? this.leftPortrait : this.rightPortrait;
    const glow = side === 'left' ? this.leftPortraitGlow : this.rightPortraitGlow;
    if (portrait) {
      this.tweens.add({
        targets: portrait,
        alpha: 1,
        scaleX: (portrait.getData('baseScale') || 4),
        scaleY: (portrait.getData('baseScale') || 4),
        duration: 200,
        ease: 'Power2'
      });
      portrait.clearTint();
    }
    if (glow) {
      this.tweens.add({ targets: glow, alpha: 0.15, duration: 200 });
    }
  }

  private dimPortrait(side: 'left' | 'right'): void {
    const portrait = side === 'left' ? this.leftPortrait : this.rightPortrait;
    const glow = side === 'left' ? this.leftPortraitGlow : this.rightPortraitGlow;
    if (portrait) {
      this.tweens.add({
        targets: portrait,
        alpha: 0.4,
        duration: 200,
        ease: 'Power2'
      });
      portrait.setTint(0x666666);
    }
    if (glow) {
      this.tweens.add({ targets: glow, alpha: 0.05, duration: 200 });
    }
  }

  private dimAllPortraits(): void {
    this.dimPortrait('left');
    this.dimPortrait('right');
  }

  private showSpiritPortrait(spiritId: string): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const boxHeight = Math.max(160, h * 0.28);
    const safeBottom = 24;
    const portraitBottom = h - boxHeight - safeBottom - 10;

    // Spirit sprite key (use south-facing)
    const spriteKey = `spirit-${spiritId}-south`;
    if (!this.textures.exists(spriteKey)) return;

    // Clear right portrait if there is one (spirits show on right/center)
    this.clearPortraitSide('right');

    const x = w * 0.65;
    
    // Eerie red glow
    const glow = this.add.graphics();
    glow.fillStyle(0xff4444, 0.2);
    glow.fillCircle(0, 0, 60);
    glow.setPosition(x, portraitBottom - 60);
    this.portraitContainer.add(glow);

    const sprite = this.add.image(x, portraitBottom, spriteKey);
    sprite.setScale(4);
    sprite.setOrigin(0.5, 1);
    this.portraitContainer.add(sprite);

    // Dramatic entrance
    sprite.setAlpha(0);
    sprite.setScale(3);
    glow.setAlpha(0);

    this.tweens.add({
      targets: sprite,
      alpha: 1,
      scaleX: 4,
      scaleY: 4,
      duration: 600,
      ease: 'Back.easeOut'
    });
    this.tweens.add({
      targets: glow,
      alpha: 0.2,
      duration: 600,
    });

    // Floating/breathing
    this.tweens.add({
      targets: sprite,
      y: { from: portraitBottom - 4, to: portraitBottom + 4 },
      scaleX: { from: 3.9, to: 4.1 },
      scaleY: { from: 3.9, to: 4.1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Dim left portrait (Syafiq reacting)
    this.dimPortrait('left');

    this.rightPortrait = sprite;
    this.rightPortraitGlow = glow;
  }

  private clearPortraitSide(side: 'left' | 'right'): void {
    if (side === 'left') {
      if (this.leftPortrait) { this.leftPortrait.destroy(); this.leftPortrait = undefined; }
      if (this.leftPortraitGlow) { this.leftPortraitGlow.destroy(); this.leftPortraitGlow = undefined; }
    } else {
      if (this.rightPortrait) { this.rightPortrait.destroy(); this.rightPortrait = undefined; }
      if (this.rightPortraitGlow) { this.rightPortraitGlow.destroy(); this.rightPortraitGlow = undefined; }
    }
  }

  private clearAllPortraits(): void {
    this.clearPortraitSide('left');
    this.clearPortraitSide('right');
  }

  // ===== END PORTRAIT SYSTEM =====

  private handleChapterCompletion(): void {
    const chapterKey = (this.scene.settings.data as { chapter?: string })?.chapter ?? 'chapter1';
    const returnTo = (this.scene.settings.data as { returnTo?: string })?.returnTo ?? 'LocationMenuScene';

    // Mark chapter as completed event
    this.daySystem.completeEvent(`${chapterKey}-complete`);
    this.daySystem.setCurrentChapter(chapterKey);

    // Update quest progress based on chapter
    switch (chapterKey) {
      case 'chapter1':
        // Chapter 1 done → go to tutorial-wake
        this.questSystem.completeQuest('discover-unit94');
        break;
      case 'tutorial-wake':
        // Tutorial wake done → go to tutorial-dian
        this.daySystem.unlockLocation('tangga');
        break;
      case 'tutorial-dian':
        // Tutorial dian done → battle triggers via 'battle' property, handled separately
        this.questSystem.completeQuest('meet-dian');
        this.daySystem.increaseBond('dian', 10);
        break;
      case 'tutorial-capture':
        // Tutorial complete → go to hub
        this.daySystem.completeTutorial();
        this.questSystem.completeQuest('first-hunt');
        break;
      default:
        // Regular chapter — update quest context
        this.questSystem.updateQuestProgress({
          event: `${chapterKey}-complete`,
          capturedSpiritsCount: this.daySystem.getGameState().capturedSpirits.length
        });
        break;
    }

    // Check if tutorial has a next chapter
    const nextChapter = this.daySystem.getNextChapter();
    if (nextChapter) {
      this.scene.start('DialogueScene', {
        chapter: nextChapter,
        returnTo: 'LocationMenuScene'
      });
    } else {
      this.scene.start(returnTo);
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
    // Dark room — but visible enough to see on mobile
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1210, 0x1a1210, 0x0d0a08, 0x0d0a08, 1);
    bg.fillRect(0, 0, w, h);
    this.backgroundContainer.add(bg);
    this.backgroundElements.push(bg);

    // Wooden shelves — more visible
    const shelves = this.add.graphics();
    shelves.lineStyle(2, 0x4a3a2a, 0.9);
    for (let i = 0; i < 5; i++) {
      const y = h * 0.2 + i * (h * 0.12);
      shelves.lineBetween(w * 0.08, y, w * 0.92, y);
      // Shelf supports
      shelves.lineStyle(1, 0x3a2a1a, 0.6);
      shelves.lineBetween(w * 0.08, y, w * 0.08, y + h * 0.12);
      shelves.lineBetween(w * 0.92, y, w * 0.92, y + h * 0.12);
      shelves.lineStyle(2, 0x4a3a2a, 0.9);
    }
    this.backgroundContainer.add(shelves);
    this.backgroundElements.push(shelves);

    // Bottles with distinct glow — larger, brighter
    const bottleContainer = this.add.container(0, 0);
    for (let i = 0; i < 15; i++) {
      const bottleX = w * 0.12 + (w * 0.76 / 15) * i;
      const bottleY = h * 0.22 + (Math.floor(i / 3) * (h * 0.12)) + Phaser.Math.Between(-5, 5);
      
      const bottle = this.add.graphics();
      const color = Phaser.Math.RND.pick([0x2dd4a8, 0xd4a82d, 0x8a4d8a, 0xff6644]);
      // Bottle body
      bottle.fillStyle(color, 0.6);
      bottle.fillRect(bottleX - 3, bottleY - 6, 6, 10);
      bottle.fillRect(bottleX - 2, bottleY - 9, 4, 4);
      // Glow
      bottle.fillStyle(color, 0.15);
      bottle.fillCircle(bottleX, bottleY, 10);
      
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
