import Phaser from 'phaser';
import { SakaSystem } from '../systems/SakaSystem';
import { SoundManager } from '../systems/SoundManager';
import { DaySystem } from '../systems/DaySystem';

interface BattleUnit {
  id: string;
  name: string;
  type: 'player' | 'enemy';
  hp: number;
  maxHp: number;
  power: number;
  defense: number;
  speed: number;
  willpower: number;
  spiritType?: string;
}

interface CapturedSpirit {
  id: string;
  name: string;
  energyLevel: number;
  bayangAbility: string;
}

export class BattleScene extends Phaser.Scene {
  // Battle state
  private player!: BattleUnit;
  private enemy!: BattleUnit;
  private currentTurn: 'player' | 'enemy' = 'player';
  private battlePhase: 'action_select' | 'animating' | 'battle_over' = 'action_select';
  private playerBottles = 3; // Available bottles for capture

  // UI elements
  private enemyNameText!: Phaser.GameObjects.Text;
  private enemySprite!: Phaser.GameObjects.Graphics;
  private enemySpriteImage?: Phaser.GameObjects.Image;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private battleLogText!: Phaser.GameObjects.Text;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private actionButtons: Phaser.GameObjects.Text[] = [];
  private currentSpiritText!: Phaser.GameObjects.Text;

  // Systems
  private saka!: SakaSystem;
  private soundManager!: SoundManager;
  private daySystem!: DaySystem;
  private spiritsData: any;
  private playerSpirits: CapturedSpirit[] = [];
  private muteButton!: Phaser.GameObjects.Text;
  private isDefending = false;
  private channeledSpirit?: CapturedSpirit;
  private battleLog: string[] = [];

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 44;
    const safeBottom = 24;

    this.saka = new SakaSystem(this, 0.1); // Very slow hunger in battle
    this.soundManager = SoundManager.getInstance();
    this.soundManager.updateScene(this);
    this.daySystem = DaySystem.getInstance();
    this.spiritsData = this.cache.json.get('spirits');
    
    // Stop ambient BGM for battle
    this.soundManager.stopBGM();
    
