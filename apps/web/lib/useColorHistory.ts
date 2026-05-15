"use client";
// Refs: persistance localStorage des couleurs récentes et favorites du color picker
import { useState, useCallback, useEffect } from "react";

const RECENT_KEY = "holenek_color_recent";
const FAVORITES_KEY = "holenek_color_favorites";
const MAX_RECENT = 12;

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string[]): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / private mode */ }
}

export function useColorHistory() {
  const [recent, setRecent] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setRecent(read(RECENT_KEY));
    setFavorites(read(FAVORITES_KEY));
  }, []);

  const pushRecent = useCallback((color: string) => {
    setRecent((prev) => {
      const next = [color, ...prev.filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, MAX_RECENT);
      write(RECENT_KEY, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((color: string) => {
    setFavorites((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === color.toLowerCase());
      const next = exists
        ? prev.filter((c) => c.toLowerCase() !== color.toLowerCase())
        : [color, ...prev];
      write(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (color: string) => favorites.some((c) => c.toLowerCase() === color.toLowerCase()),
    [favorites],
  );

  return { recent, favorites, pushRecent, toggleFavorite, isFavorite };
}
