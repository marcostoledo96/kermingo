# Spec: archival-db-dump

## Purpose

Preserve a recoverable MySQL snapshot of the event database on GitHub without exposing PII or secrets in a public repository.

## Requirements

### Requirement: Canonical revive path

`backend/src/api/database/schema.sql`, `indexes.sql`, and `seed.sql` SHALL remain the primary empty-system revive path.

### Requirement: Anonymized archive

The repository MAY include `backend/src/api/database/archives/<date>-prod-anonymized.sql` (optionally gzipped).

The anonymized dump SHALL:

- Keep schema-compatible structure and non-PII catalog data (categorias, productos, combos, config)
- Replace real customer names, phones, and WhatsApp fields with synthetic values
- Replace tracking tokens with synthetic tokens
- Replace admin password hashes with the known demo hash for `admin123`
- Omit or null real Google Drive IDs / public URLs that would leak private assets
- NEVER contain JWT secrets, OAuth tokens, or DB passwords

### Requirement: Documentation

`archives/README.md` SHALL document:

- PII policy (RAW dumps must never be committed)
- How the anonymized file was produced
- How to restore locally with mysql client

### Requirement: Raw dump handling

Raw production dumps SHALL stay outside git (local path or private channel only) and SHOULD be deleted after anonymization is verified.
