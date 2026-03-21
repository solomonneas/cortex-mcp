# cortex-mcp

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green?logo=node.js)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.x-purple)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An MCP (Model Context Protocol) server for [Cortex](https://docs.strangebee.com/cortex/) by StrangeBee/TheHive Project. Cortex automates observable analysis (IPs, URLs, hashes, domains, emails, files) using analyzers and executes response actions via responders. This MCP server exposes Cortex's full analysis and administration pipeline to LLMs.

## Features

- **30 MCP tools** covering the complete Cortex API surface
- **4 MCP resources** for browsing Cortex state
- **2 MCP prompts** with guided investigation workflows
- Full analyzer/responder lifecycle: browse definitions, enable, configure, disable
- Auto-detection of observable data types (IP, domain, hash, URL, email)
- Bulk analysis across all applicable analyzers with taxonomy aggregation
- Job cleanup with dry-run support
- User API key management (create, renew, retrieve)
- Organization CRUD with status management
- Dual API key support: org-level operations + superadmin administration

## Prerequisites

- Node.js 20 or later
- A running Cortex instance (v3.x recommended)
- A Cortex API key with appropriate permissions

## Installation

```bash
git clone https://github.com/solomonneas/cortex-mcp.git
cd cortex-mcp
npm install
npm run build
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORTEX_URL` | Yes | - | Cortex base URL (e.g., `http://cortex.example.com:9001`) |
| `CORTEX_API_KEY` | Yes | - | API key for normal operations (org admin level) |
| `CORTEX_SUPERADMIN_KEY` | No | - | Superadmin API key for org/user/definition management |
| `CORTEX_VERIFY_SSL` | No | `true` | Set to `false` to skip SSL verification |
| `CORTEX_TIMEOUT` | No | `30` | Request timeout in seconds |

## Usage

### With Claude Desktop

```json
{
  "mcpServers": {
    "cortex": {
      "command": "node",
      "args": ["/path/to/cortex-mcp/dist/index.js"],
      "env": {
        "CORTEX_URL": "http://cortex.example.com:9001",
        "CORTEX_API_KEY": "your-org-admin-key",
        "CORTEX_SUPERADMIN_KEY": "your-superadmin-key"
      }
    }
  }
}
```

### Standalone

```bash
export CORTEX_URL=http://cortex.example.com:9001
export CORTEX_API_KEY=your-org-admin-key
npm start
```

## MCP Tools (30)

### Status

| Tool | Description |
|------|-------------|
| `cortex_get_status` | Get Cortex instance health, version, and configuration |

### Analyzer Tools

| Tool | Description |
|------|-------------|
| `cortex_list_analyzers` | List all enabled analyzers, optionally filtered by data type |
| `cortex_get_analyzer` | Get details about a specific analyzer by ID |
| `cortex_run_analyzer` | Submit an observable to a specific analyzer for analysis |
| `cortex_run_analyzer_by_name` | Run an analyzer by name instead of ID (convenience wrapper) |

### Analyzer Definition Tools

| Tool | Description |
|------|-------------|
| `cortex_list_analyzer_definitions` | Browse all 260+ available analyzer definitions with filtering (by data type, free/no-config, search) |
| `cortex_enable_analyzer` | Enable an analyzer definition in the current org with configuration |
| `cortex_disable_analyzer` | Disable (remove) an enabled analyzer |

### Job Tools

| Tool | Description |
|------|-------------|
| `cortex_get_job` | Get the status and details of an analysis job |
| `cortex_get_job_report` | Get the full report of a completed analysis job |
| `cortex_wait_and_get_report` | Wait for a job to complete and return the report |
| `cortex_list_jobs` | List recent analysis jobs with optional filters |
| `cortex_get_job_artifacts` | Get artifacts (extracted IOCs) from a completed job |
| `cortex_delete_job` | Delete a specific job |
| `cortex_cleanup_jobs` | Bulk delete jobs by status or age (with dry-run) |

### Responder Tools

| Tool | Description |
|------|-------------|
| `cortex_list_responders` | List all enabled responders, optionally filtered by data type |
| `cortex_run_responder` | Execute a responder action against a TheHive entity |

### Responder Definition Tools

| Tool | Description |
|------|-------------|
| `cortex_list_responder_definitions` | Browse all 137+ available responder definitions with filtering |
| `cortex_enable_responder` | Enable a responder definition with configuration |
| `cortex_disable_responder` | Disable (remove) an enabled responder |

### Bulk Operations

| Tool | Description |
|------|-------------|
| `cortex_analyze_observable` | Run ALL applicable analyzers with auto-detected data type and aggregated taxonomy results |

### Organization Management (superadmin)

| Tool | Description |
|------|-------------|
| `cortex_list_organizations` | List all organizations |
| `cortex_get_organization` | Get organization details |
| `cortex_create_organization` | Create a new organization |
| `cortex_update_organization` | Update organization description or status |

### User Management (superadmin)

| Tool | Description |
|------|-------------|
| `cortex_list_users` | List all users across organizations |
| `cortex_get_user` | Get user details |
| `cortex_create_user` | Create a new user in an organization |
| `cortex_renew_user_key` | Generate a new API key for a user (invalidates previous) |
| `cortex_get_user_key` | Retrieve a user's current API key |

## MCP Resources (4)

| URI | Description |
|-----|-------------|
| `cortex://analyzers` | Enabled analyzers with capabilities |
| `cortex://analyzer-definitions` | All 260+ available analyzer definitions with config requirements |
| `cortex://responder-definitions` | All 137+ available responder definitions with config requirements |
| `cortex://jobs/recent` | Last 50 analysis jobs |

## MCP Prompts (2)

| Prompt | Description |
|--------|-------------|
| `analyze-observable` | Guided workflow for analyzing an observable through Cortex |
| `investigate-ioc` | Deep investigation workflow for a suspicious IOC |

## Examples

### Set up analyzers from scratch

```
1. Use cortex_list_analyzer_definitions with freeOnly=true to find analyzers
   that need no API keys.
2. Use cortex_enable_analyzer to enable "Abuse_Finder_3_0" with empty config.
3. Use cortex_analyze_observable with data "8.8.8.8" to analyze the IP.
```

### Auto-detect observable type

```
Use cortex_analyze_observable with data "185.220.101.42"
(no dataType needed - auto-detects as IP)
```

### Clean up old failed jobs

```
Use cortex_cleanup_jobs with status "Failure", dryRun true to preview,
then dryRun false to delete.
```

### Manage API keys

```
Use cortex_renew_user_key with userId "analyst1" to rotate their API key.
```

## Supported Data Types

| Type | Examples | Auto-detected |
|------|----------|---------------|
| `ip` | `8.8.8.8`, `2001:db8::1` | ✅ |
| `domain` | `example.com` | ✅ |
| `url` | `https://malware.example.com/payload` | ✅ |
| `hash` | MD5, SHA1, SHA256, SHA512 | ✅ |
| `mail` | `user@example.com` | ✅ |
| `fqdn` | `mail.example.com` | As domain |
| `filename` | `malware.exe` | Manual |
| `registry` | `HKLM\Software\Malware` | Manual |
| `file` | Binary file uploads | Manual |
| `other` | CVEs, custom types | Manual |

## Testing

```bash
npm test              # Unit tests (36 tests)
npm run test:watch    # Watch mode
npm run lint          # Type check

# Integration tests (requires live Cortex instance)
CORTEX_URL=http://cortex:9001 \
CORTEX_API_KEY=your-key \
CORTEX_SUPERADMIN_KEY=your-superadmin-key \
npx vitest run tests/integration.test.ts
```

## Project Structure

```
cortex-mcp/
  src/
    index.ts                  # MCP server entry point
    config.ts                 # Environment config + validation
    client.ts                 # Cortex REST API client (full surface)
    types.ts                  # Cortex API type definitions
    resources.ts              # MCP resources (4)
    prompts.ts                # MCP prompts (2)
    tools/
      analyzers.ts            # Analyzer tools (list, get, run, run-by-name)
      analyzer-definitions.ts # Definition browsing, enable, disable
      jobs.ts                 # Job management + cleanup
      responders.ts           # Responder tools (list, run)
      responder-definitions.ts # Definition browsing, enable, disable
      bulk.ts                 # Bulk analysis with auto-detect
      status.ts               # Health/version check
      organizations.ts        # Org CRUD (superadmin)
      users.ts                # User CRUD + key management (superadmin)
  tests/
    client.test.ts            # API client unit tests
    tools.test.ts             # Tool handler unit tests
    integration.test.ts       # Live instance integration tests (21 tests)
  scripts/
    proxmox_install.sh        # Proxmox LXC deployment script
```

## Deployment

### Proxmox LXC

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/solomonneas/cortex-mcp/main/scripts/proxmox_install.sh)"
```

## License

MIT
