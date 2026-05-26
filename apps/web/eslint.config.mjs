import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: currentDir,
});

const eslintConfig = [...compat.extends("next/core-web-vitals")];

export default eslintConfig;
