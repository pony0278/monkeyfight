// Unified input: keyboard + mouse for desktop, on-screen joystick + buttons for
// touch. Exposes a simple state the game polls each frame.

export class Input {
  constructor() {
    this.move = { x: 0, y: 0 };       // normalized (-1..1), screen-aligned
    this.punchQueued = false;          // edge-triggered, consumed by game
    this.throwQueued = false;
    this.jumpQueued = false;
    this.keys = {};
    this.touch = false;

    this._joystick = null;             // {base, knob, id, cx, cy}
    this._bindKeyboard();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) { return; }
      this.keys[e.code] = true;
      if (e.code === 'KeyJ' || e.code === 'KeyZ') this.punchQueued = true;
      if (e.code === 'KeyK' || e.code === 'KeyX') this.throwQueued = true;
      if (e.code === 'Space') { this.jumpQueued = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
  }

  // Wire up canvas mouse buttons for punch (left) / throw (right).
  bindMouse(el) {
    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.punchQueued = true;
      if (e.button === 2) { this.throwQueued = true; }
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Wire up on-screen controls (joystick zone + three action buttons).
  bindTouch({ zone, btnPunch, btnThrow, btnJump }) {
    const start = (e) => {
      this.touch = true;
      const t = e.changedTouches ? e.changedTouches[0] : e;
      this._joystick = { id: t.identifier ?? 'mouse', cx: t.clientX, cy: t.clientY };
      e.preventDefault();
    };
    const moveFn = (e) => {
      if (!this._joystick) return;
      const touches = e.changedTouches || [e];
      for (const t of touches) {
        if ((t.identifier ?? 'mouse') !== this._joystick.id) continue;
        const dx = t.clientX - this._joystick.cx;
        const dy = t.clientY - this._joystick.cy;
        const max = 60;
        const len = Math.hypot(dx, dy) || 1;
        const cl = Math.min(len, max);
        this.move.x = (dx / len) * (cl / max);
        this.move.y = (dy / len) * (cl / max);
      }
      e.preventDefault();
    };
    const end = (e) => {
      const touches = e.changedTouches || [e];
      for (const t of touches) {
        if (this._joystick && (t.identifier ?? 'mouse') === this._joystick.id) {
          this._joystick = null;
          this.move.x = 0; this.move.y = 0;
        }
      }
    };
    zone.addEventListener('touchstart', start, { passive: false });
    zone.addEventListener('touchmove', moveFn, { passive: false });
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);

    const press = (queue) => (e) => { this.touch = true; this[queue] = true; e.preventDefault(); };
    btnPunch.addEventListener('touchstart', press('punchQueued'), { passive: false });
    btnThrow.addEventListener('touchstart', press('throwQueued'), { passive: false });
    btnJump.addEventListener('touchstart', press('jumpQueued'), { passive: false });
    // also let them work with mouse for testing on desktop
    btnPunch.addEventListener('mousedown', () => { this.punchQueued = true; });
    btnThrow.addEventListener('mousedown', () => { this.throwQueued = true; });
    btnJump.addEventListener('mousedown', () => { this.jumpQueued = true; });
  }

  // Read keyboard movement into the move vector (called each frame).
  pollKeyboard() {
    if (this._joystick) return; // joystick overrides
    let x = 0, y = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) y -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    const len = Math.hypot(x, y);
    if (len > 0) { x /= len; y /= len; }
    this.move.x = x; this.move.y = y;
  }

  // Consume edge-triggered actions, returning them and clearing the flags.
  consume() {
    const out = {
      punch: this.punchQueued,
      throw: this.throwQueued,
      jump: this.jumpQueued,
    };
    this.punchQueued = false;
    this.throwQueued = false;
    this.jumpQueued = false;
    return out;
  }
}
