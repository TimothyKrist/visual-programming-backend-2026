-- Existing shared todos cannot be assigned to an owner automatically.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Todo") THEN
    RAISE EXCEPTION 'Existing todos need an owner. Back up and migrate them before applying this migration; see docs/api.md.';
  END IF;
END $$;

CREATE TABLE "User" (
  "id" SERIAL NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
ALTER TABLE "Todo" ADD COLUMN "userId" INTEGER NOT NULL;
CREATE INDEX "Todo_userId_idx" ON "Todo"("userId");
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
