import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { DialogueScene } from './scenes/DialogueScene';
import { ExploreScene } from './scenes/ExploreScene';
import { BattleScene } from './scenes/BattleScene';
import { InventoryScene } from './scenes/InventoryScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 360,
  height: 640,
  backgroundColor: '#0a0a0a',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
  },
  scene: [BootScene, MenuScene, DialogueScene, ExploreScene, BattleScene, InventoryScene],
};

new Phaser.Game(config);
