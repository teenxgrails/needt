# AGENTS_UI.md — Mina: пересобрать Calendar / Task-модалку / Settings как у Motion (базовая основа)

> Выполняй автономно, по порядку, без остановок. Коммить после каждой части (`feat(ui-N): ...`).
> Неочевидные решения — в `DECISIONS.md`. Это **UI-структурный проход**: цель — рабочая, чистая
> основа с раскладкой и плотностью как у Motion. **Логику/данные НЕ трогаем** (планировщик, API,
> сторы, Prisma — как есть).

## ВАЖНО про стиль
**Liquid Glass / стекло / glow пока НЕ делаем.** Сейчас нужна ПРАВИЛЬНАЯ ОСНОВА: структура зон,
порядок полей, рабочие контролы, плотная понятная раскладка — как в Motion. Оформление держи
простым и чистым, близко к плоским тёмным токенам Motion (ниже). Красоту (стекло, ambient, спектр)
человек накинет отдельным проходом позже — не закладывай её сюда, не усложняй.

## Источники (прочитать перед стартом)
- `design-refs/motion-ui-spec.md` — раскладка каждого экрана + система стилей настроек + токены Motion.
- `design-refs/motion-calendar.png`, `motion-task-create.png`, `motion-settings.png` — скрины (если есть).

## Токены основы (плоско, как Motion — временно, потом заменятся)
```
canvas / bg           #1A1D1E
raised card / input   #262627
border (hairline)     #323234
nav item active bg    #2B2F31
primary button        #3E63DD   text #fff   radius 6px
text primary          #FFFFFF   secondary ~#9AA0A6
font                  system-ui   base 14px
radius                6–8px      (мелкие, как Motion)
```
Не вводи новых цветовых систем, не трогай `src/components/liquid` и glass-классы. Просто плоский дарк.

---

## Часть 1 — Calendar
Три зоны как в спеке: left nav (~230px) · центр недельная сетка (FullCalendar) · right panel
(мини-месяц + список календарей).
- Тулбар: `Today` `< >`, месяц/год, переключатель Day/Week/Month.
- Сетка: строки часов, колонки дней с датой, тонкие линии `#323234`.
- **Event-чипы:** плоский прямоугольник `#262627`, тайтл + время под ним; frozen-блок помечен
  (иконка замка). Индикатор текущего времени — тонкая линия.
- Right panel: мини-месяц + `My calendars / Accounts`.
Коммит: `feat(ui-1): motion-style calendar layout`.

## Часть 2 — Task-модалка (создание/редактирование)
Центральная модалка, две колонки (см. спек):
- **Лево:** большое поле Task name; rich-text тулбар (B/I/U/S/H1/H2/списки/картинка/код/ссылка);
  Description; снизу Attachments.
- **Право (свойства):** Auto-scheduled · Status · Priority · **Duration** · **Min chunk = наши
  `ScheduledBlock`-чанки** · Start date · Deadline · Hard deadline (тоггл) · Schedule · Labels.
  Низ: `Cancel (Esc)` · `Save task` (primary `#3E63DD`).
- **Flow из календаря:** клик по пустому слоту → маленький поповер `Create event` / `Create task
  (fixed time)` + временный чип → выбор Task открывает ЭТУ ЖЕ модалку с предзаполненным временем.
Коммит: `feat(ui-2): task modal + calendar quick-create`.

## Часть 3 — Settings
Двухпанельно: left nav настроек (группы General / Account, `← Back`, активный пункт `#2B2F31`) ·
right content ~820px с секциями. Разделы: Calendars / Apple-iCloud (CalDAV), Auto-scheduling,
Task defaults, Theme, Notifications, Schedules, Connectors (personal token), AI, Energy profile, Account.
Контролы едиными компонентами (radio/toggle/dropdown/checkbox/property-row/danger-zone), карточки-строки
`#262627` с бордером `#323234`, хайрлайн-разделители, серый helper-текст под подзаголовками.
Коммит: `feat(ui-3): two-pane settings`.

## Часть 4 — Респонсив + QA
- iPhone-ширина (≈390px) и десктоп: ничего не клиппит/не наезжает; nav сворачивается адекватно.
- `pnpm tsc --noEmit` чисто · полный Jest зелёный (pass/skip) · `pnpm build` успешен.
- Вживую (`pnpm dev`, http://localhost:3000): создай задачу через модалку И через клик по календарю;
  чанкованная задача = несколько блоков; настройки открываются, контролы работают.
- Логику/схему НЕ менял. Итог — в `QA_REPORT.md` (секция «UI base pass»).
Коммит: `chore(ui-4): responsive + qa`.

## Готово когда
Три экрана с раскладкой как у Motion, рабочие; клик-создание работает; респонсив ок; build/tests
зелёные; логика нетронута; НИКАКОГО стекла/glow не добавлено (это отдельный поздний проход).
