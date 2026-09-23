# API Contract: メンバー別の使用額の可視化

`specs/002-calendar-monthly-budget/contracts/api.md` からの差分。新しいエンドポイントはない。

## `GET /api/groups/{groupId}/months/{yearMonth}`（変更）

002のレスポンスに `memberTotals` を追加する。その他の項目・ステータスコード（401/403/400）は変更しない。

```ts
{
  // ...002と同じ（yearMonth, budget, spent, remaining, dailyTotals）
  memberTotals: {
    userId: string;
    displayName: string;
    amount: number;        // その月に、このメンバーが支払者である支出の合計（0あり）
    percent: number | null; // 整数%。その月の支出合計が0なら null
    colorIndex: number;     // グループへの参加順（0始まり）。表示色の選択に使う
  }[];                      // グループの全メンバー。amount の降順、同額なら参加順
}
```

**不変条件**: `memberTotals` の `amount` の合計 = `spent`（SC-002）。
