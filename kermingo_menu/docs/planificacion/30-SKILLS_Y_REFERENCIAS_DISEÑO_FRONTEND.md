# 30 — Skills y referencias para mejorar diseño frontend Kermingo

> Objetivo: instalar skills que ayuden a OpenCode/Gentle-AI a mejorar UI, UX, performance, testing y Git sin caer en resultados genéricos.

---

## 1. Skills prioritarias

## 1.1. Diseño distintivo

```bash
npx skills add anthropics/skills --skill frontend-design
```

Uso:

```txt
Para rediseñar landing, menú, admin y pantallas públicas evitando look genérico de IA.
```

Motivo:

```txt
Obliga a tomar decisiones deliberadas de paleta, tipografía, layout, jerarquía, copy y elemento visual distintivo.
```

---

## 1.2. Auditoría UX/accesibilidad

```bash
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
```

Uso:

```txt
Para revisar componentes después de cada mejora visual.
```

Debe detectar:

```txt
- icon buttons sin aria-label;
- inputs sin label;
- focus invisible;
- transition-all;
- imágenes sin dimensiones;
- estados vacíos pobres;
- botones chicos;
- problemas de contraste;
- navegación con onClick en vez de Link.
```

---

## 1.3. React/Next performance

```bash
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills add vercel-labs/next-skills --skill next-best-practices
```

Uso:

```txt
Para revisar performance, límites server/client components, imágenes, fuentes, bundling y patrones de datos.
```

---

## 1.4. Testing de webapp

```bash
npx skills add anthropics/skills --skill webapp-testing
```

Uso:

```txt
Para validar flujos de compra, ticket, seguimiento y admin después de rediseños.
```

---

## 1.5. Shadcn/ui

```bash
npx skills add shadcn/ui --skill shadcn
```

Uso:

```txt
Para tomar patrones de sidebar, navegación, forms, tablas y componentes accesibles sin copiar estética genérica.
```

Regla:

```txt
No importar un dashboard completo sin adaptar identidad Kermingo.
```

---

## 2. Skills recomendadas de diseño avanzado

Estas son de terceros. Revisar `SKILL.md` antes de instalarlas.

```bash
npx skills add leonxlnx/taste-skill --skill design-taste-frontend
npx skills add leonxlnx/taste-skill --skill high-end-visual-design
npx skills add leonxlnx/taste-skill --skill redesign-existing-projects
npx skills add leonxlnx/taste-skill --skill minimalist-ui
npx skills add arvindrk/extract-design-system --skill extract-design-system
```

Uso recomendado:

```txt
- design-taste-frontend: criticar si una UI se ve genérica.
- high-end-visual-design: pulir tipografía, composición y jerarquía.
- redesign-existing-projects: intervenir sin reescribir todo.
- minimalist-ui: reducir exceso visual en admin.
- extract-design-system: extraer tokens/componentes de lo ya hecho.
```

---

## 3. Skills para Git y forma de trabajo

```bash
npx skills add https://github.com/netresearch/git-workflow-skill --skill git-workflow
```

Uso:

```txt
Para ramas por módulo, commits atómicos, Conventional Commits, PRs y verificación antes de merge.
```

Formato recomendado para este proyecto:

```bash
git checkout -b modulo/admin-dashboard-visual

git commit -m "feat(admin-dashboard): rediseñar mesa operativa del evento"
git commit -m "docs(frontend): documentar dirección visual del dashboard"
```

Ramas sugeridas:

```txt
modulo/design-tokens
modulo/admin-dashboard-visual
modulo/admin-caja-visual
modulo/admin-cocina-visual
modulo/admin-pedidos-visual
modulo/admin-productos-visual
modulo/checkout-ticket-visual
```

---

## 4. Skills de QA / metodología

```bash
npx skills add obra/superpowers --skill verification-before-completion
npx skills add obra/superpowers --skill requesting-code-review
npx skills add obra/superpowers --skill receiving-code-review
npx skills add obra/superpowers --skill systematic-debugging
```

Uso:

```txt
Para no cerrar tareas sin evidencia, pedir revisión, recibir feedback y depurar sin tocar de más.
```

---

## 5. Skills de archivos

```bash
npx skills add anthropics/skills --skill xlsx
npx skills add anthropics/skills --skill pdf
```

Uso futuro:

```txt
- xlsx: carga masiva / plantillas de productos o pedidos si se implementa.
- pdf: tickets, reportes o certificados futuros.
```

---

## 6. Referencias visuales y técnicas a estudiar

## 6.1. Admin/dashboard

```txt
Vercel Next.js + shadcn admin dashboard:
https://vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard

Vercel admin dashboard starter:
https://vercel.com/templates/next.js/admin-dashboard

shadcn sidebar blocks:
https://ui.shadcn.com/blocks/sidebar

Tailwind Plus Application UI:
https://tailwindcss.com/plus
```

Cómo usarlas:

```txt
- Tomar estructura, navegación, responsive y composición.
- No copiar estética neutral SaaS.
- Adaptar a Kermingo: caja/cocina/pedidos/stock como operación real.
```

---

## 6.2. Caja y cocina

```txt
Square Kitchen Display System:
https://squareup.com/us/en/point-of-sale/restaurants/kitchen-display-system

Oracle KDS:
https://www.oracle.com/food-beverage/restaurant-pos-systems/kds-kitchen-display-systems/

Dribbble Kitchen Display inspiration:
https://dribbble.com/search/kitchen-display
```

Cómo usarlas:

```txt
- Entender tickets digitales, estados, preparación y entrega.
- Priorizar legibilidad y estado actual, no decoración.
```

---

## 6.3. Checkout, carrito y QR

```txt
Baymard Checkout UX:
https://baymard.com/blog/current-state-of-checkout-ux

NNGroup QR Code Guidelines:
https://www.nngroup.com/articles/qr-code-guidelines/
```

Cómo usarlas:

```txt
- Reducir fricción en checkout.
- Explicar claramente qué hacer con QR, código y seguimiento.
- Evitar tickets QR decorativos que no escaneen bien.
```

---

## 6.4. Accesibilidad

```txt
WCAG Contrast Minimum:
https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

WCAG Target Size Minimum:
https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

WCAG Focus Appearance:
https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
```

Criterio práctico:

```txt
- Texto normal: apuntar a 4.5:1.
- Controles táctiles: mínimo 24x24 CSS px, ideal más grande en mobile.
- Focus visible: no eliminar outline sin reemplazo.
```

---

## 6.5. Next.js

```txt
Next.js Image Component:
https://nextjs.org/docs/app/api-reference/components/image

Next.js Font Optimization:
https://nextjs.org/docs/app/getting-started/fonts
```

Aplicación en Kermingo:

```txt
- Imágenes de productos con relación de aspecto estable.
- Logo/hero optimizados.
- Fuentes con next/font, sin links externos.
```

---

## 7. Orden recomendado de uso de skills

Para una tarea de rediseño:

```txt
1. frontend-design
   - Definir dirección visual y plan.

2. extract-design-system o redesign-existing-projects
   - Extraer lo que ya funciona y no romperlo.

3. web-design-guidelines
   - Auditar accesibilidad/UX.

4. vercel-react-best-practices + next-best-practices
   - Revisar performance/Next.

5. webapp-testing
   - Validar flujos.

6. git-workflow
   - Preparar commit/rama/PR.
```
