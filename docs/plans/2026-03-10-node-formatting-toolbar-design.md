# Node Formatting Toolbar — Design Spec

## Overview

Replace the existing `FloatingStyleBar` with a feature-rich contextual toolbar that appears above selected nodes, similar to Miro's contextual toolbar. Uses custom viewport-aware positioning and a modular architecture with 10 discrete section components.

## Data Model

### Style Properties (in `CanvasNode.style`)

Visual-only properties stored in `style: Record<string, string>`:

| Key | Values | Purpose |
|-----|--------|---------|
| `backgroundColor` | hex color | Fill color (existing) |
| `borderColor` | hex color | Border color (existing) |
| `borderWidth` | px value | Border width (existing) |
| `color` | hex color | Text color (existing) |
| `fontSize` | px value | Font size (existing) |
| `fontFamily` | font name | Font family (new) |
| `fontWeight` | `bold` / `normal` | Bold toggle (new) |
| `textAlign` | `left` / `center` / `right` | Horizontal text alignment (new) |
| `verticalAlign` | `top` / `middle` / `bottom` | Vertical text alignment (new) |

### Behavioral/Content Properties (in `CanvasNode.data`)

Non-visual properties stored in `data: Record<string, unknown>`:

| Key | Type | Purpose |
|-----|------|---------|
| `locked` | `boolean` | Full lock state (new) |
| `link` | `string` | Hyperlink URL on node (new) |
| `emoji` | `string` | Emoji badge character (new) |

This separation ensures ClearFormatting (which resets `style` to `{}`) doesn't accidentally remove lock state, links, or emojis.

## Architecture

### File Structure

```
frontend/src/components/toolbar/
  NodeFormattingToolbar.tsx    # Shell — viewport-aware positioning, arranges sections
  ShapeSelector.tsx            # Dropdown to change node type
  FontFamilyPicker.tsx         # Dropdown with system + Google Fonts
  FontSizePicker.tsx           # Size display + increment/decrement buttons
  TextFormatGroup.tsx          # Bold, horizontal + vertical alignment, link
  ColorPicker.tsx              # Reusable color palette + hex input (used 3x)
  ClearFormatting.tsx          # Eraser button — resets all visual styles
  EmojiPicker.tsx              # emoji-mart wrapper (lazy-loaded)
  LockToggle.tsx               # Lock/unlock button
  index.ts                     # Barrel export
```

### Shell Component (NodeFormattingToolbar)

- Props: `selectedNodes`, `boardId`, `onRefetch` (same as current `FloatingStyleBar`)
- **Positioning:** Custom viewport-aware positioning using `useReactFlow().flowToScreenPosition()` to convert node flow coordinates to screen coordinates. Calculates selection bounding box and places toolbar centered above it. Updates position on viewport changes (pan/zoom) via React Flow's `onViewportChange`.
- Manages `activeDropdown` state: `'shape' | 'fontFamily' | 'fillColor' | 'borderColor' | 'textColor' | 'emoji' | 'alignment' | 'link' | null`
- Only one dropdown open at a time; clicking outside closes all
- Provides shared `applyStyle(prop, value)` and `applyData(key, value)` functions passed to sections

### Integration

- Remove `FloatingStyleBar` import from `CanvasView.tsx`, replace with `NodeFormattingToolbar`
- Remove old `getSelectionBounds` logic — new component handles its own positioning

### Multi-Select Value Display

When multiple nodes are selected with differing values for a property:
- **Color indicators:** show a multi-color split or gray dot
- **Font size / font family:** show "—" (dash) as the mixed indicator
- **Toggles (bold, alignment):** show as inactive unless all selected nodes share the same value

## Section Behaviors

### ShapeSelector

Dropdown showing all 12 node types as small icons/shapes. Clicking one calls `api.updateNode` with the new `type` and resets dimensions to `DEFAULT_NODE_DIMENSIONS` for the new type. Current node type is highlighted. In multi-select, shows the type if all selected nodes share it, otherwise shows a generic shape icon.

### FontFamilyPicker

Dropdown with two groups:
- **System:** Arial, Helvetica, Georgia, Times New Roman, Courier New, Verdana
- **Google:** Inter, Roboto, Noto Sans, Lato, Playfair Display, Fira Code

Each font name rendered in its own font for preview. Google Fonts loaded on-demand via `<link>` tag injection. Current font shown in toolbar button (or "—" for mixed selection).

### FontSizePicker

