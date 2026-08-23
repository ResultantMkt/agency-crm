-- Adiciona phone como nullable temporariamente para poder copiar os dados
ALTER TABLE "Lead" ADD COLUMN "phone" TEXT;
ALTER TABLE "Lead" ADD COLUMN "email" TEXT;

-- Migra os dados existentes: todo contact vira phone
UPDATE "Lead" SET "phone" = "contact";

-- Agora torna phone NOT NULL (todos os registros já têm valor)
ALTER TABLE "Lead" ALTER COLUMN "phone" SET NOT NULL;

-- Remove a coluna antiga
ALTER TABLE "Lead" DROP COLUMN "contact";
