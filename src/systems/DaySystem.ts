import { QuestSystem } from './QuestSystem';

interface GameState {
  day: number;
  timeSlot: 'pagi' | 'petang' | 'malam';
  sakaHunger: number;
  capturedSpirits: string[];
  unlockedLocations: string[];
  completedEvents: string[];
  socialBonds: { dian: number; zafri: number };
  currentChapter: string;
  tutorialCompleted: boolean;
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
      currentChapter: 'chapter1',
      tutorialCompleted: false
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
      // Capturing spirits FEEDS the saka — this is the core reward loop
      this.gameState.sakaHunger = Math.min(100, this.gameState.sakaHunger + 30);
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
    const questSystem = QuestSystem.getInstance();
    
    // Tutorial-based unlocks (override day-based during tutorial)
    if (!this.gameState.tutorialCompleted) {
      // Tangga unlocks after meeting Dian (tutorial-dian completion)
      if (questSystem.isQuestComplete('meet-dian')) {
        this.unlockLocation('tangga');
      }
      return;
    }

    // Post-tutorial: Quest-based unlocks
    const activeQuest = questSystem.getActiveQuest();
    
    // Kedai Runcit unlocks when find-zafri quest becomes active
    if (activeQuest?.id === 'find-zafri' || questSystem.isQuestComplete('find-zafri')) {
      this.unlockLocation('kedai-runcit');
    }
    
    // Rooftop unlocks when rooftop-boss quest becomes active
    if (activeQuest?.id === 'rooftop-boss') {
      this.unlockLocation('rooftop');
    }

    // Fallback day-based unlocks for older saves
    if (this.gameState.day >= 2 && questSystem.isQuestComplete('first-hunt')) {
      this.unlockLocation('tangga');
    }
    
    if (this.gameState.day >= 3 && questSystem.isQuestComplete('collect-3-spirits')) {
      this.unlockLocation('rooftop');
    }
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

  // Tutorial flow management
  public getNextChapter(): string | null {
    // If tutorial not completed, follow tutorial sequence
    if (!this.gameState.tutorialCompleted) {
      if (this.gameState.currentChapter === 'chapter1' && this.gameState.completedEvents.includes('chapter1-complete')) {
        return 'tutorial-wake';
      }
      if (this.gameState.currentChapter === 'tutorial-wake' && this.gameState.completedEvents.includes('tutorial-wake-complete')) {
        return 'tutorial-dian';
      }
      if (this.gameState.currentChapter === 'tutorial-dian' && this.gameState.completedEvents.includes('tutorial-dian-complete')) {
        // After tutorial-dian, next is battle then tutorial-capture
        // This will be handled by battle system
        return null; // Go to hub, battle will trigger automatically
      }
      if (this.gameState.currentChapter === 'tutorial-capture' && this.gameState.completedEvents.includes('tutorial-capture-complete')) {
        this.gameState.tutorialCompleted = true;
        this.saveToStorage();
        return null; // Go to main hub
      }
    }
    
    // Post-tutorial: normal quest-based progression
    return null;
  }

  public setCurrentChapter(chapterId: string): void {
    this.gameState.currentChapter = chapterId;
    this.saveToStorage();
  }

  public isTutorialCompleted(): boolean {
    return this.gameState.tutorialCompleted;
  }

  public completeTutorial(): void {
    this.gameState.tutorialCompleted = true;
    // Ensure basic locations are unlocked
    this.unlockLocation('tangga');
    this.saveToStorage();
  }

  // Helper to check if we should go to hub or continue tutorial
  public shouldGoToHub(): boolean {
    return this.gameState.tutorialCompleted || 
           (this.gameState.completedEvents.includes('tutorial-capture-complete'));
  }

  public getCurrentChapter(): string {
    return this.gameState.currentChapter;
  }
}