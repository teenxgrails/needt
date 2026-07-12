# Motion UI — reference spec (Calendar · Task create · Settings)

> Снято с живого Motion (app.usemotion.com) 2026-07-08. Это референс **раскладки и структуры**.
> Motion выглядит плоско/утилитарно (тёмный, плотный, почти без скруглений и теней) — берём его
> ЛОГИКУ КОМПОНОВКИ, а поверх накладываем Mina Liquid Glass (стекло/glow вместо плоских карточек).
> Скриншоты трёх экранов: положи рядом `motion-calendar.png`, `motion-task-create.png`,
> `motion-settings.png` (Cmd+Shift+4 в Motion).

## Точные токены Motion (baseline)
```
canvas / body bg      #1A1D1E
raised card           #262627
border (hairline)     #323234
nav item active bg    #2B2F31
primary button        #3E63DD   text #FFFFFF   radius 6px
nav item radius       2px       (Motion почти без скруглений)
card radius           0–8px
font                  system-ui, "Segoe UI"   base 14px
headings              14px / weight 400        (очень сдержанно, без крупных заголовков)
text primary          #FFFFFF
text secondary        ~#9AA0A6
```
Для Mina: canvas оставляем свой `#07070d`; радиусы — свои 16/20/24 (не 2px Motion); плоские
карточки Motion → `.glass`/`.glass--subtle`; акцент — не глухой `#3E63DD`, а спектр Mina.

---

## Экран 1 — Calendar
**3 зоны, слева направо:**
1. **Left nav (~230px):** лого сверху; поиск; секции `Inbox / AI Agenda / Calendar / Projects & Tasks`;
   блок **Favorites**; блок **Workspaces** (список). Плоский тёмный фон, активный пункт — заливка `#2B2F31`.
2. **Центр — недельная сетка:** шапка с `Today` `< >`, месяц/год, справа `Week ▾` переключатель вида
   (Day/Week/Month) + `Close`. Строки часов (6 AM … 9 PM), тонкие линии часов, колонки дней с датой.
   **Event-чипы:** плоские скруглённые прямоугольники, тайтл + время под ним (напр. «Physiotherapie /
   11 AM – 12 PM»). Индикатор текущего времени — тонкая линия.
3. **Right panel (~300px):** мини-месяц (июль, выделен сегодня), ниже блок **Calendars**
   (My calendars / Frequently met with / Accounts).

**Для Mina:** центр (сетка) заворачиваем в `.glass` панель поверх ambient; event-чипы = стеклянные
с лёгким glow по priority/energy; правый мини-месяц — на `.glass--subtle`.

## Экран 2 — Создание задачи (модалка `?task=new`)
Крупная центральная модалка поверх затемнённого фона. **Две колонки:**
- **Лево (контент):** «Task» бейдж сверху; большое поле **Task name**; rich-text тулбар
  (B / I / U / S / H1 / H2 / списки / картинка / код / ссылка); поле **Description**; внизу **Attachments**.
- **Право (свойства), сверху вниз:** Workspace · Folder · Project · фиолетовая пилюля
  **Auto-scheduled (Pending)** · Assignee · Status (Todo) · Priority (Low, флажок) · **Duration** (30 min)
  · **Min chunk** (No Chunks) · Start date (Today) · Deadline (Tomorrow) · Hard deadline (тоггл) ·
  Schedule (Work hours) · Labels · `+ Add custom field`.
- **Низ:** `Cancel (Esc)` · `Save task`.

**Для Mina прямое соответствие:** Auto-scheduled пилюля, Priority, Duration, **Min chunk = наши чанки
(`ScheduledBlock`)**, Deadline/Hard deadline. Модалку — на `.glass--strong`, пилюлю auto-schedule —
с violet-glow, `Save task` — `PrimaryButton` с shimmer.