Displays current size with minus/plus buttons. Step sizes: 8, 10, 12, 14, 18, 24, 32, 48, 64, 72. Clicking +/- jumps to next/previous step. Shows "—" when selected nodes have mixed sizes.

### TextFormatGroup

Four inline controls:
- **Bold** toggle (B icon) — toggles `fontWeight` between `bold` and `normal`
- **Horizontal alignment** — three buttons: left / center / right
- **Vertical alignment** — three buttons: top / middle / bottom
- **Link** button — opens input popover. Enter URL + press Enter to save to `data.link`. If link exists, button shows active and popover pre-fills for editing. Nodes with links get a small external-link icon badge.

### ColorPicker (reused 3x)

Same 8-color palette as current FloatingStyleBar plus hex input. Receives `styleProp` to know which property to set. Current color shown as colored indicator on toolbar button. Used for:
- Fill color (`backgroundColor`)
- Border color (`borderColor`)
- Text color (`color`)

### ClearFormatting

Single eraser button. Resets `style` to `{}` on all selected nodes. Does NOT affect `data` properties (`locked`, `link`, `emoji`).

### EmojiPicker

Button opens `emoji-mart` picker dropdown. The picker is lazy-loaded with `React.lazy` + `Suspense` to avoid the ~400KB upfront bundle cost. Selecting an emoji saves to `data.emoji`. Nodes display emoji as a badge in top-left corner. Selecting same emoji again removes it.

### LockToggle

Padlock icon button. Toggles `data.locked` between `true` and `false`. When locked:
- Node can't be moved (`draggable: false` on the flow node)
- Node can't be resized (`NodeResizer` hidden)
- Label can't be edited (double-click disabled)
- Style changes blocked (all toolbar sections disabled except lock toggle)
- Visual indicator: subtle lock icon overlay on the node

## Node Component Updates

### useNodeStyle Hook

New hook `frontend/src/hooks/useNodeStyle.ts` extracts all style + data parsing from node components. Returns: `fill`, `borderColor`, `color`, `fontSize`, `fontFamily`, `fontWeight`, `textAlign`, `verticalAlign`, `locked`, `link`, `emoji`. Used by all node components that render text (all types except `image` and `group`). Image and group nodes still read `locked` from `data` for drag/resize behavior.

### Text Rendering — Switch to foreignObject

All node components switch from SVG `<text>` to `<foreignObject>` for text rendering. This ensures:
- CSS font loading (Google Fonts) automatically triggers re-paint
- `fontFamily`, `fontWeight`, `textAlign` work via standard CSS
- `verticalAlign` implemented via `display: flex` + `alignItems` (`top`->`flex-start`, `middle`->`center`, `bottom`->`flex-end`)
- Better text wrapping and overflow handling

SVG shapes (rect, circle, etc.) remain as SVG — only the text rendering moves to `<foreignObject>`.

### Link Badge

If `data.link` exists, render a small link icon in top-right corner. Click handler calls `window.open(url, '_blank')` with `event.stopPropagation()` to prevent node selection.

### Emoji Badge

If `data.emoji` exists, render emoji character as a badge in top-left corner. Uses `event.stopPropagation()` on click to prevent node selection interference.

### Lock Behavior

- `toFlowNodes` in `useBoard.ts`: set `draggable: false` when `data.locked === true`
- Node components: hide `NodeResizer` when locked, prevent `onStartEdit` when locked
- `NodeFormattingToolbar`: disable all sections except `LockToggle` when all selected nodes are locked

## Google Fonts Loading

`frontend/src/utils/googleFonts.ts`:
- Exports `loadGoogleFont(fontName: string)` — injects `<link>` into `<head>`, idempotent via module-level `Set`
- Exports `GOOGLE_FONTS` constant — list of available Google Font names
- Called by `FontFamilyPicker` on selection and by `useNodeStyle` on mount for nodes that use Google Fonts

## Dependencies

- `@emoji-mart/react` + `@emoji-mart/data` — emoji picker (lazy-loaded)

## CSS

- New file: `frontend/src/styles/toolbar.css`
- Class prefix: `nft-` (node formatting toolbar)
- Remove old `.floating-style-bar` and `.style-bar-*` classes from `global.css`
- Visual style: dark semi-transparent background (`rgba(30, 30, 36, 0.95)`), rounded corners, subtle shadow. Icon-based buttons with hover highlights. Dropdowns below toolbar with same dark theme.
