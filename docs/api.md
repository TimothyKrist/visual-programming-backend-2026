# Todo List API

Each account has its own todos. Register or log in to get an access token, then include that token with every todo request. Tokens expire after one hour; when a token expires, the client must discard it and log in again.

## Setup

Install Node.js 22, pnpm, and PostgreSQL. Create a PostgreSQL database and a user with access to it, copy `.env.example` to `.env`, and set `DATABASE_URL` to that database. Set `JWT_SECRET` to a long random value (for example, generate one with `openssl rand -hex 32`). Keep the secret private and do not commit `.env`. Changing the secret invalidates existing tokens.

```sh
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

The development server listens on `PORT` (default `3000`). For a production database, apply committed migrations with `pnpm exec prisma migrate deploy`, then run `pnpm build` and `pnpm start`. Run the HTTP tests with `pnpm test`. To include the PostgreSQL integration test, set `DATABASE_URL` to a migrated test database and run `RUN_DB_TESTS=1 pnpm test`; it creates and removes its own users and todo.

The UUID migration preserves users, todos, ownership, and existing todo timestamps, but assigns new IDs; clients must discard old IDs and log in again because existing tokens contain old user IDs. Existing users receive migration-time creation and update timestamps. The migration uses PostgreSQL 13 or later for `gen_random_uuid()`.

The user migration refuses to run while the old shared list contains todos, because it cannot know who owns them. Before migrating such a database, back up and export the existing todos, remove them from the old table, apply the migration, and register accounts. Recreate the exported todos under the appropriate accounts through the API. If `prisma migrate deploy` recorded the migration as failed, mark it rolled back with `pnpm exec prisma migrate resolve --rolled-back 20261028010000_add_users_auth` before retrying. Keep the backup until the data has been checked.

## Authentication

| Method | Path | Result |
| --- | --- | --- |
| POST | `/auth/register` | `201` and `{ "accessToken": "..." }` |
| POST | `/auth/login` | `200` and `{ "accessToken": "..." }` |

Both endpoints accept a JSON object with `email` and `password`. Email addresses must have a valid format and are trimmed and lowercased. Registration passwords must contain more than 8 characters; login accepts any nonempty password for compatibility with existing accounts. Passwords are hashed with SHA-256 before bcrypt so the entire password is included. Existing bcrypt hashes are upgraded after a successful login. Legacy bcrypt hashes cannot verify bytes beyond 72, so accounts created with a longer password before this change need a password reset; this API does not yet provide one. Unknown fields are rejected. Registration returns `409` for an existing email; login returns `401` for incorrect credentials.

```sh
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.com","password":"password123"}'
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.com","password":"password123"}'
```

Send the returned token as `Authorization: Bearer <accessToken>` on every todo request. A missing, invalid, or expired token returns `401`. There are no refresh tokens; login again to get a new access token.

For how the middleware reads and checks the header, see [Authorization header parsing](auth-header.md).

## Todo

A todo contains a UUID `id`, a required nonblank `title`, a nullable `description`, a boolean `completed`, ISO 8601 `createdAt` and `updatedAt` timestamps, and its owner's UUID `userId`. New todos default to `completed: false` and `description: null`. Titles are trimmed. The server assigns ownership, IDs, and timestamps. A user can only list, view, update, or delete their own todos; other users' IDs return `404`.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/todos` | `200` and an array of todos in ascending creation time (then ID) |
| GET | `/todos/:id` | `200` and one todo |
| POST | `/todos` | `201` and the created todo |
| PATCH | `/todos/:id` | `200` and the updated todo |
| DELETE | `/todos/:id` | `204` with no body |

POST accepts `title` plus optional `description` and `completed`; PATCH accepts at least one of those fields. Send a JSON object with `Content-Type: application/json`. To clear a description, send `null`. Unknown fields are rejected. GET and DELETE requests accept no body fields.

```sh
curl -X POST http://localhost:3000/todos \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy groceries","description":"Milk and bread"}'
curl -X PATCH 'http://localhost:3000/todos/<todo-uuid>' \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' -d '{"completed":true}'
curl http://localhost:3000/todos -H 'Authorization: Bearer <accessToken>'
curl -X DELETE 'http://localhost:3000/todos/<todo-uuid>' -H 'Authorization: Bearer <accessToken>'
```

Errors are JSON objects such as `{"error":"Todo not found"}`. Invalid JSON, IDs, and input return `400`; a missing todo or route returns `404`; bodies larger than 100 KB return `413`; unexpected server errors return `500` without exposing internals. IDs must be valid UUIDs.

The error-handling middleware in `src/middleware/error-handler.ts` handles errors forwarded by routes and JSON parsing; controllers handle request validation responses.

Request schemas are defined in `src/validations` and parsed by controllers. Types for validated data are inferred from those schemas, while Zod performs runtime validation. Response DTO interfaces in `src/models` define the fields returned for tokens, todos, and errors; a mapper explicitly selects todo fields. DELETE returns no response body.
