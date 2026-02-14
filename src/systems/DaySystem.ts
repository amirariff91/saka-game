interface GameState {
  day: number;
  timeSlot: 'pagi' | 'petang' | 'malam';
  sakaHunger: number;
  capturedSpirits: string[];
  unlockedLocations: string[];
  completedEvents: string[];
  socialBonds: { dian: number; zafri: number };
  currentChapter: string;
}

interface LocationInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  requiredDay?: number;
  unlocked: boolean;
  hasEvent?: boolean;
}

export class DaySystem {
  private static instance: DaySystem;
  private gameState: GameState;
  private scene?: Phaser.Scene;

  private constructor() {
    this.gameState = this.getDefaultGameState();
    this.loadFromStorage();
  }

  public static getInstance(): DaySystem {
    if (!DaySystem.instance) {
      DaySystem.instance = new DaySystem();
    }
    return DaySystem.instance;
  }

  public initialize(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  private getDefaultGameState(): GameState {
    return {
      day: 1,
      timeSlot: 'malam',
      sakaHunger: 70,
      capturedSpirits: [],
      unlockedLocations: ['unit-9-4', 'rumah-syafiq'],
      completedEvents: [],
      socialBonds: { dian: 0, zafri: 0 },
      currentChapter: 'chapter1'
    };
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public advanceTime(): void {
    const timeSlots: Array<'pagi' | 'petang' | 'malam'> = ['pagi', 'petang', 'malam'];
    const currentIndex = timeSlots.indexOf(this.gameState.timeSlot);
    
    if (currentIndex === timeSlots.length - 1) {
      // Move to next day
      this.gameState.day += 1;
      this.gameState.timeSlot = 'pagi';
      
      // Check for new location unlocks
      this.checkLocationUnlocks();
    } else {
      this.gameState.timeSlot = timeSlots[currentIndex + 1];
    }

    // Reduce hunger slightly with time passage
    this.gameState.sakaHunger = Math.max(0, this.gameState.sakaHunger - 5);
    
    this.saveToStorage();
  }

  public restoreHunger(amount: number = 30): void {
    this.gameState.sakaHunger = Math.min(100, this.gameState.sakaHunger + amount);
    this.saveToStorage();
  }

  public captureSpirit(spiritId: string): void {
    if (!this.gameState.capturedSpirits.includes(spiritId)) {
      this.gameState.capturedSpirits.push(spiritId);
      // Capturing spirits reduces hunger temporarily
      this.gameState.sakaHunger = Math.max(0, this.gameState.sakaHunger - 15);
      this.saveToStorage();
    }
  }

  public completeEvent(eventId: string): void {
    if (!this.gameState.completedEvents.includes(eventId)) {
      this.gameState.completedEvents.push(eventId);
      this.saveToStorage();
    }
  }

  public unlockLocation(locationId: string): void {
    if (!this.gameState.unlockedLocations.includes(locationId)) {
      this.gameState.unlockedLocations.push(locationId);
      this.saveToStorage();
    }
  }

  public increaseBond(character: 'dian' | 'zafri', amount: number = 10): void {
    this.gameState.socialBonds[character] = Math.min(100, this.gameState.socialBonds[character] + amount);
    this.saveToStorage();
  }

  public getTimeDisplay(): string {
    const timeIcons = {
      pagi: '☀️',
      petang: '🌅', 
      malam: '🌙'
    };
    
    const timeNames = {
      pagi: 'Pagi',
      petang: 'Petang',
      malam: 'Malam'
    };

    return `Hari ${this.gameState.day} — ${timeNames[this.gameState.timeSlot]} ${timeIcons[this.gameState.timeSlot]}`;
  }

  public getAvailableLocations(): LocationInfo[] {
    const allLocations: LocationInfo[] = [
      {
        id: 'unit-9-4',
        name: '🏚️ Unit 9-4',
        icon: '🏚️',
        description: 'Bilik dimeterai. Tempat segalanya bermula.',
        unlocked: true,
        hasEvent: this.hasEventAvailable('unit-9-4')
      },
      {
        id: 'tangga',
        name: '🪜 Tangga Tingkat 9',
        icon: '🪜', 
        description: 'Tempat Dian selalu lalu. Mungkin dia ada kat sini.',
        requiredDay: 2,
        unlocked: this.gameState.unlockedLocations.includes('tangga'),
        hasEvent: this.hasEventAvailable('tangga')
      },
      {
        id: 'rumah-syafiq',
        name: '🏠 Rumah Syafiq',
        icon: '🏠',
        description: 'Tempat berehat. Boleh cakap dengan mak.',
        unlocked: true,
        hasEvent: this.hasEventAvailable('rumah-syafiq')
      },
      {
        id: 'rooftop',
        name: '🔝 Rooftop',
        icon: '🔝',
        description: 'Kawasan penunggu. Bahaya, tapi boleh latihan.',
        requiredDay: 3,
        unlocked: this.gameState.unlockedLocations.includes('rooftop'),
        hasEvent: this.hasEventAvailable('rooftop')
      },
      {
        id: 'kedai-runcit',
        name: '🏪 Kedai Runcit',
        icon: '🏪',
        description: 'Tempat orang PPR berkumpul. Dengar cerita, dapat info.',
        requiredDay: 2,
        unlocked: this.gameState.unlockedLocations.includes('kedai-runcit'),
        hasEvent: this.hasEventAvailable('kedai-runcit')
      }
    ];

    return allLocations.filter(loc => loc.unlocked);
  }

  private hasEventAvailable(locationId: string): boolean {
    // This would contain complex logic for determining if events are available
    // based on day, time, completed events, etc.
    // For now, simplified logic:
    
    if (locationId === 'unit-9-4' && this.gameState.day === 1 && this.gameState.timeSlot === 'malam') {
      return !this.gameState.completedEvents.includes('chapter1-complete');
    }
    
    if (locationId === 'tangga' && this.gameState.day >= 2) {
      return !this.gameState.completedEvents.includes('met-dian');
    }
    
    if (locationId === 'rumah-syafiq' && this.gameState.day >= 2) {
      return !this.gameState.completedEvents.includes('talked-to-mum');
    }

    return false;
  }

  private checkLocationUnlocks(): void {
    // Day-based unlocks
    if (this.gameState.day >= 2) {
      this.unlockLocation('tangga');
      this.unlockLocation('kedai-runcit');
    }
    
    if (this.gameState.day >= 3) {
      this.unlockLocation('rooftop');
    }

    // Event-based unlocks could be added here
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('saka-game-state', JSON.stringify(this.gameState));
    } catch (e) {
      console.warn('Failed to save game state:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('saka-game-state');
      if (saved) {
        this.gameState = { ...this.getDefaultGameState(), ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load game state:', e);
      this.gameState = this.getDefaultGameState();
    }
  }

  public newGame(): void {
    this.gameState = this.getDefaultGameState();
    localStorage.removeItem('saka-game-state');
  }

  public hasSaveData(): boolean {
    return localStorage.getItem('saka-game-state') !== null;
  }
}