# Спецификация: Переход к Fullstack (Supabase, PostgreSQL)

**Дата:** 2026-05-03
**Статус:** Draft
**Тема:** Внедрение базы данных, авторизации и поддержки нескольких гильдий с использованием Supabase.

## 1. Цели
- Использовать **Supabase** в качестве Backend-as-a-Service (BaaS).
- Реализовать авторизацию через Google и Email/Password (Supabase Auth).
- Поддержка нескольких гильдий с разграничением прав доступа через **RLS (Row Level Security)**.

## 2. Архитектура и Стек
- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL (Managed by Supabase)
- **Auth:** Supabase Auth (Native)
- **API:** Supabase Client (заменяет классические Server Actions для CRUD, где это уместно)
- **Security:** RLS (Row Level Security) — правила доступа на уровне БД.

## 3. Схема Базы Данных (SQL для Supabase)
```sql
-- Таблица профилей (связана с auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Таблица гильдий
create table public.guilds (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  owner_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Участники гильдий
create table public.guild_members (
  id uuid default gen_random_uuid() primary key,
  guild_id uuid references public.guilds(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'MEMBER' check (role in ('OWNER', 'ADMIN', 'MEMBER')),
  unique(guild_id, user_id)
);

-- События
create table public.events (
  id uuid default gen_random_uuid() primary key,
  guild_id uuid references public.guilds(id) on delete cascade not null,
  title text not null,
  description text,
  event_date date not null,
  event_time text,
  type text not null,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## 4. Row Level Security (RLS) — Пример логики
- **Events:** Пользователь может видеть события (`SELECT`), только если его `user_id` есть в `guild_members` для соответствующего `guild_id`.
- **Guilds:** Создавать гильдию может любой авторизованный пользователь. Редактировать — только `owner_id` или `ADMIN`.

## 5. Этапы реализации
1. **Настройка Supabase Проекта:** Создание таблиц, настройка типов (TypeScript).
2. **Интеграция Auth:** Настройка `@supabase/auth-helpers-nextjs` или SSR-пакета.
3. **Создание Shared Client:** Настройка `createClient` для сервера и клиента.
4. **Миграция UI:**
   - Страница регистрации/логина (Supabase Auth UI).
   - Перевод Календаря на получение данных из Supabase.
5. **Realtime (Опционально):** Включение подписок Supabase для мгновенного обновления календаря у всех участников гильдии.

## 6. Изменения в FSD структуре
- `shared/api/supabase`: Инициализация клиента.
- `entities/user`: Использование `useSession` / `getUser` из Supabase.
- `entities/event`: Fetching данных напрямую через `supabase.from('events')`.

## 7. Тестирование
- Проверка правил RLS: попытка получить данные чужой гильдии должна возвращать пустой результат или ошибку.
- Тестирование потока регистрации и автоматического создания профиля в `public.profiles`.
