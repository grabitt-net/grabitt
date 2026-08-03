-- Account levels config (personal / business / special statuses)
CREATE TABLE IF NOT EXISTS "AccountLevelsConfig" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "data" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountLevelsConfig_pkey" PRIMARY KEY ("id")
);
