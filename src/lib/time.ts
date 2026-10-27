import "server-only";
import { cache } from "react";

/** One timestamp per request, so every component renders against the same "now". */
export const requestNow = cache((): number => Date.now());
