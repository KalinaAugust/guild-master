# Инструкции для папки /src

Этот файл содержит директивы для работы с исходным кодом проекта Guild Master. Эти правила являются обязательными для исполнения.

## Архитектура: Feature-Sliced Design (FSD)

Соблюдай строгую изоляцию слоев:
1.  **Layers:** `shared`, `entities`, `features`, `widgets`, `app`.
2.  **Public API:** Взаимодействие между модулями разрешено ТОЛЬКО через `index.ts` (Public API) каждого слайса.
3.  **Cross-imports:** Запрещены импорты между слайсами одного уровня (например, один `feature` не может импортировать другой `feature`). Используй композицию в `widgets` или `app`.
4.  **Shared:** Общий код, не имеющий бизнес-логики, должен находиться в `shared`.

## Аутентификация и Proxy Logic

В этом проекте **НЕ ИСПОЛЬЗУЕТСЯ** стандартный `middleware.ts`.
1.  Вся логика перехвата запросов, защиты роутов и обработки локали находится в **`src/proxy.ts`**.
2.  При необходимости добавить защиту для новых роутов или изменить логику редиректов — вноси изменения в `src/proxy.ts`.
3.  Не пытайся создать `middleware.ts` в корне проекта.

## Работа с Supabase (SSR)

При создании клиента Supabase на сервере (в Server Components или `proxy.ts`):
1.  Всегда используй методы `getAll()` и `setAll()` для работы с куки.
2.  **Запрещено** использовать устаревшие методы `get`, `set` и `remove`. Это критично для совместимости с асинхронными API куки в Next.js 15+.
3.  Пример инициализации клиента:
    ```typescript
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          )
        },
      },
    })
    ```

## Стилизация и UI

1.  **CSS Modules:** Используй только CSS Modules (`*.module.css`).
2.  **Inline styles:** Категорически запрещены.
3.  **Naming:** Следуй BEM-подобному именованию классов внутри модулей, если это упрощает чтение.

## Состояние (State Management)

1.  Используй Redux Toolkit.
2.  Бизнес-логика (actions, thunks, selectors) должна располагаться внутри соответствующих слайсов в `entities` или `features`.
3.  Типизируй селекторы и хуки, используя `useAppSelector` и `useAppDispatch`.