## Экран 3 — Settings
**Две панели:**
- **Left nav настроек (~230px):** группы `General` (Calendars, Auto-scheduling, Task defaults, Theme,
  Conference, Timezone, Notifications, Schedules, Desktop app, Integrations, API, Privacy) · `Account`
  (Account settings, Billing) · `Team` · `Workspaces`. Сверху `← Back to Motion`. Активный пункт — `#2B2F31`.
- **Right content:** заголовок раздела (напр. «Calendars»), затем секции с подзаголовками
  (**Accounts**, **Calendar Grouping**), внутри — карточки/строки `#262627` с бордером `#323234`
  (аккаунт-строка с дропдауном, список календарей строками с `⋮` меню, кнопки `Edit`).

**Для Mina:** ту же двухпанельную структуру; секции-карточки → `.glass`; наши разделы: AI, Connectors,
Apple/iCloud (CalDAV), Energy profile, Theme.

---

---

## Система стилей настроек (общий паттерн всех разделов)
Двухпанельно везде. Правая часть — контент шириной ~820px, левое выравнивание, много воздуха.
Каждый раздел строится из одинаковых блоков:
- **Заголовок раздела** (напр. «Auto-scheduling») — крупнее, bold, сверху.
- **Подсекция:** bold-подзаголовок + серый helper-текст под ним, затем контролы.
- **Тонкие хайрлайн-разделители** `#323234` между смысловыми блоками.

**Контролы (переиспользуемые, единый вид):**
- **Radio:** синий залитый кружок `#3E63DD` + лейбл (Auto-scheduling: «Show tasks…»).
- **Toggle:** синий пилюль-свитч (Break between tasks; Hard deadline).
- **Dropdown:** тёмное поле `#262627`, бордер `#323234`, шеврон справа; бывает full-width
  (Theme: «Start week on», «Theme: Dark») и inline в предложении («Schedule a [15] min break every [2] hour(s)»).
- **Checkbox:** синий (таблица Notifications).
- **Property-row** (Task defaults, идентична правой колонке модалки): `Label: [иконка] value`, кликабельно.
- **Кнопки:** вторичные — тёмные `#262627` (Edit, Change password, More Options); destructive —
  красный контур/текст (Danger zone: «Remove Motion tasks», «Disconnect external calendars»).
- **Карточки-строки** (Schedules, Calendar Grouping): строка `#262627` с бордером, справа иконки
  edit ✎ / delete 🗑 / `⋮`; список завершается центрированным `+ New …`.
- **Карточки-грид** (Integrations): иконка + тайтл + серое описание + full-width кнопка внутри карточки.

**Снятые разделы:** Calendars (аккаунт-строка + группировка календарей), Auto-scheduling (radio +
break-toggle с инлайн-дропдаунами), Task defaults (property-list), Theme (2 дропдауна), Notifications
(таблица Event × Inbox/Email/Browser/Mobile с чекбоксами), Schedules (список пресетов), Integrations
(2 карточки), Account settings (Profile-поле + Password + красный Danger zone).

## Flow создания задачи (важно)
- **Клик по пустому слоту календаря** → маленький поповер `Create event` / `Create task (fixed time)`
  + временный чип на сетке.
- Выбор `Create task` → открывается **та же полная модалка** (Экран 2), но время предзаполнено из слота
  (Start/Deadline подставлены). **Отдельной «лёгкой» инлайн-формы у Motion нет — одна модалка на всё.**
- Для Mina повторяем: клик по сетке → поповер выбора → общая glass-модалка с предзаполненным временем.

---

## Что НЕ копировать у Motion
- Плоский `#1A1D1E` фон без глубины, отсутствие свечения, radius 2px, глухой синий `#3E63DD`,
  мелкие заголовки 14px — всё это заменяем на Mina Liquid Glass (ambient + стекло + спектр + крупная
  лёгкая типографика в Focus). Берём у Motion ТОЛЬКО плотную, понятную компоновку.
