-- 002-calendar-monthly-budget: 月別予算・支出日・選択中グループへの移行
-- data-model.md「既存データの移行」の手順1〜5。日時は既存データと同じく整数のミリ秒で保存する
-- （research.md #6 の確認結果）。日付・年月は日本時間（+9時間）で求める。

-- 1. MonthlyBudget を作成する
CREATE TABLE "MonthlyBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT NOT NULL,
    CONSTRAINT "MonthlyBudget_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MonthlyBudget_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MonthlyBudget_groupId_yearMonth_key" ON "MonthlyBudget"("groupId", "yearMonth");

-- 2. Group.monthlyBudget を、実行時点の日本時間の年月の設定額として移す。
--    updatedById はそのグループで最初に参加したメンバー（メンバーのいないグループは対象外）
INSERT INTO "MonthlyBudget" ("id", "groupId", "yearMonth", "amount", "createdAt", "updatedAt", "updatedById")
SELECT
    'mig' || lower(hex(randomblob(11))),
    g."id",
    strftime('%Y-%m', 'now', '+9 hours'),
    g."monthlyBudget",
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    (SELECT m."userId" FROM "GroupMember" m WHERE m."groupId" = g."id" ORDER BY m."joinedAt", m."id" LIMIT 1)
FROM "Group" g
WHERE g."monthlyBudget" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "GroupMember" m WHERE m."groupId" = g."id");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- 3. ExpenseRecord.spentOn を追加し、既存行は createdAt の日本時間の日付で埋める
CREATE TABLE "new_ExpenseRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
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
INSERT INTO "new_ExpenseRecord" ("amount", "createdAt", "createdById", "description", "groupId", "id", "paidById", "paymentMethod", "spentOn", "updatedAt", "updatedById")
SELECT "amount", "createdAt", "createdById", "description", "groupId", "id", "paidById", "paymentMethod",
       date("createdAt" / 1000, 'unixepoch', '+9 hours'),
       "updatedAt", "updatedById"
FROM "ExpenseRecord";
DROP TABLE "ExpenseRecord";
ALTER TABLE "new_ExpenseRecord" RENAME TO "ExpenseRecord";
CREATE INDEX "ExpenseRecord_groupId_spentOn_idx" ON "ExpenseRecord"("groupId", "spentOn");

-- 4. User.selectedGroupId を追加し、最初に参加したグループで埋める
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedGroupId" TEXT,
    CONSTRAINT "User_selectedGroupId_fkey" FOREIGN KEY ("selectedGroupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "displayName", "email", "id", "passwordHash", "selectedGroupId")
SELECT u."createdAt", u."displayName", u."email", u."id", u."passwordHash",
       (SELECT m."groupId" FROM "GroupMember" m WHERE m."userId" = u."id" ORDER BY m."joinedAt", m."id" LIMIT 1)
FROM "User" u;
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- 5. Group.monthlyBudget を削除する（手順2で MonthlyBudget に移し済み）
CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Group" ("createdAt", "id", "name") SELECT "createdAt", "id", "name" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
