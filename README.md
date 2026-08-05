# Rollbar for Amp

An [Amp](https://ampcode.com) plugin for read-only Rollbar investigations.

## How it works

The plugin intentionally provides two read-only tools:

- `rollbar_list_environments` lists configured credential environments without exposing tokens.
- `rollbar_get` makes an authenticated `GET` request to a Rollbar API path.

The accompanying `using-rollbar` skill teaches Amp how to list and inspect items and occurrences, paginate results, interpret payload evidence, and correlate errors with source code. The plugin does not support writes, `POST` requests, or RQL.

Responses are limited to 2,000 lines and 50 KiB, with an explicit notice when output is truncated. Request paths and redirects are confined to the configured HTTPS origin so the Rollbar token is not forwarded elsewhere.

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

Environment variables named `ROLLBAR_ACCESS_TOKEN_<ENVIRONMENT>` take precedence over Amp settings. The plugin discovers these variables when it loads and exposes their lowercased suffixes as credential environments. For example:

- `ROLLBAR_ACCESS_TOKEN_QA` provides `qa`
- `ROLLBAR_ACCESS_TOKEN_STAGING` provides `staging`
- `ROLLBAR_ACCESS_TOKEN_PROD` provides `prod`

The API base URL can also be set with:

- `ROLLBAR_API_BASE_URL`

## Installation

Run:

```sh
./install.sh
```

The installer copies the plugin to `~/.config/amp/plugins/rollbar.ts` and the skill to `~/.config/agents/skills/using-rollbar/SKILL.md`. Reload plugins and skills in Amp after installation.

## Example requests

List active production errors:

```json
{
  "path": "/api/1/items",
  "environment": "prod",
  "query": {
    "status": "active",
    "level": ["error", "critical"],
    "page": 1
  }
}
```

Fetch one occurrence's raw payload:

```json
{
  "path": "/api/1/instance/3209095494",
  "environment": "staging"
}
```
