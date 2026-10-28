BEGIN;

ALTER TABLE "User" ADD COLUMN "new_id" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Todo" ADD COLUMN "new_id" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Todo" ADD COLUMN "new_user_id" UUID;
UPDATE "Todo" SET "new_user_id" = "User"."new_id" FROM "User" WHERE "Todo"."userId" = "User"."id";
ALTER TABLE "Todo" ALTER COLUMN "new_user_id" SET NOT NULL;

ALTER TABLE "Todo" DROP CONSTRAINT "Todo_userId_fkey";
DROP INDEX "Todo_userId_idx";
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_pkey";
ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "Todo" DROP COLUMN "id", DROP COLUMN "userId";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "Todo" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "Todo" RENAME COLUMN "new_user_id" TO "userId";
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Todo" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_pkey" PRIMARY KEY ("id");
CREATE INDEX "Todo_userId_idx" ON "Todo"("userId");
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                   ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Todo" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Todo" RENAME COLUMN "updatedAt" TO "updated_at";

COMMIT;
