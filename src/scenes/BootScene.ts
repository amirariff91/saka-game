import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 40;

    // Dark background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, w, h);

    // Loading text
    const fontSize = Math.max(14, Math.floor(w * 0.05));
    const loadingText = this.add.text(w / 2, h / 2 - 50, 'Membuka pintu...', {
      fontFamily: 'Georgia, serif',
      fontSize: `${fontSize}px`,
      color: '#2dd4a8',
    }).setOrigin(0.5);

    // Subtitle
    const subSize = Math.max(10, Math.floor(w * 0.03));
    const subText = this.add.text(w / 2, h / 2 - 20, 'Yang dilupa masih ada.', {
      fontFamily: 'Georgia, serif',
      fontSize: `${subSize}px`,
      color: '#3a5a4e',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Progress bar
    const barWidth = Math.min(280, w - 80);
    const barHeight = 4;
    const barX = w / 2 - barWidth / 2;
    const barY = h / 2 + 10;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1a2a24, 0.8);
    progressBox.fillRoundedRect(barX, barY, barWidth, barHeight, 2);

    const progressBar = this.add.graphics();

    // Percentage text
    const pctText = this.add.text(w / 2, barY + 24, '0%', {
      fontFamily: 'monospace',
      fontSize: `${Math.max(10, Math.floor(w * 0.028))}px`,
      color: '#2dd4a8',
    }).setOrigin(0.5).setAlpha(0.6);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x2dd4a8, 1);
      progressBar.fillRoundedRect(barX, barY, barWidth * value, barHeight, 2);
      pctText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      subText.destroy();
      pctText.destroy();
    });

    // Load JSON data
    this.load.json('chapter1', 'data/chapters/chapter1.json');
    this.load.json('chapter2', 'data/chapters/chapter2.json');
    this.load.json('chapter3', 'data/chapters/chapter3.json');
    this.load.json('spirits', 'data/spirits.json');

    // === CHARACTER SPRITES ===

    // Syafiq - 8 direction rotation sprites
    const directions = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
    
    for (const dir of directions) {
      this.load.image(`syafiq-${dir}`, `src/assets/characters/syafiq/rotations/${dir}.png`);
      this.load.image(`dian-${dir}`, `src/assets/characters/dian/rotations/${dir}.png`);
      this.load.image(`zafri-${dir}`, `src/assets/characters/zafri/rotations/${dir}.png`);
    }

    // Syafiq walking animations - check what directions have animation frames
    const walkDirs = ['south', 'south-west', 'west']; // Based on the file structure we saw
    
    for (const dir of walkDirs) {
      // Load 6 frames (frame_000 to frame_005)
      for (let i = 0; i < 6; i++) {
        const frameNum = i.toString().padStart(3, '0');
        this.load.image(
          `syafiq-walk-${dir}-${i}`, 
          `src/assets/characters/syafiq/animations/walking/${dir}/frame_${frameNum}.png`
        );
      }
    }

    // === TILESETS ===
    this.load.image('ppr-corridor-tileset', 'src/assets/tilesets/ppr-corridor.png');
    this.load.json('ppr-corridor-data', 'src/assets/tilesets/ppr-corridor.json');

    // === UI ICONS ===
    // We'll create simple colored circles for now as icons
    // The real implementation would load UI icons from assets
  }

  create(): void {
    // Create Phaser animations for walking
    const walkDirs = ['south', 'south-west', 'west'];
    
    for (const dir of walkDirs) {
      this.anims.create({
        key: `syafiq-walk-${dir}`,
        frames: [
          { key: `syafiq-walk-${dir}-0` },
          { key: `syafiq-walk-${dir}-1` },
          { key: `syafiq-walk-${dir}-2` },
          { key: `syafiq-walk-${dir}-3` },
          { key: `syafiq-walk-${dir}-4` },
          { key: `syafiq-walk-${dir}-5` },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }

  // Duplicate create method removed
}
