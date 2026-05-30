# Event Detail Page — Display Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain type badge with a colored Hero-block (icon + label) and format the date/time in a human-readable, locale-aware way on the EventDetailContent page.

**Architecture:** Both changes are self-contained to `EventDetailContent.tsx` and its CSS module. The type Hero-block follows the same `styles[`type_${event.type}`]` pattern already used in `EventCard`. The date formatting uses `dayjs` (already configured with `ru`/`en` locales) and `useLocale()` from `next-intl`.

**Tech Stack:** React, CSS Modules, dayjs (`@/shared/lib/dayjs`), next-intl (`useLocale`), lucide-react

---

### Task 1: Add Hero-block CSS classes

**Files:**
- Modify: `src/features/event-detail/ui/EventDetailContent.module.css`

- [ ] **Step 1: Remove the old badge classes and add hero-block classes**

Replace the entire badge section (lines 82–98) in `EventDetailContent.module.css`:

```css
/* REMOVE these: */
.typeBadge { ... }
.type_raid { ... }
.type_game { ... }
.type_meeting { ... }
.type_other { ... }

/* ADD these: */
.typeHero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  border-left: 4px solid transparent;
  background: rgba(255, 255, 255, 0.04);
}

.typeHeroIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.typeHeroLabel {
  font-size: 1rem;
  font-weight: 600;
}

.typeHero_raid    { border-left-color: #ff4d4d; background: rgba(255, 77,  77,  0.08); color: #ff4d4d; }
.typeHero_game    { border-left-color: #4da3ff; background: rgba(77,  163, 255, 0.08); color: #4da3ff; }
.typeHero_meeting { border-left-color: #4dff88; background: rgba(77,  255, 136, 0.08); color: #4dff88; }
.typeHero_other   { border-left-color: #ffb347; background: rgba(255, 179, 71,  0.08); color: #ffb347; }
.typeHero_dungeon { border-left-color: #a855f7; background: rgba(168, 85,  247, 0.08); color: #a855f7; }
.typeHero_party   { border-left-color: #f472b6; background: rgba(244, 114, 182, 0.08); color: #f472b6; }
.typeHero_sport   { border-left-color: #34d399; background: rgba(52,  211, 153, 0.08); color: #34d399; }
```

- [ ] **Step 2: Verify no references to old classes remain**

```bash
grep -n "typeBadge\|type_raid\|type_game\|type_meeting\|type_other" src/features/event-detail/ui/EventDetailContent.module.css
```

Expected: no output.

---

### Task 2: Implement Hero-block in EventDetailContent

**Files:**
- Modify: `src/features/event-detail/ui/EventDetailContent.tsx`

- [ ] **Step 1: Add icon imports and typeIcons map**

Add to the lucide-react import line (replace existing `ChevronLeft` import):

```tsx
import { ChevronLeft, Sword, Gamepad2, Users, Calendar, Skull, PartyPopper, Dumbbell } from 'lucide-react';
```

Add the `typeIcons` map before the component (after the imports):

```tsx
import { ActivityType } from '@/shared/types';

const typeIcons: Record<ActivityType, React.ReactNode> = {
  raid:    <Sword size={32} />,
  game:    <Gamepad2 size={32} />,
  meeting: <Users size={32} />,
  other:   <Calendar size={32} />,
  dungeon: <Skull size={32} />,
  party:   <PartyPopper size={32} />,
  sport:   <Dumbbell size={32} />,
};
```

- [ ] **Step 2: Replace the badge JSX with Hero-block**

Find this block in the component (around line 111–115):

```tsx
<div className={styles.infoGroup}>
  <span className={styles.label}>{t('type')}</span>
  <span className={`${styles.typeBadge} ${styles[`type_${event.type}`]}`}>
    {typeLabel}
  </span>
</div>
```

Replace with:

```tsx
<div className={styles.infoGroup}>
  <span className={styles.label}>{t('type')}</span>
  <div className={`${styles.typeHero} ${styles[`typeHero_${event.type}`]}`}>
    <span className={styles.typeHeroIcon}>{typeIcons[event.type]}</span>
    <span className={styles.typeHeroLabel}>{typeLabel}</span>
  </div>
</div>
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit 2>&1 | grep "EventDetailContent"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/event-detail/ui/EventDetailContent.tsx src/features/event-detail/ui/EventDetailContent.module.css
git commit -m "feat(event-detail): replace type badge with hero-block (icon + color)"
```

---

### Task 3: Format date/time in human-readable way

**Files:**
- Modify: `src/features/event-detail/ui/EventDetailContent.tsx`

- [ ] **Step 1: Add dayjs and useLocale imports**

Add to existing imports in `EventDetailContent.tsx`:

```tsx
import { useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
```

- [ ] **Step 2: Get locale and compute formatted date inside the component**

Inside `EventDetailContent` function body, after the existing hooks, add:

```tsx
const locale = useLocale();
const formattedDateTime = event
  ? dayjs(`${event.date} ${event.time}`).locale(locale).format('dddd, D MMMM · HH:mm')
  : '';
```

- [ ] **Step 3: Replace raw date/time output**

Find (around line 119–122):

```tsx
<span className={styles.dateTime}>
  <span>{event.date}</span>{' '}<span>{event.time}</span>
</span>
```

Replace with:

```tsx
<span className={styles.dateTime}>{formattedDateTime}</span>
```

- [ ] **Step 4: Run type check**

```bash
npx tsc --noEmit 2>&1 | grep "EventDetailContent"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/features/event-detail/ui/EventDetailContent.tsx
git commit -m "feat(event-detail): format date/time with dayjs locale-aware format"
```
