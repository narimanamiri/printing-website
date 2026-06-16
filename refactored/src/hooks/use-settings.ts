import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/settings.functions";
import type { AppSettings } from "@/lib/types";

// Business settings (price-per-gram, build volume, payment details), cached.
export function useSettings() {
  const { data } = useQuery<AppSettings>({
    queryKey: ["settings"],
    queryFn: async () => getSettings(),
    staleTime: 5 * 60_000,
  });
  return data;
}
