import Phaser from 'phaser';
import { SakaSystem } from '../systems/SakaSystem';
import { SoundManager } from '../systems/SoundManager';

export class ExploreScene extends Phaser.Scene {
  // Player
  private player!: Phaser.GameObjects.Sprite;
  private playerDirection = 'south';
  private isMoving = false;
  private playerSpeed = 80;

  // Systems
  private saka!: SakaSystem;
  private soundManager!: SoundManager;

  // Virtual joystick
  private joystickBase!: Phaser.GameObjects.Graphics;
  private joystickKnob!: Phaser.GameObjects.Graphics;
  private joystickActive = false;
  private joystickStartPos = { x: 0, y: 0 };

  // Movement
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  // World
  private worldWidth = 800;
  private worldHeight = 400;
  private walls!: Phaser.GameObjects.Graphics;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;

  // NPCs and interactions
  private dian!: Phaser.GameObjects.Sprite;
  private interactionPoints: Array<{ sprite: Phaser.GameObjects.Graphics; chapter: string; x: number; y: number }> = [];
  private currentInteraction: Phaser.GameObjects.Text | null = null;

  // UI
  private hungerBar!: Phaser.GameObjects.Graphics;
  private hungerLabel!: Phaser.GameObjects.Text;
  private floorText!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Text;
  private muteButton!: Phaser.GameObjects.Text;
  private bottleButton!: Phaser.GameObjects.Text;
  private lightFlicker!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'ExploreScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 44;
    const safeBottom = 24;

    // Initialize systems
    this.saka = new SakaSystem(this, 0.2); // Slower hunger rate in exploration
    this.soundManager = SoundManager.getInstance();

    // Start ambient BGM
    this.soundManager.playBGM('ambient-eerie');

    // Set world bounds for camera
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Create corridor background
    this.createCorridor();

    // Add flickering light overlay
    this.createFlickeringLight(w, h);

    // Create player
    this.createPlayer();

    // Create NPCs
    this.createNPCs();

    // Create interaction points
    this.createInteractionPoints();

    // Set up camera to follow player
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setDeadzone(60, 100);

    // Set up input
    this.setupInput();

    // Create virtual joystick
    this.createVirtualJoystick();

    // Create UI overlay (fixed to camera)
    this.createUI();

    // Start saka system
    this.saka.start();

    // Fade in
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private createCorridor(): void {
    // Create a simple PPR corridor using graphics
    // Floor (dark grey concrete)
    const floor = this.add.graphics();
    floor.fillStyle(0x2a2a2a, 1);
    floor.fillRect(0, 0, this.worldWidth, this.worldHeight);
    
    // Add some texture with darker lines
    floor.lineStyle(1, 0x1a1a1a, 0.3);
    for (let x = 0; x < this.worldWidth; x += 32) {
      floor.lineBetween(x, 0, x, this.worldHeight);
    }
    for (let y = 0; y < this.worldHeight; y += 32) {
      floor.lineBetween(0, y, this.worldWidth, y);
    }

    // Walls (darker concrete)
    this.walls = this.add.graphics();
    this.walls.fillStyle(0x1a1a1a, 1);
    
    // Top and bottom walls
    this.walls.fillRect(0, 0, this.worldWidth, 40);
    this.walls.fillRect(0, this.worldHeight - 40, this.worldWidth, 40);
    
    // Some pillars/obstacles
    this.walls.fillRect(200, 60, 30, 80);
    this.walls.fillRect(500, this.worldHeight - 140, 30, 80);
    this.walls.fillRect(350, this.worldHeight / 2 - 15, 100, 30);

    // Create collision group for walls
    const wallGroup = this.physics.add.staticGroup();
    
    const wallDefs = [
      { x: this.worldWidth / 2, y: 20, w: this.worldWidth, h: 40 },
      { x: this.worldWidth / 2, y: this.worldHeight - 20, w: this.worldWidth, h: 40 },
      { x: 215, y: 100, w: 30, h: 80 },
      { x: 515, y: this.worldHeight - 100, w: 30, h: 80 },
      { x: 400, y: this.worldHeight / 2, w: 100, h: 30 },
    ];

    wallDefs.forEach(def => {
      const wall = this.add.zone(def.x, def.y, def.w, def.h);
      wallGroup.add(wall);
    });

    // Store for collision setup in createPlayer
    this.wallGroup = wallGroup;
  }

