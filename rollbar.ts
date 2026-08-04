import type { PluginAPI } from "@ampcode/plugin";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type RollbarEnvironment = "qa" | "staging" | "prod";

const DEFAULT_API_BASE_URL = "https://api.rollbar.com";
const MAX_OUTPUT_BYTES = 50 * 1024;
const MAX_OUTPUT_LINES = 2000;
const MAX_REDIRECTS = 5;
const TOKEN_ENVIRONMENT_VARIABLES: Record<RollbarEnvironment, string> = {
  qa: "ROLLBAR_QA_ACCESS_TOKEN",
  staging: "ROLLBAR_STAGING_ACCESS_TOKEN",
  prod: "ROLLBAR_PROD_ACCESS_TOKEN",
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizedApiBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("ROLLBAR_API_BASE_URL must use HTTPS");
  if (url.username || url.password) {
    throw new Error("ROLLBAR_API_BASE_URL must not contain credentials");
  }
  if (url.search || url.hash) {
    throw new Error("ROLLBAR_API_BASE_URL must not contain a query string or fragment");
  }
  return url.origin + url.pathname.replace(/\/+$/, "");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatResult(value: Json): string {
  const output = JSON.stringify(value, null, 2);
  const allLines = output.split("\n");
  const totalBytes = Buffer.byteLength(output);
  if (allLines.length <= MAX_OUTPUT_LINES && totalBytes <= MAX_OUTPUT_BYTES) return output;

  const lineLimited = allLines.slice(0, MAX_OUTPUT_LINES).join("\n");
  const encoded = new TextEncoder().encode(lineLimited);
  let end = Math.min(encoded.length, MAX_OUTPUT_BYTES);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let content = "";
  while (!content) {
    try {
      content = decoder.decode(encoded.subarray(0, end));
    } catch {
      end -= 1;
    }
  }
  const outputLines = content.split("\n").length;
  return `${content}\n\n[Output truncated: ${outputLines} of ${allLines.length} lines (${formatSize(end)} of ${formatSize(totalBytes)}).]`;
}

export default function rollbarPlugin(amp: PluginAPI) {
  async function credentials(
    environment: RollbarEnvironment,
  ): Promise<{ apiBaseUrl: string; token: string }> {
    const config = await amp.configuration.get();
    const tokenEnvironmentVariable = TOKEN_ENVIRONMENT_VARIABLES[environment];
    const token =
      process.env[tokenEnvironmentVariable] ??
      text(config[`rollbar.${environment}.accessToken`]);
    const configuredBaseUrl =
      process.env.ROLLBAR_API_BASE_URL ?? text(config["rollbar.apiBaseUrl"]);

    if (!token) {
      throw new Error(
        `Configure ${tokenEnvironmentVariable} or the Amp setting amp.rollbar.${environment}.accessToken with a read-scoped Rollbar token`,
      );
    }
    return {
      apiBaseUrl: normalizedApiBaseUrl(configuredBaseUrl || DEFAULT_API_BASE_URL),
      token,
    };
  }

  async function request(path: string, environment: RollbarEnvironment): Promise<Json> {
    const { apiBaseUrl, token } = await credentials(environment);
    const allowedOrigin = new URL(apiBaseUrl).origin;
    let url = new URL(`${apiBaseUrl}${path}`);

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Rollbar-Access-Token": token,
        },
        redirect: "manual",
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (location) {
          if (redirects === MAX_REDIRECTS) {
            throw new Error(`Rollbar API exceeded ${MAX_REDIRECTS} redirects`);
          }
          const nextUrl = new URL(location, url);
          if (nextUrl.origin !== allowedOrigin) {
            throw new Error("Rollbar API refused a redirect outside the configured origin");
          }
          await response.body?.cancel();
          url = nextUrl;
          continue;
        }
      }

      const raw = await response.text();
      let body: Json = null;
      if (raw) {
        try {
          body = JSON.parse(raw) as Json;
        } catch {
          body = raw;
        }
      }
      if (!response.ok) {
        throw new Error(
          `Rollbar API ${response.status} ${response.statusText}: ${formatResult(body)}`,
        );
      }
      return body;
    }

    throw new Error(`Rollbar API exceeded ${MAX_REDIRECTS} redirects`);
  }

  amp.registerTool({
    name: "rollbar_get",
    description:
      "Make one authenticated GET request to a Rollbar API path. This tool is read-only and may truncate large output.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Rollbar API path beginning with /, for example /api/1/items or /api/1/instance/12345",
        },
        environment: {
          type: "string",
          enum: ["qa", "staging", "prod"],
          default: "prod",
          description:
            "Credential environment. Selects the matching Rollbar project token and defaults to prod.",
        },
        query: {
          type: "object",
          description:
            "Optional query parameters. Array values are encoded as repeated parameters.",
          additionalProperties: {
            oneOf: [
              { type: "string" },
              { type: "number" },
              { type: "boolean" },
              {
                type: "array",
                items: {
                  oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
                },
              },
            ],
          },
        },
      },
      required: ["path"],
    },
    async execute(input) {
      const params = input as {
        path: string;
        environment?: RollbarEnvironment;
        query?: Record<
          string,
          string | number | boolean | Array<string | number | boolean>
        >;
      };
      const sentinelOrigin = "https://rollbar.invalid";
      if (!params.path.startsWith("/")) throw new Error("Rollbar API path must begin with /");
      const url = new URL(params.path, sentinelOrigin);
      if (url.origin !== sentinelOrigin) {
        throw new Error("Rollbar API path must be relative to the configured origin");
      }
      for (const [name, rawValue] of Object.entries(params.query ?? {})) {
        url.searchParams.delete(name);
        const values = Array.isArray(rawValue) ? rawValue : [rawValue];
        for (const value of values) url.searchParams.append(name, String(value));
      }
      return formatResult(
        await request(`${url.pathname}${url.search}`, params.environment ?? "prod"),
      );
    },
  });
}
