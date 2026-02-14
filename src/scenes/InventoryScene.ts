import Phaser from 'phaser';

interface CapturedSpirit {
  id: string;
  name: string;
  type: string;
  tier: string;
  description: string;
  bottleType: string;
  bayangAbility: string;
  energyLevel: number; // 0-100%
}

export class InventoryScene extends Phaser.Scene {
  private spiritsData: any;
  private capturedSpirits: CapturedSpirit[] = [];
  private bottleSlots: Phaser.GameObjects.Container[] = [];
  private detailsPanel: Phaser.GameObjects.Container | null = null;
  private scrollY = 0;
  private maxScroll = 0;

  private readonly COLS = 3;
  private readonly SLOT_SIZE = 80;
  private readonly SLOT_GAP = 16;
  private readonly MAX_SLOTS = 15; // 5 rows of 3

  constructor() {
    super({ key: 'InventoryScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 40;
    const safeBottom = 20;

    // Load spirits data
    this.spiritsData = this.cache.json.get('spirits');

    // Initialize with one captured spirit (Hantu Raya from Episode 4)
    this.initializeCapturedSpirits();

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x1a160d, 0x1a160d, 1);
    bg.fillRect(0, 0, w, h);

    // Title
    const titleSize = Math.max(22, Math.floor(w * 0.08));
    this.add.text(w / 2, safeTop + 20, 'BALANG', {
      fontFamily: 'Georgia, serif',
      fontSize: `${titleSize}px`,
      color: '#d4a82d',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    const subSize = Math.max(12, Math.floor(w * 0.035));
    this.add.text(w / 2, safeTop + 45, 'Spirit Collection', {
      fontFamily: 'Georgia, serif',
      fontSize: `${subSize}px`,
      color: '#6a5a3e',
    }).setOrigin(0.5);

    // Create bottle grid
    this.createBottleGrid();

    // Back button
    this.createBackButton(w, h, safeBottom);

    // Add scroll instructions if needed
    if (this.maxScroll > 0) {
      this.add.text(w / 2, h - safeBottom - 40, 'Swipe to scroll', {
        fontFamily: 'Georgia, serif',
        fontSize: '10px',
        color: '#3a3a3a',
        fontStyle: 'italic',
      }).setOrigin(0.5);
    }

    // Set up touch scrolling
    this.setupScrolling();

    // Scan-line overlay
    const scanlines = this.add.graphics();
    scanlines.lineStyle(1, 0x000000, 0.15);
    for (let y = 0; y < h; y += 3) {
      scanlines.lineBetween(0, y, w, y);
    }
    scanlines.setAlpha(0.04);
    scanlines.setDepth(1000);

    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  private initializeCapturedSpirits(): void {
    // Start with one captured spirit from the story
    if (this.spiritsData && this.spiritsData.spirits) {
      const hantuRaya = this.spiritsData.spirits.find((s: any) => s.id === 'hantu_raya');
      if (hantuRaya) {
        this.capturedSpirits.push({
          id: hantuRaya.id,
          name: hantuRaya.name,
          type: hantuRaya.type,
          tier: hantuRaya.tier,
          description: hantuRaya.description,
          bottleType: hantuRaya.bottleType,
          bayangAbility: hantuRaya.bayangAbility,
          energyLevel: 85, // 85% energy remaining
        });
      }
    }
  }

  private createBottleGrid(): void {
    const w = this.scale.width;
    const safeTop = 40;
    const gridStartY = safeTop + 80;
    const gridWidth = this.COLS * this.SLOT_SIZE + (this.COLS - 1) * this.SLOT_GAP;
    const gridStartX = (w - gridWidth) / 2;

    // Calculate max scroll based on number of rows
    const rows = Math.ceil(this.MAX_SLOTS / this.COLS);
    const gridHeight = rows * this.SLOT_SIZE + (rows - 1) * this.SLOT_GAP;
    const availableHeight = this.scale.height - gridStartY - 100;
    this.maxScroll = Math.max(0, gridHeight - availableHeight);

    for (let i = 0; i < this.MAX_SLOTS; i++) {
      const col = i % this.COLS;
      const row = Math.floor(i / this.COLS);
      
      const x = gridStartX + col * (this.SLOT_SIZE + this.SLOT_GAP) + this.SLOT_SIZE / 2;
      const y = gridStartY + row * (this.SLOT_SIZE + this.SLOT_GAP) + this.SLOT_SIZE / 2;

      const slot = this.createBottleSlot(x, y, i);
      this.bottleSlots.push(slot);
    }
  }

  private createBottleSlot(x: number, y: number, index: number): Phaser.GameObjects.Container {
    const slot = this.add.container(x, y);

    // Slot background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 0.8);
    bg.fillRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE, 8);
    bg.lineStyle(1, 0x3a3a3a, 0.5);
    bg.strokeRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE, 8);
    slot.add(bg);

    // Check if we have a spirit for this slot
    const spirit = this.capturedSpirits[index];
    
    if (spirit) {
      // Filled slot
      this.createFilledSlot(slot, spirit);
    } else {
      // Empty slot
      this.createEmptySlot(slot);
    }

    return slot;
  }

  private createFilledSlot(slot: Phaser.GameObjects.Container, spirit: CapturedSpirit): void {
    // Bottle icon based on type
    const bottleColor = this.getBottleColor(spirit.bottleType);
    const bottle = this.add.graphics();
    bottle.fillStyle(bottleColor, 0.8);
    // Simple bottle shape
    bottle.fillRect(-8, -20, 16, 35);
    bottle.fillRect(-6, -25, 12, 8);
    bottle.fillRect(-4, -30, 8, 8);
    slot.add(bottle);

    // Spirit type icon
    const typeIcon = this.getSpiritTypeIcon(spirit.type);
    const icon = this.add.text(0, -8, typeIcon, {
      fontSize: '14px',
    }).setOrigin(0.5);
    slot.add(icon);

    // Energy level indicator
    const energyBar = this.add.graphics();
    energyBar.fillStyle(0x000000, 0.6);
    energyBar.fillRect(-12, 15, 24, 4);
    const energyColor = spirit.energyLevel > 50 ? 0x2dd4a8 : spirit.energyLevel > 20 ? 0xd4a82d : 0xd42d2d;
    energyBar.fillStyle(energyColor, 1);
    energyBar.fillRect(-12, 15, 24 * (spirit.energyLevel / 100), 4);
    slot.add(energyBar);

    // Spirit name
    const name = this.add.text(0, 25, spirit.name.split(' ')[0], {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: '#d4d4c8',
    }).setOrigin(0.5);
    slot.add(name);

    // Make slot interactive
    slot.setSize(this.SLOT_SIZE, this.SLOT_SIZE);
    slot.setInteractive({ useHandCursor: true });

    slot.on('pointerover', () => {
      const bg = slot.getAt(0) as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(0x1a2a24, 1);
      bg.fillRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE, 8);
      bg.lineStyle(2, 0x2dd4a8, 1);
      bg.strokeRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE, 8);
    });
    slot.on('pointerout', () => {
      const bg = slot.getAt(0) as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(0x0d1a16, 1);
      bg.fillRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE, 8);
      bg.lineStyle(1, 0x2dd4a8, 0.3);
      bg.strokeRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE, 8);
    });
    slot.on('pointerdown', () => {
      this.showSpiritDetails(spirit);
    });
  }

  private createEmptySlot(slot: Phaser.GameObjects.Container): void {
    // Empty bottle outline
    const outline = this.add.graphics();
    outline.lineStyle(2, 0x3a3a3a, 0.3);
    // Simple bottle outline
    outline.strokeRect(-8, -20, 16, 35);
    outline.strokeRect(-6, -25, 12, 8);
    outline.strokeRect(-4, -30, 8, 8);
    slot.add(outline);

    // Empty indicator
    const empty = this.add.text(0, 0, '?', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#3a3a3a',
    }).setOrigin(0.5);
    slot.add(empty);
  }

  private getBottleColor(bottleType: string): number {
    switch (bottleType) {
      case 'glass': return 0x8db4e2;
      case 'clay': return 0xd4a82d;
      case 'metal': return 0x9a9a9a;
      default: return 0x6a6a6a;
    }
  }

  private getSpiritTypeIcon(type: string): string {
    switch (type) {
      case 'hantu': return '👻';
      case 'jembalang': return '🌍';
      case 'djinn': return '🔥';
      case 'familiar': return '🐾';
      default: return '❓';
    }
  }

  private showSpiritDetails(spirit: CapturedSpirit): void {
    // Remove existing details panel
    if (this.detailsPanel) {
      this.detailsPanel.destroy();
    }

    const w = this.scale.width;
    const h = this.scale.height;

    // Create details panel
    this.detailsPanel = this.add.container(w / 2, h / 2);
    this.detailsPanel.setDepth(2000);

    // Background overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(-w / 2, -h / 2, w, h);
    this.detailsPanel.add(overlay);

    // Details box
    const boxWidth = Math.min(300, w - 40);
    const boxHeight = Math.min(400, h - 80);

    const box = this.add.graphics();
    box.fillStyle(0x1a1a1a, 0.95);
    box.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12);
    box.lineStyle(2, 0x2dd4a8, 0.8);
    box.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12);
    this.detailsPanel.add(box);

    // Spirit name
    const name = this.add.text(0, -boxHeight / 2 + 30, spirit.name, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#2dd4a8',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.detailsPanel.add(name);

    // Type and tier
    const typeText = this.add.text(0, -boxHeight / 2 + 55, `${spirit.type} • ${spirit.tier}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#6a6a6a',
    }).setOrigin(0.5);
    this.detailsPanel.add(typeText);

    // Description
    const desc = this.add.text(0, -boxHeight / 2 + 85, spirit.description, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#d4d4c8',
      wordWrap: { width: boxWidth - 40 },
      align: 'center',
    }).setOrigin(0.5);
    this.detailsPanel.add(desc);

    // Bayang ability
    const ability = this.add.text(0, -boxHeight / 2 + 160, `Bayang: ${spirit.bayangAbility}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#d4a82d',
      wordWrap: { width: boxWidth - 40 },
      align: 'center',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.detailsPanel.add(ability);

    // Energy level
    const energyLabel = this.add.text(0, -boxHeight / 2 + 200, `Energy: ${spirit.energyLevel}%`, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#2dd4a8',
    }).setOrigin(0.5);
    this.detailsPanel.add(energyLabel);

    // Energy bar
    const energyBarBg = this.add.graphics();
    energyBarBg.fillStyle(0x000000, 0.6);
    energyBarBg.fillRect(-60, -boxHeight / 2 + 220, 120, 8);
    this.detailsPanel.add(energyBarBg);

    const energyBarFill = this.add.graphics();
    const energyColor = spirit.energyLevel > 50 ? 0x2dd4a8 : spirit.energyLevel > 20 ? 0xd4a82d : 0xd42d2d;
    energyBarFill.fillStyle(energyColor, 1);
    energyBarFill.fillRect(-60, -boxHeight / 2 + 220, 120 * (spirit.energyLevel / 100), 8);
    this.detailsPanel.add(energyBarFill);

    // Close button
    const closeBtn = this.add.text(0, boxHeight / 2 - 40, '✕ Tutup', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#6b8f82',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#2dd4a8'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#6b8f82'));
    closeBtn.on('pointerdown', () => {
      if (this.detailsPanel) {
        this.detailsPanel.destroy();
        this.detailsPanel = null;
      }
    });
    this.detailsPanel.add(closeBtn);

    // Close on overlay click
    overlay.setInteractive();
    overlay.on('pointerdown', () => {
      if (this.detailsPanel) {
        this.detailsPanel.destroy();
        this.detailsPanel = null;
      }
    });
  }

  private setupScrolling(): void {
    if (this.maxScroll <= 0) return;

    let dragStartY = 0;
    let dragStartScrollY = 0;
    let isDragging = false;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.detailsPanel) return; // Don't scroll when details panel is open
      
      dragStartY = pointer.y;
      dragStartScrollY = this.scrollY;
      isDragging = true;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!isDragging || this.detailsPanel) return;

      const deltaY = pointer.y - dragStartY;
      const newScrollY = Phaser.Math.Clamp(dragStartScrollY - deltaY, 0, this.maxScroll);
      
      if (newScrollY !== this.scrollY) {
        this.scrollY = newScrollY;
        this.updateSlotPositions();
      }
    });

    this.input.on('pointerup', () => {
      isDragging = false;
    });
  }

  private updateSlotPositions(): void {
    for (let i = 0; i < this.bottleSlots.length; i++) {
      const slot = this.bottleSlots[i];
      slot.y -= this.scrollY;
    }
  }

  private createBackButton(w: number, h: number, safeBottom: number): void {
    const btnSize = Math.max(14, Math.floor(w * 0.042));
    const backBtn = this.add.text(20, 20, '← Kembali', {
      fontFamily: 'Georgia, serif',
      fontSize: `${btnSize}px`,
      color: '#6b8f82',
      padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#2dd4a8'));
    backBtn.on('pointerout', () => {
      backBtn.setColor('#6b8f82');
      backBtn.setScale(1.0);
    });
    backBtn.on('pointerdown', () => backBtn.setScale(0.95));
    backBtn.on('pointerup', () => {
      backBtn.setScale(1.0);
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => this.scene.start('ExploreScene'));
    });
  }
}
