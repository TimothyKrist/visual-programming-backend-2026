# Project guidelines

This project is a Todo List API providing create, read, update, and delete operations.

## Stack

- Express.js and TypeScript
- Prisma and PostgreSQL

## Architecture

Follow MVC with a service layer:

- Routes map endpoints to controllers.
- Controllers validate requests, call services, and return HTTP responses.
- Services contain business logic and interact with Prisma models.
- Models represent data using the Prisma schema; JSON responses serve as views.
- Organize routes, controllers, and services in separate folders.

## Development

- Use pnpm instead of npm as the package manager.
- Keep changes focused and follow existing project conventions.
- Validate API input and return appropriate HTTP status codes and clear errors.
- Use Prisma migrations for database schema changes. Never commit secrets; use environment variables for configuration.
- Add or update relevant tests when behavior changes.

## Documentation

Keep API documentation, project decisions and rules, and code documentation in the repository's `/docs` folder. Update the relevant documentation when behavior or decisions change.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
