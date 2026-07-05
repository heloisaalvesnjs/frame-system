import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
