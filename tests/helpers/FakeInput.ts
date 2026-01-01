export class FakeInput {
  private leftPressed = false;
  private rightPressed = false;
  private upPressed = false;
  private downPressed = false;
  private shootPressed = false;
  
  pressLeft(): void { this.leftPressed = true; }
  releaseLeft(): void { this.leftPressed = false; }
  
  pressRight(): void { this.rightPressed = true; }
  releaseRight(): void { this.rightPressed = false; }
  
  pressUp(): void { this.upPressed = true; }
  releaseUp(): void { this.upPressed = false; }
  
  pressDown(): void { this.downPressed = true; }
  releaseDown(): void { this.downPressed = false; }
  
  pressShoot(): void { this.shootPressed = true; }
  releaseShoot(): void { this.shootPressed = false; }
  
  reset(): void {
    this.leftPressed = false;
    this.rightPressed = false;
    this.upPressed = false;
    this.downPressed = false;
    this.shootPressed = false;
  }
  
  getCursorKeys(): any {
    return {
      left: { isDown: this.leftPressed },
      right: { isDown: this.rightPressed },
      up: { isDown: this.upPressed },
      down: { isDown: this.downPressed },
      space: { isDown: this.shootPressed }
    };
  }
  
  getSpaceKey(): any {
    return { isDown: this.shootPressed };
  }
}
