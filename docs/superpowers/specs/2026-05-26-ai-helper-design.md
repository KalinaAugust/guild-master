# AI Helper — Design Spec

**Date:** 2026-05-26  
**Branch:** deep-seek  
**Status:** Approved

## Overview

Add an "AI helper" button to the header (next to UserMenu) that sends a test message to the DeepSeek API and displays the response in a toast notification.

## Architecture

Feature-Sliced Design — new feature slice `ai-helper`.

### Files

```
src/features/ai-helper/
  api/aiHelperApi.ts            — RTK Query endpoint via injectEndpoints on baseApi
  ui/AiHelperButton.tsx         — 'use client' button component (Bot icon, loading state)
  ui/AiHelperButton.module.css  — CSS Module styles
  index.ts                      — public API export

src/app/api/ai-helper/
  route.ts                      — POST route handler, calls DeepSeek server-side

.env.local (not committed):
  DEEPSEEK_API_KEY=...
```

`Header.tsx` remains a server component — `<AiHelperButton />` is added to `<nav>` alongside `<UserMenu />`.

## Data Flow

1. User clicks `AiHelperButton`
2. RTK Query mutation `sendTestMessage` fires
3. `POST /api/ai-helper` is called
4. Route handler reads `DEEPSEEK_API_KEY` from env, calls DeepSeek Chat Completions API (`https://api.deepseek.com/chat/completions`, model `deepseek-chat`)
5. Test message: `"Say hello in one sentence"`
6. Response text returned to client → `toast.success(response)` via sonner
7. On error → `toast.error(...)`

## Component

- Icon: `Bot` from lucide-react
- Visual style: matches UserMenu button (same size/look)
- Styles: CSS Module only, no inline styles
- Loading state: button is `disabled` during request, icon opacity reduced

## Environment

```
DEEPSEEK_API_KEY=<your-key>   # server-only, never exposed to client
```
