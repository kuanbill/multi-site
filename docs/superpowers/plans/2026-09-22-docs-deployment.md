# Documentation And Deployment Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document local development and production deployment, and make the Docker deployment consume explicit production secrets safely.

**Architecture:** Keep the existing Next.js, Prisma, SQLite, Docker Compose, and Nginx deployment structure. Add a committed environment-variable template and make the deployment script pass `.env.production` explicitly to every Compose operation.

**Tech Stack:** Markdown, dotenv, Docker Compose, Bash, Next.js 16, Prisma 7.

**Spec:** Approved in chat on 2026-09-22 as the documentation and deployment hardening scope.

## Global Constraints

- Do not expose real credentials or secrets in tracked files.
- Preserve the existing local SQLite and Docker SQLite database paths.
- Keep the existing application behavior unchanged.
- Use Traditional Chinese for user-facing documentation.
- Verify TypeScript, lint, production build, and Docker Compose configuration.

---

### Task 1: Project Documentation

**Files:**
- Modify: `README.md`

- [x] Add project purpose, current capabilities, prerequisites, local setup, database commands, verification commands, test-account warning, Docker deployment, and Nginx notes.
- [x] Confirm every documented command exists in `package.json`, `deploy.sh`, or the existing Prisma configuration.

### Task 2: Environment Template

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`

- [x] Add `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` placeholders without real secrets.
- [x] Add a negated ignore rule so `.env.example` is trackable while real `.env*` files remain ignored.

### Task 3: Deployment Hardening

**Files:**
- Modify: `docker-compose.yml`
- Modify: `deploy.sh`
- Modify: `README.md`

- [x] Require runtime database and NextAuth variables instead of silently using an insecure default secret.
- [x] Replace the Alpine-incompatible `curl` healthcheck with an available HTTP probe.
- [x] Make `deploy.sh` use `docker compose --env-file .env.production` for build, startup, migration, and opt-in seed commands.
- [x] Keep the existing first-run seed marker behavior and fail immediately on command errors.
- [x] Synchronize README deployment commands and variable descriptions with the hardened Compose flow.

### Task 4: Verification

**Files:**
- No additional files.

- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Run the current `docker-compose.yml` through `docker compose config --quiet` on the deployed Docker host using a temporary, non-secret validation copy and the host environment file. Docker emitted only the existing obsolete `version` warning; the temporary file was removed afterward.
