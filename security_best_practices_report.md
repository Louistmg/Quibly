# Rapport de sécurité - Quibly

## Résumé exécutif
Audit frontend React/TypeScript réalisé sur le dépôt. Constatations : 0 critique, 0 élevé, 2 moyen, 3 faible. Les points principaux concernent l'absence de politiques CSP/headers de sécurité visibles dans le repo et la persistance probable des jetons Supabase côté navigateur.

## Constatations

[MED-001] Absence de CSP / headers de sécurité visibles dans le repo
Rule ID: REACT-HEADERS-001 / JS-CSP-001
Severity: Medium
Location: `index.html` (lignes 1-12)
Evidence:
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Quibly - The free alternative to Kahoot</title>
    <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@100,200,300,400,500,700,800,900&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```
Impact: Sans CSP/headers, la surface XSS/clickjacking est moins protégée (défense en profondeur).
Fix: Configurer les headers de sécurité au niveau edge/CDN (CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors/X-Frame-Options).
Mitigation: Si l'hébergement est statique sans accès aux headers, ajouter une CSP via `<meta http-equiv="Content-Security-Policy">` en tête du `<head>` en respectant ses limitations.
False positive notes: Ces headers peuvent être définis hors repo (Vercel/Netlify/Cloudflare). À vérifier au runtime.

[MED-002] Jetons Supabase probablement persistés en localStorage (par défaut)
Rule ID: REACT-AUTH-001 / JS-STORAGE-001
Severity: Medium
Location: `src/lib/supabase.ts` (lignes 1-6)
Evidence:
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)
```
Impact: Si un XSS survient, les jetons d'auth Supabase stockés côté navigateur peuvent être exfiltrés, ce qui augmente l'impact.
Fix: Configurer le client Supabase pour éviter la persistance locale (par ex. `auth: { persistSession: false, storage: custom }`) ou basculer vers des cookies HTTPOnly côté backend.
Mitigation: Réduire la durée de vie des jetons, activer CSP stricte, durcir les règles RLS côté Supabase.
False positive notes: Si un stockage custom est configuré ailleurs (ou si l'app tourne dans un contexte sans storage), l'impact peut être réduit.

[LOW-001] Données de session et brouillon stockés dans localStorage (données altérables)
Rule ID: JS-STORAGE-001
Severity: Low
Location: `src/App.tsx` (lignes 58-82), `src/pages/CreateQuiz.tsx` (lignes 110-134)
Evidence:
```ts
const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY)
window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(value))
window.localStorage.removeItem(ACTIVE_SESSION_KEY)
window.localStorage.removeItem(CREATE_QUIZ_DRAFT_KEY)
```
```ts
const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
window.localStorage.removeItem(DRAFT_STORAGE_KEY)
```
Impact: En cas de XSS ou de modification locale, ces valeurs peuvent être altérées (ex. tentative d'accès à une autre session).
Fix: Traiter systématiquement ces valeurs comme non fiables et s'appuyer sur des validations serveur/RLS; envisager `sessionStorage` ou mémoire pour des données moins persistantes.
Mitigation: Validation stricte déjà partielle côté client; conserver cette validation et ajouter des contrôles côté serveur.
False positive notes: Ce point est surtout une note d'hygiène; l'impact dépend des règles RLS en base.

[LOW-002] Usage de `dangerouslySetInnerHTML` pour des styles dynamiques
Rule ID: REACT-XSS-001
Severity: Low
Location: `src/components/ui/chart.tsx` (lignes 70-98)
Evidence:
```tsx
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
```
Impact: Si des valeurs non fiables alimentent `config`, cela ouvre une surface d'injection CSS/HTML.
Fix: Garantir que `config` n'est jamais alimenté par des entrées utilisateur; sinon, appliquer une validation stricte des valeurs (allowlist CSS).
Mitigation: Garder ce composant interne et non exposé à des données non fiables.
False positive notes: Si `config` est 100% contrôlé côté code, le risque est faible.

[LOW-003] Ressource tierce sans SRI
Rule ID: REACT-SRI-001 / REACT-3P-001
Severity: Low
Location: `index.html` (ligne 8)
Evidence:
```html
<link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@100,200,300,400,500,700,800,900&display=swap" rel="stylesheet">
```
Impact: Risque supply-chain si la ressource tierce est modifiée côté CDN.
Fix: Auto-héberger la police, ou ajouter `integrity` + `crossorigin` (SRI) avec version figée.
Mitigation: Restreindre `style-src` et `font-src` via CSP.
False positive notes: L'impact reste faible si l'origine est de confiance et surveillée.
