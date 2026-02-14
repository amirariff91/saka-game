import Phaser from 'phaser';

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InventoryScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, width, height);

    this.add.text(width / 2, height / 2 - 40, 'BALANG', {
      fontFamily: 'Georgia, serif',
      fontSize: '48px',
      color: '#d4a82d',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, 'Bottle Collection', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#6a5a3e',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 60, 'Coming Soon', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#3a2a1e',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    const backBtn = this.add.text(width / 2, height / 2 + 120, '← Kembali', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#6b8f82',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    backBtn.on('pointerover', () => backBtn.setColor('#2dd4a8'));
    backBtn.on('pointerout', () => backBtn.setColor('#6b8f82'));
  }
}
