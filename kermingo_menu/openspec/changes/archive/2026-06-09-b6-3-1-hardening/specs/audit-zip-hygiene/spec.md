# Audit ZIP Hygiene Specification

## Purpose

Ensure the audit ZIP generation script produces clean archives that exclude secrets, credentials, build artifacts, and heavy directories that should never be part of an audit bundle.

## Requirements

### Requirement: Audit ZIP script must exclude secrets and artifacts

The system MUST provide `scripts/crear_zip_auditoria.sh` that generates a timestamped ZIP of the project, explicitly excluding: `.env`, `node_modules/`, `.next/`, `coverage/`, `dist/`, `credentials/`, `drive-credentials.json`, `.git/`, and any `*.key` or `*.pem` files. The script MUST verify exclusions after generation and fail if any excluded pattern is found in the ZIP.

#### Scenario: ZIP excludes .env files

- GIVEN `bash scripts/crear_zip_auditoria.sh` is executed
- WHEN the ZIP is generated
- THEN no `.env` or `.env.*` files are present in the archive
- AND the script exits 0

#### Scenario: ZIP excludes node_modules

- GIVEN the project has `node_modules/` with thousands of files
- WHEN the ZIP is generated
- THEN no `node_modules/` directory or contents are in the archive
- AND the ZIP size is reasonable (< 50 MB)

#### Scenario: ZIP excludes credentials

- GIVEN `credentials/` directory and `drive-credentials.json` exist
- WHEN the ZIP is generated
- THEN neither the directory nor the file are in the archive

#### Scenario: ZIP excludes build artifacts

- GIVEN `.next/`, `coverage/`, and `dist/` directories exist
- WHEN the ZIP is generated
- THEN none of these directories are in the archive

#### Scenario: Post-generation verification catches leaks

- GIVEN the ZIP is generated
- WHEN the verification step runs
- THEN it scans the ZIP for excluded patterns
- AND if any are found, the script exits non-zero with a list of violations

**Traceability**: `scripts/crear_zip_auditoria.sh`, `DOCUMENTACION/IA/TESTING.md` (ZIP generation docs)
