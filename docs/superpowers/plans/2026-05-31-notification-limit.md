# Notification Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce a maximum of 20 notifications per user in the database via a Postgres trigger.

**Architecture:** Add an AFTER INSERT trigger on the `notifications` table that deletes the oldest rows beyond 20 for the inserting user. Fires automatically regardless of which existing trigger created the notification.

**Tech Stack:** Supabase (PL/pgSQL), Supabase MCP (`apply_migration`).

---

## Task 1: Apply migration — notification limit trigger

**Files:**
- DB migration only (no source code changes)

- [ ] **Step 1: Apply migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with name `enforce_notification_limit` and the following SQL:

```sql
CREATE OR REPLACE FUNCTION enforce_notification_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM notifications
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM notifications
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      LIMIT 20
    );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_enforce_notification_limit
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION enforce_notification_limit();
```

Expected: migration applied successfully, no errors.

- [ ] **Step 2: Verify trigger exists**

Use `mcp__supabase__execute_sql` to confirm:

```sql
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trg_enforce_notification_limit';
```

Expected: one row returned with `AFTER` / `INSERT`.
