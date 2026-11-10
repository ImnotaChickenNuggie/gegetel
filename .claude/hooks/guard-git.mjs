#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Hook de Claude Code: guard-git (evento PreToolUse, herramienta Bash)
//
// Qué hace:
//   Se ejecuta ANTES de que Claude corra un comando en la terminal. Si el
//   comando es un `git commit` o un `git push`, aplica dos reglas:
//
//   1. qa/evidence vacía: si `apps/*/qa/evidence/` contiene archivos, bloquea
//      el commit/push. Las capturas del subagente synthetic-qa son temporales
//      y deben eliminarse tras la revisión visual.
//
//   2. Sin co-author:
//      - commit: bloquea si el mensaje (en el comando, en un archivo -F, o el
//        mensaje reutilizado por --amend) contiene "Co-authored-by:".
//      - push: bloquea si alguno de los commits que se van a enviar contiene
//        "Co-authored-by:".
//
// Cómo bloquea:
//   Sale con código 2 y escribe el motivo en stderr. Claude Code cancela el
//   comando y le muestra el mensaje a Claude para que lo corrija.
//
// Entrada: JSON por stdin con { tool_input: { command }, cwd }.
// -----------------------------------------------------------------------------

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const EVIDENCE_MESSAGE =
  "se deben eliminar los archivos de la carpeta qa/evidence antes de desplegar cambios";
const CO_AUTHOR_REGEX = /^\s*co-authored-by:/im;

const input = JSON.parse(readFileSync(0, "utf8"));
const command = input?.tool_input?.command ?? "";
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();

// Detecta `git commit` / `git push` en cualquier parte del comando
// (incluye cadenas con &&, ; o flags globales como `git -C dir commit`).
const isCommit = /\bgit\b[^;&|\n]*\bcommit\b/.test(command);
const isPush = /\bgit\b[^;&|\n]*\bpush\b/.test(command);

if (!isCommit && !isPush) process.exit(0);

/** Termina bloqueando el comando con un mensaje para Claude. */
function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

/** Lista recursiva de archivos dentro de un directorio. */
function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

/** Ejecuta git en el proyecto y devuelve stdout ("" si falla). */
function git(args) {
  try {
    return execFileSync("git", args, { cwd: projectDir, encoding: "utf8", stdio: "pipe" });
  } catch {
    return "";
  }
}

// --- Regla 1: qa/evidence debe estar vacía -----------------------------------
const appsDir = join(projectDir, "apps");
const evidenceFiles = existsSync(appsDir)
  ? readdirSync(appsDir)
      .map((app) => join(appsDir, app, "qa", "evidence"))
      .filter((dir) => existsSync(dir))
      .flatMap(listFiles)
  : [];

if (evidenceFiles.length > 0) {
  const list = evidenceFiles.map((f) => `  - ${f.replace(`${projectDir}/`, "")}`).join("\n");
  block(`${EVIDENCE_MESSAGE}\n\nArchivos encontrados:\n${list}`);
}

// --- Regla 2a: commit sin co-author ------------------------------------------
if (isCommit) {
  let message = command;

  // Mensaje desde archivo: -F <archivo> / --file=<archivo>
  const fileMatch = command.match(/(?:-F\s+|--file[=\s]+)(["']?)([^\s"']+)\1/);
  if (fileMatch) {
    const msgPath = resolve(projectDir, fileMatch[2]);
    if (existsSync(msgPath)) message += `\n${readFileSync(msgPath, "utf8")}`;
  }

  // --amend sin mensaje nuevo reutiliza el mensaje del último commit.
  if (/--amend\b/.test(command) && !/(\s-m\b|--message\b|\s-F\b|--file\b)/.test(command)) {
    message += `\n${git(["log", "-1", "--format=%B"])}`;
  }

  // En el comando el trailer puede venir en medio de la línea (-m "...\n\nCo-authored-by: ..."),
  // por eso aquí se busca en cualquier posición.
  if (/co-authored-by:/i.test(message)) {
    block(
      "No se permiten commits con co-author (Co-authored-by). Elimina la línea 'Co-authored-by:' del mensaje y vuelve a intentarlo.",
    );
  }
}

// --- Regla 2b: push sin commits con co-author --------------------------------
if (isPush) {
  // Commits pendientes de enviar: contra el upstream si existe; si no, todo lo
  // que aún no está en ninguna rama remota.
  const hasUpstream = git(["rev-parse", "--abbrev-ref", "@{u}"]).trim() !== "";
  const range = hasUpstream ? ["@{u}..HEAD"] : ["HEAD", "--not", "--remotes"];
  const messages = git(["log", "--format=%H%n%B%n---", ...range]);

  if (CO_AUTHOR_REGEX.test(messages)) {
    block(
      "No se permite desplegar commits con co-author (Co-authored-by). Reescribe los commits afectados (git rebase -i / git commit --amend) antes de hacer push.",
    );
  }
}

process.exit(0);
