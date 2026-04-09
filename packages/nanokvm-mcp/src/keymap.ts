// HID modifier bitmap positions (matches NanoKVM web UI).
export const ModifierBits = {
  LeftCtrl: 1 << 0,
  LeftShift: 1 << 1,
  LeftAlt: 1 << 2,
  LeftMeta: 1 << 3,
  RightCtrl: 1 << 4,
  RightShift: 1 << 5,
  RightAlt: 1 << 6,
  RightMeta: 1 << 7,
} as const;

const MODIFIER_ALIASES: Record<string, number> = {
  ctrl: ModifierBits.LeftCtrl,
  control: ModifierBits.LeftCtrl,
  lctrl: ModifierBits.LeftCtrl,
  rctrl: ModifierBits.RightCtrl,
  shift: ModifierBits.LeftShift,
  lshift: ModifierBits.LeftShift,
  rshift: ModifierBits.RightShift,
  alt: ModifierBits.LeftAlt,
  lalt: ModifierBits.LeftAlt,
  ralt: ModifierBits.RightAlt,
  altgr: ModifierBits.RightAlt,
  meta: ModifierBits.LeftMeta,
  lmeta: ModifierBits.LeftMeta,
  rmeta: ModifierBits.RightMeta,
  win: ModifierBits.LeftMeta,
  windows: ModifierBits.LeftMeta,
  super: ModifierBits.LeftMeta,
  cmd: ModifierBits.LeftMeta,
};

const KEYCODES: Record<string, number> = {
  KeyA: 0x04, KeyB: 0x05, KeyC: 0x06, KeyD: 0x07, KeyE: 0x08, KeyF: 0x09,
  KeyG: 0x0a, KeyH: 0x0b, KeyI: 0x0c, KeyJ: 0x0d, KeyK: 0x0e, KeyL: 0x0f,
  KeyM: 0x10, KeyN: 0x11, KeyO: 0x12, KeyP: 0x13, KeyQ: 0x14, KeyR: 0x15,
  KeyS: 0x16, KeyT: 0x17, KeyU: 0x18, KeyV: 0x19, KeyW: 0x1a, KeyX: 0x1b,
  KeyY: 0x1c, KeyZ: 0x1d,
  Digit1: 0x1e, Digit2: 0x1f, Digit3: 0x20, Digit4: 0x21, Digit5: 0x22,
  Digit6: 0x23, Digit7: 0x24, Digit8: 0x25, Digit9: 0x26, Digit0: 0x27,
  Enter: 0x28, Escape: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c,
  Minus: 0x2d, Equal: 0x2e, BracketLeft: 0x2f, BracketRight: 0x30,
  Backslash: 0x31, Semicolon: 0x33, Quote: 0x34, Backquote: 0x35,
  Comma: 0x36, Period: 0x37, Slash: 0x38, CapsLock: 0x39,
  F1: 0x3a, F2: 0x3b, F3: 0x3c, F4: 0x3d, F5: 0x3e, F6: 0x3f,
  F7: 0x40, F8: 0x41, F9: 0x42, F10: 0x43, F11: 0x44, F12: 0x45,
  PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48, Insert: 0x49,
  Home: 0x4a, PageUp: 0x4b, Delete: 0x4c, End: 0x4d, PageDown: 0x4e,
  ArrowRight: 0x4f, ArrowLeft: 0x50, ArrowDown: 0x51, ArrowUp: 0x52,
  NumLock: 0x53, NumpadDivide: 0x54, NumpadMultiply: 0x55,
  NumpadSubtract: 0x56, NumpadAdd: 0x57, NumpadEnter: 0x58,
  Numpad1: 0x59, Numpad2: 0x5a, Numpad3: 0x5b, Numpad4: 0x5c,
  Numpad5: 0x5d, Numpad6: 0x5e, Numpad7: 0x5f, Numpad8: 0x60,
  Numpad9: 0x61, Numpad0: 0x62, NumpadDecimal: 0x63,
};

const KEY_ALIASES: Record<string, string> = {
  enter: "Enter", return: "Enter", ret: "Enter",
  esc: "Escape", escape: "Escape",
  backspace: "Backspace", bksp: "Backspace",
  tab: "Tab", space: "Space", spacebar: "Space",
  del: "Delete", delete: "Delete",
  ins: "Insert", insert: "Insert",
  home: "Home", end: "End",
  pgup: "PageUp", pageup: "PageUp",
  pgdn: "PageDown", pagedown: "PageDown", pgdown: "PageDown",
  up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
  caps: "CapsLock", capslock: "CapsLock",
  numlock: "NumLock", scrolllock: "ScrollLock", printscreen: "PrintScreen",
  prtsc: "PrintScreen", pause: "Pause", break: "Pause",
  minus: "Minus", equal: "Equal", equals: "Equal",
  semicolon: "Semicolon", quote: "Quote", backquote: "Backquote",
  backtick: "Backquote", tilde: "Backquote",
  comma: "Comma", period: "Period", dot: "Period", slash: "Slash",
  backslash: "Backslash",
};

export function resolveModifier(name: string): number | undefined {
  return MODIFIER_ALIASES[name.trim().toLowerCase()];
}

export function resolveKeycode(name: string): number | undefined {
  const raw = name.trim();
  if (raw.length === 0) return undefined;
  if (raw in KEYCODES) return KEYCODES[raw];

  const lower = raw.toLowerCase();
  if (lower.length === 1 && lower >= "a" && lower <= "z") {
    return KEYCODES[`Key${lower.toUpperCase()}`];
  }
  if (lower.length === 1 && lower >= "0" && lower <= "9") {
    return KEYCODES[`Digit${lower}`];
  }
  const fMatch = /^f(\d{1,2})$/.exec(lower);
  if (fMatch) {
    const n = Number(fMatch[1]);
    if (n >= 1 && n <= 12) return KEYCODES[`F${n}`];
  }
  const aliased = KEY_ALIASES[lower];
  if (aliased && aliased in KEYCODES) return KEYCODES[aliased];
  return undefined;
}

export function buildChord(names: string[]): {
  modifiers: number;
  keys: number[];
} {
  let modifiers = 0;
  const keys: number[] = [];
  for (const raw of names) {
    const mod = resolveModifier(raw);
    if (mod !== undefined) {
      modifiers |= mod;
      continue;
    }
    const code = resolveKeycode(raw);
    if (code === undefined) {
      throw new Error(`unknown key: ${raw}`);
    }
    if (keys.length >= 6) {
      throw new Error("cannot press more than 6 non-modifier keys at once");
    }
    keys.push(code);
  }
  return { modifiers, keys };
}
