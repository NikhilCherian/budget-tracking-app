import { useEffect, useState } from "react";
import api from "../lib/api";
import { Household } from "../types";

export function useHousehold(userId: string | undefined) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHousehold = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data } = await api.get<Household | null>("/households/me");
      setHousehold(data);
    } catch {
      setHousehold(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHousehold(); }, [userId]);

  return { household, loading, refetch: fetchHousehold };
}
