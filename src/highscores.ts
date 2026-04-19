import { CONFIG } from "./config";

export interface HighscoreEntry {
  name: string;
  score: number;
  wave: number;
  date: number;
}

function clone(list: HighscoreEntry[]): HighscoreEntry[] {
  return list.map((e) => ({ ...e }));
}

function defaults(): HighscoreEntry[] {
  // Seed with a ladder so the board is never empty on first play.
  const seed = [
    { name: "ACE", score: 8000 },
    { name: "NEO", score: 6500 },
    { name: "ZAP", score: 5000 },
    { name: "LUX", score: 3800 },
    { name: "XOR", score: 2700 },
    { name: "RGB", score: 1800 },
    { name: "ION", score: 1200 },
    { name: "VEX", score: 800 },
    { name: "PIX", score: 500 },
    { name: "CRT", score: 250 },
  ];
  const now = Date.now();
  return seed.map((s, i) => ({ name: s.name, score: s.score, wave: Math.max(1, 6 - Math.floor(i / 2)), date: now - i * 1000 }));
}

export class HighscoreBoard {
  private list: HighscoreEntry[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(CONFIG.highscores.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as HighscoreEntry[];
        if (Array.isArray(parsed) && parsed.every((e) => typeof e.score === "number")) {
          this.list = parsed.slice(0, CONFIG.highscores.max);
          return;
        }
      }
    } catch {
      // fall through to defaults
    }
    this.list = defaults();
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(CONFIG.highscores.storageKey, JSON.stringify(this.list));
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }

  entries(): HighscoreEntry[] {
    return clone(this.list);
  }

  qualifies(score: number): boolean {
    if (score <= 0) return false;
    if (this.list.length < CONFIG.highscores.max) return true;
    return score > this.list[this.list.length - 1].score;
  }

  // Returns the 0-based rank of the newly added entry, or -1 if it did not qualify.
  submit(name: string, score: number, wave: number): number {
    if (!this.qualifies(score)) return -1;
    const cleanName = name.toUpperCase().slice(0, 3).padEnd(3, "A");
    const entry: HighscoreEntry = { name: cleanName, score, wave, date: Date.now() };
    this.list.push(entry);
    this.list.sort((a, b) => b.score - a.score || a.date - b.date);
    this.list = this.list.slice(0, CONFIG.highscores.max);
    this.persist();
    return this.list.indexOf(entry);
  }

  reset(): void {
    this.list = defaults();
    this.persist();
  }
}
