export class SakaWhisper {
  private scene: Phaser.Scene;
  private isActive = false;
  private lastWhisperTime = 0;
  private currentWhisperText?: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Graphics;
  private shakeTween?: Phaser.Tweens.Tween;
  
  // Whisper phrases for different hunger levels
  private whisperPhrases = {
    mild: ['Lapar...', 'Kosong...', 'Haus...'],
    moderate: [
      'Bagi makan...', 
      'Tangkap lagi...', 
      'Aku lapar...', 
      'Cari makanan...',
      'Roh... aku mahu roh...'
    ],
    severe: [
      'BAGI MAKAN!', 
      'SEKARANG!', 
      'AKU LAPAR!',
      'TANGKAP! TANGKAP!',
      'MAKAN... MAKAN...'
    ]
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public start(): void {
    this.isActive = true;
    this.lastWhisperTime = 0;
  }

  public stop(): void {
    this.isActive = false;
    this.clearCurrentWhisper();
    this.clearOverlay();
    this.clearShake();
  }

  public update(sakaLevel: number): void {
    if (!this.isActive) return;

    const currentTime = Date.now();
    
    // Determine whisper frequency based on saka level
    let whisperInterval = 0;
    
    if (sakaLevel > 80) {
      // Silent - no whispers
      return;
    } else if (sakaLevel > 50) {
      // Rare whispers every 30-60s
      whisperInterval = 30000 + Math.random() * 30000;
    } else if (sakaLevel > 30) {
      // Moderate whispers every 15-30s
      whisperInterval = 15000 + Math.random() * 15000;
    } else {
      // Frequent whispers every 8-15s
      whisperInterval = 8000 + Math.random() * 7000;
    }

    // Check if enough time has passed for next whisper
    if (currentTime - this.lastWhisperTime >= whisperInterval) {
      this.showWhisper(sakaLevel);
      this.lastWhisperTime = currentTime;
    }

    // Update overlay effects
    this.updateOverlay(sakaLevel);
  }

  private showWhisper(sakaLevel: number): void {
    // Clear any existing whisper
    this.clearCurrentWhisper();

    // Choose appropriate whisper phrase
    let phrases: string[];
    let color: string;
    
    if (sakaLevel > 50) {
      phrases = this.whisperPhrases.mild;
      color = '#2dd4a8';
    } else if (sakaLevel > 30) {
      phrases = this.whisperPhrases.moderate;
      color = '#2dd4a8';
    } else {
      phrases = this.whisperPhrases.severe;
      color = '#d42d2d';
    }

    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    // Random position along screen edges
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const margin = 40;
    
    let x: number, y: number;
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    
    switch (edge) {
      case 0: // top
        x = margin + Math.random() * (w - margin * 2);
        y = margin;
        break;
      case 1: // right
        x = w - margin;
        y = margin + Math.random() * (h - margin * 2);
        break;
      case 2: // bottom
        x = margin + Math.random() * (w - margin * 2);
        y = h - margin;
        break;
      case 3: // left
      default:
        x = margin;
        y = margin + Math.random() * (h - margin * 2);
        break;
    }

    // Create whisper text
    this.currentWhisperText = this.scene.add.text(x, y, phrase, {
      fontFamily: 'Georgia, serif',
      fontSize: sakaLevel < 30 ? '18px' : '14px',
      color: color,
      fontStyle: 'italic',
      stroke: '#000000',
      strokeThickness: 2
    });

    // Set origin based on edge position to keep text on screen
    if (edge === 1) this.currentWhisperText.setOrigin(1, 0.5); // right edge
    else if (edge === 2) this.currentWhisperText.setOrigin(0.5, 1); // bottom edge
    else if (edge === 3) this.currentWhisperText.setOrigin(0, 0.5); // left edge
    else this.currentWhisperText.setOrigin(0.5, 0); // top edge

    // Whisper animation: fade in, hold, fade out
    this.currentWhisperText.setAlpha(0);
    this.currentWhisperText.setScale(0.8);

    this.scene.tweens.chain({
      targets: this.currentWhisperText,
      tweens: [
        {
          // Fade in
          alpha: { from: 0, to: 0.9 },
          scaleX: { from: 0.8, to: 1 },
          scaleY: { from: 0.8, to: 1 },
          duration: 1000,
          ease: 'Power2.easeOut'
        },
        {
          // Hold
          duration: 2000
        },
        {
          // Fade out
          alpha: { from: 0.9, to: 0 },
          scaleX: { from: 1, to: 0.8 },
          scaleY: { from: 1, to: 0.8 },
          duration: 1000,
          ease: 'Power2.easeIn',
          onComplete: () => {
            this.clearCurrentWhisper();
          }
        }
      ]
    });

    // Additional effects for severe hunger
    if (sakaLevel < 30) {
      // Add screen shake
      this.addScreenShake();
      
      // Make text glow/pulse
      this.scene.tweens.add({
        targets: this.currentWhisperText,
        scaleX: { from: 1, to: 1.1 },
        scaleY: { from: 1, to: 1.1 },
        duration: 500,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private updateOverlay(sakaLevel: number): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    if (sakaLevel > 50) {
      // No overlay needed
      this.clearOverlay();
      return;
    }

    // Create or update overlay
    if (!this.overlay) {
      this.overlay = this.scene.add.graphics();
      this.overlay.setDepth(100); // High depth to appear over other UI
    }

    this.overlay.clear();

    if (sakaLevel > 30) {
      // Moderate hunger: darken edges
      const alpha = 0.2 * (1 - (sakaLevel - 30) / 20); // 0 to 0.2 alpha
      this.overlay.fillStyle(0x000000, alpha);
      
      // Create vignette effect
      const centerX = w / 2;
      const centerY = h / 2;
      const maxRadius = Math.max(w, h);
      
      for (let i = 0; i < 5; i++) {
        const radius = maxRadius * (0.7 + i * 0.1);
        const edgeAlpha = alpha * (i + 1) / 5;
        this.overlay.fillStyle(0x000000, edgeAlpha);
        this.overlay.fillCircle(centerX, centerY, radius);
      }
    } else {
      // Severe hunger: red pulse edges
      const time = this.scene.time.now;
      const pulse = 0.3 + 0.3 * Math.sin(time * 0.01); // Pulse between 0.3 and 0.6
      
      this.overlay.fillStyle(0x330000, pulse);
      
      // Draw red edges
      const thickness = 20 + 10 * Math.sin(time * 0.005);
      
      // Top
      this.overlay.fillRect(0, 0, w, thickness);
      // Bottom  
      this.overlay.fillRect(0, h - thickness, w, thickness);
      // Left
      this.overlay.fillRect(0, 0, thickness, h);
      // Right
      this.overlay.fillRect(w - thickness, 0, thickness, h);
    }
  }

  private addScreenShake(): void {
    if (this.shakeTween) {
      this.shakeTween.stop();
    }

    const camera = this.scene.cameras.main;
    const originalX = camera.scrollX;
    const originalY = camera.scrollY;

    this.shakeTween = this.scene.tweens.add({
      targets: camera,
      duration: 100,
      repeat: 4,
      yoyo: true,
      ease: 'Power2.easeInOut',
      scrollX: {
        getStart: () => originalX,
        getEnd: () => originalX + Phaser.Math.Between(-3, 3)
      },
      scrollY: {
        getStart: () => originalY,
        getEnd: () => originalY + Phaser.Math.Between(-2, 2)
      },
      onComplete: () => {
        camera.setScroll(originalX, originalY);
        this.shakeTween = undefined;
      }
    });
  }

  private clearCurrentWhisper(): void {
    if (this.currentWhisperText) {
      this.currentWhisperText.destroy();
      this.currentWhisperText = undefined;
    }
  }

  private clearOverlay(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = undefined;
    }
  }

  private clearShake(): void {
    if (this.shakeTween) {
      this.shakeTween.stop();
      this.shakeTween = undefined;
      
      // Reset camera position
      const camera = this.scene.cameras.main;
      camera.setScroll(0, 0);
    }
  }

  public destroy(): void {
    this.stop();
    this.clearCurrentWhisper();
    this.clearOverlay();
    this.clearShake();
  }
}