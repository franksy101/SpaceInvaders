// Central configuration for the game. Tune here, not in gameplay code.
export interface GameConfig {
  width: number;
  height: number;
  player: {
    width: number;
    height: number;
    speed: number;
    fireCooldown: number;
    spawnY: number;
    color: number;
  };
  invaders: {
    rows: number;
    cols: number;
    cellW: number;
    cellH: number;
    offsetY: number;
    baseSpeed: number;
    descendStep: number;
    fireChance: number;
    colors: number[];
    points: number[];
    waveAmplitude: number;
    waveFrequency: number;
  };
  bullets: {
    playerSpeed: number;
    invaderSpeed: number;
    cooldownDecay: number;
  };
  shields: {
    count: number;
    blockSize: number;
    cols: number;
    rows: number;
    y: number;
  };
  scoring: {
    comboWindow: number;
    maxCombo: number;
    extraLifeEvery: number;
  };
  highscores: {
    max: number;
    storageKey: string;
  };
  palette: {
    bg: number;
    hud: number;
    danger: number;
    accent: number;
  };
}

export const CONFIG: GameConfig = {
  width: 960,
  height: 720,

  player: {
    width: 44,
    height: 22,
    speed: 320,
    fireCooldown: 0.35,
    spawnY: 660,
    color: 0x00ffd1,
  },

  invaders: {
    rows: 5,
    cols: 11,
    cellW: 48,
    cellH: 36,
    offsetY: 110,
    baseSpeed: 22,
    descendStep: 16,
    fireChance: 0.006,
    colors: [0xff2e88, 0xffb800, 0x00ffd1, 0x5effff, 0xbe5eff],
    points: [30, 20, 20, 10, 10],
    waveAmplitude: 4,
    waveFrequency: 1.4,
  },

  bullets: {
    playerSpeed: 720,
    invaderSpeed: 260,
    cooldownDecay: 0.01,
  },

  shields: {
    count: 4,
    blockSize: 6,
    cols: 11,
    rows: 8,
    y: 560,
  },

  scoring: {
    comboWindow: 1.25,
    maxCombo: 8,
    extraLifeEvery: 5000,
  },

  highscores: {
    max: 10,
    storageKey: "space-invaders-modern/highscores/v1",
  },

  palette: {
    bg: 0x05060d,
    hud: 0x7effe0,
    danger: 0xff3060,
    accent: 0xffe066,
  },
};
