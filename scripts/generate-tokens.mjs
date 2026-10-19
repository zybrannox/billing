// Regenerates src/theme/tokens.generated.css from src/theme/tokens.ts:
//
//   pnpm tokens
//
// The generated file is committed, so a plain `vite build` (how production
// builds) needs no extra step and vite.config.ts stays untouched. Run this
// after editing tokens.ts - `pnpm dev` does it for you, and a unit test fails
// if the committed file is ever out of date. Node runs the TypeScript sources
// directly (native type stripping), so there is no extra tooling.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tokensToCss } from "../src/theme/generateCss.ts";

const out = fileURLToPath(new URL("../src/theme/tokens.generated.css", import.meta.url));
writeFileSync(out, tokensToCss());
console.log("wrote src/theme/tokens.generated.css");
