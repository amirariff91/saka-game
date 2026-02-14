import Phaser from 'phaser';
import { DaySystem } from '../systems/DaySystem';
import { SoundManager } from '../systems/SoundManager';
import { QuestSystem } from '../systems/QuestSystem';
import { SakaWhisper } from '../systems/SakaWhisper';

interface LocationInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  hasEvent?: boolean;
}

export class LocationMenuScene extends Phaser.Scene {
  private daySystem!: DaySystem;
  private soundManager!: SoundManager;
  private questSystem!: QuestSystem;
  private sakaWhisper!: SakaWhisper;
  private locations: LocationInfo[] = [];
  
  // UI elements
  private backgroundGraphics!: Phaser.GameObjects.Graphics;
  private timeDisplay!: Phaser.GameObjects.Text;
  private hungerBar!: Phaser.GameObjects.Graphics;
  private hungerLabel!: Phaser.GameObjects.Text;
  private locationCards: Phaser.GameObjects.Container[] = [];
  private restButton!: Phaser.GameObjects.Text;
  private muteButton!: Phaser.GameObjects.Text;
  private questBar!: Phaser.GameObjects.Text;
  private questBarBg!: Phaser.GameObjects.Graphics;
  private particles: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'LocationMenuScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 44;
    const safeBottom = 24;

    // Initialize systems
    this.daySystem = DaySystem.getInstance();
    this.daySystem.initialize(this);
    this.questSystem = QuestSystem.getInstance();
    this.questSystem.initialize(this);
    this.soundManager = SoundManager.getInstance();
    this.soundManager.updateScene(this);
    this.sakaWhisper = new SakaWhisper(this);

    // Start ambient BGM
    this.soundManager.setBGMVolume(0.15);
    this.soundManager.playBGM('ambient-eerie');

    // Create atmospheric background
    this.createBackground(w, h);
    
    // Create floating particles for atmosphere
    this.createParticles(w, h);

    // Top bar: time display and hunger
    this.createTopBar(w, safeTop);

    // Location cards in the center
    this.createLocationCards(w, h, safeTop, safeBottom);

    // Quest bar above rest button
    this.createQuestBar(w, h, safeBottom);

    // Rest button at bottom
    this.createRestButton(w, h, safeBottom);

    // Mute button (top-left)
    this.createMuteButton(safeTop);

    // Update locations
    this.updateLocations();

    // Start saka whisper system
    this.sakaWhisper.start();

    // Handle resize
    this.scale.on('resize', this.handleResize, this);

    // Fade in
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  private createBackground(w: number, h: number): void {
    // Dark background
    this.backgroundGraphics = this.add.graphics();
    this.backgroundGraphics.fillStyle(0x0a0a0a, 1);
    this.backgroundGraphics.fillRect(0, 0, w, h);

    // Subtle PPR blueprint/floor plan overlay
    this.backgroundGraphics.lineStyle(1, 0x2dd4a8, 0.05);
    
    // Draw simple floor plan lines
    const margin = 40;
    const cellW = (w - margin * 2) / 4;
    const cellH = (h - 200) / 6;
    
    // Horizontal lines (floors)
    for (let i = 0; i <= 6; i++) {
      const y = 120 + i * cellH;
      this.backgroundGraphics.lineBetween(margin, y, w - margin, y);
    }
    
    // Vertical lines (units)
    for (let i = 0; i <= 4; i++) {
      const x = margin + i * cellW;
      this.backgroundGraphics.lineBetween(x, 120, x, 120 + cellH * 6);
    }

    // Add some architectural details
    // Central stairwell
    const stairX = w / 2 - 15;
    const stairY = 120;
    this.backgroundGraphics.fillStyle(0x2dd4a8, 0.03);
    this.backgroundGraphics.fillRect(stairX, stairY, 30, cellH * 6);
    
    // Unit doors (small rectangles)
    for (let floor = 0; floor < 6; floor++) {
      for (let unit = 0; unit < 4; unit++) {
        if (unit === 1) continue; // Skip stairwell area
        const x = margin + unit * cellW + 10;
        const y = 120 + floor * cellH + cellH / 2;
        this.backgroundGraphics.lineStyle(1, 0x2dd4a8, 0.08);
        this.backgroundGraphics.strokeRect(x, y - 3, 20, 6);
      }
    }

    // Vignette overlay
    const vignette = this.add.graphics();
    const vignetteAlpha = 0.4;
    vignette.fillGradientStyle(
      0x000000, 0x000000, 0x000000, 0x000000, 
      vignetteAlpha, 0, vignetteAlpha, 0
    );
    vignette.fillEllipse(w / 2, h / 2, w * 1.5, h * 1.5);
  }

