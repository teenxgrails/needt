# AGENTS_DESIGN_RESUME.md — Mina: продолжение Liquid Glass (Part 3 → 6)

> Это НЕ новый план — это точка возобновления `AGENTS_DESIGN.md`.
> Читай `AGENTS_DESIGN.md` как источник значений (палитра, glass-токены, acceptance).
> Здесь только то, что осталось, и в каком состоянии код.

## Где остановилась прошлая сессия (факт, проверено по git)

- **Part 1** ✅ закоммичено — `8830686 fix(design-1)`: setup, dark-тема, PWA guard.
- **Part 2** ✅ закоммичено — `984e596 feat(design-2)`: `ScheduledBlock` (все чанки), Neon-адаптер объявлен.
- **Part 3** 🟡 **в процессе, НЕ закоммичено** (`git status`):
  - `M src/app/globals.css` — glass-токены + утилиты готовы (`.glass/.glass--strong/.glass--subtle`,
    `::before` specular, `.glow-blue/violet/magenta/teal`, `.ambient-backdrop`, `.liquid-press`,
    `.liquid-shimmer`, гейты `prefers-reduced-transparency` и `prefers-reduced-motion`). ~180 строк.
  - `?? src/components/liquid/index.tsx` — примитивы готовы: `AmbientBackdrop`, `GlassPanel`,
    `GlassCard`, `GlowRing`, `StatBlock`, `PrimaryButton`.
  - ❌ **`src/app/style/` создана, но пустая** — нет `page.tsx`. Демо-роут не написан → **acceptance Part 3 НЕ выполнен**.
- **Part 4 / 5 / 6** — не начаты. `QA_REPORT.md` не создан.

## Задача этой сессии

### 0. Санити перед стартом
- Открой `AGENTS_DESIGN.md` — держи под рукой значения из Part 3–6 (это единственный источник правды по числам/цветам/acceptance).
- Референс: `design-refs/opal-reference.jpg`.
- НЕ трогай untracked-файлы человека (`AGENTS*.md`, `.agents/`, lockfiles) — коммить только код проекта.
- Neon-пакеты НЕ доустанавливай в песочнице (это делает человек в нормальном окружении). Ничего от них здесь не зависит.

### 1. Закрыть Part 3 (демо-роут + коммит)
- Создай `src/app/style/page.tsx` — dev-only витрину всех примитивов из `src/components/liquid/index.tsx`:
  каждый glass-тон, все 4 glow-цвета, `StatBlock` (эхо «77%» / «2h 58m» из референса), `PrimaryButton`
  с shimmer, `AmbientBackdrop` на фоне. Проверь: рендерится в dark, деградирует под
  `prefers-reduced-transparency`, не роняет скролл-перф.
- Задокументируй выбор иконок (lucide-react, stroke 1.75) и glass-токены в `DECISIONS.md`.
- Коммит: `feat(design-3): add liquid glass design system + /style demo`.

### 2. Part 4 — применить скин по всем экранам (см. AGENTS_DESIGN.md, Part 4)
Скин + layout, БЕЗ изменения логики. Смонтируй `AmbientBackdrop` глобально, затем по порядку:
auth/setup → топ-нав/командбар → календарь (FullCalendar в glass, event-чипы с glow по priority/energy,
now-индикатор) → задачи (`.glass--subtle` строки, glow-точки) → **focus timer (витринный экран:
большое кольцо прогресса, лёгкие крупные цифры, `StatBlock`-и)** → smart-planning сайдбар → settings.
Респонсив: iPhone-ширина (≈390px) и десктоп. Коммит: `feat(design-4): apply glass skin across app`.

### 3. Part 5 — идентичность (см. Part 5)
Свой Mina-значок (абстрактный светящийся glass-шард на CSS/SVG-градиентах спектра — **НЕ камень Opal**) →
favicon/PWA-иконки/splash в manifest и `<head>`. Empty/loading — glass-скелетоны с shimmer.
Микро-интеракции: press, streak-инкремент, bloom по завершению фокус-сессии.
Коммит: `feat(design-5): add mina identity + polish`.

### 4. Part 6 — ОБЯЗАТЕЛЬНЫЙ self-QA (см. Part 6, полный чеклист)
Прогони весь чеклист сам, **почини каждый фейл, перезапусти**. Запиши результат в новый `QA_REPORT.md`
(каждый пункт: pass/fail + заметка). Ключевое:
- `pnpm prisma validate` / `tsc --noEmit` / полный Jest (укажи pass/skip) / `pnpm build` — всё зелёное.
- Runtime-смоук: fresh DB → `/setup` заводит аккаунт; нет светлого gutter; localhost И LAN-IP без
  console-ошибок; создание задачи; авто-планинг с чанками показывает несколько блоков; Pomodoro-сессия
  обновляет Focus Score/Streak/Focus Hours + пишет TimeEntry; калибровка рендерится;
  `curl /api/connect/tasks` с токеном создаёт задачу; PWA ставится, работает офлайн, синкается.
- Дизайн: каждый роут на glass-ките + ambient; деградация под reduced-transparency/motion; моб-ширина
  без клиппинга; имя «Mina» везде, свой значок (ноль Opal-ассетов).
- Обнови `DECISIONS.md`. **Только когда весь Part 6 зелёный → тег `v0.2.0`.**

## Определение готовности
Part 3–6 закоммичены; `/style` показывает кит; каждый роут в стекле; `QA_REPORT.md` весь зелёный;
`v0.2.0` проставлен. Untracked-файлы человека нетронуты.
