import { mutate } from "swr";

// 支出・予算を保存したあと、そのグループの月・日のキャッシュをまとめて無効化する。
// 戻った先の画面が、ポーリングを待たずに新しい値を表示できるようにする（research.md #8）
export function revalidateGroup(groupId: string) {
  const prefix = `/api/groups/${groupId}/`;
  return mutate((key) => typeof key === "string" && key.startsWith(prefix));
}
