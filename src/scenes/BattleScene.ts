import Phaser from 'phaser';
import { SakaSystem } from '../systems/SakaSystem';

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
  gridX: number;
  gridY: number;
  sprite?: Phaser.GameObjects.Sprite;
  spiritType?: string;
}

interface CapturedSpirit {
  id: string;
  name: string;
  energyLevel: number;
  bayangAbility: string;
}

export class BattleScene extends Phaser.Scene {
  private gridCols = 6;
  private gridRows = 4;
  private cellSize = 48;
  private gridStartX = 0;
  private gridStartY = 0;

  // Battle state
  private player!: BattleUnit;
  private enemy!: BattleUnit;
  private currentTurn: 'player' | 'enemy' = 'player';
  private battlePhase: 'action_select' | 'animating' | 'battle_over' = 'action_select';

  // UI elements
  private grid: Phaser.GameObjects.Graphics[] = [];
  private turnIndicator!: Phaser.GameObjects.Text;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private actionButtons: Phaser.GameObjects.Text[] = [];
  private damageText?: Phaser.GameObjects.Text;

  // Systems
  private saka!: SakaSystem;
  private spiritsData: any;
  private playerSpirits: CapturedSpirit[] = [];
  private playerBottles = 3; // Available bottles for capture

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 40;
    const safeBottom = 20;

    this.saka = new SakaSystem(this, 0.1); // Very slow hunger in battle
    this.spiritsData = this.cache.json.get('spirits');
    
