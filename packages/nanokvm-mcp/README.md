# @adamhancock/nanokvm-mcp

MCP server for Sipeed [NanoKVM](https://github.com/sipeed/NanoKVM) devices. Lets an MCP-aware client (Claude, etc.) fully operate a remote machine via the NanoKVM: view the screen, press power/reset, send keystrokes and text, toggle HDMI/SSH, and manage the NanoKVM itself.

Implemented from scratch against the upstream NanoKVM server API — no third-party MCP dependency.

## Install

```
pnpm add -g @adamhancock/nanokvm-mcp
# or use npx
npx @adamhancock/nanokvm-mcp
```

## Configure

The server reads credentials from environment variables:

```
NANOKVM_HOST=http://192.168.x.x
NANOKVM_USERNAME=root
NANOKVM_PASSWORD=...
```

The username is sent plaintext (the NanoKVM server compares it directly); the password is encrypted client-side with the same CryptoJS-compatible AES scheme the web UI uses (see `src/crypto.ts`).

### Claude Desktop / Claude Code

Add to your MCP config (`~/.claude/mcp.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "nanokvm": {
      "command": "npx",
      "args": ["-y", "@adamhancock/nanokvm-mcp"],
      "env": {
        "NANOKVM_HOST": "http://192.168.x.x",
        "NANOKVM_USERNAME": "root",
        "NANOKVM_PASSWORD": "your-password"
      }
    }
  }
}
```

## Tools

### Display

| Tool | Description |
|---|---|
| `nanokvm_screenshot` | Capture a single JPEG frame from the HDMI MJPEG stream and return it as an image |
| `nanokvm_get_hdmi_state` | Check whether HDMI capture is enabled |
| `nanokvm_set_hdmi` | Enable / disable / reset HDMI capture |

### Keyboard

| Tool | Description |
|---|---|
| `nanokvm_send_keys` | Send a single keyboard chord (press + hold + release). Accepts friendly names: modifiers (`ctrl`, `shift`, `alt`, `meta`/`win`/`cmd`, `rctrl`, `ralt`, `altgr`, …) and keys (`a`–`z`, `0`–`9`, `f1`–`f12`, `enter`, `esc`, `tab`, `space`, `backspace`, `del`, `ins`, `home`, `end`, `pgup`, `pgdn`, `up`/`down`/`left`/`right`, …) or event.code-style names (`KeyA`, `Digit1`, `ArrowLeft`). Example: `["ctrl","alt","del"]`. |
| `nanokvm_paste_text` | Type a string of text at the emulated USB keyboard, with optional layout code (e.g. `de`) |
| `nanokvm_reset_hid` | Reset the emulated HID (keyboard/mouse) if input appears stuck |

### Power / target machine

| Tool | Description |
|---|---|
| `nanokvm_get_power_state` | Read the target's power/HDD LED state via GPIO (note: on Beta hardware the power line may not be wired, so `pwr=false` does not always mean "off") |
| `nanokvm_press_power` | Press the power button. ~300ms = tap (power on / sleep), 5000ms+ = force-off hold |
| `nanokvm_press_reset` | Press the reset button |

### NanoKVM device

| Tool | Description |
|---|---|
| `nanokvm_get_info` | Device info: IPs, mDNS name, firmware image, app version, device key |
| `nanokvm_get_hardware` | Hardware version (PCIe / Lite / Full / Beta) |
| `nanokvm_get_ssh_state` / `nanokvm_set_ssh` | Enable / disable SSH on the NanoKVM itself |
| `nanokvm_reboot_device` | Reboot the NanoKVM itself (not the target) — expect ~30s offline |

## How it works

- **Auth**: `POST /api/auth/login` → JWT cookie, auto re-login on 401.
- **HDMI**: opens `/api/stream/mjpeg`, scans the multipart stream for the first `FFD8…FFD9` JPEG boundary, cancels the stream, returns the frame.
- **Keystrokes**: opens a WebSocket to `/api/ws` (with the auth cookie) and writes the 9-byte `[1, modifiers, 0, k1..k6]` HID report, waits `holdMs`, then writes a release report. Uses the [`ws`](https://www.npmjs.com/package/ws) package since Node's built-in `WebSocket` can't attach a `Cookie` header.
- **Everything else**: thin wrappers around `/api/vm/*` and `/api/hid/*`.

## Dev

```
pnpm install
pnpm --filter @adamhancock/nanokvm-mcp dev
pnpm --filter @adamhancock/nanokvm-mcp inspector
pnpm --filter @adamhancock/nanokvm-mcp build
```

## License

MIT
