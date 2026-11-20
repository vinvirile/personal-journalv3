# Editor page override

> Overrides `MASTER.md` for the reading and writing surface only.

## Typography

- UI chrome (index, toolbar, dialogs): Inter 300–700.
- Entry title: Inter 600, 32px mobile → 44px desktop, tracking `-0.035em`,
  line-height `1.08`.
- Entry body: Source Serif 4 19px / 1.8, tracking `0.002em`. This is the one
  intentional departure from the master’s Inter/Inter pairing: a journal’s
  long-form surface needs a reading serif, and Source Serif 4 is the verified
  serif body from the skill’s “Minimalist Monochrome Editorial” pairing.
- Dates, counts, tags, labels: JetBrains Mono 11px, uppercase, `0.12em`
  tracking.

## Measure and spacing

- Reading column: `max-width: 68ch`, centered in the editor pane.
- Horizontal padding: 20px at 375px, 32px at 768px, 40px at 1024px+.
- Vertical rhythm: 8px base; 16/24/32/48 for sections.
- The editor scrolls inside its pane; the header and word-count footer stay
  fixed. No content hides behind either.

## Surfaces

- Background `#FFFBEB`; editor stays flat paper.
- Cards `#FFFFFF`, borders `#E7DCD2`, 16px radius.
- Primary action `#92400E` with white text; accent `#6366F1` is reserved for AI
  actions and focus, never for body text.
- Dark mode uses warm ink `#171310`, card `#211B15`, primary `#E6B17E`.

## Interaction

- Save is explicit. Dirty state, saving, saved, and error are visible in the
  header and footer; the status region is polite.
- `⌘S` / `Ctrl+S` saves; `⌘N` / `Ctrl+N` creates.
- Switching entries, locking, and creating with unsaved changes goes through a
  confirmation dialog.
- Suggested tag buttons (🧐 serious, 🗑️ dump, 😤 vent, 💡 idea, ❓ question,
  ☀️ positivity, 🎯 goal, 🍔 Mugshots, 🌙 dream, 💬 quote) are always visible
  in the tag section.
  Emoji are decorative and hidden from assistive tech. Selected buttons use
  filled primary with a check and remain fully opaque; inactive buttons show
  the emoji and label. Matching is case-insensitive.
- Custom tag chips add on Enter/comma/blur; Backspace on an empty field removes
  the last tag.
- All controls ≥44×44px; textareas keep a visible focus ring.

## Motion

- Header/menu transitions: 200ms.
- Card entry: 280ms opacity + 6px rise, stagger capped at six items.
- Dialog: 220ms scale/fade; bottom sheet on ≤639px.
- `prefers-reduced-motion: reduce` disables all non-essential motion.
