#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Hook de Claude Code: check-imports (evento PostToolUse, herramientas
// Edit | Write | MultiEdit)
//
// Qué hace:
//   Se ejecuta DESPUÉS de que Claude crea o edita un archivo de código en
//   `apps/`. Valida dos reglas de imports usando la regla de Biome
//   `style/noRestrictedImports` configurada en biome.json:
//
//   1. Path aliases: siempre `@/…`; prohibido `../` (`./` solo en la misma carpeta).
//   2. Barrels: importar mediante `index.ts` del módulo/capa/carpeta
//      (ej. `@/modules/lineas`, `@/components/ui`, `@/lib`; en apps/api
//      `@/modules/lineas/index.js`), nunca un archivo interno.
//
// Cómo avisa:
//   Si hay violaciones sale con código 2 y escribe el diagnóstico en stderr.
//   El archivo ya quedó escrito, pero Claude recibe el error y debe corregir
//   los imports antes de continuar.
//
// Entrada: JSON por stdin con { tool_input: { file_path } }.
// -----------------------------------------------------------------------------

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input?.tool_input?.file_path ?? "";
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();

// Solo archivos JS/TS dentro de apps/.
const relPath = relative(projectDir, filePath);
if (!/^apps\/[^/]+\/.+\.(ts|tsx|js|jsx|mts|cts)$/.test(relPath)) process.exit(0);

const biome = join(projectDir, "node_modules", ".bin", "biome");
if (!existsSync(biome)) process.exit(0); // Dependencias sin instalar: no bloquear.

try {
  execFileSync(
    biome,
    ["lint", "--only=style/noRestrictedImports", "--no-errors-on-unmatched", relPath],
    { cwd: projectDir, encoding: "utf8", stdio: "pipe" },
  );
} catch (error) {
  const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
  process.stderr.write(
    `Imports inválidos en ${relPath}: usa path aliases @/ (sin ../) e importa mediante barrels (index.ts).\n\n${output}\n`,
  );
  process.exit(2);
}

process.exit(0);
