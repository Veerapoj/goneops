import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const tailwind = readFileSync(new URL("../tailwind.config.ts", import.meta.url), "utf8");

test("global styles provide dark mode and responsive base polish", () => {
  for (const label of [
    "color-scheme: light dark",
    "@media (prefers-color-scheme: dark)",
    "--background",
    "--foreground",
    "--panel",
    "--border",
    "min-width: 320px",
    "@media (max-width: 640px)"
  ]) {
    assert.ok(globals.includes(label));
  }
});

test("tailwind colors use css variables for light and dark themes", () => {
  for (const label of ["var(--background)", "var(--foreground)", "var(--panel)", "var(--muted)", "var(--border)", "var(--accent)"]) {
    assert.ok(tailwind.includes(label));
  }
});
