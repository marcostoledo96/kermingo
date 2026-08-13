# Spec: demo-documentation

## Purpose

Document demo mode, Railway decommission, backend revival, and how to modify the frontend so future agents/humans can revive or extend the portfolio.

## Requirements

### Requirement: Index map

`DOCUMENTACION/IA/INDEX.md` SHALL link new docs: modo demo, revivir backend, guía frontend.

### Requirement: Deploy status

`DOCUMENTACION/IA/DEPLOY.md` SHALL describe the current architecture as Vercel-only demo, mark Railway as decommissioned, and include a teardown checklist.

### Requirement: Demo mode doc

`DOCUMENTACION/IA/MODO-DEMO.md` SHALL explain the mock flag, demo credentials, what is real vs fake, and Vercel env vars.

### Requirement: Revive runbook

`DOCUMENTACION/IA/REVIVIR-BACKEND.md` SHALL explain restoring MySQL from schema/seed or anonymized archive, required env vars, and optional Drive.

### Requirement: Frontend guide

`DOCUMENTACION/IA/GUIA-FRONTEND.md` SHALL explain where to edit landing/menu/admin, fixtures, and static product images.

### Requirement: Secrets hygiene

`DOCUMENTACION/IA/SECRETS.md` SHALL note Railway secrets as obsolete after decommission and instruct OAuth revocation.

### Requirement: Root README

Root `README.md` SHALL state the project is a permanent demo portfolio and point to the IA docs.
