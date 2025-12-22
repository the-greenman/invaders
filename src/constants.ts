export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Player
export const PLAYER_SPEED = 300;
export const PLAYER_SHOOT_COOLDOWN = 500;
export const MAX_BULLETS = 3;

// Projectiles
export const BULLET_SPEED = 400;
export const BOMB_SPEED = 200;

// Aliens
export const ALIEN_ROWS = 5;
export const ALIEN_COLS = 11;
export const ALIEN_SPACING_X = 60;
export const ALIEN_SPACING_Y = 50;
export const ALIEN_START_Y = 100;
export const ALIEN_START_SPEED = 1000; // ms per move

// Game
export const MAX_LIVES = 3;
export const SHIELD_COUNT = 4;
export const SHIELD_Y = 480;
export const MAX_STORED_FACES = 10;

// Points
export const POINTS = {
  ALIEN_TOP: 30,
  ALIEN_MIDDLE: 20,
  ALIEN_BOTTOM: 10
};

// Colors
export const COLORS = {
  BACKGROUND: 0x000000,
  PLAYER: 0x00ff00,
  ALIEN: 0xff0000,
  BULLET: 0xffff00,
  BOMB: 0xff00ff,
  SHIELD: 0x00ff00,
  GREEN_TINT: 0x00ff00
};