  private createParticles(w: number, h: number): void {
    // Ambient floating particles (spirit dust)
    for (let i = 0; i < 15; i++) {
      const particle = this.add.graphics();
      const size = Phaser.Math.Between(1, 2);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.3);
      particle.fillStyle(0x2dd4a8, alpha);
      particle.fillCircle(0, 0, size);
      particle.setPosition(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h)
      );
      particle.setData('speed', Phaser.Math.FloatBetween(0.1, 0.3));
      particle.setData('drift', Phaser.Math.FloatBetween(-0.2, 0.2));
      this.particles.push(particle);
    }
  }

  private createTopBar(w: number, safeTop: number): void {
    // Time display (top center)
    this.timeDisplay = this.add.text(w / 2, safeTop + 20, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#2dd4a8',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hunger bar (top right)
    const barW = Math.min(100, w * 0.28);
    this.hungerLabel = this.add.text(w - barW - 16, safeTop + 8, 'SAKA', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#2dd4a8',
    });

    this.hungerBar = this.add.graphics();
    this.updateHungerBar(w, safeTop);
  }

  private createLocationCards(w: number, h: number, safeTop: number, safeBottom: number): void {
    // Clear existing cards
    this.locationCards.forEach(card => card.destroy());
    this.locationCards = [];

    const locations = this.daySystem.getAvailableLocations();
    const cardHeight = 60;
    const cardGap = 8;
    const totalHeight = locations.length * cardHeight + (locations.length - 1) * cardGap;
    const startY = (h - totalHeight) / 2 - 20; // Slightly above center

    locations.forEach((location, index) => {
      const cardY = startY + index * (cardHeight + cardGap);
      const card = this.createLocationCard(location, w, cardY, cardHeight);
      this.locationCards.push(card);
    });
  }

  private createLocationCard(
    location: LocationInfo, 
    w: number, 
    y: number, 
    height: number
  ): Phaser.GameObjects.Container {
    const pad = 16;
    const cardW = w - pad * 2;
    const cardX = pad;

    const container = this.add.container(0, 0);

    // Check if this location is a quest target
    const activeQuest = this.questSystem.getActiveQuest();
    const isQuestTarget = activeQuest && activeQuest.targetLocation === location.id;

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(0x0d1a16, 0.9);
    bg.fillRoundedRect(cardX, y, cardW, height, 8);
    
    // Enhanced border for quest targets
    if (isQuestTarget) {
      bg.lineStyle(2, 0x2dd4a8, 0.8);
      bg.strokeRoundedRect(cardX, y, cardW, height, 8);
      
      // Add quest glow effect
      const glowGraphics = this.add.graphics();
      glowGraphics.lineStyle(4, 0x2dd4a8, 0.3);
      glowGraphics.strokeRoundedRect(cardX - 2, y - 2, cardW + 4, height + 4, 10);
      container.add(glowGraphics);
      
      // Pulse the glow
      this.tweens.add({
        targets: glowGraphics,
        alpha: { from: 0.3, to: 0.8 },
        scaleX: { from: 0.98, to: 1.02 },
        scaleY: { from: 0.98, to: 1.02 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      bg.lineStyle(1, location.hasEvent ? 0x2dd4a8 : 0x1a2a24, location.hasEvent ? 0.5 : 0.3);
      bg.strokeRoundedRect(cardX, y, cardW, height, 8);
    }
    
    container.add(bg);

    // Event indicator (pulsing teal dot)
    if (location.hasEvent) {
      const dot = this.add.graphics();
      dot.fillStyle(0x2dd4a8, 1);
      dot.fillCircle(cardX + cardW - 20, y + 15, 4);
      container.add(dot);

      // Pulse animation
      this.tweens.add({
        targets: dot,
        alpha: { from: 0.4, to: 1 },
        scaleX: { from: 0.8, to: 1.2 },
        scaleY: { from: 0.8, to: 1.2 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // Location name - enhanced color for quest targets
    let nameColor = '#6b8f82'; // default
    if (isQuestTarget) nameColor = '#4af7c7'; // bright quest color
    else if (location.hasEvent) nameColor = '#2dd4a8'; // event color
    
    const nameText = this.add.text(cardX + 16, y + 15, location.name, {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: nameColor,
      fontStyle: 'bold'
    });
    container.add(nameText);

    // Description
    const descText = this.add.text(cardX + 16, y + 35, location.description, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#4a6a5a',
      wordWrap: { width: cardW - 50 }
    });
    container.add(descText);

    // Make interactive
    const hitArea = new Phaser.Geom.Rectangle(cardX, y, cardW, height);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x112a22, 0.95);
      bg.fillRoundedRect(cardX, y, cardW, height, 8);
      bg.lineStyle(2, 0x2dd4a8, 0.6);
      bg.strokeRoundedRect(cardX, y, cardW, height, 8);
      nameText.setColor('#4af7c7');
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x0d1a16, 0.9);
      bg.fillRoundedRect(cardX, y, cardW, height, 8);
      
      if (isQuestTarget) {
        bg.lineStyle(2, 0x2dd4a8, 0.8);
        nameText.setColor('#4af7c7');
      } else {
        bg.lineStyle(1, location.hasEvent ? 0x2dd4a8 : 0x1a2a24, location.hasEvent ? 0.5 : 0.3);
        nameText.setColor(location.hasEvent ? '#2dd4a8' : '#6b8f82');
      }
      bg.strokeRoundedRect(cardX, y, cardW, height, 8);
    });

    container.on('pointerdown', () => {
      this.soundManager.playSFX('ui-click');
      this.selectLocation(location);
    });

    return container;
  }

  private createRestButton(w: number, h: number, safeBottom: number): void {
    const buttonY = h - safeBottom - 60;
    
    this.restButton = this.add.text(w / 2, buttonY, '💤 Rehat', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#6b8f82',
      padding: { x: 24, y: 12 },
      backgroundColor: '#0d1a16',
      align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Ensure minimum 48px touch target
    const restHitArea = new Phaser.Geom.Rectangle(
      -this.restButton.width / 2 - 10, -Math.max(24, this.restButton.height / 2),
      this.restButton.width + 20, Math.max(48, this.restButton.height)
    );
    this.restButton.setInteractive(restHitArea, Phaser.Geom.Rectangle.Contains);

    this.restButton.on('pointerover', () => {
      this.restButton.setColor('#2dd4a8');
      this.restButton.setScale(1.05);
    });

    this.restButton.on('pointerout', () => {
      this.restButton.setColor('#6b8f82');
      this.restButton.setScale(1);
    });

    this.restButton.on('pointerdown', () => {
      this.soundManager.playSFX('ui-click');
      this.rest();
    });
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

  private createQuestBar(w: number, h: number, safeBottom: number): void {
    const questBarHeight = 50;
    const questBarY = h - safeBottom - 120; // Above rest button
    
    // Background
    this.questBarBg = this.add.graphics();
    this.questBarBg.fillStyle(0x0d1a16, 0.9);
    this.questBarBg.fillRoundedRect(8, questBarY, w - 16, questBarHeight, 6);
    this.questBarBg.lineStyle(1, 0x2dd4a8, 0.3);
    this.questBarBg.strokeRoundedRect(8, questBarY, w - 16, questBarHeight, 6);

    // Quest text
    this.questBar = this.add.text(16, questBarY + questBarHeight / 2, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#2dd4a8',
      wordWrap: { width: w - 32 }
    }).setOrigin(0, 0.5);

    this.updateQuestBar();
  }

  private updateQuestBar(): void {
    const activeQuest = this.questSystem.getActiveQuest();
    if (activeQuest) {
      this.questBar.setText(`${activeQuest.title}: ${activeQuest.description}`);
      this.questBarBg.setAlpha(1);
      this.questBar.setAlpha(1);
    } else {
      this.questBar.setText('');
      this.questBarBg.setAlpha(0.3);
      this.questBar.setAlpha(0.3);
    }
  }

  private checkQuestCompletion(locationId: string): void {
    const gameState = this.daySystem.getGameState();
    
    // Update quest progress based on location visits and context
    const context: any = {
      location: locationId,
      capturedSpiritsCount: gameState.capturedSpirits.length
    };

    // Add specific event context based on location
    if (locationId === 'tangga' && !gameState.completedEvents.includes('met-dian')) {
      context.event = 'met-dian';
    }
    if (locationId === 'kedai-runcit' && !gameState.completedEvents.includes('met-zafri')) {
      context.event = 'met-zafri';
    }
    if (locationId === 'unit-9-4' && gameState.completedEvents.includes('first-battle')) {
      context.event = 'unit-94-explored-again';
    }

    // Update quest progress
    const questProgressed = this.questSystem.updateQuestProgress(context);
    if (questProgressed) {
      this.updateLocations(); // Refresh UI to show new quest
    }
  }

  private selectLocation(location: LocationInfo): void {
    // Check quest completion before advancing time
    this.checkQuestCompletion(location.id);

    // Advance time when visiting a location
    this.daySystem.advanceTime();

    // Stop whisper system
    this.sakaWhisper.stop();

    // Fade out with transition
    this.cameras.main.fadeOut(800, 0, 0, 0);
    
    this.time.delayedCall(800, () => {
      // Determine which chapter/event to show based on location and game state
      let chapterKey = this.getChapterForLocation(location.id);
      
      this.scene.start('DialogueScene', { 
        chapter: chapterKey,
        location: location.id,
        returnTo: 'LocationMenuScene'
      });
    });
  }

  private rest(): void {
    // Advance time and restore hunger
    this.daySystem.advanceTime();
    this.daySystem.restoreHunger(30);

    // Update UI to reflect changes
    this.updateTimeDisplay();
    this.updateHungerBar(this.scale.width, 44);
    this.updateLocations();

    // Visual feedback
    const restText = this.add.text(this.scale.width / 2, this.scale.height / 2, '+30 Saka Pulih', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#2dd4a8',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: restText,
      y: restText.y - 50,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      ease: 'Power2',
      onComplete: () => restText.destroy()
    });
  }

  private getChapterForLocation(locationId: string): string {
    const gameState = this.daySystem.getGameState();
    
    // Simple logic for now - would be expanded based on story progression
    switch (locationId) {
      case 'unit-9-4':
        if (!gameState.completedEvents.includes('chapter1-complete')) {
          return 'chapter1';
        }
        return 'unit-9-4-return';
      
      case 'tangga':
        if (!gameState.completedEvents.includes('met-dian')) {
          return 'chapter2';
        }
        // After meeting Dian, first stairwell visit triggers Hantu Raya encounter
        if (!gameState.completedEvents.includes('first-battle')) {
          return 'tangga-encounter';
        }
        return 'tangga-casual';
        
      case 'rumah-syafiq':
        return 'home-visit';
        
      case 'rooftop':
        return 'rooftop-exploration';
        
      case 'kedai-runcit':
        return 'shop-visit';
        
      default:
        return 'chapter1';
    }
  }

  private updateLocations(): void {
    this.createLocationCards(this.scale.width, this.scale.height, 44, 24);
    this.updateQuestBar();
  }

  private updateTimeDisplay(): void {
    this.timeDisplay.setText(this.daySystem.getTimeDisplay());
  }

  private updateHungerBar(w: number, safeTop: number): void {
    const gameState = this.daySystem.getGameState();
    const barW = Math.min(100, w * 0.28);
    const barH = 8;
    const x = w - barW - 16;
    const y = safeTop + 26;

    this.hungerBar.clear();
    
    // Background
    this.hungerBar.fillStyle(0x1a1a1a, 1);
    this.hungerBar.fillRoundedRect(x, y, barW, barH, 2);
    
    // Fill based on hunger level
    const hunger = gameState.sakaHunger;
    const color = hunger > 50 ? 0x2dd4a8 : hunger > 20 ? 0xd4a82d : 0xd42d2d;
    this.hungerBar.fillStyle(color, 1);
    this.hungerBar.fillRoundedRect(x, y, barW * (hunger / 100), barH, 2);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    // On resize, restart the scene to re-layout
    this.scale.off('resize', this.handleResize, this);
    this.scene.restart();
  }

  update(_time: number, delta: number): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // Animate floating particles
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

    // Update time display and hunger bar
    this.updateTimeDisplay();
    this.updateHungerBar(w, 44);

    // Update saka whisper system
    const gameState = this.daySystem.getGameState();
    this.sakaWhisper.update(gameState.sakaHunger);
  }
}