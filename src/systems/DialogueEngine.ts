export interface DialogueLine {
  id: string;
  speaker?: string;
  text: string;
  next?: string;
  choices?: DialogueChoice[];
  effect?: string;
  background?: string;
  battle?: string;  // If set, triggers BattleScene with this enemy ID on end
}

export interface DialogueChoice {
  text: string;
  next: string;
  flag?: string;
}

export interface ChapterData {
  id: string;
  title: string;
  titleMalay: string;
  startNode: string;
  lines: Record<string, DialogueLine>;
}

export class DialogueEngine {
  private chapter: ChapterData | null = null;
  private currentLine: DialogueLine | null = null;
  private flags: Map<string, boolean> = new Map();

  loadChapter(data: ChapterData): void {
    this.chapter = data;
    this.currentLine = null;
  }

  start(): DialogueLine | null {
    if (!this.chapter) return null;
    this.currentLine = this.chapter.lines[this.chapter.startNode] ?? null;
    return this.currentLine;
  }

  advance(): DialogueLine | null {
    if (!this.chapter || !this.currentLine) return null;
    if (this.currentLine.choices && this.currentLine.choices.length > 0) {
      // Waiting for choice
      return this.currentLine;
    }
    if (!this.currentLine.next) return null;
    this.currentLine = this.chapter.lines[this.currentLine.next] ?? null;
    return this.currentLine;
  }

  choose(choiceIndex: number): DialogueLine | null {
    if (!this.chapter || !this.currentLine || !this.currentLine.choices) return null;
    const choice = this.currentLine.choices[choiceIndex];
    if (!choice) return null;
    if (choice.flag) {
      this.flags.set(choice.flag, true);
    }
    this.currentLine = this.chapter.lines[choice.next] ?? null;
    return this.currentLine;
  }

  getCurrentLine(): DialogueLine | null {
    return this.currentLine;
  }

  hasChoices(): boolean {
    return (this.currentLine?.choices?.length ?? 0) > 0;
  }

  isEnd(): boolean {
    if (!this.currentLine) return true;
    return !this.currentLine.next && (!this.currentLine.choices || this.currentLine.choices.length === 0);
  }

  getFlag(key: string): boolean {
    return this.flags.get(key) ?? false;
  }

  getChapterTitle(): string {
    return this.chapter?.title ?? '';
  }

  getChapterTitleMalay(): string {
    return this.chapter?.titleMalay ?? '';
  }
}