    // Load player's captured spirits (simplified - in real game would come from save data)
    this.initializePlayerSpirits();

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x1a0d0d, 0x1a0d0d, 1);
    bg.fillRect(0, 0, w, h);

    // Calculate grid position (centered)
    const gridWidth = this.gridCols * this.cellSize;
    const gridHeight = this.gridRows * this.cellSize;
    this.gridStartX = (w - gridWidth) / 2;
    this.gridStartY = safeTop + 60;

    // Create battle grid
    this.createGrid();

    // Initialize battle units
    this.initializeBattle();

    // Create UI
    this.createUI();

    // Start systems
    this.saka.start();
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private initializePlayerSpirits(): void {
    // Player starts with Hantu Raya captured
    if (this.spiritsData?.spirits) {
      const hantuRaya = this.spiritsData.spirits.find((s: any) => s.id === 'hantu_raya');
      if (hantuRaya) {
        this.playerSpirits.push({
          id: hantuRaya.id,
          name: hantuRaya.name,
          energyLevel: 85,
          bayangAbility: hantuRaya.bayangAbility,
        });
      }
    }
  }

  private createGrid(): void {
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const x = this.gridStartX + col * this.cellSize;
        const y = this.gridStartY + row * this.cellSize;
        
        const cell = this.add.graphics();
        cell.lineStyle(1, 0x333333, 0.5);
        cell.strokeRect(x, y, this.cellSize, this.cellSize);
        
        // Different colors for player side (bottom) vs enemy side (top)
        if (row >= 2) {
          cell.fillStyle(0x0d1a16, 0.3); // Player area - dark green
        } else {
          cell.fillStyle(0x1a0d0d, 0.3); // Enemy area - dark red
        }
        cell.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
        
        this.grid.push(cell);
      }
    }
  }

  private initializeBattle(): void {
    const enemyData = this.getRandomEnemySpirit();
    
    // Player setup (bottom center)
    this.player = {
      id: 'syafiq',
      name: 'Syafiq',
      type: 'player',
      hp: 100,
      maxHp: 100,
      power: 25,
      defense: 20,
      speed: 30,
      willpower: 40,
      gridX: 2, // Center of bottom row
      gridY: 3, // Bottom row
    };

    // Enemy setup (top center)
    this.enemy = {
      id: enemyData.id,
      name: enemyData.name,
      type: 'enemy',
      hp: enemyData.stats.willpower * 2, // Convert willpower to HP
      maxHp: enemyData.stats.willpower * 2,
      power: enemyData.stats.power,
      defense: enemyData.stats.defense,
      speed: enemyData.stats.speed,
      willpower: enemyData.stats.willpower,
      gridX: 3, // Center of top row
      gridY: 0, // Top row
      spiritType: enemyData.type,
    };

    this.createUnitSprites();
  }

  private getRandomEnemySpirit(): any {
    if (!this.spiritsData?.spirits) return null;
    
    // Select a random spirit as enemy (excluding already captured ones)
    const availableSpirits = this.spiritsData.spirits.filter((s: any) => 
      !this.playerSpirits.find(p => p.id === s.id)
    );
    
    return availableSpirits[Math.floor(Math.random() * availableSpirits.length)] || this.spiritsData.spirits[0];
  }

  private createUnitSprites(): void {
    // Player sprite (Syafiq facing enemy)
    const playerX = this.gridStartX + this.player.gridX * this.cellSize + this.cellSize / 2;
    const playerY = this.gridStartY + this.player.gridY * this.cellSize + this.cellSize / 2;
    
    this.player.sprite = this.add.sprite(playerX, playerY, 'syafiq-north');
    this.player.sprite.setScale(1);

    // Enemy sprite (simplified - use colored circle for now)
    const enemyX = this.gridStartX + this.enemy.gridX * this.cellSize + this.cellSize / 2;
    const enemyY = this.gridStartY + this.enemy.gridY * this.cellSize + this.cellSize / 2;
    
    // Create enemy representation
    const enemyGraphics = this.add.graphics();
    const enemyColor = this.getSpiritColor(this.enemy.spiritType || 'hantu');
    enemyGraphics.fillStyle(enemyColor, 0.8);
    enemyGraphics.fillCircle(0, 0, 16);
    enemyGraphics.lineStyle(2, 0xffffff, 0.6);
    enemyGraphics.strokeCircle(0, 0, 16);
    enemyGraphics.setPosition(enemyX, enemyY);
    
    // Add enemy label
    const enemyLabel = this.add.text(enemyX, enemyY + 28, this.enemy.name.split(' ')[0], {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#d42d2d',
    }).setOrigin(0.5);
  }

  private getSpiritColor(type: string): number {
    switch (type) {
      case 'hantu': return 0xd42d2d;
      case 'jembalang': return 0x8b4513;
      case 'djinn': return 0xff6600;
      case 'familiar': return 0x9370db;
      default: return 0x808080;
    }
  }

  private createUI(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 40;
    const safeBottom = 20;

    // Turn indicator
    this.turnIndicator = this.add.text(w / 2, safeTop + 10, 'Giliran Kau', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#2dd4a8',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // HP bars
    this.createHpBars();

    // Action buttons (bottom of screen)
    this.createActionButtons();

    // Bottle count indicator
    this.add.text(20, safeTop + 10, `Bottles: ${this.playerBottles}`, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#d4a82d',
    });
  }

  private createHpBars(): void {
    const barWidth = 120;
    const barHeight = 8;
    const w = this.scale.width;
    const safeTop = 40;

    // Player HP (bottom left)
    this.add.text(20, this.gridStartY + this.gridRows * this.cellSize + 20, 'Syafiq', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#2dd4a8',
    });

    this.playerHpBar = this.add.graphics();
    this.updateHpBar(this.playerHpBar, 20, this.gridStartY + this.gridRows * this.cellSize + 35, 
                    this.player.hp, this.player.maxHp, 0x2dd4a8);

    // Enemy HP (bottom right)
    this.add.text(w - 140, this.gridStartY + this.gridRows * this.cellSize + 20, this.enemy.name, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#d42d2d',
    });

    this.enemyHpBar = this.add.graphics();
    this.updateHpBar(this.enemyHpBar, w - 140, this.gridStartY + this.gridRows * this.cellSize + 35, 
                    this.enemy.hp, this.enemy.maxHp, 0xd42d2d);
  }

  private updateHpBar(bar: Phaser.GameObjects.Graphics, x: number, y: number, 
                      currentHp: number, maxHp: number, color: number): void {
    bar.clear();
    
    // Background
    bar.fillStyle(0x1a1a1a, 1);
    bar.fillRect(x, y, 120, 8);
    
    // Fill
    const fillWidth = (currentHp / maxHp) * 120;
    bar.fillStyle(color, 1);
    bar.fillRect(x, y, fillWidth, 8);
    
    // HP text
    const hpText = `${currentHp}/${maxHp}`;
    const text = this.add.text(x + 60, y + 15, hpText, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#d4d4c8',
    }).setOrigin(0.5);
  }

  private createActionButtons(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeBottom = 20;
    const btnY = h - safeBottom - 100;

    const actions = [
      { text: 'Serang', action: 'attack', color: '#d42d2d' },
      { text: 'Bayang', action: 'bayang', color: '#d4a82d' },
      { text: 'Tangkap', action: 'capture', color: '#2dd4a8' },
    ];

    const btnWidth = (w - 60) / actions.length;
    
    actions.forEach((action, index) => {
      const x = 30 + index * btnWidth + btnWidth / 2;
      
      const btn = this.add.text(x, btnY, action.text, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: action.color,
        padding: { x: 16, y: 12 },
      }).setOrigin(0.5);
      
      // Ensure minimum 48px touch target
      const hitArea = new Phaser.Geom.Rectangle(-30, -24, 60, 48);
      btn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      btn.setData('action', action.action);

      btn.on('pointerover', () => {
        btn.setColor('#ffffff');
        btn.setScale(1.05);
      });
      btn.on('pointerout', () => {
        btn.setColor(action.color);
        btn.setScale(1.0);
      });
      btn.on('pointerdown', () => {
        btn.setScale(0.95);
      });
      btn.on('pointerup', () => {
        btn.setScale(1.05);
        this.handlePlayerAction(action.action);
      });

      this.actionButtons.push(btn);
    });
    
    this.updateActionButtons();
  }

  private updateActionButtons(): void {
    // Disable/enable buttons based on game state
    if (this.currentTurn !== 'player' || this.battlePhase !== 'action_select') {
      this.actionButtons.forEach(btn => {
        btn.setAlpha(0.5);
        btn.disableInteractive();
      });
    } else {
      this.actionButtons.forEach((btn, index) => {
        btn.setAlpha(1);
        btn.setInteractive();
        
        // Disable Bayang if no spirits
        if (btn.getData('action') === 'bayang' && this.playerSpirits.length === 0) {
          btn.setAlpha(0.5);
          btn.disableInteractive();
        }
        
        // Disable Capture if no bottles or enemy HP too high
        if (btn.getData('action') === 'capture') {
          const canCapture = this.playerBottles > 0 && (this.enemy.hp / this.enemy.maxHp) <= 0.2;
          if (!canCapture) {
            btn.setAlpha(0.5);
            btn.disableInteractive();
          }
        }
      });
    }
  }

  private handlePlayerAction(action: string): void {
    if (this.currentTurn !== 'player' || this.battlePhase !== 'action_select') return;

    this.battlePhase = 'animating';
    this.updateActionButtons();

    switch (action) {
      case 'attack':
        this.performAttack(this.player, this.enemy);
        break;
      case 'bayang':
        this.performBayang();
        break;
      case 'capture':
        this.performCapture();
        break;
    }
  }

  private performAttack(attacker: BattleUnit, target: BattleUnit): void {
    // Calculate damage
    const baseDamage = attacker.power;
    const defense = target.defense;
    const damage = Math.max(1, baseDamage - defense + Phaser.Math.Between(-5, 5));

    // Apply damage
    target.hp = Math.max(0, target.hp - damage);

    // Show damage number
    this.showDamageNumber(target, damage, '#d42d2d');

    // Animate attack (simple flash)
    if (attacker.sprite) {
      this.tweens.add({
        targets: attacker.sprite,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true,
        ease: 'Power2',
      });
    }

    // Check for victory
    this.time.delayedCall(1000, () => {
      this.checkBattleEnd();
    });
  }

  private performBayang(): void {
    if (this.playerSpirits.length === 0) return;

    const spirit = this.playerSpirits[0]; // Use first available spirit
    const enhancedDamage = this.player.power * 1.5;
    const damage = Math.max(1, enhancedDamage - this.enemy.defense);

    // Drain spirit energy
    spirit.energyLevel = Math.max(0, spirit.energyLevel - 20);

    // Apply damage
    this.enemy.hp = Math.max(0, this.enemy.hp - damage);

    // Show enhanced damage
    this.showDamageNumber(this.enemy, damage, '#d4a82d');

    // Special effect for Bayang
    const flash = this.add.graphics();
    flash.fillStyle(0xd4a82d, 0.8);
    flash.fillCircle(
      this.gridStartX + this.player.gridX * this.cellSize + this.cellSize / 2,
      this.gridStartY + this.player.gridY * this.cellSize + this.cellSize / 2,
      30
    );

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 800,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Remove spirit if energy depleted
    if (spirit.energyLevel <= 0) {
      this.playerSpirits = this.playerSpirits.filter(s => s.id !== spirit.id);
    }

    this.time.delayedCall(1000, () => {
      this.checkBattleEnd();
    });
  }

  private performCapture(): void {
    if (this.playerBottles <= 0 || (this.enemy.hp / this.enemy.maxHp) > 0.2) return;

    // Calculate capture chance (higher when enemy HP is lower)
    const captureChance = 80 - (this.enemy.hp / this.enemy.maxHp) * 50;
    const success = Math.random() * 100 < captureChance;

    this.playerBottles--;

    if (success) {
      // Successful capture
      this.showDamageNumber(this.enemy, 0, '#2dd4a8', 'CAPTURED!');
      
      // Add spirit to collection
      const capturedSpirit: CapturedSpirit = {
        id: this.enemy.id,
        name: this.enemy.name,
        energyLevel: 100,
        bayangAbility: 'Unknown ability',
      };
      this.playerSpirits.push(capturedSpirit);

      // Feed saka
      this.saka.captureSpirit();

      // Victory
      this.time.delayedCall(1500, () => {
        this.endBattle(true, true);
      });
    } else {
      // Failed capture
      this.showDamageNumber(this.enemy, 0, '#6a6a6a', 'FAILED!');
      
      this.time.delayedCall(1000, () => {
        this.endTurn();
      });
    }
  }

  private showDamageNumber(target: BattleUnit, damage: number, color: string, text?: string): void {
    const displayText = text || damage.toString();
    const x = this.gridStartX + target.gridX * this.cellSize + this.cellSize / 2;
    const y = this.gridStartY + target.gridY * this.cellSize + this.cellSize / 2 - 20;

    this.damageText = this.add.text(x, y, displayText, {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: color,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.damageText,
      y: y - 40,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        if (this.damageText) {
          this.damageText.destroy();
          this.damageText = undefined;
        }
      },
    });

    // Update HP bars
    this.updateHpBar(this.playerHpBar, 20, this.gridStartY + this.gridRows * this.cellSize + 35, 
                    this.player.hp, this.player.maxHp, 0x2dd4a8);
    this.updateHpBar(this.enemyHpBar, this.scale.width - 140, this.gridStartY + this.gridRows * this.cellSize + 35, 
                    this.enemy.hp, this.enemy.maxHp, 0xd42d2d);
  }

  private checkBattleEnd(): void {
    if (this.enemy.hp <= 0) {
      this.endBattle(true, false);
    } else if (this.player.hp <= 0) {
      this.endBattle(false, false);
    } else {
      this.endTurn();
    }
  }

  private endTurn(): void {
    if (this.currentTurn === 'player') {
      this.currentTurn = 'enemy';
      this.turnIndicator.setText('Giliran Musuh');
      this.turnIndicator.setColor('#d42d2d');
      
      // Simple AI: enemy attacks
      this.time.delayedCall(1500, () => {
        this.performAttack(this.enemy, this.player);
      });
    } else {
      this.currentTurn = 'player';
      this.turnIndicator.setText('Giliran Kau');
      this.turnIndicator.setColor('#2dd4a8');
      this.battlePhase = 'action_select';
      this.updateActionButtons();
    }
  }

  private endBattle(playerWon: boolean, captured: boolean): void {
    this.battlePhase = 'battle_over';
    this.updateActionButtons();

    let resultText = '';
    if (playerWon) {
      resultText = captured ? 'Spirit Ditangkap!' : 'Musuh Dikalahkan!';
      this.turnIndicator.setText(resultText);
      this.turnIndicator.setColor('#2dd4a8');
    } else {
      resultText = 'Kau Kalah!';
      this.turnIndicator.setText(resultText);
      this.turnIndicator.setColor('#d42d2d');
    }

    // Return to exploration after delay
    this.time.delayedCall(3000, () => {
      this.saka.stop();
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, () => {
        this.scene.start('ExploreScene');
      });
    });
  }

  update(): void {
    // Battle scene doesn't need continuous updates
  }
}
