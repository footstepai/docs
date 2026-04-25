# Contributing

Thanks for helping improve the Footstep docs. Fixes, clarifications, and new examples are all welcome.

## Quick fixes

For typos, broken links, or small wording changes, open a PR directly. No issue needed.

## Larger changes

For new pages, structural changes, or anything that changes how the docs are organised, open an issue first so we can discuss the approach.

## How to contribute

1. Fork the repo and create a branch from `main`
2. Make your changes (see [local development](#local-development) below)
3. Open a pull request

Mintlify generates a preview deployment for every PR, so you can check your changes look right before review.

## Local development

```sh
pnpm install
pnpm dev
```

Opens at `http://localhost:3000` with hot reload.

## File structure

| Path | Contents |
|------|----------|
| `api/endpoint/` | Individual REST endpoint pages |
| `api/openapi.json` | OpenAPI spec (auto-generates endpoint schemas) |
| `mcp/tools/` | Individual MCP tool pages |
| `*.mdx` | Top-level guide pages |
| `docs.json` | Navigation, theme, and site config |

## Style notes

- Use British English (optimise, colour, etc.) to match the existing docs
- Keep sentences short. One idea per sentence.
- Code examples should be copy-pasteable and use real-looking coordinates
- Field names include units in the API (`distance_meters`, `duration_seconds`) so you don't need to restate them in prose

## Code of conduct

Be respectful. That's it.
