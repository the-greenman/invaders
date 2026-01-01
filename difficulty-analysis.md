# Difficulty Analysis - Level 1 Starting Values

## Base Values (Level 1, before multipliers)
- Alien Rows: 3
- Alien Speed: 500ms per move
- Bomb Frequency: 0.3 bombs per second
- Points Multiplier: 1.0x

## After Difficulty Multipliers

### EASY
- Alien Rows: 3 × 0.9 = **2.7 → 2 rows**
- Alien Speed: 500 ÷ 0.85 = **588ms per move** (slower)
- Bomb Frequency: 0.3 × 0.75 = **0.225 bombs/sec** (fewer bombs)
- Points Multiplier: 1.0 × 0.8 = **0.8x** (fewer points)

### MEDIUM
- Alien Rows: 3 × 1.0 = **3 rows**
- Alien Speed: 500 ÷ 1.0 = **500ms per move**
- Bomb Frequency: 0.3 × 1.0 = **0.3 bombs/sec**
- Points Multiplier: 1.0 × 1.0 = **1.0x**

### HARD (UPDATED)
- Alien Rows: 3 × 1.2 = 3.6 → **4 rows** (minimum enforced)
- Alien Speed: 500 ÷ 1.3 = **385ms per move** (much faster)
- Bomb Frequency: 0.3 × 1.4 = **0.42 bombs/sec** (40% more bombs)
- Points Multiplier: 1.0 × 1.3 = **1.3x** (more points)

### EXTREME
- Alien Rows: 3 × 1.15 = **3.45 → 3 rows**
- Alien Speed: 500 ÷ 1.35 = **370ms per move** (much faster)
- Bomb Frequency: 0.3 × 1.5 = **0.45 bombs/sec** (50% more bombs)
- Points Multiplier: 1.0 × 1.5 = **1.5x** (much more points)

## Improvements Made

1. **HARD now starts with 4 rows** instead of 3, making it immediately distinct from MEDIUM
2. **Increased HARD speed multiplier** from 1.15 to 1.3 (23% faster vs 15%)
3. **Increased HARD bomb frequency** from 1.2 to 1.4 (40% more bombs vs 20%)
4. **Increased HARD row multiplier** from 1.05 to 1.2 for better scaling

## Level Scaling Impact

At level 10:
- Base rows: 3 + floor(9/3) = 6 rows
- MEDIUM: 6 rows
- HARD: 6 × 1.2 = 7.2 → **7 rows**
- EXTREME: 6 × 1.15 = 6.9 → **6 rows**

The differences are now more pronounced at higher levels too.
