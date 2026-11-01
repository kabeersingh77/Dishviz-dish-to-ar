-- AlterTable
ALTER TABLE "ARJob" ADD COLUMN "providerTaskId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inputJobId" TEXT,
    "outputJobId" TEXT,
    "type" TEXT NOT NULL,
    "storagePath" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Asset_inputJobId_fkey" FOREIGN KEY ("inputJobId") REFERENCES "ARJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_outputJobId_fkey" FOREIGN KEY ("outputJobId") REFERENCES "ARJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("createdAt", "height", "id", "inputJobId", "mimeType", "outputJobId", "sizeBytes", "storagePath", "type", "width") SELECT "createdAt", "height", "id", "inputJobId", "mimeType", "outputJobId", "sizeBytes", "storagePath", "type", "width" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
