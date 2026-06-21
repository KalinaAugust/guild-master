# Glassmorphism Migration Plan (The 5 Rules of Glass)

## 🎯 Цель миграции
Перевести все вложенные компоненты (карточки, списки, элементы форм, бабблы сообщений), которые сейчас рендерятся внутри основных панелей, на новые правила "Glassmorphism".
Главная проблема текущей кодовой базы: компоненты используют `backdrop-filter: var(--glass-blur)`, `background: var(--glass-bg)` и внешние белые бордеры, даже когда они вложены в другие стеклянные элементы. 
Это нарушает оптическую иерархию (правило чередования материалов) и сильно бьет по производительности рендеринга (вложенные размытия).

## 🛠️ Основной паттерн рефакторинга
В каждом **Вложенном компоненте (L2 / L3)** необходимо провести следующие замены в CSS-модуле:

1. **Удалить:** `backdrop-filter` и `-webkit-backdrop-filter`.
2. **Удалить:** `border: 1px solid var(--glass-border)`.
3. **Изменить Background:**
   * Если компонент должен выглядеть как углубление или структурный контейнер: использовать `background: var(--glass-cutout)` (или `--glass-cutout-strong`).
   * Если компонент должен быть светлой плашкой поверх темного выреза (чип, кнопка): использовать `background: var(--glass-bg-light)`.
4. **Изменить Shadow:**
   * Если это углубление (cutout): использовать `box-shadow: var(--shadow-inset-cutout)`.
   * Если это карточка без углубления: `box-shadow: none` или оставить легкую внешнюю тень без обводки-блика.

---

## 🗂️ Распределение компонентов и этапы работ

Ниже представлен детальный список файлов, разбитый на логические фазы. Галочками `[ ]` можно отмечать прогресс.

### Фаза 1: Списки и карточки событий (Events & Guilds)
Внимание: Карточки событий (EventCard) часто лежат прямо на фоне страницы (уровень L1), поэтому они должны сохранять полноценный глассморфизм. Остальные элементы списков (например, участники), как правило, рендерятся внутри `Panel` или `ProfileBlock` (L2).

- [x] `src/entities/event/ui/EventCard.module.css`
- [x] `src/shared/ui/EventCardSkeleton/EventCardSkeleton.module.css`
- [x] `src/features/event-detail/ui/ParticipantItem.module.css`
- [x] `src/widgets/upcoming-events/ui/UpcomingEventsStrip.module.css`
- [x] `src/features/manage-guilds/ui/GuildList.module.css`
- [x] `src/features/manage-guilds/ui/PendingInvitesList.module.css`
- [x] `src/widgets/guild-members/ui/GuildMembersSection.module.css`

### Фаза 2: Мессенджер и коммуникации (Chat)
Чат-секция содержит интенсивный скроллинг, поэтому удаление `backdrop-filter` с сотен бабблов сообщений даст наибольший прирост производительности.

- [x] `src/shared/ui/MessageBubble/MessageBubble.module.css`
- [x] `src/widgets/chat/ui/ChatThread.module.css`
- [x] `src/shared/ui/MessageComposer/EmojiPicker.module.css`
- [x] `src/app/guild-chat/loading.module.css`

### Фаза 3: Интерактивные фичи гильдии (Announcements, Polls, Notifications)
Аналогично первой фазе, элементы списков и карточек.

- [x] `src/features/guild-announcement/ui/AnnouncementCard.module.css`
- [x] `src/features/guild-poll/ui/PollCard.module.css`
- [x] `src/features/notification-panel/ui/NotificationPanel.module.css`
- [x] `src/features/call-to-action/ui/CallToActionCard.module.css`

### Фаза 4: Элементы форм, инпуты и общие UI-виджеты
Многие общие элементы сейчас имеют свое собственное "стекло". Их надо сделать более плоскими и легкими.

- [x] `src/shared/ui/Button/Button.module.css`
- [x] `src/features/update-profile/interests/ui/EditableInterests/EditableInterests.module.css`
- [x] `src/shared/ui/Select/Select.module.css`
- [x] `src/shared/ui/Switch/Switch.module.css`
- [x] `src/features/auth/ui/LoginForm.module.css`

### Фаза 5: Оболочки L1, которые нужно ПРОВЕРИТЬ, но скорее всего ОСТАВИТЬ
Эти компоненты являются модальными окнами, дропдаунами или основными панелями. Они лежат поверх градиента страницы и по правилам **должны сохранить** `backdrop-filter` и `--glass-bg`. В них нужно только проверить, что они не вложены в другие панели.

- [x] `src/shared/ui/Panel/Panel.module.css` (Оставить: Базовый L1)
- [x] `src/widgets/sidebar/ui/Sidebar.module.css` (Оставить: Базовый L1)
- [x] `src/widgets/header/ui/UserMenu.module.css` (Оставить: Плавающий дропдаун над всем)
- [x] `src/shared/ui/Modal/Modal.module.css` (Оставить: Плавающее модальное окно поверх страницы)
- [x] `src/shared/ui/WizardDialog/WizardDialog.module.css` (Оставить: Плавающее модальное окно)
- [x] `src/shared/ui/DatePicker/DatePicker.module.css` (Оставить: Плавающий поповер)
- [x] `src/shared/ui/TimePicker/TimePicker.module.css` (Оставить: Плавающий поповер)
- [x] `src/features/filter-events/ui/EventFilterDropdown.module.css` (Оставить: Плавающий поповер)
- [x] `src/shared/ui/ImageLightbox/ImageLightbox.module.css` (Оставить: Полноэкранный оверлей)
- [x] `src/app/profile/[publicId]/OwnProfile.module.css` (Оставить внешние слои, вложенные уже используют `none`)
- [x] `src/app/profile/[publicId]/PublicProfilePage.module.css` (Оставить внешние слои)
- [x] `src/app/events/[publicId]/EventPage.module.css` (Оставить внешние слои)

---

## 🚦 Правила проверки перед коммитом
После рефакторинга каждой фазы необходимо открывать интерфейс и визуально убеждаться, что:
1. Карточки четко читаются и не сливаются с фоном.
2. Пропала «муть» и двойное/тройное перемножение прозрачности.
3. Тексты внутри новых вырезов (`cutout`) контрастны и легко читаемы. При необходимости применять `var(--glass-bg-light)` для более светлых поверхностей внутри выреза.
