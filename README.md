# Gege Tel

Gege Tel es un operador móvil nuevo. Sobre una sola plataforma multiempresa lanza dos productos:

1. **Portal empresarial**: gestión de Líneas, centros de costo y facturación.
2. **Beneficios para Usuarios de línea**: por WhatsApp y web, con agentes de IA.

La arquitectura es un monolito modular en NestJS, un frontend en Next.js y un servicio de IA delgado en FastAPI. Detalle en [`docs/arquitectura.md`](./docs/arquitectura.md).

## Estructura del monorepo

```
gegetel/
├── apps/
│   ├── web/          # Frontend Next.js (Tailwind v4, shadcn, lucide-react)
│   ├── api/          # API NestJS (arquitectura hexagonal)
│   └── design/       # Documentación UX/UI (Diseño Atómico)
├── docs/             # Documentación del proyecto
├── .claude/
│   ├── agents/       # Subagentes de Claude Code
│   └── skills/       # Skills locales (impeccable, setup-matt-pocock-skills)
├── skills-lock.json  # Versión instalada de las skills de skills.sh
├── GLOSSARY.md       # Lenguaje de dominio
└── AGENTS.md         # Instrucciones para agentes de IA
```

## Requisitos

- Node.js 24 (ver [`.nvmrc`](./.nvmrc))
- pnpm 11.6 (`packageManager` en `package.json`)
- [Claude Code](https://claude.com/claude-code) para usar subagentes y skills

## Configuración inicial

```bash
pnpm install
pnpm setup:skills
```

`pnpm setup:skills` instala las skills de Claude Code del proyecto en `.claude/`:

| Skill | Uso |
|---|---|
| `setup-matt-pocock-skills` | Configura issue tracker, labels de triage y docs de dominio para las skills de ingeniería. Ya aplicada en este repo (ver `docs/agents/`); se ejecuta con `/setup-matt-pocock-skills` solo si se reconfigura. |
| `impeccable` | Diseño UX/UI: línea gráfica, auditoría y pulido de interfaces. La usa el subagente `design`. Primera vez en el chat: `/impeccable init`. |

Las skills y los agentes se versionan en git. Lo que depende de cada equipo **no** se versiona y lo genera el script: el binario de `impeccable` según tu sistema operativo y los hooks en `.claude/settings.local.json`, que revisan cambios de UI después de cada edición.

Para actualizar ambas skills: `pnpm update:skills`.

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm install` | Instala dependencias del workspace |
| `pnpm dev:web` | Levanta el frontend en modo desarrollo |
| `pnpm dev:api` | Levanta la API en modo watch |
| `pnpm build` | Compila todos los paquetes |
| `pnpm lint` | Revisa el código con Biome |
| `pnpm format` | Formatea y corrige con Biome |
| `pnpm test` | Ejecuta las pruebas de los paquetes que las tienen |
| `pnpm setup:skills` | Instala skills de Claude Code, binario de `impeccable` y hooks locales |
| `pnpm update:skills` | Actualiza las skills a su última versión |

## Documentación

| Archivo | Contenido |
|---|---|
| [`GLOSSARY.md`](./GLOSSARY.md) | Glosario del dominio (Cliente, Empresa, Grupo, Línea, Créditos…) y términos a evitar |
| [`AGENTS.md`](./AGENTS.md) | Instrucciones base para agentes de IA: plan mode, issue tracker, labels, docs de dominio |
| [`docs/info_inicial.md`](./docs/info_inicial.md) | Resumen del proyecto y hechos establecidos (plazo, equipo, créditos de IA, fuentes de datos) |
| [`docs/arquitectura.md`](./docs/arquitectura.md) | Arquitectura del MVP con diagramas de contexto y componentes |
| [`docs/adr/0001-modelo-de-tenant.md`](./docs/adr/0001-modelo-de-tenant.md) | ADR: el tenant es Cliente, con Grupo opcional sobre Empresas |
| [`docs/adr/0002-aislamiento-con-rls.md`](./docs/adr/0002-aislamiento-con-rls.md) | ADR: aislamiento por Empresa con PostgreSQL compartida y Row-Level Security |
| [`docs/adr/0003-monolito-modular-y-servicio-de-ia.md`](./docs/adr/0003-monolito-modular-y-servicio-de-ia.md) | ADR: monolito modular en NestJS y servicio de IA en FastAPI |
| [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md) | Uso de GitHub Issues con `gh` CLI |
| [`docs/agents/triage-labels.md`](./docs/agents/triage-labels.md) | Vocabulario de labels de triage |
| [`docs/agents/domain.md`](./docs/agents/domain.md) | Cómo los agentes consumen el glosario y los ADR |
| [`docs/subagentes.md`](./docs/subagentes.md) | Guía de subagentes: cuándo y cómo usar cada uno |
| [`apps/design/`](./apps/design/) | Sistema de diseño UX/UI (pendiente de generar por el subagente `design`) |

## Subagentes de Claude Code

| Agente | Cuándo usarlo |
|---|---|
| `design` | Definir o cambiar UX/UI, tokens y specs en `apps/design/` |
| `frontend` | Implementar UI en `apps/web` según el diseño |
| `backend` | Implementar la API en `apps/api` |
| `synthetic-qa` | Pruebas E2E, visuales y de componentes del frontend (mobile, tablet, desktop) |
| `backend-qa` | Pruebas unitarias, de integración, endpoints y webhooks de la API |

Guía completa, ejemplos y flujo recomendado: [`docs/subagentes.md`](./docs/subagentes.md).

## Convenciones

- Commits con [Conventional Commits](https://www.conventionalcommits.org/), validados por commitlint y Husky.
- Lint y formato con Biome (`pnpm lint`, `pnpm format`).
- Solo `pnpm` como gestor de paquetes.
- **Imports con path alias `@/`**: prohibido `../`; `./` solo dentro de la misma carpeta.
- **Imports mediante barrels (`index.ts`)**: `@/modules/<modulo>`, `@/modules/<modulo>/<capa>`, `@/components/ui`, `@/lib`… En `apps/api` (ESM) con extensión: `@/modules/<modulo>/index.js`.

## Hooks de Claude Code

Definidos en [`.claude/settings.json`](./.claude/settings.json) (versionado; aplican a todo el equipo al abrir el proyecto con Claude Code). Scripts comentados en [`.claude/hooks/`](./.claude/hooks/).

| Hook | Evento | Qué verifica | Si falla |
|---|---|---|---|
| [`guard-git.mjs`](./.claude/hooks/guard-git.mjs) | `PreToolUse` · Bash | Antes de un `git commit` / `git push` de Claude: `apps/*/qa/evidence/` vacía y ningún commit con `Co-authored-by:` | Bloquea el comando: `se deben eliminar los archivos de la carpeta qa/evidence antes de desplegar cambios` / `No se permiten commits con co-author` |
| [`check-imports.mjs`](./.claude/hooks/check-imports.mjs) | `PostToolUse` · Edit, Write | Tras editar código en `apps/`: alias `@/` (sin `../`) e imports mediante barrels | Devuelve el error de Biome a Claude para que corrija los imports |

Además, `includeCoAuthoredBy: false` evita que Claude Code agregue co-autores a sus commits.

Los hooks de git (Husky) solo ejecutan commitlint y `biome check` sobre los archivos en stage.
