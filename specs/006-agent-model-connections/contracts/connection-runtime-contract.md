# Contract: Connection Runtime

## Scope

Defines local Vite middleware endpoints and browser client behavior for agent/model connection settings. These routes are owned by 006 and are consumed by the settings UI, slide library first-run setup, and `specs/005-agent-chat-ui`.

## `GET /__agent-connections/bootstrap`

Returns safe settings bootstrap data for the current project.

Response:

```json
{
  "activeConnection": {
    "connectionId": "local-codex",
    "displayName": "Codex CLI",
    "type": "local-agent",
    "provider": "codex",
    "modelOrAgent": "codex-cli 0.13.4",
    "modelId": "gpt-5.5",
    "reasoningEffort": "high",
    "availableModels": ["gpt-5.5"],
    "availableReasoningEfforts": ["low", "medium", "high", "xhigh"],
    "status": "ready",
    "capabilities": {
      "streaming": true,
      "cancellation": true,
      "structuredProposals": true,
      "toolCalls": true,
      "localFileContext": true,
      "writeCapable": true,
      "supportedModalities": ["text", "image"]
    },
    "settingsTarget": "execution-model"
  },
  "firstRunSetup": {
    "shouldShow": false,
    "dismissedAt": null
  },
  "runtime": {
    "mode": "interactive",
    "settingsRoute": "/settings/connections",
    "settingsModalTarget": "execution-model"
  }
}
```

Rules:

- Must not return raw credentials, raw environment values, full local paths, or command output.
- `firstRunSetup.shouldShow` is true when no valid active connection and no setup preference exists.
- Static/read-only builds may return `mode: "read-only"` and a non-writing status.
- The slide page quick switcher uses `activeConnection`, safe connection lists, available models, and available reasoning values.
- 005 uses `activeConnection`, `runtime.settingsRoute`, and `runtime.settingsModalTarget` for chat bootstrap and recovery.

## `GET /__agent-connections/settings`

Returns settings-modal state.

Response:

```json
{
  "connections": [],
  "scanPreference": {
    "enabled": false,
    "approvedDirectories": [],
    "includePathCommands": true,
    "includeKnownInstallLocations": true,
    "lastScanAt": null
  },
  "candidates": [],
  "providers": [
    {
      "id": "codex",
      "displayName": "Codex CLI",
      "type": "local-agent"
    }
  ]
}
```

Rules:

- Values are safe for browser display.
- Provider registry entries include display metadata and capability defaults, not secrets.

## `POST /__agent-connections/first-run/dismiss`

Records that the user chose not to configure a connection now.

Request:

```json
{ "reason": "do-later" }
```

Response:

```json
{ "ok": true }
```

Rules:

- Does not enable auto-scan.
- May be stored browser-locally or user-locally.
- Failed active connections may still show a smaller recovery prompt later.

## `POST /__agent-connections/scan`

Starts a bounded local agent scan.

Request:

```json
{
  "includePathCommands": true,
  "includeKnownInstallLocations": true,
  "approvedDirectoryIds": ["dir_1"]
}
```

Response:

```json
{
  "scanId": "scan_123",
  "state": "scanning",
  "eventUrl": "/__agent-connections/scan/scan_123/events"
}
```

Rules:

- Requires explicit user action.
- Must not scan full disk.
- May check known commands, known install locations, current project metadata, and user-approved directories only.
- Must be cancellable.

## `GET /__agent-connections/scan/:scanId/events`

Streams scan progress and candidates.

Event types:

- `started`
- `candidate`
- `diagnostic`
- `completed`
- `cancelled`
- `failed`

Rules:

- Candidate events are review-only and do not activate a connection.
- Diagnostics are redacted.

## `POST /__agent-connections/scan/:scanId/cancel`

Cancels an active scan.

Response:

```json
{ "ok": true, "scanId": "scan_123", "state": "cancelled" }
```

## `POST /__agent-connections/manual-path/validate`

Validates a user-entered executable, command, or project path.

Request:

```json
{
  "input": "C:\\Users\\Admin\\AppData\\Local\\Programs\\Codex\\codex.exe",
  "kind": "executable"
}
```

Response:

```json
{
  "validation": {
    "status": "pass",
    "provider": "codex",
    "version": "0.13.4",
    "message": "Codex CLI detected."
  }
}
```

Rules:

- Existence and basic type checks happen before any process startup.
- Protocol/version probes must use timeouts and redacted output.
- Validation failure must not create or activate a connection.

## `POST /__agent-connections`

Creates a configured connection from a candidate, manual path, or BYOK provider.

Request:

```json
{
  "source": "manual-path",
  "displayName": "Codex CLI",
  "provider": "codex",
  "manualPathId": "path_123",
  "scope": "project-default"
}
```

Response:

```json
{
  "connection": {
    "id": "conn_123",
    "displayName": "Codex CLI",
    "type": "manual-agent-path",
    "provider": "codex",
    "status": {
      "state": "ready",
      "recoveryActions": []
    }
  }
}
```

Rules:

- BYOK creation stores only a credential reference in settings.
- Candidate/manual path activation requires compatible validation.

## `POST /__agent-connections/:connectionId/test`

Runs a cheap privacy-conscious test.

Response:

```json
{
  "status": {
    "state": "ready",
    "checkedAt": "2026-05-29T09:00:00.000Z",
    "recoveryActions": []
  }
}
```

Rules:

- Test requests must be minimal and avoid sending slide source.
- BYOK tests must validate credential presence and provider authentication first.
- Model listing is optional; if listing is unavailable, the runtime may keep a manually entered model ID and report `unsupported-model` only when the provider rejects that model.
- Failure categories must map to recovery actions.

## `POST /__agent-connections/active`

Sets the active connection for current session and optionally project default.

Request:

```json
{
  "connectionId": "conn_123",
  "scope": "project-default",
  "modelId": "gpt-5.5",
  "reasoningEffort": "high"
}
```

Response:

```json
{ "ok": true, "activeConnectionId": "conn_123" }
```

Rules:

- Only configured connections can be selected.
- Requests may include `modelId` and `reasoningEffort` for providers that support quick preference changes.
- If status is degraded, UI must show that state before the user starts 005 chat runs.
- Slide-page quick switcher changes update the same safe active connection snapshot used by 005 for subsequent runs.

## `DELETE /__agent-connections/:connectionId`

Removes a connection.

Request:

```json
{ "deleteCredential": true }
```

Response:

```json
{ "ok": true }
```

Rules:

- Credential deletion requires confirmation in the UI.
- Non-secret history may remain for audit/debugging if credential values are removed.

## Error Shape

```json
{
  "error": "Codex CLI was not found.",
  "category": "missing-executable",
  "recoveryActions": ["rescan", "edit-path"],
  "diagnostics": "redacted optional details"
}
```

Supported categories:

- `missing-executable`
- `invalid-path`
- `scan-denied`
- `secure-storage-unavailable`
- `authentication-failed`
- `quota-rate-limit`
- `unsupported-model`
- `incompatible-protocol`
- `provider-offline`
- `timeout`
- `unknown`
