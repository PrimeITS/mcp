#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  BackupRadarClient,
  BackupRadarConfig,
  QueryParams,
} from "./backupradar-client.js";

const rawTimeoutMs = process.env.BACKUPRADAR_TIMEOUT_MS
  ? Number.parseInt(process.env.BACKUPRADAR_TIMEOUT_MS, 10)
  : undefined;
const timeoutMs = Number.isFinite(rawTimeoutMs ?? NaN)
  ? rawTimeoutMs
  : undefined;

const config: BackupRadarConfig = {
  baseUrl:
    process.env.BACKUPRADAR_BASE_URL || "https://api-eu.backupradar.com/v2",
  apiKey: process.env.BACKUPRADAR_API_KEY || "",
  apiKeyHeader: process.env.BACKUPRADAR_API_KEY_HEADER || "ApiKey",
  timeoutMs,
  userAgent: process.env.BACKUPRADAR_USER_AGENT,
};

if (!config.apiKey) {
  console.error("Missing required environment variable BACKUPRADAR_API_KEY.");
  console.error(
    "Set BACKUPRADAR_API_KEY and optionally BACKUPRADAR_BASE_URL, BACKUPRADAR_API_KEY_HEADER, BACKUPRADAR_TIMEOUT_MS, BACKUPRADAR_USER_AGENT."
  );
  process.exit(1);
}

const backupRadarClient = new BackupRadarClient(config);

const server = new Server(
  {
    name: "backupradar-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools: Tool[] = [
  {
    name: "backupradar_list_backups",
    description:
      "List backups (/backups) with optional filters for company, device, status, and pagination. Mirrors the mocked BackupRadar endpoint.",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "number",
          description: "Page number to request (default: 1).",
        },
        size: {
          type: "number",
          description: "Number of records to return (default: 3).",
        },
        searchCompanyName: {
          type: "string",
          description: "Filter by company name.",
        },
        searchDeviceName: {
          type: "string",
          description: "Filter by device name.",
        },
        searchJobName: { type: "string", description: "Filter by job name." },
        searchBackupMethod: {
          type: "string",
          description: "Filter by backup method.",
        },
        searchTag: { type: "string", description: "Filter by tag." },
        searchTooltip: {
          type: "string",
          description: "Search in tooltip/notes.",
        },
        searchString: { type: "string", description: "Generic search text." },
        date: {
          type: "string",
          description:
            "Optional ISO date stamp used by the mock for history entries.",
        },
        daysWithoutSuccess: {
          type: "number",
          description: "Minimum days without a successful run.",
        },
        historyDays: {
          type: "number",
          description: "Number of days of history to include (mock hint).",
        },
        filterScheduled: {
          type: "boolean",
          description: "Set true to request only scheduled backups.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Restrict to specific tags.",
        },
        statuses: {
          type: "array",
          items: { type: "string" },
          description: "Restrict to specific statuses.",
        },
        policyIds: {
          type: "array",
          items: { type: "string" },
          description: "Return specific backup IDs only.",
        },
      },
    },
  },
  {
    name: "backupradar_get_backup",
    description: "Retrieve a single backup record (/backups/{backupId}).",
    inputSchema: {
      type: "object",
      properties: {
        backupId: { type: "string", description: "Backup identifier." },
        date: {
          type: "string",
          description: "Optional ISO date to influence mock history.",
        },
      },
      required: ["backupId"],
    },
  },
  {
    name: "backupradar_get_backup_results",
    description:
      "Retrieve backup execution results (/backups/{backupId}/results).",
    inputSchema: {
      type: "object",
      properties: {
        backupId: { type: "string", description: "Backup identifier." },
        date: {
          type: "string",
          description: "Optional ISO date to seed mock results.",
        },
      },
      required: ["backupId"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

function getArg<T = unknown>(
  args: Record<string, unknown> | undefined,
  key: string,
  defaultValue?: T
): T | undefined {
  if (!args || typeof args !== "object") {
    return defaultValue;
  }
  if (Object.prototype.hasOwnProperty.call(args, key)) {
    return (args as Record<string, T | undefined>)[key];
  }
  return defaultValue;
}

function requireArg<T = unknown>(
  args: Record<string, unknown> | undefined,
  key: string
): T {
  const value = getArg<T>(args, key);
  if (value === undefined || value === null) {
    throw new Error(`Missing required argument: ${key}`);
  }
  return value;
}

type ScalarQueryValue = string | number | boolean | Date;
function normalizeScalar(value: unknown): ScalarQueryValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return String(value);
}

function normalizeQueryValue(
  value: unknown
): ScalarQueryValue | ScalarQueryValue[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => normalizeScalar(entry))
      .filter((entry): entry is ScalarQueryValue => entry !== undefined);

    return normalized.length > 0 ? normalized : undefined;
  }

  return normalizeScalar(value);
}

