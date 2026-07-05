"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  if (typeof window !== "undefined" && !getToken()) {
    return null;
  }

  return <>{children}</>;
}
