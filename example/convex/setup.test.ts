/// <reference types="vite/client" />
import { test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
export const modules = import.meta.glob("./**/*.*s");

import componentSchema from "../../src/component/schema.js";
export { componentSchema };
export const componentModules = import.meta.glob("../../src/component/**/*.ts");

export function initConvexTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("agent", componentSchema, componentModules);
  return t;
}

test("setup", () => {});
