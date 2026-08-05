---
name: using-rollbar
description: Investigates Rollbar items and occurrences through the read-only Rollbar plugin. Use for production errors, exception triage, stack traces, occurrences, and Rollbar item links or numbers.
---

# Using Rollbar

Use `rollbar_get` to investigate Rollbar items and occurrences. It makes one authenticated GET request per call and returns Rollbar's raw response. It cannot write, make POST requests, or run RQL.

## Choose the credential environment

Use `rollbar_list_environments` when you need to discover which credential environments are configured. It returns names only, never access tokens. Environments are discovered from `ROLLBAR_ACCESS_TOKEN_<ENVIRONMENT>` variables and Amp settings. Set `rollbar_get`'s top-level `environment` to the selected value and keep it consistent across every call in the investigation. If the user does not specify one, use `prod` when it is listed; otherwise ask which listed environment to use.

The top-level credential `environment` is separate from `query.environment`, which only filters occurrence data inside the already selected Rollbar project. Do not use a query parameter as a substitute for selecting the correct credential environment.

## Investigation workflow

1. List a small, relevant set of items.
2. Resolve the selected item's project counter to its internal item ID when necessary.
3. Inspect the item and a bounded page of recent occurrences.
4. Fetch the full raw payload for the most relevant occurrence IDs.
5. Correlate payload evidence with the matching source revision, then report observed facts separately from inferences.

## Item requests

- List items: `/api/1/items`
  - Common query parameters: `status`, `level`, `environment`, and `page`.
  - Use repeated `level` values for several levels, for example `level: ["error", "critical"]`.
  - Start with `status: "active"` and the narrowest levels relevant to the request unless the user specifies otherwise.
  - Use `query.environment` only when the selected Rollbar project itself contains several payload environments and the user wants to filter them.
- Get an item by internal item ID: `/api/1/item/{itemId}`.
- Resolve an item number from a Rollbar UI URL: `/api/1/item_by_counter/{counter}`.

An item URL such as `/items/456/` contains the project-local `counter`, not the internal item `id`. List responses expose both `counter` and `id`. Endpoints containing `/item/{itemId}` require the internal ID.

## Occurrence requests

- List an item's occurrences: `/api/1/item/{itemId}/instances`.
  - Results are newest first, in pages of 20 by default.
  - Use a bounded `limit`; prefer 20 initially and rarely exceed 100.
  - Continue with `lastId` set to the last occurrence ID from the previous response, or increment the one-based `page`. `lastId` overrides `page`.
- Get one complete occurrence: `/api/1/instance/{occurrenceId}`.

Occurrence IDs come from the `id` field in occurrence-list responses and from Rollbar UI URLs such as `/occurrences/3209095494/`.

If the user supplies an item counter, resolve it before calling item-ID or occurrence-list endpoints. Do not substitute the counter for the internal item ID.

## Interpret payload evidence

Treat an item as an aggregate for triage and an occurrence as evidence for one concrete event. Item titles, levels, counters, and aggregate timestamps do not establish the request, user, code path, or root cause of every occurrence.

Occurrence shape varies by SDK and payload version. Inspect available fields rather than assuming they exist. Useful evidence commonly includes:

- `data.environment`, `data.code_version`, `data.context`, and event timestamps
- exception/message bodies under `data.body`, including `trace` or `trace_chain` frames
- request URL, method, parameters, headers, and route context under `data.request`
- affected user data under `data.person`
- runtime or host details under `data.server` and client/browser details under `data.client`
- application metadata under `data.custom`

Use stack frames to identify the first relevant application frame, while distinguishing application code from framework or dependency frames. Treat request parameters, headers, person data, and custom metadata as potentially sensitive; quote only what is necessary.

Compare multiple recent occurrences before claiming a pattern. State whether a conclusion is directly observed in Rollbar, inferred from repeated payloads, or inferred from source code.

## Correlate with source

Prefer the occurrence's `code_version` or equivalent revision evidence when selecting source to inspect. Verify that the revision exists in the repository; do not assume the current checkout matches production. If no revision is present, use timestamps, deployed environment, stack paths, and surrounding code as weaker evidence and say that the production revision is unverified.

Use the exception type/message and application frames to locate code. Then explain the complete failure path from observed input or state to the throwing frame. Do not present a plausible code path as proven unless payload values and the matching source revision support it.

## Keep responses bounded

Use filters and small pages before retrieving full occurrences. If the tool reports output truncation, narrow the request or fetch individual occurrences; never treat omitted output as evidence that a field or event is absent.
