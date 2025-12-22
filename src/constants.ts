export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Player
export const PLAYER_SPEED = 300;
export const PLAYER_SHOOT_COOLDOWN = 500;
export const MAX_BULLETS = 3;
export const PLAYER_WIDTH = 96;    // doubled for larger face area
export const PLAYER_HEIGHT = 72;   // doubled for larger face area
export const PLAYER_CORE_RADIUS = 24;

// Projectiles
export const BULLET_SPEED = 400;
export const BOMB_SPEED = 200;

// Aliens
export const ALIEN_ROWS = 3;
export const ALIEN_COLS = 7;       // reduced further to fit larger sprites
export const ALIEN_SPACING_X = 90; // widened spacing for bigger aliens
export const ALIEN_SPACING_Y = 70;
export const ALIEN_START_Y = 100;
export const ALIEN_START_SPEED = 500; // ms per move
export const ALIEN_WIDTH = 88;     // doubled sprite size
export const ALIEN_HEIGHT = 64;    // doubled sprite size
export const ALIEN_CORE_RADIUS = 20;
export const ALIEN_BODY_SCALE = 0.3; // collision body width/height multiplier vs sprite

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
