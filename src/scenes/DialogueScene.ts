import Phaser from 'phaser';
import { DialogueEngine, type ChapterData, type DialogueLine } from '../systems/DialogueEngine';
import { TypewriterEffect } from '../systems/TypewriterEffect';
import { SakaSystem } from '../systems/SakaSystem';

export class DialogueScene extends Phaser.Scene {
  private engine!: DialogueEngine;
  private typewriter!: TypewriterEffect;
  private saka!: SakaSystem;

  // UI elements
  private dialogueBox!: Phaser.GameObjects.Graphics;
  private speakerText!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private continueIndicator!: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Text[] = [];
  private hungerBar!: Phaser.GameObjects.Graphics;
  private hungerLabel!: Phaser.GameObjects.Text;
  private chapterTitle!: Phaser.GameObjects.Text;

  private waitingForInput = false;
  private isTyping = false;

  constructor() {
    super({ key: 'DialogueScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.engine = new DialogueEngine();
    this.saka = new SakaSystem(this, 0.3);

    // Dark atmospheric background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x0a1210, 0x0a1210, 1);
    bg.fillRect(0, 0, width, height);

    // Vignette overlay
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.3);
    vignette.fillRect(0, 0, width, 80);
    vignette.fillRect(0, height - 220, width, 220);

    // Dialogue box
    this.dialogueBox = this.add.graphics();
    this.dialogueBox.fillStyle(0x0d1a16, 0.92);
    this.dialogueBox.fillRoundedRect(40, height - 200, width - 80, 180, 8);
    this.dialogueBox.lineStyle(1, 0x2dd4a8, 0.3);
    this.dialogueBox.strokeRoundedRect(40, height - 200, width - 80, 180, 8);

    // Speaker name
    this.speakerText = this.add.text(70, height - 225, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#2dd4a8',
      fontStyle: 'bold',
      backgroundColor: '#0d1a16',
      padding: { x: 12, y: 4 },
    });

    // Dialogue text
    this.dialogueText = this.add.text(70, height - 180, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#d4d4c8',
      wordWrap: { width: width - 160 },
      lineSpacing: 6,
    });

    this.typewriter = new TypewriterEffect(this, this.dialogueText, 28);

    // Continue indicator
    this.continueIndicator = this.add.text(width - 80, height - 40, '▼', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#2dd4a8',
    }).setAlpha(0);

    // Blinking continue indicator
    this.tweens.add({
      targets: this.continueIndicator,
      alpha: { from: 0.3, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Hunger bar (top-right)
    this.hungerLabel = this.add.text(width - 200, 15, 'SAKA', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#2dd4a8',
    });

    this.hungerBar = this.add.graphics();
    this.updateHungerBar();

    // Chapter title display
    this.chapterTitle = this.add.text(width / 2, 40, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#3a5a4e',
      fontStyle: 'italic',
    }).setOrigin(0.5);

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

    // Input handling
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
      this.cameras.main.shake(300, 0.005);
    } else if (line.effect === 'flash') {
      this.cameras.main.flash(500, 255, 255, 255);
    } else if (line.effect === 'fadeout') {
      this.cameras.main.fade(500, 0, 0, 0);
    }

    // Typewriter
    this.isTyping = true;
    this.waitingForInput = false;
    this.continueIndicator.setAlpha(0);

    this.typewriter.start(line.text, () => {
      this.isTyping = false;

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
    const { width, height } = this.cameras.main;
    const startY = height - 280 - (line.choices.length * 45);

    line.choices.forEach((choice, index) => {
      const btn = this.add.text(width / 2, startY + index * 50, `◈  ${choice.text}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        color: '#6b8f82',
        backgroundColor: '#0d1a16e8',
        padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => {
        btn.setColor('#2dd4a8');
        btn.setScale(1.03);
      });
      btn.on('pointerout', () => {
        btn.setColor('#6b8f82');
        btn.setScale(1.0);
      });
      btn.on('pointerdown', () => {
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
    this.choiceButtons = [];
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
        // End of chapter
        this.cameras.main.fadeOut(1500, 0, 0, 0);
        this.time.delayedCall(1500, () => {
          this.saka.stop();
          this.scene.start('MenuScene');
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
    const { width } = this.cameras.main;
    const barWidth = 120;
    const barHeight = 6;
    const x = width - 200;
    const y = 32;

    this.hungerBar.clear();
    // Background
    this.hungerBar.fillStyle(0x1a1a1a, 1);
    this.hungerBar.fillRect(x, y, barWidth, barHeight);
    // Fill
    const hunger = this.saka.getHunger();
    const color = hunger > 50 ? 0x2dd4a8 : hunger > 20 ? 0xd4a82d : 0xd42d2d;
    this.hungerBar.fillStyle(color, 1);
    this.hungerBar.fillRect(x, y, barWidth * (hunger / 100), barHeight);
  }

  update(): void {
    this.updateHungerBar();
  }
}
