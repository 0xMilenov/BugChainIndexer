"use client";

import { useEffect } from "react";

const CHUNK_RELOAD_KEY = "chunk-reload-ts";
const RELOAD_COOLDOWN_MS = 10_000;

// When a new Next.js build replaces chunk filenames, browsers holding the
// previous HTML 404 on the old chunk URL and surface ChunkLoadError. A hard
// reload pulls the freshly-deployed HTML+chunks. Cooldown prevents loops if
// the chunk is genuinely missing (true 500 → user sees the error UI).
export function useChunkErrorRecovery(error: Error) {
  useEffect(() => {
    const isChunkLoadError =
      error.name === "ChunkLoadError" ||
      /Loading chunk [\w-]+ failed/i.test(error.message) ||
      /Failed to load chunk/i.test(error.message);

    if (!isChunkLoadError) return;

    const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return;

    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
  }, [error]);
}