  private createPlayer(): void {
    // Create player sprite — use texture if available, fallback to simple graphic
    const hasTexture = this.textures.exists('syafiq-south');
    
    if (hasTexture) {
      this.player = this.add.sprite(100, this.worldHeight / 2, 'syafiq-south');
    } else {
      // Fallback: create a colored rectangle as placeholder
      const placeholder = this.add.graphics();
      placeholder.fillStyle(0x2dd4a8, 1);
      placeholder.fillRect(-8, -12, 16, 24);
      placeholder.generateTexture('player-placeholder', 16, 24);
      placeholder.destroy();
      this.player = this.add.sprite(100, this.worldHeight / 2, 'player-placeholder');
    }
    this.player.setScale(1);
    
    // Add physics body
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(16, 16);

    // Add collision with walls
    if (this.wallGroup) {
      this.physics.add.collider(this.player, this.wallGroup);
    }
  }

  private createNPCs(): void {
    // Dian standing near the middle of the corridor
    const hasDianTexture = this.textures.exists('dian-south');
    if (!hasDianTexture) {
      const ph = this.add.graphics();
      ph.fillStyle(0xd4a82d, 1);
      ph.fillRect(-8, -12, 16, 24);
      ph.generateTexture('dian-south', 16, 24);
      ph.destroy();
    }
    this.dian = this.add.sprite(300, 200, 'dian-south');
    this.dian.setScale(1);

    // Add speech bubble icon above Dian
    const bubble = this.add.graphics();
    bubble.fillStyle(0x2dd4a8, 0.8);
    bubble.fillCircle(300, 200 - 30, 8);
    bubble.fillStyle(0xffffff, 1);
    bubble.fillRect(297, 200 - 33, 6, 2);
    bubble.fillRect(299, 200 - 31, 2, 2);

    // Make bubble pulse
    this.tweens.add({
      targets: bubble,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    // Add subtle particle trail from Dian (spiritual energy)
    this.createDianParticleTrail();
  }

  private createInteractionPoints(): void {
    // Create glowing interaction points throughout the corridor
    const points = [
      { x: 150, y: 120, chapter: 'chapter2' },
      { x: 400, y: 300, chapter: 'chapter3' },
      { x: 600, y: 150, chapter: 'chapter1' },
      { x: 700, y: 250, chapter: 'chapter1' },
    ];

    for (const point of points) {
      const glow = this.add.graphics();
      glow.fillStyle(0x2dd4a8, 0.6);
      glow.fillCircle(0, 0, 12);
      
      // Add faint glow effect
      glow.lineStyle(2, 0x4af7c7, 0.3);
      glow.strokeCircle(0, 0, 16);
      
      glow.setPosition(point.x, point.y);

      // Enhanced pulsing animation with scale and glow
      this.tweens.add({
        targets: glow,
        scaleX: 1.3,
        scaleY: 1.3,
        alpha: 0.8,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.interactionPoints.push({
        sprite: glow,
        chapter: point.chapter,
        x: point.x,
        y: point.y,
      });
    }
  }

  private createVirtualJoystick(): void {
    const joystickRadius = 40;
    const knobRadius = 18;
    const margin = 20;

    // Position in bottom-left corner
    const joystickX = margin + joystickRadius;
    const joystickY = this.scale.height - margin - joystickRadius;

    // Joystick base (semi-transparent with teal border)
    this.joystickBase = this.add.graphics();
    this.joystickBase.fillStyle(0x0a0a0a, 0.4);
    this.joystickBase.fillCircle(0, 0, joystickRadius);
    this.joystickBase.lineStyle(3, 0x2dd4a8, 0.8);
    this.joystickBase.strokeCircle(0, 0, joystickRadius);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setPosition(joystickX, joystickY);

    // Joystick knob (solid teal)
    this.joystickKnob = this.add.graphics();
    this.joystickKnob.fillStyle(0x2dd4a8, 1);
    this.joystickKnob.fillCircle(0, 0, knobRadius);
    this.joystickKnob.lineStyle(1, 0x4af7c7, 0.6);
    this.joystickKnob.strokeCircle(0, 0, knobRadius);
    this.joystickKnob.setScrollFactor(0);
    this.joystickKnob.setPosition(joystickX, joystickY);

    // Make joystick interactive
    const hitArea = new Phaser.Geom.Circle(0, 0, joystickRadius + 20);
    this.joystickBase.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

    this.joystickBase.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.joystickActive = true;
      this.joystickStartPos = { x: joystickX, y: joystickY };
    });

    this.input.on('pointerup', () => {
      if (this.joystickActive) {
        this.joystickActive = false;
        this.joystickKnob.setPosition(this.joystickStartPos.x, this.joystickStartPos.y);
        this.isMoving = false;
        this.stopPlayerAnimation();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickActive) {
        const distance = Phaser.Math.Distance.Between(
          pointer.x, pointer.y,
          this.joystickStartPos.x, this.joystickStartPos.y
        );

        if (distance < joystickRadius) {
          this.joystickKnob.setPosition(pointer.x, pointer.y);
        } else {
          const angle = Phaser.Math.Angle.Between(
            this.joystickStartPos.x, this.joystickStartPos.y,
            pointer.x, pointer.y
          );
          this.joystickKnob.setPosition(
            this.joystickStartPos.x + Math.cos(angle) * joystickRadius,
            this.joystickStartPos.y + Math.sin(angle) * joystickRadius
          );
        }

        // Calculate movement direction
        const deltaX = this.joystickKnob.x - this.joystickStartPos.x;
        const deltaY = this.joystickKnob.y - this.joystickStartPos.y;
        const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (magnitude > 10) {
          this.isMoving = true;
          this.updatePlayerDirection(deltaX, deltaY);
        } else {
          this.isMoving = false;
          this.stopPlayerAnimation();
        }
      }
    });
  }

  private setupInput(): void {
    // Keyboard input for desktop
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,S,A,D') as any;
  }

  private createUI(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 44;
    const safeBottom = 24;
    const pad = 16;

    // Mute toggle button (top-left safe area)
    this.muteButton = this.add.text(16, safeTop, '🔊', {
      fontSize: '24px',
    }).setScrollFactor(0).setInteractive({ useHandCursor: true });

    this.muteButton.on('pointerdown', () => {
      const isMuted = this.soundManager.toggleMute();
      this.muteButton.setText(isMuted ? '🔇' : '🔊');
      this.soundManager.playSFX('ui-click');
    });

    // Floor text with glow (top-left, below mute)
    this.floorText = this.add.text(pad, safeTop + 32, 'Tingkat 9', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#2dd4a8',
      fontStyle: 'bold',
      stroke: '#4af7c7',
      strokeThickness: 1,
    });
    this.floorText.setScrollFactor(0);

    // Pause button (top-left, below floor text)
    this.pauseBtn = this.add.text(pad, safeTop + 56, '⏸ Pause', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#6b8f82',
      padding: { x: 8, y: 4 },
    });
    this.pauseBtn.setScrollFactor(0);
    this.pauseBtn.setInteractive({ useHandCursor: true });

    this.pauseBtn.on('pointerover', () => this.pauseBtn.setColor('#2dd4a8'));
    this.pauseBtn.on('pointerout', () => this.pauseBtn.setColor('#6b8f82'));
    this.pauseBtn.on('pointerdown', () => {
      this.soundManager.playSFX('ui-click');
      this.showPauseMenu();
    });

    // Hunger bar (top-right)
    this.hungerLabel = this.add.text(w - 120 - pad, safeTop + 8, 'SAKA', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#2dd4a8',
    });
    this.hungerLabel.setScrollFactor(0);

