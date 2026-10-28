# Set up a similar project from scratch

This guide initializes an Express, TypeScript, Prisma, and PostgreSQL project using pnpm. It creates a starter server and a Todo table; you will still need to implement the CRUD and authentication endpoints.

This repository uses Prisma 6. Installing dependencies without versions currently selects Prisma 8, whose setup and migration commands differ. Prisma 8 is currently a release candidate; see the [Prisma release status](https://www.prisma.io/docs/orm/release-status).

## 1. Check the prerequisites

Install Node.js, pnpm, and PostgreSQL. Node.js 24 is a suitable choice for the latest Prisma release.

```sh
node --version
pnpm --version
psql --version
```

Start PostgreSQL and make sure your database user can create or access a development database.

## 2. Create the project

```sh
mkdir todo-list-api
cd todo-list-api
pnpm init
```

`pnpm init` creates `package.json` for the project's dependencies and scripts.

## 3. Install dependencies

```sh
pnpm add express dotenv bcryptjs jsonwebtoken
pnpm add -D typescript tsx @types/node @types/express \
  @types/jsonwebtoken supertest @types/supertest
```

Express handles HTTP requests; `tsx` runs TypeScript during development; `bcryptjs` and `jsonwebtoken` support authentication; and Supertest helps test HTTP endpoints.

## 4. Initialize TypeScript

```sh
pnpm exec tsc --init
```

This creates `tsconfig.json`. Prisma's initialization adjusts the module settings it needs.

## 5. Install and initialize Prisma

```sh
pnpm add -D prisma
pnpm add @prisma/orm-postgres
pnpm exec prisma orm init --yes --target postgres --authoring psl --write-env
```

The initialization creates Prisma configuration, a starter data model, a database helper, and environment files. See the [Prisma initialization documentation](https://docs.prisma.io/docs/cli/orm-init).

## 6. Configure PostgreSQL

Create an empty development database, for example:

```sh
createdb todo_list_api
```

Open `.env` and set the connection string to match your PostgreSQL user and password:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/todo_list_api"
```

Replace `USER` and `PASSWORD` with your credentials. Make sure `.env` is listed in `.gitignore` so credentials are not committed.

## 7. Define a Todo model

Replace the contents of `src/prisma/contract.prisma` with:

```prisma
// use prisma-8

model Todo {
  id          Int     @id @default(autoincrement())
  title       String
  description String?
  completed   Boolean @default(false)
}
```

This is a starting model. Add users, timestamps, and relationships as you build the API.

## 8. Create and apply the first migration

```sh
pnpm exec prisma contract emit
pnpm exec prisma migration plan --name init
pnpm exec prisma db migrate --advance-ref db
```

The first command prepares the contract and types, the second creates migration files, and the third applies them to your development database. Commit the generated contract artifacts and migration files. See the [Prisma migration workflow](https://www.prisma.io/docs/orm/migrations/how-migrations-work).

## 9. Create the application folders

```sh
mkdir -p src/routes src/controllers src/services src/middleware tests docs
```

Use routes to map endpoints, controllers to handle requests, and services for business logic and database access.

## 10. Add a starting server

Create `src/server.ts`:

```ts
import "dotenv/config";
import express from "express";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Todo List API is running" });
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
```

## 11. Add package scripts

Add these entries inside the existing `"scripts"` object in `package.json`, keeping any other scripts Prisma created:

```json
"dev": "tsx watch src/server.ts",
"prisma:emit": "prisma contract emit",
"prisma:plan": "prisma migration plan",
"prisma:migrate": "prisma db migrate --advance-ref db"
```

After changing a model, run `pnpm prisma:emit`, `pnpm prisma:plan --name change_name`, and `pnpm prisma:migrate`.

## 12. Start the server

```sh
pnpm dev
```

Visit `http://localhost:3000` to see the JSON confirmation message.
