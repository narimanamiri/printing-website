import { useQuery, useQueryClient } from "@tanstack/react-query";
import { me, signOut as signOutFn } from "@/lib/auth.functions";
import type { PublicUser } from "@/lib/types";

// Local, cookie-session auth. No external service — reads the current user from
// the server `me` function and caches it via react-query.
export function useAuth() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<PublicUser | null>({
    queryKey: ["me"],
    queryFn: async () => (await me()).user,
    staleTime: 60_000,
    retry: false,
  });

  const user = data ?? null;

  return {
    user,
    loading: isLoading,
    isAdmin: user?.role === "admin",
    refresh: () => qc.invalidateQueries({ queryKey: ["me"] }),
    signOut: async () => {
      await signOutFn();
      qc.setQueryData(["me"], null);
    },
  };
}
