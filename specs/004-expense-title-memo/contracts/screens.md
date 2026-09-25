# Screen Contract: 支出のタイトルとメモ

`specs/002-calendar-monthly-budget/contracts/screens.md` の「支出追加・支出編集」「日別詳細」への差分。

## 支出追加・支出編集（`/expenses/new`, `/expenses/{id}/edit`）

「内容」欄を次の2つに置き換える。他の項目（金額・支出日・支払者・支払い方法）は変更しない。

| 欄 | テストID | 形 | 文字数の表示（テストID） |
|---|---|---|---|
| タイトル | `expense-form-title` | 1行の入力欄 | `expense-form-title-count`（例「12/50」） |
| メモ（任意） | `expense-form-memo` | 複数行の入力欄（4行分） | `expense-form-memo-count`（例「34/200」） |

- 文字数は前後の空白を除いた見た目の文字数（research.md #2）。上限を超えたら文字数の表示を赤くする
- 上限を超えても入力はできる。保存時にサーバーが拒否したら、002と同じく `expense-form-error` にエラーを出す
- 編集画面は、既存のタイトルとメモ（改行を含む）を初期値にする

## 日別詳細（`/days/{date}`）

各支出（`day-expense-item`）の「内容」の表示を次に置き換える。

- タイトル（`day-expense-title`）: 省略せず、長い場合は折り返す
- メモ（`day-expense-memo`）: メモがある場合だけ、タイトルの下に表示する。改行を保ち、画面の幅で折り返し、
  省略しない。メモが空なら要素を出さない
