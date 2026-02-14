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
  private rightPortrait?: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  private leftPortraitGlow?: Phaser.GameObjects.Graphics;
  private rightPortraitGlow?: Phaser.GameObjects.Graphics;
  private currentSpeakerSide: 'left' | 'right' | 'center' | 'none' = 'none';
  private lastSpeaker = '';

  // Speaker → portrait mapping with expression variants
  private readonly speakerSpriteMap: Record<string, {
    key: string;
    side: 'left' | 'right';
    expressions: Record<string, string>;
  }> = {
    'Syafiq': {
      key: 'portrait-syafiq',
      side: 'left',
      expressions: {
        neutral: 'portrait-syafiq',
        shocked: 'portrait-syafiq-shocked',
        angry: 'portrait-syafiq-angry',
        sad: 'portrait-syafiq-sad',
        smirk: 'portrait-syafiq-smirk',
      },
    },
    'Dian': {
      key: 'portrait-dian',
      side: 'right',
      expressions: {
        neutral: 'portrait-dian',
        worried: 'portrait-dian-worried',
        happy: 'portrait-dian-happy',
        angry: 'portrait-dian-angry',
        frightened: 'portrait-dian-frightened',
      },
    },
    'Zafri': {
      key: 'portrait-zafri',
      side: 'right',
      expressions: {
        neutral: 'portrait-zafri',
        excited: 'portrait-zafri-excited',
        nervous: 'portrait-zafri-nervous',
        serious: 'portrait-zafri-serious',
        frustrated: 'portrait-zafri-frustrated',
      },
    },
    'Mak': {
      key: 'portrait-mak-loving',
      side: 'right',
      expressions: {
        neutral: 'portrait-mak-loving',
        loving: 'portrait-mak-loving',
        worried: 'portrait-mak-worried',
        stern: 'portrait-mak-stern',
      },
    },
    'Ikal': {
      key: 'portrait-ikal-guarded',
      side: 'right',
      expressions: {
        neutral: 'portrait-ikal-guarded',
        guarded: 'portrait-ikal-guarded',
        knowing: 'portrait-ikal-knowing',
        warning: 'portrait-ikal-warning',
      },
    },
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

    // Dark flat background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, w, h);

    // Background container (60% of screen for atmospheric art)
    this.backgroundContainer = this.add.container(0, 0);
    this.backgroundContainer.setDepth(1);
    this.createBackground('ppr-corridor'); // Default background
    
    // Character portrait container (above dialogue box, below vignette)
    this.portraitContainer = this.add.container(0, 0);
    this.portraitContainer.setDepth(5);

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
    }).setDepth(15);

    this.hungerBar = this.add.graphics();
    this.hungerBar.setDepth(15);
    this.updateHungerBar();

    // Chapter title display — safe area
    const chTitleSize = Math.max(11, Math.floor(w * 0.033));
    this.chapterTitle = this.add.text(w / 2, safeTop + 12, '', {
      fontFamily: 'Georgia, serif',
      fontSize: `${chTitleSize}px`,
      color: '#3a5a4e',
      fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(15);

    // Mute toggle button (top-left safe area) - hide during typing
    this.muteButton = this.add.text(16, safeTop, '🔊', {
      fontSize: '20px',
    }).setInteractive({ useHandCursor: true });

    this.muteButton.on('pointerdown', () => {
      const isMuted = this.soundManager.toggleMute();
      this.muteButton.setText(isMuted ? '🔇' : '🔊');
      this.soundManager.playSFX('ui-click');
    });

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

    // Speaker + VN portrait with expression
    if (line.speaker) {
      this.speakerText.setText(line.speaker);
      this.speakerText.setVisible(true);
      const expression = (line as any).expression || 'neutral';
      this.updatePortrait(line.speaker, expression);
    } else {
      this.speakerText.setText('');
      this.speakerText.setVisible(false);
      // Narration — dim both portraits, show background
      this.dimAllPortraits();
      if (!this.leftPortrait && !this.rightPortrait) {
        this.backgroundContainer.setVisible(true);
      }
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
            // Determine if we need to return to a specific chapter after battle
            const chapterKey = (this.scene.settings.data as { chapter?: string })?.chapter ?? 'chapter1';
            let battleData: any = { enemy: battle };
            
            // For tutorial-dian, return to tutorial-capture after battle
            if (chapterKey === 'tutorial-dian') {
              battleData.returnChapter = 'tutorial-capture';
            }
            
            // Transition to battle scene with enemy ID and return chapter
            this.scene.start('BattleScene', battleData);
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

  private updatePortrait(speaker: string, expression: string = 'neutral'): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const boxHeight = Math.max(160, h * 0.28);
    const safeBottom = 24;
    const portraitBottom = h - boxHeight - safeBottom - 10;
    const portraitScale = 4;
    const spriteInfo = this.speakerSpriteMap[speaker];

    if (!spriteInfo) {
      this.dimAllPortraits();
      return;
    }

    const { side, expressions } = spriteInfo;
    // Resolve expression to texture key, fallback to default
    const textureKey = (expressions && expressions[expression]) || spriteInfo.key;
    const hasTexture = this.textures.exists(textureKey);

    // Hide procedural background when portrait is showing
    if (hasTexture) {
      this.backgroundContainer.setVisible(false);
    }

    if (side === 'left') {
      if (!this.leftPortrait && hasTexture) {
        this.createPortrait('left', textureKey, w, portraitBottom, portraitScale);
      } else if (this.leftPortrait && hasTexture) {
        if (this.leftPortrait.texture.key !== textureKey) {
          this.leftPortrait.setTexture(textureKey);
        }
      }
      this.activatePortrait('left');
      this.dimPortrait('right');
    } else {
      if (!this.rightPortrait && hasTexture) {
        this.createPortrait('right', textureKey, w, portraitBottom, portraitScale);
      } else if (this.rightPortrait && hasTexture && this.rightPortrait instanceof Phaser.GameObjects.Image) {
        if (this.rightPortrait.texture.key !== textureKey) {
          this.rightPortrait.setTexture(textureKey);
        }
      }
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
    _scale: number
  ): void {
    // Position: left character at ~35%, right at ~65% (closer to center for impact)
    const x = side === 'left' ? screenW * 0.35 : screenW * 0.65;
    
    // Fill the entire area above dialogue box — portrait IS the visual
    const availableHeight = bottomY;
    const portraitScale = availableHeight / 1024; // Fill full height
    
    // No glow — let the portrait's own atmosphere breathe
    const glow = this.add.graphics(); // Keep ref for dimming system
    this.portraitContainer.add(glow);

    // HD character portrait — fills the screen
    const portrait = this.add.image(x, bottomY, textureKey);
    portrait.setScale(portraitScale);
    portrait.setOrigin(0.5, 1); // Bottom-center anchor
    portrait.setData('baseScale', portraitScale);
    this.portraitContainer.add(portrait);

    // Cinematic fade + slide in
    const slideFrom = side === 'left' ? x - 20 : x + 20;
    portrait.setAlpha(0);
    portrait.setPosition(slideFrom, bottomY);

    this.tweens.add({
      targets: portrait,
      alpha: 1,
      x: x,
      duration: 400,
      ease: 'Power2.easeOut'
    });

    // Subtle idle breathing
    this.tweens.add({
      targets: portrait,
      y: { from: bottomY - 1, to: bottomY + 1 },
      duration: 3000,
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
      const baseScale = portrait.getData('baseScale') || portrait.scaleX;
      this.tweens.add({
        targets: portrait,
        alpha: 1,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: 200,
        ease: 'Power2'
      });
      if (portrait instanceof Phaser.GameObjects.Image) {
        portrait.clearTint();
      }
    }
    if (glow) {
      this.tweens.add({ targets: glow, alpha: 0.12, duration: 200 });
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
      if (portrait instanceof Phaser.GameObjects.Image) {
        portrait.setTint(0x666666);
      }
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

    // Clear right portrait if there is one
    this.clearPortraitSide('right');

    const x = w * 0.75;
    
    // Create shadow silhouette instead of pixel sprite
    const shadowSize = 60;
    
    // Eerie red glow — larger for dramatic effect
    const glow = this.add.graphics();
    glow.fillStyle(0xff4444, 0.3);
    glow.fillCircle(0, 0, shadowSize * 1.2);
    glow.setPosition(x, portraitBottom - shadowSize);
    this.portraitContainer.add(glow);

    // Dark silhouette shape
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.9);
    // Create an ominous humanoid shadow shape
    shadow.fillEllipse(0, -10, 20, 35); // body
    shadow.fillCircle(0, -35, 12); // head
    shadow.fillEllipse(-8, -5, 8, 15); // left arm
    shadow.fillEllipse(8, -5, 8, 15); // right arm
    shadow.fillEllipse(-5, 10, 6, 20); // left leg
    shadow.fillEllipse(5, 10, 6, 20); // right leg
    
    shadow.setPosition(x, portraitBottom - shadowSize);
    this.portraitContainer.add(shadow);

    // Red glowing eyes
    const eyes = this.add.graphics();
    eyes.fillStyle(0xff2222, 1);
    eyes.fillCircle(-4, -35, 2); // left eye
    eyes.fillCircle(4, -35, 2); // right eye
    eyes.setPosition(x, portraitBottom - shadowSize);
    this.portraitContainer.add(eyes);

    // Dramatic entrance — fade in with shake
    shadow.setAlpha(0);
    glow.setAlpha(0);
    eyes.setAlpha(0);

    this.tweens.add({
      targets: [shadow, eyes],
      alpha: 1,
      duration: 800,
      ease: 'Power2.easeOut'
    });
    this.tweens.add({
      targets: glow,
      alpha: 0.3,
      duration: 800,
    });

    // Menacing floating
    this.tweens.add({
      targets: [shadow, eyes],
      y: { from: portraitBottom - shadowSize - 3, to: portraitBottom - shadowSize + 3 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Glow pulses
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.2, to: 0.4 },
      scaleX: { from: 0.9, to: 1.1 },
      scaleY: { from: 0.9, to: 1.1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Eye glow pulse
    this.tweens.add({
      targets: eyes,
      alpha: { from: 0.8, to: 1 },
      scaleX: { from: 0.9, to: 1.2 },
      scaleY: { from: 0.9, to: 1.2 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Dim left portrait (Syafiq reacting)
    this.dimPortrait('left');

    // Screen shake effect for dramatic entrance
    this.cameras.main.shake(400, 0.008);

    this.rightPortrait = shadow;
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

  // Clean dark fills only — portraits provide the atmosphere
  private createPPRCorridorBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, w, h);
    this.backgroundContainer.add(bg);
    this.backgroundElements.push(bg);
  }

  private createUnit94Background(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0808, 1);
    bg.fillRect(0, 0, w, h);
    this.backgroundContainer.add(bg);
    this.backgroundElements.push(bg);
  }

  private createStairwellBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, w, h);
    this.backgroundContainer.add(bg);
    this.backgroundElements.push(bg);
  }

  private createRooftopBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x050a18, 1);
    bg.fillRect(0, 0, w, h);
    this.backgroundContainer.add(bg);
    this.backgroundElements.push(bg);
  }

  private createHomeBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0c0a08, 1);
    bg.fillRect(0, 0, w, h);
    this.backgroundContainer.add(bg);
    this.backgroundElements.push(bg);
  }

  update(): void {
    this.updateHungerBar();
  }
}
