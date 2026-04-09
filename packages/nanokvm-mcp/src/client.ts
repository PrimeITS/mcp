import WebSocket from "ws";
import { encryptForNanoKvm } from "./crypto.js";

export interface NanoKvmConfig {
  host: string;
  username: string;
  password: string;
}

interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

export interface DeviceInfo {
  ips: Array<{ name: string; addr: string; version: string; type: string }>;
  mdns: string;
  image: string;
  application: string;
  deviceKey: string;
}

export interface GpioState {
  pwr: boolean;
  hdd: boolean;
}

export type GpioAction = "power" | "reset";

export class NanoKvmError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "NanoKvmError";
  }
}

export class NanoKvmClient {
  private readonly baseUrl: string;
  private token: string | null = null;

  // MJPEG frame cache: keep a warm stream so screenshots return instantly.
  private frameStreamActive = false;
  private latestFrame: Buffer | null = null;
  private lastFrameAccess = 0;
  private frameWaiters: Array<(frame: Buffer | null) => void> = [];
  private readonly frameIdleMs = 30_000;

  constructor(private readonly config: NanoKvmConfig) {
    this.baseUrl = config.host.replace(/\/+$/, "");
  }

  /**
   * Authenticate with the NanoKVM. Username is sent in plaintext (the server
   * compares it directly) while the password is encrypted with the same
   * CryptoJS-compatible AES scheme the web UI uses.
   */
  async login(): Promise<void> {
    const body = JSON.stringify({
      username: this.config.username,
      password: encryptForNanoKvm(this.config.password),
    });
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const json = (await res.json()) as ApiEnvelope<{ token: string }>;
    if (json.code !== 0) {
      throw new NanoKvmError(`login failed: ${json.msg}`, json.code);
    }
    this.token = json.data.token;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    { form = false }: { form?: boolean } = {},
  ): Promise<T> {
    if (!this.token) await this.login();
    const doRequest = async () => {
      const headers: Record<string, string> = {
        Cookie: `nano-kvm-token=${this.token}`,
      };
      let encodedBody: string | undefined;
      if (body !== undefined) {
        if (form) {
          headers["content-type"] = "application/x-www-form-urlencoded";
          encodedBody = new URLSearchParams(
            body as Record<string, string>,
          ).toString();
        } else {
          headers["content-type"] = "application/json";
          encodedBody = JSON.stringify(body);
        }
      }
      return fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: encodedBody,
      });
    };

    let res = await doRequest();
    if (res.status === 401) {
      // Token expired — re-authenticate once and retry.
      this.token = null;
      await this.login();
      res = await doRequest();
    }

    const json = (await res.json()) as ApiEnvelope<T>;
    if (json.code !== 0) {
      throw new NanoKvmError(
        `${method} ${path} failed: ${json.msg}`,
        json.code,
      );
    }
    return json.data;
  }

  getInfo(): Promise<DeviceInfo> {
    return this.request<DeviceInfo>("GET", "/api/vm/info");
  }

  getHardware(): Promise<{ version: string }> {
    return this.request("GET", "/api/vm/hardware");
  }

  getGpio(): Promise<GpioState> {
    return this.request<GpioState>("GET", "/api/vm/gpio");
  }

  /**
   * Press the power or reset button for `durationMs` milliseconds. The NanoKVM
   * toggles the target motherboard header line for the given duration. Short
   * presses (~300ms) simulate a tap; long presses (5000ms+) simulate a hold.
   */
  pressButton(type: GpioAction, durationMs: number): Promise<void> {
    return this.request("POST", "/api/vm/gpio", {
      Type: type,
      Duration: durationMs,
    });
  }

  getHdmiState(): Promise<{ enabled: boolean }> {
    return this.request("GET", "/api/vm/hdmi");
  }

  enableHdmi(): Promise<void> {
    return this.request("POST", "/api/vm/hdmi/enable");
  }

  disableHdmi(): Promise<void> {
    return this.request("POST", "/api/vm/hdmi/disable");
  }

  resetHdmi(): Promise<void> {
    return this.request("POST", "/api/vm/hdmi/reset");
  }

  getSshState(): Promise<{ enabled: boolean }> {
    return this.request("GET", "/api/vm/ssh");
  }

  enableSsh(): Promise<void> {
    return this.request("POST", "/api/vm/ssh/enable");
  }

  disableSsh(): Promise<void> {
    return this.request("POST", "/api/vm/ssh/disable");
  }

  getMouseJiggler(): Promise<{ enabled: boolean; mode: string }> {
    return this.request("GET", "/api/vm/mouse-jiggler");
  }

  rebootSystem(): Promise<void> {
    return this.request("POST", "/api/vm/system/reboot");
  }

  /**
   * Type a string at the emulated USB keyboard. Optionally pass a language
   * code (e.g. "de") to remap to a non-US keyboard layout.
   */
  pasteText(content: string, langue?: string): Promise<void> {
    const body: Record<string, string> = { content };
    if (langue) body.langue = langue;
    return this.request("POST", "/api/hid/paste", body, { form: true });
  }

  resetHid(): Promise<void> {
    return this.request("POST", "/api/hid/reset");
  }

  getApplicationVersion(): Promise<{ current: string; latest?: string }> {
    return this.request("GET", "/api/application/version");
  }

  /**
   * Return the most recent JPEG frame from the NanoKVM's MJPEG HDMI stream.
   * Lazily starts a background stream reader on first call and keeps it warm
   * for `frameIdleMs` after the last access so subsequent screenshots return
   * the cached frame instantly. The stream auto-closes while idle.
   */
  async screenshot(): Promise<Buffer> {
    this.lastFrameAccess = Date.now();
    this.ensureFrameStream();

    if (this.latestFrame) return this.latestFrame;

    return new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.frameWaiters.indexOf(onFrame);
        if (idx >= 0) this.frameWaiters.splice(idx, 1);
        reject(new NanoKvmError("timed out waiting for mjpeg frame"));
      }, 5000);

      const onFrame = (frame: Buffer | null) => {
        clearTimeout(timer);
        if (frame) resolve(frame);
        else reject(new NanoKvmError("mjpeg stream closed before first frame"));
      };

      this.frameWaiters.push(onFrame);
    });
  }

  private ensureFrameStream(): void {
    if (this.frameStreamActive) return;
    this.frameStreamActive = true;
    void this.runFrameStreamLoop();
  }

  private notifyFrameWaiters(frame: Buffer | null): void {
    const waiters = this.frameWaiters.splice(0);
    for (const w of waiters) w(frame);
  }

  private async runFrameStreamLoop(): Promise<void> {
    const SOI = Buffer.from([0xff, 0xd8]);
    const EOI = Buffer.from([0xff, 0xd9]);

    try {
      while (Date.now() - this.lastFrameAccess < this.frameIdleMs) {
        if (!this.token) await this.login();

        const res = await fetch(`${this.baseUrl}/api/stream/mjpeg`, {
          headers: { Cookie: `nano-kvm-token=${this.token}` },
        });
        if (res.status === 401) {
          this.token = null;
          continue;
        }
        if (!res.ok || !res.body) {
          throw new NanoKvmError(`mjpeg stream failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        let pending = Buffer.alloc(0);
        try {
          while (Date.now() - this.lastFrameAccess < this.frameIdleMs) {
            const { value, done } = await reader.read();
            if (done) break;
            if (!value || value.length === 0) continue;

            pending = Buffer.concat([pending, value]);

            // Extract every complete JPEG frame in the buffer.
            while (true) {
              const soi = pending.indexOf(SOI);
              if (soi < 0) {
                // No start marker anywhere — drop everything, keep last byte
                // in case a marker is split across the next chunk.
                pending =
                  pending.length > 0
                    ? pending.subarray(pending.length - 1)
                    : pending;
                break;
              }
              const eoi = pending.indexOf(EOI, soi + 2);
              if (eoi < 0) {
                if (soi > 0) pending = pending.subarray(soi);
                break;
              }
              this.latestFrame = Buffer.from(pending.subarray(soi, eoi + 2));
              pending = pending.subarray(eoi + 2);
              this.notifyFrameWaiters(this.latestFrame);
            }
          }
        } finally {
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      // On failure, fail any pending waiters so they don't hang.
      this.notifyFrameWaiters(null);
    } finally {
      this.frameStreamActive = false;
      // Clear the cached frame so a new stream starts fresh next time.
      this.latestFrame = null;
    }
  }

  /**
   * Open an authenticated WebSocket to /api/ws and pass it to `fn`. The
   * connection is closed after `fn` resolves or throws.
   */
  private async withHidSocket<T>(fn: (ws: WebSocket) => Promise<T>): Promise<T> {
    if (!this.token) await this.login();

    const wsUrl =
      this.baseUrl.replace(/^http/i, (m) =>
        m.toLowerCase() === "https" ? "wss" : "ws",
      ) + "/api/ws";

    const ws = new WebSocket(wsUrl, {
      headers: { Cookie: `nano-kvm-token=${this.token}` },
    });

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        ws.off("error", onError);
        resolve();
      };
      const onError = (err: Error) => {
        ws.off("open", onOpen);
        reject(err);
      };
      ws.once("open", onOpen);
      ws.once("error", onError);
    });

    try {
      return await fn(ws);
    } finally {
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  }

  private wsSend(ws: WebSocket, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) =>
      ws.send(data, (err) => (err ? reject(err) : resolve())),
    );
  }

  /**
   * Send a single keyboard chord over the /api/ws WebSocket. `modifiers` is
   * the HID modifier bitmap, `keys` is up to 6 HID usage codes. The chord is
   * pressed, held for `holdMs`, then released.
   */
  async sendKeys(
    modifiers: number,
    keys: number[],
    holdMs = 50,
  ): Promise<void> {
    await this.withHidSocket(async (ws) => {
      const press = Buffer.alloc(9);
      press[0] = 1; // KeyboardEvent
      press[1] = modifiers & 0xff;
      press[2] = 0;
      for (let i = 0; i < keys.length && i < 6; i++) {
        press[3 + i] = keys[i] & 0xff;
      }

      const release = Buffer.alloc(9);
      release[0] = 1;

      await this.wsSend(ws, press);
      await new Promise((r) => setTimeout(r, Math.max(0, holdMs)));
      await this.wsSend(ws, release);
      await new Promise((r) => setTimeout(r, 20));
    });
  }

  // ----- Mouse -----

  // Last absolute cursor position (normalized 0..1). Used as the default
  // for clicks/scrolls that don't specify coordinates.
  private lastMouseX = 0.5;
  private lastMouseY = 0.5;

  private static readonly MOUSE_BUTTON_BITS: Record<string, number> = {
    left: 1 << 0,
    right: 1 << 1,
    middle: 1 << 2,
    back: 1 << 3,
    forward: 1 << 4,
  };

  static resolveMouseButton(name: string): number {
    const bit = NanoKvmClient.MOUSE_BUTTON_BITS[name.trim().toLowerCase()];
    if (bit === undefined) throw new Error(`unknown mouse button: ${name}`);
    return bit;
  }

  private buildAbsoluteMouseReport(
    buttons: number,
    x: number,
    y: number,
    wheel = 0,
  ): Buffer {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const xi = Math.round(clamp01(x) * 32767);
    const yi = Math.round(clamp01(y) * 32767);
    const msg = Buffer.alloc(7);
    msg[0] = 2; // MouseEvent
    msg[1] = buttons & 0xff;
    msg[2] = xi & 0xff;
    msg[3] = (xi >> 8) & 0xff;
    msg[4] = yi & 0xff;
    msg[5] = (yi >> 8) & 0xff;
    msg[6] = wheel & 0xff; // signed 8-bit wraps via & 0xff
    return msg;
  }

  private buildRelativeMouseReport(
    buttons: number,
    dx: number,
    dy: number,
    wheel = 0,
  ): Buffer {
    const clampI8 = (v: number) => Math.max(-127, Math.min(127, Math.round(v)));
    const msg = Buffer.alloc(5);
    msg[0] = 2; // MouseEvent
    msg[1] = buttons & 0xff;
    msg[2] = clampI8(dx) & 0xff;
    msg[3] = clampI8(dy) & 0xff;
    msg[4] = clampI8(wheel) & 0xff;
    return msg;
  }

  /**
   * Move the cursor to an absolute (x, y) position. x and y are normalized
   * to the range [0, 1] — (0,0) is the top-left corner of the captured
   * display, (1,1) is the bottom-right.
   */
  async mouseMoveAbsolute(x: number, y: number): Promise<void> {
    await this.withHidSocket(async (ws) => {
      await this.wsSend(ws, this.buildAbsoluteMouseReport(0, x, y, 0));
    });
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  /**
   * Click a mouse button at an absolute (x, y) position. If x/y are omitted
   * the click happens at the last known cursor position. Set `double=true`
   * for a double-click.
   */
  async mouseClickAbsolute(
    buttonBit: number,
    x?: number,
    y?: number,
    double = false,
  ): Promise<void> {
    const targetX = x ?? this.lastMouseX;
    const targetY = y ?? this.lastMouseY;

    await this.withHidSocket(async (ws) => {
      // Move first so the click lands at the right spot.
      await this.wsSend(ws, this.buildAbsoluteMouseReport(0, targetX, targetY));
      await new Promise((r) => setTimeout(r, 10));

      const clicks = double ? 2 : 1;
      for (let i = 0; i < clicks; i++) {
        await this.wsSend(
          ws,
          this.buildAbsoluteMouseReport(buttonBit, targetX, targetY),
        );
        await new Promise((r) => setTimeout(r, 40));
        await this.wsSend(ws, this.buildAbsoluteMouseReport(0, targetX, targetY));
        if (i < clicks - 1) await new Promise((r) => setTimeout(r, 60));
      }
      await new Promise((r) => setTimeout(r, 20));
    });

    this.lastMouseX = targetX;
    this.lastMouseY = targetY;
  }

  /**
   * Scroll the wheel by `delta` ticks (positive = up, negative = down).
   * Uses the relative-mouse HID report so the cursor position is unaffected.
   */
  async mouseScroll(delta: number): Promise<void> {
    await this.withHidSocket(async (ws) => {
      await this.wsSend(ws, this.buildRelativeMouseReport(0, 0, 0, delta));
      await new Promise((r) => setTimeout(r, 20));
    });
  }
}