    this.hungerBar = this.add.graphics();
    this.hungerBar.setScrollFactor(0);
    this.updateHungerBar();

    // Bottle icon button (bottom-right)
    this.bottleButton = this.add.text(w - 60, h - safeBottom - 60, '🏺', {
      fontSize: '32px',
      backgroundColor: '#0a1a16',
      padding: { x: 12, y: 8 },
    });
    this.bottleButton.setScrollFactor(0);
    this.bottleButton.setInteractive({ useHandCursor: true });
    
    this.bottleButton.on('pointerover', () => {
      this.bottleButton.setScale(1.1);
    });
    this.bottleButton.on('pointerout', () => {
      this.bottleButton.setScale(1.0);
    });
    this.bottleButton.on('pointerdown', () => {
      this.soundManager.playSFX('ui-click');
      this.soundManager.stopBGM();
      this.scene.start('InventoryScene');
    });
  }

  private showPauseMenu(): void {
    // Simple pause overlay
    const w = this.scale.width;
    const h = this.scale.height;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, w, h);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    const resumeBtn = this.add.text(w / 2, h / 2 - 40, 'Sambung', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#2dd4a8',
      padding: { x: 20, y: 10 },
    });
    resumeBtn.setOrigin(0.5);
    resumeBtn.setScrollFactor(0);
    resumeBtn.setDepth(1001);
    resumeBtn.setInteractive({ useHandCursor: true });

    const menuBtn = this.add.text(w / 2, h / 2 + 20, 'Menu Utama', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#6b8f82',
      padding: { x: 20, y: 10 },
    });
    menuBtn.setOrigin(0.5);
    menuBtn.setScrollFactor(0);
    menuBtn.setDepth(1001);
    menuBtn.setInteractive({ useHandCursor: true });

    resumeBtn.on('pointerdown', () => {
      overlay.destroy();
      resumeBtn.destroy();
      menuBtn.destroy();
    });

    menuBtn.on('pointerdown', () => {
      this.soundManager.playSFX('ui-click');
      this.soundManager.stopBGM();
      this.saka.stop();
      this.scene.start('MenuScene');
    });
  }

  private updatePlayerDirection(deltaX: number, deltaY: number): void {
    // Determine 8-directional movement
    const angle = Math.atan2(deltaY, deltaX);
    const deg = Phaser.Math.RadToDeg(angle);
    
    let direction = 'south';
    if (deg >= -22.5 && deg < 22.5) direction = 'east';
    else if (deg >= 22.5 && deg < 67.5) direction = 'south-east';
    else if (deg >= 67.5 && deg < 112.5) direction = 'south';
    else if (deg >= 112.5 && deg < 157.5) direction = 'south-west';
    else if (deg >= 157.5 || deg < -157.5) direction = 'west';
    else if (deg >= -157.5 && deg < -112.5) direction = 'north-west';
    else if (deg >= -112.5 && deg < -67.5) direction = 'north';
    else if (deg >= -67.5 && deg < -22.5) direction = 'north-east';

    if (direction !== this.playerDirection) {
      this.playerDirection = direction;
      this.updatePlayerSprite();
    }
  }

  private updatePlayerSprite(): void {
    // Check if we have walking animation for this direction
    const walkDirs = ['south', 'south-west', 'west'];
    
    if (this.isMoving && walkDirs.includes(this.playerDirection)) {
      // Play walking animation
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== `syafiq-walk-${this.playerDirection}`) {
        this.player.play(`syafiq-walk-${this.playerDirection}`);
      }
    } else {
      // Use static rotation sprite
      this.player.setTexture(`syafiq-${this.playerDirection}`);
      this.player.stop();
    }
  }

  private stopPlayerAnimation(): void {
    this.player.stop();
    this.player.setTexture(`syafiq-${this.playerDirection}`);
  }

  private updateHungerBar(): void {
    const w = this.scale.width;
    const pad = 16;
    const safeTop = 40;
    const barWidth = 100;
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

  private checkInteractions(): void {
    // Check if player is near any interaction points
    for (const point of this.interactionPoints) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        point.x, point.y
      );

      if (distance < 40) {
        if (!this.currentInteraction) {
          this.showInteractionPrompt(point);
        }
        return;
      }
    }

    // Remove interaction prompt if no interactions nearby
    if (this.currentInteraction) {
      this.currentInteraction.destroy();
      this.currentInteraction = null;
    }
  }

  private showInteractionPrompt(point: { sprite: Phaser.GameObjects.Graphics; chapter: string; x: number; y: number }): void {
    this.currentInteraction = this.add.text(point.x, point.y - 30, 'Ketuk ▶', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#2dd4a8',
      backgroundColor: '#0a0a0a',
      padding: { x: 6, y: 3 },
    });
    this.currentInteraction.setOrigin(0.5);

    this.currentInteraction.setInteractive({ useHandCursor: true });
    this.currentInteraction.on('pointerdown', () => {
      this.soundManager.playSFX('ui-click');
      this.soundManager.stopBGM();
      this.saka.stop();
      this.scene.start('DialogueScene', { chapter: point.chapter });
    });
  }

  update(): void {
    // Handle keyboard movement
    if (this.cursors || this.wasd) {
      let moveX = 0;
      let moveY = 0;

      if (this.cursors?.left.isDown || this.wasd?.A.isDown) moveX = -1;
      if (this.cursors?.right.isDown || this.wasd?.D.isDown) moveX = 1;
      if (this.cursors?.up.isDown || this.wasd?.W.isDown) moveY = -1;
      if (this.cursors?.down.isDown || this.wasd?.S.isDown) moveY = 1;

      if (moveX !== 0 || moveY !== 0) {
        this.isMoving = true;
        this.updatePlayerDirection(moveX, moveY);
      } else if (!this.joystickActive) {
        this.isMoving = false;
        this.stopPlayerAnimation();
      }

      // Apply movement
      if (this.isMoving && (moveX !== 0 || moveY !== 0)) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const normalizedX = moveX / Math.sqrt(moveX * moveX + moveY * moveY);
        const normalizedY = moveY / Math.sqrt(moveX * moveX + moveY * moveY);
        body.setVelocity(normalizedX * this.playerSpeed, normalizedY * this.playerSpeed);
      }
    }

    // Handle virtual joystick movement
    if (this.joystickActive && this.isMoving) {
      const deltaX = this.joystickKnob.x - this.joystickStartPos.x;
      const deltaY = this.joystickKnob.y - this.joystickStartPos.y;
      const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (magnitude > 10) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const normalizedX = deltaX / magnitude;
        const normalizedY = deltaY / magnitude;
        body.setVelocity(normalizedX * this.playerSpeed, normalizedY * this.playerSpeed);
      }
    } else if (!this.isMoving) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
    }

    // Update sprite animation
    this.updatePlayerSprite();

    // Check for interactions
    this.checkInteractions();

    // Update UI
    this.updateHungerBar();
  }

  private createFlickeringLight(w: number, h: number): void {
    // Create flickering light overlay
    this.lightFlicker = this.add.graphics();
    this.lightFlicker.setDepth(100);
    
    // Random flicker every few seconds
    this.time.addEvent({
      delay: Phaser.Math.Between(3000, 6000),
      callback: () => {
        this.lightFlicker.clear();
        this.lightFlicker.fillStyle(0x000000, Phaser.Math.FloatBetween(0.1, 0.3));
        this.lightFlicker.fillRect(0, 0, this.worldWidth, this.worldHeight);
        
        this.tweens.add({
          targets: this.lightFlicker,
          alpha: 0,
          duration: Phaser.Math.Between(100, 400),
          onComplete: () => {
            this.lightFlicker.clear();
          }
        });
      },
      loop: true,
    });
  }

  private createDianParticleTrail(): void {
    // Create subtle particle trail from Dian
    this.time.addEvent({
      delay: 500,
      callback: () => {
        const particle = this.add.graphics();
        particle.fillStyle(0xd4a82d, 0.6);
        particle.fillCircle(0, 0, 2);
        particle.setPosition(
          this.dian.x + Phaser.Math.Between(-10, 10),
          this.dian.y + Phaser.Math.Between(-15, 5)
        );

        this.tweens.add({
          targets: particle,
          y: particle.y - 30,
          alpha: 0,
          duration: 2000,
          ease: 'Power2',
          onComplete: () => particle.destroy(),
        });
      },
      loop: true,
    });
  }
}
