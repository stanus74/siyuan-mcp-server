# Changelog

## Unreleased
- Removed duplicate MCP tool registrations from [`src/index.ts`](src/index.ts) in favor of the consolidated registry in [`src/tools/Tools.ts`](src/tools/Tools.ts).
- Updated tool list documentation in [`README.md`](README.md) to match the consolidated registry.
- Updated improvement plan with localization and search-title fallback actions in [`plans/improvement-plan.md`](plans/improvement-plan.md).
- Ensured document creation uses a title-based path fallback when `path` is empty in [`src/siyuanClient/documents.ts`](src/siyuanClient/documents.ts).
