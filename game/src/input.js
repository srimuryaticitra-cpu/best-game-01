// input.js — keyboard and mouse for KURA OPS: Arena Tempurung.
//
// WASD moves, the mouse aims, click fires, R reloads, Space raises the shell
// shield, E (held) plants the Benih inside Site Kebun, B opens the buy menu,
// M mutes, P pauses, Enter/Space starts, R restarts from the end screen.
// Keys are read as a held set each frame; one-shot actions are consumed by
// takeActions(), so a held key never double-fires a menu.
export const ACTION_START = 1 << 0;
export const ACTION_RELOAD = 1 << 1;
export const ACTION_SHIELD = 1 << 2;
export const ACTION_GRENADE = 1 << 3;
export const ACTION_BUY_MENU = 1 << 4;
export const ACTION_PAUSE = 1 << 5;
export const ACTION_MUTE = 1 << 6;
export const ACTION_RESTART = 1 << 7;

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;
  let buyKey = '';

  // Lowercase every key name, so multi-character keys ('Enter', 'Escape',
  // 'ArrowUp') match the same comparisons as single letters.
  function keyName(event) {
    return event.key.toLowerCase();
  }

  function onKeyDown(event) {
    const key = keyName(event);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    held.add(key);
    if (key === ' ' || key === 'enter') queued |= ACTION_START;
    if (key === 'r') queued |= ACTION_RELOAD | ACTION_RESTART;
    if (key === 'g') queued |= ACTION_GRENADE;
    if (key === 'b') queued |= ACTION_BUY_MENU;
    if (key === 'p' || key === 'escape') queued |= ACTION_PAUSE;
    if (key === 'm') queued |= ACTION_MUTE;
    if (['1', '2', '3', '4', '5'].includes(key)) buyKey = key;
  }

  function onKeyUp(event) {
    held.delete(keyName(event));
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    mouseDown = true;
    mouseClicked = true;
    onMouseMove(event);
  }

  function onMouseUp(event) {
    if (event.button !== 0) return;
    mouseDown = false;
  }

  function onBlur() {
    held.clear();
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    // Movement vector from WASD/arrows, normalized, in screen space.
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('a') || held.has('arrowleft')) x -= 1;
      if (held.has('d') || held.has('arrowright')) x += 1;
      if (held.has('w') || held.has('arrowup')) y -= 1;
      if (held.has('s') || held.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    isHeld(key) {
      return held.has(key);
    },
    // Space is the shield while playing (and start on the title screen).
    shieldHeld() {
      return held.has(' ');
    },
    plantHeld() {
      return held.has('e');
    },
    mouse() {
      return { x: mouseX, y: mouseY, down: mouseDown };
    },
    // True once per click; consumed by the caller.
    takeClick() {
      const clicked = mouseClicked;
      mouseClicked = false;
      return clicked;
    },
    // One-shot actions since the last call; consumed.
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
    // A buy-menu digit pressed since the last call; consumed.
    takeBuyKey() {
      const key = buyKey;
      buyKey = '';
      return key;
    },
  };
}
