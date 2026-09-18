export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "cash" | "mobile";
}) {
  const toneClass =
    tone === "cash"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      : tone === "mobile"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
        : "bg-background text-muted";

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}
