# Data Model: メンバー別の使用額の可視化

**保存するデータの変更はない。** 002のデータ（`specs/002-calendar-monthly-budget/data-model.md`）から、
次の導出値を計算して表示する。

## メンバーごとの支払額（導出値）

表示中の月（`yearMonth`）・選択中のグループ（`groupId`）について、グループの各メンバーごとに求める。

| 項目 | 求め方 |
|---|---|
| userId / displayName | `GroupMember` → `User`（グループの全メンバー） |
| amount | `ExpenseRecord` のうち `groupId` が一致し、`spentOn` がその月に含まれ、`paidById` がそのメンバーのものの `amount` の合計。該当なしは0（FR-001, FR-003） |
| percent | `Math.round(amount / 月の支出合計 × 100)`。月の支出合計が0なら `null`（FR-002, FR-003） |
| colorIndex | そのメンバーの、グループ内での参加順（`joinedAt` 昇順、0始まり）。表示色は6色の並びの `colorIndex % 6` 番目（research.md #4） |

**並び順**: `amount` の降順。同額なら参加順（research.md #3）。

**整合性**: 全メンバーの `amount` の合計は、002の月別集計の `spent`（その月の支出合計）と一致する
（SC-002）。支払者は必ずグループのメンバーである（002のFR-017）ため、メンバー以外の支払額は生じない。
