// Thumb joystick. Pointer events only, works with multi-touch (tame button kept separate).

export class Joystick {
  constructor(root, knob) {
    this.root = root;
    this.knob = knob;
    this.value = { x: 0, z: 0 };
    this.active = false;
    this.pointerId = null;
    this.radius = 46;
    this.origin = { x: 0, y: 0 };

    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);

    root.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  measure() {
    const rect = this.root.getBoundingClientRect();
    this.radius = Math.max(30, rect.width * 0.34);
    return rect;
  }

  onDown(e) {
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.active = true;
    const rect = this.measure();
    this.origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.update(e);
    try { this.root.setPointerCapture?.(e.pointerId); } catch (err) { /* synthetic pointer */ }
    e.preventDefault();
  }

  onMove(e) {
    if (!this.active || e.pointerId !== this.pointerId) return;
    this.update(e);
    e.preventDefault();
  }

  onUp(e) {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.active = false;
    this.value.x = 0;
    this.value.z = 0;
    this.knob.style.transform = 'translate(0px, 0px)';
  }

  update(e) {
    let dx = e.clientX - this.origin.x;
    let dy = e.clientY - this.origin.y;
    const len = Math.hypot(dx, dy);
    const max = this.radius;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / max;
    const ny = dy / max;
    this.value.x = Math.abs(nx) > 0.12 ? nx : 0;
    this.value.z = Math.abs(ny) > 0.12 ? ny : 0;
  }

  reset() {
    this.active = false;
    this.pointerId = null;
    this.value.x = 0;
    this.value.z = 0;
    this.knob.style.transform = 'translate(0px, 0px)';
  }
}
