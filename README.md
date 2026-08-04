# Rollbar for Amp

An [Amp](https://ampcode.com) plugin for read-only Rollbar investigations.

## How it works

The plugin intentionally provides one thin transport tool:

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

Every request can select `qa`, `staging`, or `prod`. Requests that omit the credential environment use `prod`.

The API base URL defaults to `https://api.rollbar.com`. Custom or proxied API endpoints can override it:

```json
{
  "amp.rollbar.apiBaseUrl": "https://api.rollbar.com"
}
```

Environment variables take precedence over Amp settings:

- `ROLLBAR_QA_ACCESS_TOKEN`
- `ROLLBAR_STAGING_ACCESS_TOKEN`
- `ROLLBAR_PROD_ACCESS_TOKEN`
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