function mapArgsToQuery(
  args: Record<string, unknown> | undefined,
  mapping: Record<string, string>
): QueryParams | undefined {
  if (!args) return undefined;
  const query: QueryParams = {};

  Object.entries(mapping).forEach(([argKey, queryKey]) => {
    const rawValue = getArg(args, argKey);
    const fallbackValue =
      argKey === queryKey ? undefined : getArg(args, queryKey);
    const value = normalizeQueryValue(rawValue ?? fallbackValue);
    if (value !== undefined) {
      query[queryKey] = value;
    }
  });

  return Object.keys(query).length > 0 ? query : undefined;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let response: unknown;

    switch (name) {
      case "backupradar_list_backups":
        {
          const query: QueryParams = {};

          const setIfPresent = (keys: string[], targetKey: string) => {
            if (!args) return;
            for (const key of keys) {
              const val = getArg(args, key);
              if (val !== undefined && val !== null) {
                const normalized = normalizeQueryValue(val);
                if (normalized !== undefined) {
                  query[targetKey] = normalized;
                  return;
                }
              }
            }
          };

          // Correct, Mockoon-compatible param names (case-sensitive)
          setIfPresent(["page", "Page"], "Page");
          setIfPresent(["size", "Size"], "Size");

          setIfPresent(
            ["searchCompanyName", "searchByCompanyName", "SearchByCompanyName"],
            "searchCompanyName"
          );
          setIfPresent(
            ["searchDeviceName", "searchByDeviceName", "SearchByDeviceName"],
            "searchDeviceName"
          );
          setIfPresent(
            ["searchJobName", "searchByJobName", "SearchByJobName"],
            "searchJobName"
          );
          setIfPresent(
            [
              "searchBackupMethod",
              "searchByBackupMethod",
              "SearchByBackupMethod",
            ],
            "searchBackupMethod"
          );

          setIfPresent(
            ["searchTooltip", "searchByTooltip", "SearchByTooltip"],
            "searchTooltip"
          );
          setIfPresent(
            ["searchTag", "searchByTag", "SearchByTag"],
            "searchTag"
          );
          setIfPresent(["searchString", "SearchString"], "searchString");

          setIfPresent(["date", "Date"], "date");
          setIfPresent(
            ["daysWithoutSuccess", "DaysWithoutSuccess"],
            "daysWithoutSuccess"
          );
          setIfPresent(["historyDays", "HistoryDays"], "historyDays");
          setIfPresent(
            ["filterScheduled", "FilterScheduled"],
            "filterScheduled"
          );

          setIfPresent(["tags", "Tags"], "tags");
          setIfPresent(["statuses", "Statuses"], "statuses");
          setIfPresent(["policyIds", "PolicyIds"], "policyIds");

          response = await backupRadarClient.listBackups(
            Object.keys(query).length ? query : undefined
          );
        }
        break;
      case "backupradar_get_backup":
        response = await backupRadarClient.getBackup(
          requireArg<string | number>(args, "backupId"),
          mapArgsToQuery(args, { date: "date" })
        );
        break;
      case "backupradar_get_backup_results":
        response = await backupRadarClient.getBackupResults(
          requireArg<string | number>(args, "backupId"),
          mapArgsToQuery(args, { date: "date" })
        );
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
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
  console.error("Server error:", error);
  process.exit(1);
});
