-- AlterTable: add unique room code for lobby join
ALTER TABLE "rooms" ADD COLUMN "code" VARCHAR(6);

-- Backfill existing rows with a random 6-char code (A-Z0-9)
UPDATE "rooms"
SET "code" = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE "code" IS NULL;

-- Make it NOT NULL and UNIQUE after backfill
ALTER TABLE "rooms" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");
