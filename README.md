# cortex-mcp

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green?logo=node.js)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.x-purple)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An MCP (Model Context Protocol) server for [Cortex](https://docs.strangebee.com/cortex/) by StrangeBee/TheHive Project. Cortex automates observable analysis (IPs, URLs, hashes, domains, emails, files) using analyzers and executes response actions via responders. This MCP server exposes Cortex's full analysis pipeline to LLMs for AI-driven observable enrichment and automated response.

## Features

- **18 MCP tools** covering analyzers, jobs, responders, bulk operations, status, organizations, and users
- **2 MCP resources** for browsing Cortex state
- **2 MCP prompts** with guided investigation workflows
- Full TLP/PAP support for data classification
- Dual API key support: org-level operations + superadmin administration
- Bulk analysis across all applicable analyzers with taxonomy aggregation
- Structured error handling with meaningful messages

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

Set these environment variables before running the server:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORTEX_URL` | Yes | - | Cortex base URL (e.g., `http://cortex.example.com:9001`) |
| `CORTEX_API_KEY` | Yes | - | API key for normal operations (org admin level) |
| `CORTEX_SUPERADMIN_KEY` | No | - | Superadmin API key for org/user management |
| `CORTEX_VERIFY_SSL` | No | `true` | Set to `false` to skip SSL verification |
| `CORTEX_TIMEOUT` | No | `30` | Request timeout in seconds |

Example `.env` file:
```env
CORTEX_URL=http://cortex.example.com:9001
CORTEX_API_KEY=your-org-admin-key
CORTEX_SUPERADMIN_KEY=your-superadmin-key
CORTEX_VERIFY_SSL=false
```

## Usage

### With Claude Desktop

Add to your Claude Desktop MCP configuration (`claude_desktop_config.json`):

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

### Development

```bash
export CORTEX_URL=http://cortex.example.com:9001
export CORTEX_API_KEY=your-org-admin-key
npm run dev
```

## MCP Tools

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

### Job Tools

| Tool | Description |
|------|-------------|
| `cortex_get_job` | Get the status and details of an analysis job |
| `cortex_get_job_report` | Get the full report of a completed analysis job |
| `cortex_wait_and_get_report` | Wait for a job to complete and return the report |
| `cortex_list_jobs` | List recent analysis jobs with optional filters |
| `cortex_get_job_artifacts` | Get artifacts (extracted IOCs) from a completed job |

### Responder Tools

| Tool | Description |
|------|-------------|
| `cortex_list_responders` | List all enabled responders, optionally filtered by data type |
| `cortex_run_responder` | Execute a responder action against a TheHive entity |

### Bulk Operations

| Tool | Description |
|------|-------------|
| `cortex_analyze_observable` | Run ALL applicable analyzers and return aggregated results with taxonomy summary |

### Organization Management (superadmin)

| Tool | Description |
|------|-------------|
| `cortex_list_organizations` | List all organizations |
| `cortex_get_organization` | Get details about a specific organization |
| `cortex_create_organization` | Create a new organization |

### User Management (superadmin)

| Tool | Description |
|------|-------------|
| `cortex_list_users` | List all users across organizations |
| `cortex_get_user` | Get details about a specific user |
| `cortex_create_user` | Create a new user in an organization |

## MCP Resources

| URI | Description |
|-----|-------------|
| `cortex://analyzers` | List of all enabled analyzers with capabilities |
| `cortex://jobs/recent` | Last 50 analysis jobs |

## MCP Prompts

| Prompt | Description |
|--------|-------------|
| `analyze-observable` | Guided workflow for analyzing an observable through Cortex |
| `investigate-ioc` | Deep investigation workflow for a suspicious IOC |

## Examples

### Check Cortex health

```
Use cortex_get_status to check if Cortex is running.
```

### Analyze an IP address

```
Use cortex_analyze_observable to check the IP 185.220.101.42
with dataType "ip", tlp 2, pap 2.
```

The server will submit the IP to all analyzers that support the `ip` data type, wait for results, and return an aggregated report with taxonomy counts:

```json
{
  "observable": { "dataType": "ip", "data": "185.220.101.42" },
  "analyzersRun": 4,
  "summary": {
    "malicious": 2,
    "suspicious": 1,
    "info": 1,
    "safe": 0
  },
  "results": [...]
}
```

### Run a specific analyzer

```
Use cortex_run_analyzer_by_name with analyzerName "VirusTotal",
dataType "hash", data "44d88612fea8a8f36de82e1278abb02f"
```

### List organizations (superadmin)

```
Use cortex_list_organizations to see all Cortex organizations.
```

### Create a user (superadmin)

```
Use cortex_create_user with login "analyst1", name "Jane Doe",
organization "SOC", roles ["read", "analyze"]
```

## Supported Data Types

| Type | Examples |
|------|----------|
| `ip` | `8.8.8.8`, `2001:db8::1` |
| `domain` | `example.com` |
| `url` | `https://malware.example.com/payload` |
| `fqdn` | `mail.example.com` |
| `hash` | MD5, SHA1, SHA256 hashes |
| `mail` | `user@example.com` |
| `filename` | `malware.exe` |
| `registry` | `HKLM\Software\Malware` |
| `regexp` | Regular expression patterns |
| `other` | Any other observable type |

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
    index.ts              # MCP server entry point
    config.ts             # Environment config + validation
    client.ts             # Cortex REST API client
    types.ts              # Cortex API type definitions
    resources.ts          # MCP resources
    prompts.ts            # MCP prompts
    tools/
      analyzers.ts        # Analyzer tools
      jobs.ts             # Job management tools
      responders.ts       # Responder tools
      bulk.ts             # Bulk operations
      status.ts           # Health/version check
      organizations.ts    # Org management (superadmin)
      users.ts            # User management (superadmin)
  tests/
    client.test.ts        # API client unit tests
    tools.test.ts         # Tool handler unit tests
    integration.test.ts   # Live instance integration tests
  scripts/
    proxmox_install.sh    # Proxmox LXC deployment script
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
```

## Deployment

### Proxmox LXC

A one-click installer is included for Proxmox VE environments:

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/solomonneas/cortex-mcp/main/scripts/proxmox_install.sh)"
```

## License

MIT
