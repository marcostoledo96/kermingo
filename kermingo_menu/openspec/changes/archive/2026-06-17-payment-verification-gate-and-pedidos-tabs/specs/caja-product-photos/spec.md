# Caja Product Photos Specification

## Purpose

Use existing product image data to improve recognition in `/admin/caja` without changing checkout behavior.

## Requirements

### Requirement: Caja product cards render images when available

The caja rápida product list MUST render a product image when the product payload includes `imagen_url`. Relative image URLs from the backend MUST be converted to backend-absolute URLs before being used in `<img>`.

#### Scenario: Product with image displays photo

- GIVEN `GET /api/productos?activo=1` returns a product with `imagen_url`
- WHEN `/admin/caja` renders the product card/button
- THEN an image is visible with meaningful alt text based on product name.

#### Scenario: Product without image keeps fallback

- GIVEN a product has no `imagen_url`
- WHEN `/admin/caja` renders it
- THEN the current non-image fallback remains visible
- AND the product can still be selected.
