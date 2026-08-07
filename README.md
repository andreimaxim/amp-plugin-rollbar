# Rollbar for Amp

An [Amp](https://ampcode.com) plugin for read-only Rollbar investigations.

## How it works

The plugin intentionally provides two read-only tools:

- `rollbar_list_environments` lists configured credential environments without exposing tokens.
- `rollbar_get` makes an authenticated `GET` request to a Rollbar API path.

The accompanying `using-rollbar` skill teaches Amp how to list and inspect items and occurrences, paginate results, interpret payload evidence, and correlate errors with source code. The plugin does not support writes, `POST` requests, or RQL.

Responses are limited to 2,000 lines and 50 KiB, with an explicit notice when output is truncated. Request paths and redirects are confined to the configured HTTPS origin so the Rollbar token is not forwarded elsewhere.

## Other agents

This integration deliberately uses a small HTTP client and a focused skill instead of depending on an official Rollbar MCP server or CLI. That keeps the tool surface limited to the operations you need, reduces API discovery, and makes the skill easy to customize. Official MCPs, CLIs, and API clients can still serve as canonical references when implementing the limited feature set.

Pass this prompt to an agent harness such as Claude Code or Codex:

```text
Build a native plugin for your agent harness equivalent to this Amp Rollbar plugin:

https://github.com/andreimaxim/amp-plugin-rollbar

Read its source code, README, and `using-rollbar` skill. Reimplement it using your harness's native plugin conventions.

Do not wrap or depend on an official Rollbar MCP server or CLI. Build a small HTTP client that inserts the Rollbar base URL and authentication token automatically, expose only the two read-only operations in the Amp plugin, and port the skill describing common Rollbar investigations with sample payloads. Official MCPs, CLIs, and API clients may be consulted as canonical references, but they should not become runtime dependencies.

The Amp implementation reads tokens from environment variables such as `ROLLBAR_PROD_ACCESS_TOKEN` and user-level settings such as `amp.rollbar.prod.accessToken`, with environment variables taking precedence. It also supports a configurable API base URL. Translate these mechanisms into the closest secure, user-level equivalents offered by your harness.

For context, Amp plugins are TypeScript modules that register tools through `amp.registerTool(...)`, read user configuration through `amp.configuration.get()`, and can include skills under `.agents/skills/`. The detailed Amp plugin API is documented at https://ampcode.com/manual/plugin-api.

Preserve the original implementation's read-only behavior, security constraints, output limits, and skill guidance. Add concise setup documentation and appropriate tests, then validate it using your harness's native plugin workflow.
```

## Configuration

Create a Rollbar **Project Access Token** with only the `read` scope for each environment. Then edit `~/.config/amp/settings.json`:

```json
{
  "amp.rollbar.qa.accessToken": "your-qa-read-token",
  "amp.rollbar.staging.accessToken": "your-staging-read-token",
  "amp.rollbar.prod.accessToken": "your-prod-read-token"
}
```

Every request can select a configured credential environment. Use `rollbar_list_environments` to discover the available values. Requests that omit the credential environment use `prod`.

The API base URL defaults to `https://api.rollbar.com`. Custom or proxied API endpoints can override it:

```json
{
  "amp.rollbar.apiBaseUrl": "https://api.rollbar.com"
}
```

Environment variables named `ROLLBAR_<ENVIRONMENT>_ACCESS_TOKEN` take precedence over Amp settings. The plugin discovers these variables when it loads and exposes their lowercased environment segments as credential environments. For example:

- `ROLLBAR_QA_ACCESS_TOKEN` provides `qa`
- `ROLLBAR_STAGING_ACCESS_TOKEN` provides `staging`
- `ROLLBAR_PROD_ACCESS_TOKEN` provides `prod`

The API base URL can also be set with:

- `ROLLBAR_API_BASE_URL`
