# Quibly - Agent Instructions

## Project Overview
Quibly is an open-source Kahoot alternative built with React 19, TypeScript, Vite, and Tailwind CSS v4. It uses shadcn/ui components, Huge Icons, and Supabase for real-time quiz gaming.

## Commands

### Development
```bash
pnpm dev              # Start development server
pnpm build            # Build for production (runs TypeScript + Vite)
pnpm preview          # Preview production build
```

### Linting
```bash
pnpm lint             # Run ESLint on all src files
```

### Package Management
```bash
pnpm add <package>    # Add dependency
pnpm add -D <package> # Add dev dependency
```

## Project Structure

```
src/
├── components/ui/     # shadcn/ui components (Button, Card, Input)
├── hooks/            # Custom React hooks (useSupabase)
├── lib/              # Utilities and Supabase client
├── pages/            # Page components (Home, CreateQuiz, etc.)
├── types/            # TypeScript type definitions
├── App.tsx           # Main app component with routing logic
└── main.tsx          # Entry point
```

## Code Style Guidelines

### TypeScript
- Use strict TypeScript with explicit types
- Prefer `type` over `interface` for object shapes
- Use `React.FC` sparingly; prefer regular function components
- Avoid `any` types - use `unknown` or proper generics
- Use PascalCase for types and interfaces

### Imports
```typescript
// React imports first
import { useState, useCallback } from 'react'

// Third-party libraries
import { Button } from '@/components/ui/button'
import { PlayIcon } from 'hugeicons-react'

// Local imports grouped by type
import { useSupabase } from '@/hooks/useSupabase'
import { supabase } from '@/lib/supabase'
import type { Quiz, Player } from '@/types'

// Relative imports last
import './App.css'
```

### Naming Conventions
- Components: PascalCase (`Home.tsx`, `CreateQuiz.tsx`)
- Hooks: camelCase starting with `use` (`useSupabase`)
- Types: PascalCase (`Quiz`, `GameSession`)
- Variables/Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Files: PascalCase for components, camelCase for utilities

### React Patterns
- Use functional components with hooks
- Prefer `useCallback` for memoized callbacks
- Use `useMemo` for expensive computations
- Keep components focused and small
- Extract reusable logic into custom hooks
- Use early returns for loading/error states

### Error Handling
```typescript
const handleAction = async () => {
  try {
    const result = await someAsyncAction()
    // Handle success
  } catch (err) {
    console.error('Descriptive error message:', err)
    // Show user-friendly error
    alert('Action failed. Please try again.')
  }
}
```

### Styling (Tailwind CSS v4)
- Use Tailwind utility classes exclusively
- No arbitrary values (e.g., avoid `w-[123px]`)
- Use CSS variables from design system
- Group related classes logically
- Use `cn()` utility for conditional classes
- Follow mobile-first responsive design

### Icons
- Use **Huge Icons** library exclusively (`hugeicons-react`)
- Import specific icons: `import { PlayIcon } from 'hugeicons-react'`
- Common icons: `PlayIcon`, `UserGroupIcon`, `ArrowRight01Icon`, `Tick02Icon`

### Components
- Keep props interfaces simple and explicit
- Use destructuring in function parameters
- Default props when appropriate
- Document complex prop types with JSDoc

### Supabase Integration
- Use `useSupabase` hook for database operations
- Handle real-time subscriptions with cleanup
- Use proper error handling for all DB calls
- Type database responses with custom types

### French Language Conventions
- UI text in French
- No mid-sentence capitalizations ("Créer un quiz" not "Créer un Quiz")
- Use proper French typography
- No emojis - use icons only

### ESLint Rules
- Max 0 warnings allowed
- No unused variables
- React Hooks rules enforced
- No explicit `any` types

## Environment Variables
```env
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Language Policy

### Code Language
- All code must be written in **English**: variable names, function names, comments, documentation
- Examples: `handleSubmit`, `fetchQuizData`, `// Calculate total score`
- UI text displayed to users should be in **French** (as this is a French-language application)

### Communication Language
- Always respond to the user in **French** at the end of each task
- Technical explanations and code reviews can be in English
- Final summaries and user-facing messages must be in French

## Task Completion Workflow

After completing any code changes, ALWAYS run:
```bash
pnpm build            # Verify TypeScript compilation and build
pnpm lint             # Verify ESLint passes with 0 errors
```

Both commands must pass successfully before considering a task complete.

## Build Requirements
- All TypeScript errors must be resolved
- ESLint must pass with 0 errors
- Build must complete successfully before committing

## Design Principles
- Clean, minimal, premium aesthetic
- Solid colors only (no gradients except answer colors)
- Cabinet Grotesk font family
- Cream/off-white background (#FAF9F6)
- Four answer colors: red, blue, yellow, green