import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "cryptoDash:watchlist:v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(arr) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export default function useWatchlist() {
  const [ids, setIds] = useState(() => read());

  useEffect(() => {
    write(ids);
  }, [ids]);

  const isWatched = useCallback((id) => ids.includes(id), [ids]);

  const toggleWatch = useCallback((id) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [id, ...prev];
    });
  }, []);

  const remove = useCallback((id) => {
    setIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => setIds([]), []);

  return useMemo(
    () => ({ watchlist: ids, isWatched, toggleWatch, remove, clear }),
    [ids, isWatched, toggleWatch, remove, clear]
  );
}