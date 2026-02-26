# Research: Why Contract Page Buttons Render with Unequal Sizes

## Problem

The 6 action buttons (Bookmark, AI Audit, Get Recon, Import evmbench Job, Add Manual AI Audit, Add Manual Recon) on the contract page render with visibly different widths despite using CSS Grid with `grid-cols-[repeat(3,minmax(0,1fr))]` and shared `ACTION_BUTTON_BASE` classes.

## Root Cause: CSS Grid "Blowout"

### The Mechanism

1. **Grid column minimum is `auto` by default**  
   Even with `1fr`, the minimum size of an `fr` unit is `auto`. The grid uses the `min-content` size of items in that track to determine the column's minimum width.

2. **Grid items (buttons) have `min-width: auto` by default**  
   Each button's minimum width is derived from its content. Buttons with longer text ("Import evmbench Job", "Add Manual AI Audit") have larger min-content than shorter ones ("Bookmark", "AI Audit", "Get Recon").

3. **Content-driven column sizing**  
   Column 1 contains "Bookmark" (short) and "Import evmbench Job" (long) → column expands to fit the longer label.  
   Column 2 contains "AI Audit" (short) and "Add Manual AI Audit" (long) → column expands.  
   Column 3 contains "Get Recon" (short) and "Add Manual Recon" (medium) → column expands less.  
   Result: columns end up with different widths based on their longest label.

4. **`minmax(0, 1fr)` on columns**  
   This sets the column minimum to `0`, which should stop content from expanding columns. However, the **grid items** (the buttons) can still have `min-width: auto`, so their content can influence layout. The fix must be applied at the **grid item** level as well.

### References

- [CSS-Tricks: Preventing a Grid Blowout](https://css-tricks.com/preventing-a-grid-blowout/)
- Rachel Andrew: "The minimum size of an `fr` unit is auto. Grid then looks at the `min-content` size of the item."

## Current Implementation Gaps

1. **Buttons have `min-w-0`**  
   `ACTION_BUTTON_BASE` includes `min-w-0`, which should override `min-width: auto`. In practice, nested flex content (icon + span) can still affect layout.

2. **Flex content inside buttons**  
   Buttons use `flex items-center justify-center`. The inner span has `truncate`. Icons have `flex-shrink-0`. Flex containers can still contribute to min-content sizing in some browsers.

3. **No isolation between grid cell and content**  
   The button is both the grid item and the flex container. A wrapper div between the grid cell and the button would isolate the grid item from content-driven sizing.

## Solutions (in order of robustness)

### Option A: Wrapper div per grid cell (most robust)

Wrap each button in a div that is the grid item:

```tsx
<div className="min-w-0 overflow-hidden">
  <button className={ACTION_BUTTON_BASE}>...</button>
</div>
```

The wrapper has `min-w-0` and `overflow-hidden`, so it cannot expand the column. The button fills the wrapper.

### Option B: Inline style to force grid columns

Use `style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}` to bypass any Tailwind compilation issues. Less maintainable but guarantees the CSS.

### Option C: Fixed pixel columns

Use `grid-template-columns: repeat(3, 128px)` (or `calc((100% - 16px) / 3)` for gap). Ensures equal columns but is less flexible.

### Option D: Table layout

Use `display: table` with `table-layout: fixed` for equal column widths. Requires different markup.

## Recommended Fix

**Option A (wrapper div)** is the most robust and keeps the current structure. Each of the 6 buttons is wrapped in:

```tsx
<div key="..." className="min-w-0 overflow-hidden">
  <button ...>
```

This isolates the grid item from content-driven sizing and prevents blowout.