    // Load player's captured spirits (simplified - in real game would come from save data)
    this.initializePlayerSpirits();

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x1a0d0d, 0x1a0d0d, 1);
    bg.fillRect(0, 0, w, h);

    // Enemy display area (top 40%)
    this.createEnemyArea(w, h * 0.4);

    // Battle log area (middle 20%)
    this.createBattleLogArea(w, h * 0.4, h * 0.2);

    // Player area (bottom 40%)
    this.createPlayerArea(w, h * 0.6, h * 0.4, safeBottom);

    // Mute button
    this.createMuteButton(safeTop);

    // Initialize battle
    this.initializeBattle();
    this.updateUI();

    // Start saka system
    this.saka.start();

    // Fade in
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  private createEnemyArea(w: number, h: number): void {
    // Enemy name and type
    this.enemyNameText = this.add.text(w / 2, 20, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#d42d2d',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Enemy sprite (pixel art or fallback orb)
    this.enemySprite = this.add.graphics();

    // Enemy HP bar
    this.enemyHpBar = this.add.graphics();
  }

  private createBattleLogArea(w: number, y: number, h: number): void {
    // Battle log background
    const logBg = this.add.graphics();
    logBg.fillStyle(0x0d1a16, 0.8);
    logBg.fillRoundedRect(16, y + 10, w - 32, h - 20, 6);
    logBg.lineStyle(1, 0x2dd4a8, 0.3);
    logBg.strokeRoundedRect(16, y + 10, w - 32, h - 20, 6);

    // Battle log text (scrolling)
    this.battleLogText = this.add.text(24, y + 20, 'Pertarungan bermula!', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#d4d4c8',
      wordWrap: { width: w - 48 },
      lineSpacing: 4,
    });
  }

  private createPlayerArea(w: number, y: number, h: number, safeBottom: number): void {
    // Player HP and Saka bars
    this.playerHpBar = this.add.graphics();
    
    // HP label
    this.add.text(16, y + 10, 'SYAFIQ', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#2dd4a8',
    });

    // Saka label  
    this.add.text(16, y + 35, 'SAKA', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#2dd4a8',
    });

    // Action buttons in 2x2 grid
    this.createActionButtons(w, y + 70, h - 70 - safeBottom);

    // Currently channeled spirit
    this.currentSpiritText = this.add.text(w / 2, y + h - safeBottom - 30, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#6b8f82',
      fontStyle: 'italic',
    }).setOrigin(0.5);
  }

  private createActionButtons(w: number, y: number, h: number): void {
    const buttonW = (w - 48) / 2;
    const buttonH = Math.max(48, (h - 16) / 2);
    const gap = 8;

    const buttons = [
      { text: '⚔️ Serang', action: 'attack', enabled: true },
      { text: '👤 Bayang', action: 'bayang', enabled: this.playerSpirits.length > 0 },
      { text: '🫙 Tangkap', action: 'capture', enabled: this.playerBottles > 0 },
      { text: '🛡️ Bertahan', action: 'defend', enabled: true }
    ];

    buttons.forEach((buttonData, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const btnX = 16 + col * (buttonW + gap) + buttonW / 2;
      const btnY = y + row * (buttonH + gap) + buttonH / 2;

      const button = this.add.text(btnX, btnY, buttonData.text, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: buttonData.enabled ? '#6b8f82' : '#2a3a34',
        backgroundColor: buttonData.enabled ? '#0d1a16' : '#0a0a0a',
        padding: { x: 16, y: 12 },
        align: 'center'
      }).setOrigin(0.5);

      if (buttonData.enabled) {
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
          button.setColor('#2dd4a8');
          button.setScale(1.05);
        });

        button.on('pointerout', () => {
          button.setColor('#6b8f82');
          button.setScale(1);
        });

        button.on('pointerdown', () => {
          this.soundManager.playSFX('ui-click');
          this.playerAction(buttonData.action);
        });
      }

      this.actionButtons.push(button);
    });
  }

  private createMuteButton(safeTop: number): void {
    this.muteButton = this.add.text(16, safeTop, '🔊', {
      fontSize: '20px',
    }).setInteractive({ useHandCursor: true });

    this.muteButton.on('pointerdown', () => {
      const isMuted = this.soundManager.toggleMute();
      this.muteButton.setText(isMuted ? '🔇' : '🔊');
      this.soundManager.playSFX('ui-click');
    });
  }

  private initializeBattle(): void {
    // Initialize player
    this.player = {
      id: 'syafiq',
      name: 'Syafiq',
      type: 'player',
      hp: 80,
      maxHp: 80,
      power: 15,
      defense: 10,
      speed: 12,
      willpower: 20
    };

    // Get enemy data from scene data or use default
    const enemyId = (this.scene.settings.data as { enemy?: string })?.enemy ?? 'hantu-raya';
    const enemyData = this.spiritsData.spirits.find((s: any) => s.id === enemyId);
    
    if (enemyData) {
      const stats = enemyData.stats || {};
      this.enemy = {
        id: enemyData.id,
        name: enemyData.name,
        type: 'enemy',
        hp: enemyData.hp || 50,
        maxHp: enemyData.hp || 50,
        power: stats.power || 12,
        defense: stats.defense || 8,
        speed: stats.speed || 10,
        willpower: stats.willpower || 15,
        spiritType: enemyData.type
      };
    } else {
      // Default enemy
      this.enemy = {
        id: 'hantu-raya',
        name: 'Hantu Raya',
        type: 'enemy',
        hp: 50,
        maxHp: 50,
        power: 12,
        defense: 8,
        speed: 10,
        willpower: 15,
        spiritType: 'hantu'
      };
    }

    this.battleLog = ['Pertarungan bermula!'];
    this.currentTurn = 'player';
    this.battlePhase = 'action_select';
  }

  private initializePlayerSpirits(): void {
    // Simplified - in real game would load from save data
    const gameState = this.daySystem.getGameState();
    this.playerSpirits = gameState.capturedSpirits.map(spiritId => ({
      id: spiritId,
      name: spiritId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      energyLevel: 80,
      bayangAbility: 'power'
    }));
  }

  private playerAction(action: string): void {
    if (this.battlePhase !== 'action_select' || this.currentTurn !== 'player') return;

    this.battlePhase = 'animating';
    this.hideActionButtons();

    switch (action) {
      case 'attack':
        this.playerAttack();
        break;
      case 'bayang':
        this.playerBayang();
        break;
      case 'capture':
        this.playerCapture();
        break;
      case 'defend':
        this.playerDefend();
        break;
    }
  }

  private playerAttack(): void {
    const damage = Math.max(1, this.player.power - this.enemy.defense + Phaser.Math.Between(-3, 3));
    this.enemy.hp = Math.max(0, this.enemy.hp - damage);
    
    this.addBattleLog(`Syafiq menyerang! -${damage} HP`);
    this.soundManager.playSFX('hit');
    this.cameras.main.shake(200, 0.01);
    
    // Reduce saka hunger slightly
    const gameState = this.daySystem.getGameState();
    this.daySystem.restoreHunger(-5);

    this.time.delayedCall(1000, () => {
      this.checkBattleEnd() || this.enemyTurn();
    });
  }

  private playerBayang(): void {
    if (this.playerSpirits.length === 0) {
      this.battlePhase = 'action_select';
      this.showActionButtons();
      return;
    }

    // Use first available spirit
    const spirit = this.playerSpirits[0];
    const damage = Math.max(1, (this.player.power * 1.5) - this.enemy.defense + Phaser.Math.Between(-2, 5));
    this.enemy.hp = Math.max(0, this.enemy.hp - damage);
    
    this.addBattleLog(`Syafiq menggunakan Bayang ${spirit.name}! -${damage} HP`);
    this.soundManager.playSFX('bayang-activate');
    this.cameras.main.flash(300, 100, 255, 100);
    
    // Drain spirit energy and reduce saka hunger less
    spirit.energyLevel = Math.max(0, spirit.energyLevel - 20);
    this.daySystem.restoreHunger(-3);

    this.time.delayedCall(1000, () => {
      this.checkBattleEnd() || this.enemyTurn();
    });
  }

  private playerCapture(): void {
    if (this.playerBottles <= 0) {
      this.battlePhase = 'action_select';
      this.showActionButtons();
      return;
    }

    const captureRate = this.enemy.hp < (this.enemy.maxHp * 0.25) ? 
      (this.playerBottles === 3 ? 80 : this.playerBottles === 2 ? 60 : 40) : 0;
    
    this.playerBottles--;

    if (this.enemy.hp < (this.enemy.maxHp * 0.25) && Phaser.Math.Between(1, 100) <= captureRate) {
      // Success!
      this.addBattleLog(`Berjaya menangkap ${this.enemy.name}!`);
      this.soundManager.playSFX('capture');
      this.cameras.main.flash(500, 0, 255, 0);
      
      this.daySystem.captureSpirit(this.enemy.id);
      
      this.time.delayedCall(1500, () => {
        this.battleVictory();
      });
    } else {
      // Failed
      this.addBattleLog(`Gagal menangkap ${this.enemy.name}! Botol pecah.`);
      this.soundManager.playSFX('bottle-break');
      this.cameras.main.shake(300, 0.015);
      
      this.time.delayedCall(1000, () => {
        this.checkBattleEnd() || this.enemyTurn();
      });
    }
  }

  private playerDefend(): void {
    this.isDefending = true;
    this.addBattleLog('Syafiq bertahan untuk serangan seterusnya.');
    this.daySystem.restoreHunger(5); // Slight recovery
    
    this.time.delayedCall(800, () => {
      this.enemyTurn();
    });
  }

  private enemyTurn(): void {
    this.currentTurn = 'enemy';
    
    // Simple AI: just attack
    const damage = Math.max(1, this.enemy.power - this.player.defense + Phaser.Math.Between(-2, 2));
    const finalDamage = this.isDefending ? Math.floor(damage / 2) : damage;
    this.player.hp = Math.max(0, this.player.hp - finalDamage);
    
    this.addBattleLog(`${this.enemy.name} menyerang! -${finalDamage} HP`);
    this.soundManager.playSFX('hit');
    this.cameras.main.shake(200, 0.01);
    
    this.isDefending = false;
    
    this.time.delayedCall(1500, () => {
      if (!this.checkBattleEnd()) {
        this.currentTurn = 'player';
        this.battlePhase = 'action_select';
        this.showActionButtons();
      }
    });
  }

  private checkBattleEnd(): boolean {
    if (this.player.hp <= 0) {
      this.battleDefeat();
      return true;
    }
    
    if (this.enemy.hp <= 0) {
      this.battleVictory();
      return true;
    }
    
    return false;
  }

  private battleVictory(): void {
    this.battlePhase = 'battle_over';
    this.hideActionButtons();
    
    const victoryText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'BERJAYA!', {
      fontFamily: 'Georgia, serif',
      fontSize: '32px',
      color: '#2dd4a8',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Glow effect
    this.tweens.add({
      targets: victoryText,
      scaleX: { from: 0.8, to: 1.2 },
      scaleY: { from: 0.8, to: 1.2 },
      duration: 1000,
      yoyo: true,
      ease: 'Power2'
    });

    this.soundManager.playSFX('capture');
    
    this.time.delayedCall(2500, () => {
      this.returnToLocationMenu();
    });
  }

  private battleDefeat(): void {
    this.battlePhase = 'battle_over';
    this.hideActionButtons();
    
    // Screen fade to red
    const overlay = this.add.graphics();
    overlay.fillStyle(0xff0000, 0.3);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);

    const defeatText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Saka menguasai...', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#ff6666',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Advance time as recovery
    this.daySystem.advanceTime();
    
    this.time.delayedCall(3000, () => {
      this.returnToLocationMenu();
    });
  }

  private returnToLocationMenu(): void {
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.time.delayedCall(800, () => {
      this.saka.stop();
      this.scene.start('LocationMenuScene');
    });
  }

  private hideActionButtons(): void {
    this.actionButtons.forEach(button => {
      button.setAlpha(0.3);
      button.removeAllListeners();
    });
  }

  private showActionButtons(): void {
    // Recreate action buttons with updated state
    this.actionButtons.forEach(button => button.destroy());
    this.actionButtons = [];
    this.createActionButtons(this.scale.width, this.scale.height * 0.6 + 70, this.scale.height * 0.4 - 70 - 24);
    this.updateUI();
  }

  private addBattleLog(message: string): void {
    this.battleLog.push(message);
    if (this.battleLog.length > 3) {
      this.battleLog.shift();
    }
    this.battleLogText.setText(this.battleLog.join('\n'));
  }

  private updateUI(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // Enemy name
    this.enemyNameText.setText(`${this.enemy.name} — ${this.enemy.spiritType?.toUpperCase()}`);

    // Try to show pixel art sprite, fallback to glowing orb
    // Spirit IDs use underscores (hantu_raya) but sprite keys use hyphens (hantu-raya)
    const spriteId = this.enemy.id.replace(/_/g, '-');
    const spriteKey = `spirit-${spriteId}-south`;
    if (this.textures.exists(spriteKey) && !this.enemySpriteImage) {
      // Use pixel art sprite — scale up for battle visibility
      this.enemySprite.clear(); // Hide orb fallback
      this.enemySpriteImage = this.add.image(w / 2, h * 0.2, spriteKey);
      this.enemySpriteImage.setScale(3); // 48px × 3 = 144px display size
      this.enemySpriteImage.setOrigin(0.5);
      
      // Add floating/breathing animation
      this.tweens.add({
        targets: this.enemySpriteImage,
        y: { from: h * 0.2 - 4, to: h * 0.2 + 4 },
        scaleX: { from: 2.9, to: 3.1 },
        scaleY: { from: 2.9, to: 3.1 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Add eerie glow behind sprite
      this.enemySprite.fillStyle(this.getEnemyColor(), 0.2);
      this.enemySprite.fillCircle(w / 2, h * 0.2, 50);
    } else if (!this.enemySpriteImage) {
      // Fallback: glowing orb
      this.enemySprite.clear();
      const enemyColor = this.getEnemyColor();
      this.enemySprite.fillStyle(enemyColor, 0.8);
      this.enemySprite.fillCircle(w / 2, h * 0.2, 40);
      
      // Add pulse effect
      this.tweens.add({
        targets: this.enemySprite,
        scaleX: { from: 0.9, to: 1.1 },
        scaleY: { from: 0.9, to: 1.1 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // Enemy HP bar
    this.updateEnemyHpBar(w, h);
    
    // Player HP bar
    this.updatePlayerHpBar(w, h);
    
    // Current spirit
    if (this.channeledSpirit) {
      this.currentSpiritText.setText(`Channeling: ${this.channeledSpirit.name} (${this.channeledSpirit.energyLevel}%)`);
    } else {
      this.currentSpiritText.setText('');
    }
  }

  private getEnemyColor(): number {
    switch (this.enemy.spiritType) {
      case 'hantu': return 0xff6666;
      case 'jembalang': return 0x8b4513;
      case 'toyol': return 0x9966ff;
      case 'penanggal': return 0xff3333;
      default: return 0xff6666;
    }
  }

  private updateEnemyHpBar(w: number, h: number): void {
    const barW = Math.min(200, w - 32);
    const barH = 8;
    const x = w / 2 - barW / 2;
    const y = h * 0.32;

    this.enemyHpBar.clear();
    
    // Background
    this.enemyHpBar.fillStyle(0x1a1a1a, 1);
    this.enemyHpBar.fillRoundedRect(x, y, barW, barH, 2);
    
    // Fill
    const hpPercent = this.enemy.hp / this.enemy.maxHp;
    const color = hpPercent > 0.5 ? 0xff6666 : hpPercent > 0.25 ? 0xffaa66 : 0xffff66;
    this.enemyHpBar.fillStyle(color, 1);
    this.enemyHpBar.fillRoundedRect(x, y, barW * hpPercent, barH, 2);
    
    // HP text
    const hpText = `${this.enemy.hp}/${this.enemy.maxHp}`;
    if (!this.enemyHpBar.getData('hpText')) {
      const text = this.add.text(w / 2, y + 20, hpText, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#d4d4c8',
      }).setOrigin(0.5);
      this.enemyHpBar.setData('hpText', text);
    } else {
      this.enemyHpBar.getData('hpText').setText(hpText);
    }
  }

  private updatePlayerHpBar(w: number, h: number): void {
    const barW = Math.min(120, w * 0.3);
    const barH = 6;
    const x = 70;
    const y = h * 0.6 + 15;

    this.playerHpBar.clear();
    
    // HP bar background
    this.playerHpBar.fillStyle(0x1a1a1a, 1);
    this.playerHpBar.fillRoundedRect(x, y, barW, barH, 2);
    
    // HP bar fill
    const hpPercent = this.player.hp / this.player.maxHp;
    const color = hpPercent > 0.5 ? 0x2dd4a8 : hpPercent > 0.25 ? 0xd4a82d : 0xd42d2d;
    this.playerHpBar.fillStyle(color, 1);
    this.playerHpBar.fillRoundedRect(x, y, barW * hpPercent, barH, 2);
    
    // Saka bar
    const sakaY = y + 20;
    this.playerHpBar.fillStyle(0x1a1a1a, 1);
    this.playerHpBar.fillRoundedRect(x, sakaY, barW, barH, 2);
    
    const gameState = this.daySystem.getGameState();
    const sakaPercent = gameState.sakaHunger / 100;
    const sakaColor = sakaPercent > 0.5 ? 0x2dd4a8 : sakaPercent > 0.2 ? 0xd4a82d : 0xd42d2d;
    this.playerHpBar.fillStyle(sakaColor, 1);
    this.playerHpBar.fillRoundedRect(x, sakaY, barW * sakaPercent, barH, 2);
  }

  update(): void {
    this.updateUI();
  }
}