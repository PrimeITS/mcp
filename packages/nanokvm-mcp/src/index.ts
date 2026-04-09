#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NanoKvmClient, type GpioAction } from "./client.js";
import { buildChord } from "./keymap.js";

const server = new Server(
  { name: "nanokvm-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

let client: NanoKvmClient | null = null;

function getClient(): NanoKvmClient {
  if (client) return client;
  const host = process.env.NANOKVM_HOST;
  const username = process.env.NANOKVM_USERNAME;
  const password = process.env.NANOKVM_PASSWORD;
  if (!host || !username || !password) {
    throw new Error(
      "NANOKVM_HOST, NANOKVM_USERNAME and NANOKVM_PASSWORD environment variables are required",
    );
  }
  client = new NanoKvmClient({ host, username, password });
  return client;
}

const tools: Tool[] = [
  {
    name: "nanokvm_get_info",
    description:
      "Get NanoKVM device information: IP addresses, mDNS name, firmware image, application version, and device key.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "nanokvm_get_hardware",
    description: "Get the NanoKVM hardware version (e.g. PCIe, Lite, Full).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "nanokvm_get_power_state",
    description:
      "Read the target machine's power and HDD LED state (as reported via GPIO). `pwr=true` means the target is powered on.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "nanokvm_press_power",
    description:
      "Press the target machine's power button for the given duration in milliseconds. Use ~300ms for a short press (tap to power on/sleep), 5000ms+ for a force-off long press.",
    inputSchema: {
      type: "object",
      properties: {
        durationMs: {
          type: "number",
          description:
            "How long to hold the power button (milliseconds). Default 300.",
        },
      },
    },
  },
  {
    name: "nanokvm_press_reset",
    description:
      "Press the target machine's reset button for the given duration in milliseconds.",
    inputSchema: {
      type: "object",
      properties: {
        durationMs: {
          type: "number",
          description:
            "How long to hold the reset button (milliseconds). Default 300.",
        },
      },
    },
  },
  {
    name: "nanokvm_get_hdmi_state",
    description:
      "Check whether the NanoKVM's HDMI capture is currently enabled.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "nanokvm_set_hdmi",
    description: "Enable, disable, or reset HDMI capture on the NanoKVM.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["enable", "disable", "reset"],
        },
      },
      required: ["action"],
    },
  },
  {
    name: "nanokvm_get_ssh_state",
    description: "Check whether SSH is enabled on the NanoKVM itself.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "nanokvm_set_ssh",
    description: "Enable or disable SSH on the NanoKVM.",
    inputSchema: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
      },
      required: ["enabled"],
    },
  },
  {
    name: "nanokvm_paste_text",
    description:
      "Type text at the emulated USB keyboard, as if the user typed it on the target machine.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Text to type." },
        langue: {
          type: "string",
          description:
            "Optional keyboard layout code (e.g. 'de'). Defaults to US.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "nanokvm_reset_hid",
    description:
      "Reset the NanoKVM's emulated HID (keyboard/mouse) if input appears stuck.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "nanokvm_screenshot",
    description:
      "Capture a single frame from the NanoKVM's HDMI MJPEG stream and return it as an image. Requires HDMI capture to be enabled.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "nanokvm_send_keys",
    description:
      "Send a single keyboard chord to the target machine (press, hold, release). Accepts modifier names (ctrl, shift, alt, meta/win/cmd, rctrl, rshift, ralt, rmeta, altgr) and key names (a-z, 0-9, f1-f12, enter, esc, tab, space, backspace, del, ins, home, end, pgup, pgdn, up/down/left/right, etc., or event.code-style names like KeyA, Digit1, ArrowLeft). Example: ['ctrl','alt','del'].",
    inputSchema: {
      type: "object",
      properties: {
        keys: {
          type: "array",
          items: { type: "string" },
          description: "Keys to press together, e.g. ['ctrl','alt','del'].",
        },
        holdMs: {
          type: "number",
          description: "How long to hold the chord before releasing. Default 50ms.",
        },
      },
      required: ["keys"],
    },
  },
  {
    name: "nanokvm_mouse_move",
    description:
      "Move the target machine's mouse cursor to an absolute position. x and y are normalized floats in [0, 1] where (0,0) is top-left and (1,1) is bottom-right of the captured display.",
    inputSchema: {
      type: "object",
      properties: {
        x: { type: "number", description: "X position, 0.0 to 1.0." },
        y: { type: "number", description: "Y position, 0.0 to 1.0." },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "nanokvm_mouse_click",
    description:
      "Click a mouse button on the target machine. If x/y are provided the cursor is moved there first (normalized 0..1); otherwise the click happens at the last known position. Set double=true for a double-click.",
    inputSchema: {
      type: "object",
      properties: {
        button: {
          type: "string",
          enum: ["left", "right", "middle", "back", "forward"],
          description: "Which mouse button to click. Default: left.",
        },
        x: { type: "number", description: "Optional X position, 0.0 to 1.0." },
        y: { type: "number", description: "Optional Y position, 0.0 to 1.0." },
        double: {
          type: "boolean",
          description: "If true, issue a double-click. Default false.",
        },
      },
    },
  },
  {
    name: "nanokvm_mouse_scroll",
    description:
      "Scroll the mouse wheel on the target machine. Positive `delta` scrolls up, negative scrolls down. Range -127 to 127 (one notch is typically 1).",
    inputSchema: {
      type: "object",
      properties: {
        delta: {
          type: "number",
          description: "Wheel delta, -127 to 127. Positive = up.",
        },
      },
      required: ["delta"],
    },
  },
  {
    name: "nanokvm_reboot_device",
    description:
      "Reboot the NanoKVM device itself (not the target machine). The NanoKVM will be offline for ~30s.",
    inputSchema: { type: "object", properties: {} },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args = (rawArgs ?? {}) as Record<string, unknown>;

  try {
    const c = getClient();
    let result: unknown;

    switch (name) {
      case "nanokvm_get_info":
        result = await c.getInfo();
        break;
      case "nanokvm_get_hardware":
        result = await c.getHardware();
        break;
      case "nanokvm_get_power_state":
        result = await c.getGpio();
        break;
      case "nanokvm_press_power": {
        const duration = Number(args.durationMs ?? 300);
        await c.pressButton("power", duration);
        result = { ok: true, action: "power", durationMs: duration };
        break;
      }
      case "nanokvm_press_reset": {
        const duration = Number(args.durationMs ?? 300);
        await c.pressButton("reset", duration);
        result = { ok: true, action: "reset", durationMs: duration };
        break;
      }
      case "nanokvm_get_hdmi_state":
        result = await c.getHdmiState();
        break;
      case "nanokvm_set_hdmi": {
        const action = String(args.action);
        if (action === "enable") await c.enableHdmi();
        else if (action === "disable") await c.disableHdmi();
        else if (action === "reset") await c.resetHdmi();
        else throw new Error(`invalid hdmi action: ${action}`);
        result = { ok: true, action };
        break;
      }
      case "nanokvm_get_ssh_state":
        result = await c.getSshState();
        break;
      case "nanokvm_set_ssh": {
        const enabled = Boolean(args.enabled);
        if (enabled) await c.enableSsh();
        else await c.disableSsh();
        result = { ok: true, enabled };
        break;
      }
      case "nanokvm_paste_text": {
        const content = String(args.content ?? "");
        const langue =
          typeof args.langue === "string" ? args.langue : undefined;
        await c.pasteText(content, langue);
        result = { ok: true, length: content.length };
        break;
      }
      case "nanokvm_reset_hid":
        await c.resetHid();
        result = { ok: true };
        break;
      case "nanokvm_screenshot": {
        const jpeg = await c.screenshot();
        return {
          content: [
            {
              type: "image",
              data: jpeg.toString("base64"),
              mimeType: "image/jpeg",
            },
          ],
        };
      }
      case "nanokvm_send_keys": {
        const rawKeys = Array.isArray(args.keys) ? (args.keys as unknown[]) : [];
        const names = rawKeys.map((k) => String(k));
        if (names.length === 0) throw new Error("keys array cannot be empty");
        const { modifiers, keys } = buildChord(names);
        const holdMs = Number(args.holdMs ?? 50);
        await c.sendKeys(modifiers, keys, holdMs);
        result = {
          ok: true,
          keys: names,
          modifiers,
          keycodes: keys,
          holdMs,
        };
        break;
      }
      case "nanokvm_mouse_move": {
        const x = Number(args.x);
        const y = Number(args.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          throw new Error("x and y are required numbers");
        }
        await c.mouseMoveAbsolute(x, y);
        result = { ok: true, x, y };
        break;
      }
      case "nanokvm_mouse_click": {
        const buttonName =
          typeof args.button === "string" ? args.button : "left";
        const bit = NanoKvmClient.resolveMouseButton(buttonName);
        const x =
          args.x !== undefined && args.x !== null ? Number(args.x) : undefined;
        const y =
          args.y !== undefined && args.y !== null ? Number(args.y) : undefined;
        const double = Boolean(args.double);
        await c.mouseClickAbsolute(bit, x, y, double);
        result = { ok: true, button: buttonName, x, y, double };
        break;
      }
      case "nanokvm_mouse_scroll": {
        const delta = Number(args.delta);
        if (!Number.isFinite(delta)) throw new Error("delta is required");
        await c.mouseScroll(delta);
        result = { ok: true, delta };
        break;
      }
      case "nanokvm_reboot_device":
        await c.rebootSystem();
        result = { ok: true, note: "device rebooting; expect ~30s downtime" };
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("nanokvm-mcp error:", error);
  process.exit(1);
});

// Silence unused type warning.
void ((): GpioAction => "power");
