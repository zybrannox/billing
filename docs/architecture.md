# Frontend architecture

```
src/
  main.tsx, App.tsx      routing + providers (shell)
  layouts/               AdminLayout, EmployeeLayout, PortalLayout, navigation.ts (shell)
  portal/                client-portal pages (shell)
  features/<area>/       one folder per business area (see below)
  ui/                    design-system components (buttons, tables, dialogs, cards)
  theme/                 design tokens -> CSS variables + MUI theme
  format/  domain/  messages/   money/date/phone formatting, enums & status rules, shared copy
  hooks/  utils/  api/  store/  types/   cross-cutting plumbing and session/dialog state
```

## The dependency rule

Imports only point **down**. ESLint enforces it (`no-restricted-imports`, configured at the top of `eslint.config.js`), so a violation fails `pnpm lint` and CI.

| Layer | May import |
| --- | --- |
| shared (`ui`, `format`, `domain`, `messages`, `theme`, `hooks`, `utils`, `api`, `store`, `types`) | shared only |
| `features/<x>` | shared + the features listed for `<x>` in `FEATURE_DEPENDENCIES` |
| shells (`layouts`, `portal`, `App`) | everything |

Current feature graph (an edge means "may import"):

```
projects -> customers -> billing -> documents
companies -> billing           system -> billing, documents
employees -> auth              projects -> documents
dashboard, job-requests, auth, documents: leaves
```

## Where does new code go?

* Used by two or more features and has no business knowledge -> `ui/` (component) or `utils/`/`format/` (function).
* Business rules, enums, statuses -> `domain/`. Display text used in more than one place -> `messages/`.
* A page, dialog, store or form belonging to one area -> that area's `features/` folder, flat. Form field definitions live in the feature's `fields.ts`, its zod schema in `*.schema.ts`.
* Need something from another feature? Check the graph above. If the dependency is real and keeps the graph one-way, add the edge in `FEATURE_DEPENDENCIES`; if it would create a cycle, the shared piece belongs one layer down (this is how `StatCard`/`SectionCard`, `useProjectStore` and `useListOptionsStore` ended up in shared code).
* Colours, type sizes, radii, shadows: only `src/theme/tokens.ts` (then `pnpm tokens`).

## Features

| Folder | What it owns |
| --- | --- |
| `auth` | login, forgot/change password, route guards, password policy |
| `documents` | the generic document renderer, templates/themes, settings store, PDF + WhatsApp plumbing (knows nothing about invoices) |
| `billing` | invoices, quotations, payments, their sheets, lists, drawers, adapters into `documents` |
| `customers`, `companies`, `employees` | list / profile / add pages |
| `projects` | projects table, add project, delivery check, files, notifications |
| `dashboard`, `job-requests`, `system` | admin dashboard, client job requests, System Setup (incl. document design) |
