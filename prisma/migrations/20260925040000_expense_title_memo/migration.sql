-- 004-expense-title-memo: 支出の「内容」(description) をタイトル (title) とメモ (memo) に分ける
-- data-model.md「既存データの移行」/ research.md #1。
-- 50文字以下の内容はそのままタイトルにし、メモは空にする。
-- 51文字以上の内容は、先頭50文字をタイトル、全文をメモにする（全文が残るので文字は失われない）。
-- SQLite の length() / substr() は文字（コードポイント）単位で数える。

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExpenseRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "memo" TEXT NOT NULL DEFAULT '',
    "paidById" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "spentOn" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "ExpenseRecord_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseRecord_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ExpenseRecord" ("amount", "createdAt", "createdById", "groupId", "id", "paidById", "paymentMethod", "spentOn", "updatedAt", "updatedById", "title", "memo")
SELECT "amount", "createdAt", "createdById", "groupId", "id", "paidById", "paymentMethod", "spentOn", "updatedAt", "updatedById",
       CASE WHEN length("description") <= 50 THEN "description" ELSE substr("description", 1, 50) END,
       CASE WHEN length("description") <= 50 THEN '' ELSE "description" END
FROM "ExpenseRecord";
DROP TABLE "ExpenseRecord";
ALTER TABLE "new_ExpenseRecord" RENAME TO "ExpenseRecord";
CREATE INDEX "ExpenseRecord_groupId_spentOn_idx" ON "ExpenseRecord"("groupId", "spentOn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
