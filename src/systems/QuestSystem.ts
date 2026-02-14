interface Quest {
  id: string;
  title: string;
  description: string;
  targetLocation?: string;
  type: 'main' | 'side' | 'hunt';
  isComplete: boolean;
}

interface QuestState {
  activeQuest?: Quest;
  completedQuests: string[];
  questChain: Quest[];
}

export class QuestSystem {
  private static instance: QuestSystem;
  private questState: QuestState;
  private scene?: Phaser.Scene;

  private constructor() {
    this.questState = this.getDefaultQuestState();
    this.loadFromStorage();
  }

  public static getInstance(): QuestSystem {
    if (!QuestSystem.instance) {
      QuestSystem.instance = new QuestSystem();
    }
    return QuestSystem.instance;
  }

  public initialize(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  private getDefaultQuestState(): QuestState {
    // Arc 1 quest chain - starts with discover-unit94 auto-completed
    const questChain: Quest[] = [
      {
        id: 'discover-unit94',
        title: 'Bilik Dimeterai',
        description: 'Sesuatu berlaku di Unit 9-4...',
        targetLocation: 'unit-9-4',
        type: 'main',
        isComplete: true // Auto-completed by Chapter 1
      },
      {
        id: 'meet-dian',
        title: 'Suara di Tangga',
        description: 'Siapa yang menangis di tangga tingkat 9?',
        targetLocation: 'tangga',
        type: 'main',
        isComplete: false
      },
      {
        id: 'first-hunt',
        title: 'Saka Lapar',
        description: 'Benda dalam kau lapar. Kena tangkap sesuatu.',
        targetLocation: 'tangga',
        type: 'hunt',
        isComplete: false
      },
      {
        id: 'find-zafri',
        title: 'Cucu Bomoh',
        description: 'Ada orang kat kedai yang tahu pasal benda-benda ni.',
        targetLocation: 'kedai-runcit',
        type: 'main',
        isComplete: false
      },
      {
        id: 'collect-3-spirits',
        title: 'Pemburu Hantu',
        description: 'Tangkap 3 makhluk untuk kuatkan saka.',
        type: 'hunt',
        isComplete: false
      },
      {
        id: 'return-unit94',
        title: 'Rahsia Unit 9-4',
        description: 'Ada lagi botol-botol dalam bilik tu...',
        targetLocation: 'unit-9-4',
        type: 'main',
        isComplete: false
      },
      {
        id: 'rooftop-boss',
        title: 'Puncak PPR',
        description: 'Sesuatu menunggu di atas.',
        targetLocation: 'rooftop',
        type: 'main',
        isComplete: false
      }
    ];

    return {
      activeQuest: questChain.find(q => !q.isComplete),
      completedQuests: ['discover-unit94'],
      questChain
    };
  }

  public getActiveQuest(): Quest | undefined {
    return this.questState.activeQuest;
  }

  public getCompletedQuests(): string[] {
    return [...this.questState.completedQuests];
  }

  public isQuestActive(questId: string): boolean {
    return this.questState.activeQuest?.id === questId;
  }

  public isQuestComplete(questId: string): boolean {
    return this.questState.completedQuests.includes(questId);
  }

  public completeQuest(questId: string): boolean {
    if (!this.questState.activeQuest || this.questState.activeQuest.id !== questId) {
      console.warn(`Cannot complete quest ${questId} - not the active quest`);
      return false;
    }

    // Mark current quest as complete
    this.questState.activeQuest.isComplete = true;
    this.questState.completedQuests.push(questId);

    // Find and activate next quest
    this.advanceToNext();
    
    this.saveToStorage();
    return true;
  }

  public advanceToNext(): void {
    // Find next uncompleted quest in chain
    const nextQuest = this.questState.questChain.find(q => !q.isComplete);
    this.questState.activeQuest = nextQuest;
    this.saveToStorage();
  }

  public forceStartQuest(questId: string): void {
    const quest = this.questState.questChain.find(q => q.id === questId);
    if (quest && !quest.isComplete) {
      this.questState.activeQuest = quest;
      this.saveToStorage();
    }
  }

  public getQuestProgress(): { completed: number; total: number } {
    return {
      completed: this.questState.completedQuests.length,
      total: this.questState.questChain.length
    };
  }

  // Check if specific quest conditions are met
  public checkQuestCompletion(questId: string, context: any = {}): boolean {
    const quest = this.questState.questChain.find(q => q.id === questId);
    if (!quest || quest.isComplete || this.questState.activeQuest?.id !== questId) {
      return false;
    }

    switch (questId) {
      case 'meet-dian':
        // Complete when first talking to Dian on stairwell
        return context.event === 'met-dian';
      
      case 'first-hunt':
        // Complete when first spirit is captured
        return context.event === 'first-spirit-captured';
      
      case 'find-zafri':
        // Complete when meeting Zafri at kedai
        return context.event === 'met-zafri';
      
      case 'collect-3-spirits':
        // Complete when 3 spirits total are captured
        return context.capturedSpiritsCount >= 3;
      
      case 'return-unit94':
        // Complete when returning to Unit 9-4 after having saka
        return context.event === 'unit-94-explored-again';
      
      case 'rooftop-boss':
        // Complete when defeating rooftop boss
        return context.event === 'rooftop-boss-defeated';
      
      default:
        return false;
    }
  }

  // Auto-complete quest if conditions are met
  public updateQuestProgress(context: any = {}): boolean {
    const activeQuest = this.questState.activeQuest;
    if (!activeQuest) return false;

    if (this.checkQuestCompletion(activeQuest.id, context)) {
      this.completeQuest(activeQuest.id);
      return true;
    }
    
    return false;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('saka-quest-state', JSON.stringify(this.questState));
    } catch (e) {
      console.warn('Failed to save quest state:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('saka-quest-state');
      if (saved) {
        const loaded = JSON.parse(saved);
        this.questState = {
          ...this.getDefaultQuestState(),
          ...loaded,
          questChain: this.getDefaultQuestState().questChain // Always use fresh quest chain
        };
        
        // Sync active quest with loaded completion state
        if (loaded.completedQuests && loaded.completedQuests.length > 0) {
          // Update questChain completion status
          this.questState.questChain.forEach(quest => {
            quest.isComplete = this.questState.completedQuests.includes(quest.id);
          });
          // Find next active quest
          this.questState.activeQuest = this.questState.questChain.find(q => !q.isComplete);
        }
      }
    } catch (e) {
      console.warn('Failed to load quest state:', e);
      this.questState = this.getDefaultQuestState();
    }
  }

  public newGame(): void {
    this.questState = this.getDefaultQuestState();
    localStorage.removeItem('saka-quest-state');
  }

  public getQuestForLocation(locationId: string): Quest | undefined {
    const activeQuest = this.questState.activeQuest;
    if (activeQuest && activeQuest.targetLocation === locationId) {
      return activeQuest;
    }
    return undefined;
  }

  // Get display text for quest bar
  public getQuestDisplayText(): string {
    const quest = this.questState.activeQuest;
    if (!quest) return '';
    
    return `${quest.title}: ${quest.description}`;
  }
}