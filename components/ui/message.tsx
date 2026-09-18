import { AlertCircle } from "lucide-react";

export function ErrorMessage({
  children,
  testId,
}: {
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <p
      data-testid={testId}
      className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"
    >
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
