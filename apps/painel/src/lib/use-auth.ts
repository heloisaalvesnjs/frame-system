"use client";

import { useEffect, useState } from "react";
import { getStoredUser, getToken, type Nutritionist } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<Nutritionist | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setReady(true);
  }, []);

  return { user, isAuthenticated: !!getToken(), ready };
}
