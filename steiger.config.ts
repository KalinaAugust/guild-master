import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Non-FSD files living under src/ — not part of any layer.
    // `shared/lib/test` is Vitest tooling (setup file), not code consumed via a
    // public API, so it has no business satisfying FSD rules.
    ignores: [
      './src/i18n/**',
      './src/proxy.ts',
      './src/CLAUDE.md',
      './src/shared/lib/test/**',
    ],
  },
  {
    // Typed Redux hooks. RootState/AppDispatch are derived from the store,
    // which lives in `app` by construction (it combines feature/entity
    // reducers). The hooks must stay in `shared` so every layer can reach
    // them, so this shared→app type import is an accepted FSD carve-out.
    files: ['./src/shared/lib/hooks.ts'],
    rules: {
      'fsd/forbidden-imports': 'off',
    },
  },
  {
    // GuildMembersSection is a permission-gated block (member add/remove
    // mutations) — correctly a widget. These two features compose it inline
    // because its props come from feature-local state; lifting composition to
    // the page would require hoisting that state up through the feature tree.
    // Intentional feature→widget import; revisit if pages compose it instead.
    files: [
      './src/features/guild-detail/ui/GuildDetailContent.tsx',
      './src/features/manage-guilds/ui/EditGuildWizard.tsx',
    ],
    rules: {
      'fsd/forbidden-imports': 'off',
    },
  },
  {
    // Intentional single-consumer slices — cohesive, self-contained units we
    // deliberately keep isolated, not accidental over-slicing. Merging each
    // into its lone consumer (a widget or another feature) would bloat that
    // consumer and break modularity. `entities/notification` is a proper
    // domain entity; the features are independently meaningful (e.g.
    // `call-to-action`/`filter-events`/`guild-poll` are full features each
    // composed by a single widget — board / calendar / chat).
    files: [
      './src/entities/notification/**',
      './src/features/ai-helper/**',
      './src/features/call-to-action/**',
      './src/features/filter-events/**',
      './src/features/guild-announcement/**',
      './src/features/guild-poll/**',
      './src/features/language-switcher/**',
      './src/features/notification-panel/**',
    ],
    rules: {
      'fsd/insignificant-slice': 'off',
    },
  },

  // --- no-public-api-sidestep carve-outs ---
  // The shared Supabase clients / baseApi / guildAuth (shared/api) have a
  // deliberate server-only vs client-only split, so they cannot be funneled
  // through a single public-API barrel without pulling `next/headers` into
  // client bundles (verified: `next build` fails). Likewise, server data-layer
  // functions reached by route handlers can't go through a slice's barrel
  // because that barrel is also consumed by client code. These sidesteps are
  // the documented transport/data-layer pattern (see src/CLAUDE.md), so the
  // rule is scoped off where that pattern legitimately applies — but still
  // guards accidental deep imports into other slices' UI elsewhere.
  {
    // Tests import slice internals directly to mock them in isolation.
    files: ['./src/**/*.test.ts', './src/**/*.test.tsx'],
    rules: {
      'fsd/no-public-api-sidestep': 'off',
    },
  },
  {
    // src/app is the transport/composition layer (Next App Router): route
    // handlers and server components call data-layer functions and Supabase
    // clients directly.
    files: ['./src/app/**'],
    rules: {
      'fsd/no-public-api-sidestep': 'off',
    },
  },
  {
    // Data-layer functions in entity/feature `api` segments talk to the shared
    // Supabase / baseApi infrastructure. The `*/*/api` glob covers slices that
    // live inside a feature group (e.g. `features/update-profile/settings`).
    files: ['./src/entities/*/api/**', './src/features/*/api/**', './src/features/*/*/api/**'],
    rules: {
      'fsd/no-public-api-sidestep': 'off',
    },
  },
  {
    // Client UI that legitimately needs shared infrastructure (browser Supabase
    // client, RTK baseApi) or a sibling data fn directly. Listed explicitly so
    // the rule keeps guarding accidental deep imports into other slices' UI.
    files: [
      './src/widgets/header/ui/UserMenu.tsx',
      './src/features/auth/ui/LoginForm.tsx',
      './src/features/ai-helper/ui/AiHelperModal.tsx',
      './src/features/update-profile/name/ui/EditableName/EditableName.tsx',
      './src/features/update-profile/avatar/ui/AvatarUpload/AvatarUpload.tsx',
      './src/shared/lib/hooks.ts',
    ],
    rules: {
      'fsd/no-public-api-sidestep': 'off',
    },
  },

  // --- remaining FSD carve-outs ---
  {
    // shared/api can't expose a single public-API barrel: its Supabase clients
    // split into server-only (next/headers) and client-only modules, and one
    // barrel would pull server code into client bundles (same reason the
    // sidestep carve-outs exist above).
    files: ['./src/shared/api/**'],
    rules: {
      'fsd/public-api': 'off',
    },
  },
  {
    // `shared/types` is a conventional, widely-used segment name (27 importers).
    // Renaming buys nothing but churn.
    files: ['./src/shared/types/**'],
    rules: {
      'fsd/segments-by-purpose': 'off',
    },
  },
  {
    // app-internal store configuration; the `config` folder name is descriptive
    // here and renaming it has no architectural payoff.
    files: ['./src/app/providers/StoreProvider/config/**'],
    rules: {
      'fsd/no-reserved-folder-names': 'off',
    },
  },
]);
