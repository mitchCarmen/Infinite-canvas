# Node Formatting Toolbar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing FloatingStyleBar with a feature-rich Miro-style contextual toolbar with 10 modular sections for node formatting.

**Architecture:** Modular toolbar shell with discrete section components, custom viewport-aware positioning, shared style/data application functions. Server-side changes to support `type` updates. Style/data use replace semantics on the server; the frontend merges client-side before sending.

**Tech Stack:** React 18, @xyflow/react ^12.6, @emoji-mart/react, TypeScript, Vite, vitest

**Spec:** `docs/plans/2026-03-10-node-formatting-toolbar-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `frontend/src/components/toolbar/NodeFormattingToolbar.tsx` | Shell: viewport-aware positioning, dropdown state, section layout |
| `frontend/src/components/toolbar/ShapeSelector.tsx` | Node type change dropdown |
| `frontend/src/components/toolbar/FontFamilyPicker.tsx` | System + Google font dropdown |
| `frontend/src/components/toolbar/FontSizePicker.tsx` | Size display + step increment/decrement |
| `frontend/src/components/toolbar/TextFormatGroup.tsx` | Bold, H-align, V-align, link |
| `frontend/src/components/toolbar/ColorPicker.tsx` | Reusable color palette + hex input |
| `frontend/src/components/toolbar/ClearFormatting.tsx` | Eraser button |
| `frontend/src/components/toolbar/EmojiPicker.tsx` | emoji-mart wrapper (lazy-loaded) |
| `frontend/src/components/toolbar/LockToggle.tsx` | Lock/unlock button |
| `frontend/src/components/toolbar/index.ts` | Barrel export |
| `frontend/src/components/nodes/NodeBadges.tsx` | Emoji, link, and lock badge overlays for nodes |
| `frontend/src/hooks/useNodeStyle.ts` | Shared style+data parsing for node components |
| `frontend/src/utils/googleFonts.ts` | Google Font on-demand loader |
| `frontend/src/styles/toolbar.css` | All toolbar CSS |

### Modified Files

| File | Changes |
|------|---------|
| `server/src/data/boards.ts` | Add `type` to `UpdateNodeOpts` (style/data keep replace semantics) |
| `server/src/api/routes.ts` | Pass `type` in PATCH node route |
| `server/src/mcp/tools.ts` | Pass `type` in update_node tool (if applicable) |
| `frontend/src/api.ts` | Add `applyNodeData` method, update `bulkUpdateNodes` to support style/data |
| `frontend/src/hooks/useBoard.ts` | Set `draggable: false` for locked nodes in `toFlowNodes` |
| `frontend/src/components/CanvasView.tsx` | Replace FloatingStyleBar with NodeFormattingToolbar, block edit for locked nodes |
| `frontend/src/components/nodes/RectangleNode.tsx` | Use `useNodeStyle`, foreignObject text, badges |
| `frontend/src/components/nodes/CircleNode.tsx` | Same as above |
| `frontend/src/components/nodes/EllipseNode.tsx` | Same as above |
| `frontend/src/components/nodes/DiamondNode.tsx` | Same as above |
| `frontend/src/components/nodes/HexagonNode.tsx` | Same as above |
| `frontend/src/components/nodes/ParallelogramNode.tsx` | Same as above |
| `frontend/src/components/nodes/CylinderNode.tsx` | Same as above |
| `frontend/src/components/nodes/TriangleNode.tsx` | Same as above |
| `frontend/src/components/nodes/StickyNode.tsx` | Use `useNodeStyle`, badges |
| `frontend/src/components/nodes/TextNode.tsx` | Use `useNodeStyle`, foreignObject text, badges |
| `frontend/src/components/nodes/ImageNode.tsx` | Read `locked` from data |
| `frontend/src/components/nodes/GroupNode.tsx` | Read `locked` from data |
| `frontend/src/styles/global.css` | Remove `.floating-style-bar` and `.style-bar-*` classes (lines 548-641, 1084) |
| `frontend/package.json` | Add emoji-mart dependencies |

### Deleted Files

| File | Reason |
|------|--------|
| `frontend/src/components/FloatingStyleBar.tsx` | Replaced by toolbar/ directory |

---

## Chunk 1: Server-Side Changes + Utilities

### Task 1: Add `type` to UpdateNodeOpts

**Files:**
- Modify: `server/src/data/boards.ts:27-35` (UpdateNodeOpts interface)
- Modify: `server/src/data/boards.ts:215-234` (updateNode method)
- Modify: `server/src/data/boards.ts:236-262` (bulkUpdateNodes method)
- Test: `server/src/data/__tests__/boards.test.ts`

**Note:** Style/data keep their existing replace semantics on the server. The frontend merges client-side before sending. This ensures ClearFormatting (sending `style: {}`) works correctly by replacing the entire style object with an empty one.

- [ ] **Step 1: Write failing test for type update**

In `server/src/data/__tests__/boards.test.ts`, add:

```typescript
it('updateNode can change node type and resets dimensions', async () => {
  const board = await store.createBoard('test', 'user');
  const b2 = await store.createNode(board.id, { type: 'rectangle', label: 'R1' }, 'user');
  const nodeId = b2.nodes[0].id;

  const b3 = await store.updateNode(board.id, nodeId, { type: 'circle' }, 'user');
  const updated = b3.nodes.find(n => n.id === nodeId)!;
  expect(updated.type).toBe('circle');
  expect(updated.width).toBe(100);  // DEFAULT_NODE_DIMENSIONS.circle.width
  expect(updated.height).toBe(100); // DEFAULT_NODE_DIMENSIONS.circle.height
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/data/__tests__/boards.test.ts`
Expected: FAIL — `type` not in `UpdateNodeOpts`

- [ ] **Step 3: Add `type` to UpdateNodeOpts and update methods**

In `server/src/data/boards.ts`, update the interface:

```typescript
interface UpdateNodeOpts {
  type?: NodeType;
  label?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  style?: Record<string, string>;
  data?: Record<string, unknown>;
}
```

In `updateNode` method (after line 225), add type handling:

```typescript
if (updates.type !== undefined && updates.type !== node.type) {
  node.type = updates.type;
  // Reset dimensions to defaults for new type unless explicitly provided
  if (updates.width === undefined) node.width = DEFAULT_NODE_DIMENSIONS[updates.type].width;
  if (updates.height === undefined) node.height = DEFAULT_NODE_DIMENSIONS[updates.type].height;
}
```

Add the same block in `bulkUpdateNodes` loop (after line 252).

Add import for `DEFAULT_NODE_DIMENSIONS` at top of file:

```typescript
import type { NodeType, Board, CanvasNode, CanvasEdge, ActivityEntry, ReorderAction } from '@shared/types';
import { DEFAULT_NODE_DIMENSIONS } from '@shared/types';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/data/__tests__/boards.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/data/boards.ts server/src/data/__tests__/boards.test.ts
git commit -m "feat: add type to UpdateNodeOpts with dimension reset"
```

### Task 2: Update API route to pass `type`

**Files:**
- Modify: `server/src/api/routes.ts:95-103`

- [ ] **Step 1: Update PATCH route to include type**

In `server/src/api/routes.ts`, line 97, add `type`:

```typescript
const { type, label, x, y, width, height, style, data } = req.body;
const board = await store.updateNode(req.params.id, req.params.nodeId, { type, label, x, y, width, height, style, data }, 'user');
```

- [ ] **Step 2: Run all server tests**

Run: `cd server && npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add server/src/api/routes.ts
git commit -m "feat: pass type in PATCH node route for shape changes"
```

### Task 2b: Update MCP update_node tool to pass `type` and `data`

**Files:**
- Modify: `server/src/mcp/tools.ts`

- [ ] **Step 1: Find the `update_node` tool handler and add `type` and `data` parameters**

In the `update_node` tool definition, add `type` (optional string enum of NodeType values) and `data` (optional object) to the input schema. In the handler, pass `type` and `data` through to `store.updateNode()`.

- [ ] **Step 2: Run server tests**

Run: `cd server && npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add server/src/mcp/tools.ts
git commit -m "feat: add type and data params to MCP update_node tool"
```

### Task 3: Google Fonts utility

**Files:**
- Create: `frontend/src/utils/googleFonts.ts`

- [ ] **Step 1: Create the utility**

```typescript
export const SYSTEM_FONTS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
];

export const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Noto Sans',
  'Lato',
  'Playfair Display',
  'Fira Code',
];

const loadedFonts = new Set<string>();

export function loadGoogleFont(fontName: string): void {
  if (loadedFonts.has(fontName)) return;
  if (!GOOGLE_FONTS.includes(fontName)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

export function isGoogleFont(fontName: string): boolean {
  return GOOGLE_FONTS.includes(fontName);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/googleFonts.ts
git commit -m "feat: add Google Fonts on-demand loading utility"
```

### Task 4: useNodeStyle hook

**Files:**
- Create: `frontend/src/hooks/useNodeStyle.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useEffect } from 'react';
import { getContrastColor } from '../utils/color';
import { loadGoogleFont, isGoogleFont } from '../utils/googleFonts';

interface NodeStyleResult {
  fill: string;
  borderColor: string;
  borderWidth: string;
  color: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  locked: boolean;
  link: string | null;
  emoji: string | null;
}

export function useNodeStyle(data: Record<string, unknown>): NodeStyleResult {
  const style = (data.style as Record<string, string>) ?? {};

  const fill = style.backgroundColor ?? '#ffffff';
  const borderColor = style.borderColor ?? '#333333';
  const borderWidth = style.borderWidth ?? '2px';
  const explicitColor = style.color;
  const color = explicitColor ?? getContrastColor(fill);
  const fontSize = style.fontSize ?? '14px';
  const fontFamily = style.fontFamily ?? 'Arial';
  const fontWeight = style.fontWeight ?? 'normal';
  const textAlign = (style.textAlign as 'left' | 'center' | 'right') ?? 'center';
  const verticalAlign = (style.verticalAlign as 'top' | 'middle' | 'bottom') ?? 'middle';

  const locked = data.locked === true;
  const link = typeof data.link === 'string' ? data.link : null;
  const emoji = typeof data.emoji === 'string' ? data.emoji : null;

  // Load Google Font if needed
  useEffect(() => {
    if (isGoogleFont(fontFamily)) {
      loadGoogleFont(fontFamily);
    }
  }, [fontFamily]);

  return {
    fill, borderColor, borderWidth, color, fontSize,
    fontFamily, fontWeight, textAlign, verticalAlign,
    locked, link, emoji,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useNodeStyle.ts
git commit -m "feat: add useNodeStyle hook for shared style parsing"
```

### Task 5: Install emoji-mart

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install dependencies**

Run: `cd frontend && npm install @emoji-mart/react @emoji-mart/data`

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add emoji-mart dependencies"
```

Note: if there's a root-level package-lock.json, add that too.

---

## Chunk 2: Toolbar Components

### Task 6: ColorPicker (reusable)

**Files:**
- Create: `frontend/src/components/toolbar/ColorPicker.tsx`

- [ ] **Step 1: Create ColorPicker component**

```typescript
import React, { useState } from 'react';

const COLOR_PALETTE = [
  '#ffffff', '#e88a8a', '#e4c55a', '#5bc4a0',
  '#5b8def', '#9b7de8', '#d97bac', '#2e2e38',
];

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  label: string;
}

export default function ColorPicker({ currentColor, onColorChange, label }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState('');

  return (
    <div className="nft-color-picker">
      <div className="nft-color-palette">
        {COLOR_PALETTE.map((color) => (
          <button
            key={color}
            className={`nft-color-swatch ${color === currentColor ? 'nft-color-swatch-active' : ''}`}
            style={{
              backgroundColor: color,
              border: color === '#ffffff' ? '1px solid #555' : '1px solid transparent',
            }}
            onClick={() => onColorChange(color)}
            title={color}
          />
        ))}
      </div>
      <div className="nft-hex-row">
        <input
          className="nft-hex-input"
          type="text"
          placeholder="#hex"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && /^#[0-9a-fA-F]{3,8}$/.test(hexInput)) {
              onColorChange(hexInput);
              setHexInput('');
            }
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p frontend/src/components/toolbar
git add frontend/src/components/toolbar/ColorPicker.tsx
git commit -m "feat: add reusable ColorPicker toolbar component"
```

### Task 7: ShapeSelector

**Files:**
- Create: `frontend/src/components/toolbar/ShapeSelector.tsx`

- [ ] **Step 1: Create ShapeSelector component**

```typescript
import React from 'react';
import type { NodeType } from '@shared/types';
import { DEFAULT_NODE_DIMENSIONS } from '@shared/types';

const NODE_TYPES: { type: NodeType; label: string }[] = [
  { type: 'rectangle', label: 'Rectangle' },
  { type: 'circle', label: 'Circle' },
  { type: 'ellipse', label: 'Ellipse' },
  { type: 'diamond', label: 'Diamond' },
  { type: 'hexagon', label: 'Hexagon' },
  { type: 'parallelogram', label: 'Parallelogram' },
  { type: 'cylinder', label: 'Cylinder' },
  { type: 'triangle', label: 'Triangle' },
  { type: 'sticky', label: 'Sticky Note' },
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Image' },
  { type: 'group', label: 'Group' },
];

interface ShapeSelectorProps {
  currentType: string;
  isOpen: boolean;
  onToggle: () => void;
  onChangeType: (type: NodeType) => void;
}

export default function ShapeSelector({ currentType, isOpen, onToggle, onChangeType }: ShapeSelectorProps) {
  return (
    <div className="nft-section">
      <button className={`nft-btn ${isOpen ? 'nft-btn-active' : ''}`} onClick={onToggle} title="Change shape">
        <ShapeIcon type={currentType} />
      </button>
      {isOpen && (
        <div className="nft-dropdown nft-shape-dropdown">
          {NODE_TYPES.map(({ type, label }) => (
            <button
              key={type}
              className={`nft-shape-option ${type === currentType ? 'nft-shape-option-active' : ''}`}
              onClick={() => onChangeType(type)}
              title={label}
            >
              <ShapeIcon type={type} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShapeIcon({ type }: { type: string }) {
  const size = 16;
  switch (type) {
    case 'circle':
      return <svg width={size} height={size}><circle cx={8} cy={8} r={7} fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'diamond':
      return <svg width={size} height={size}><polygon points="8,1 15,8 8,15 1,8" fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'triangle':
      return <svg width={size} height={size}><polygon points="8,1 15,15 1,15" fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'hexagon':
      return <svg width={size} height={size}><polygon points="4,1 12,1 15,8 12,15 4,15 1,8" fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'ellipse':
      return <svg width={size} height={size}><ellipse cx={8} cy={8} rx={7} ry={5} fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'cylinder':
      return <svg width={size} height={size}><ellipse cx={8} cy={4} rx={6} ry={3} fill="none" stroke="currentColor" strokeWidth={1.5}/><line x1={2} y1={4} x2={2} y2={12} stroke="currentColor" strokeWidth={1.5}/><line x1={14} y1={4} x2={14} y2={12} stroke="currentColor" strokeWidth={1.5}/><ellipse cx={8} cy={12} rx={6} ry={3} fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'parallelogram':
      return <svg width={size} height={size}><polygon points="4,1 15,1 12,15 1,15" fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'sticky':
      return <svg width={size} height={size}><rect x={1} y={1} width={14} height={14} fill="#fff9c4" stroke="#e6db00" strokeWidth={1.5}/></svg>;
    case 'text':
      return <svg width={size} height={size}><text x={3} y={13} fontSize={13} fill="currentColor" fontWeight="bold">T</text></svg>;
    case 'image':
      return <svg width={size} height={size}><rect x={1} y={1} width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} rx={1}/><circle cx={5} cy={5} r={2} fill="currentColor"/><polyline points="1,13 6,8 10,12 12,10 15,13" fill="none" stroke="currentColor" strokeWidth={1}/></svg>;
    case 'group':
      return <svg width={size} height={size}><rect x={1} y={1} width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="2,2" rx={2}/></svg>;
    default: // rectangle
      return <svg width={size} height={size}><rect x={1} y={1} width={14} height={14} rx={2} fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/toolbar/ShapeSelector.tsx
git commit -m "feat: add ShapeSelector toolbar component"
```

### Task 8: FontFamilyPicker

**Files:**
- Create: `frontend/src/components/toolbar/FontFamilyPicker.tsx`

- [ ] **Step 1: Create FontFamilyPicker component**

```typescript
import React from 'react';
import { SYSTEM_FONTS, GOOGLE_FONTS, loadGoogleFont } from '../../utils/googleFonts';

interface FontFamilyPickerProps {
  currentFont: string;
  isOpen: boolean;
  onToggle: () => void;
  onChangeFont: (font: string) => void;
}

export default function FontFamilyPicker({ currentFont, isOpen, onToggle, onChangeFont }: FontFamilyPickerProps) {
  const handleSelect = (font: string) => {
    if (GOOGLE_FONTS.includes(font)) {
      loadGoogleFont(font);
    }
    onChangeFont(font);
  };

  return (
    <div className="nft-section">
      <button className={`nft-btn nft-font-btn ${isOpen ? 'nft-btn-active' : ''}`} onClick={onToggle} title="Font family">
        <span className="nft-font-label">{currentFont === '—' ? '—' : currentFont}</span>
      </button>
      {isOpen && (
        <div className="nft-dropdown nft-font-dropdown">
          <div className="nft-font-group-label">System</div>
          {SYSTEM_FONTS.map((font) => (
            <button
              key={font}
              className={`nft-font-option ${font === currentFont ? 'nft-font-option-active' : ''}`}
              style={{ fontFamily: font }}
              onClick={() => handleSelect(font)}
            >
              {font}
            </button>
          ))}
          <div className="nft-font-group-label">Google Fonts</div>
          {GOOGLE_FONTS.map((font) => (
            <button
              key={font}
              className={`nft-font-option ${font === currentFont ? 'nft-font-option-active' : ''}`}
              style={{ fontFamily: font }}
              onClick={() => handleSelect(font)}
              onMouseEnter={() => loadGoogleFont(font)}
            >
              {font}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/toolbar/FontFamilyPicker.tsx
git commit -m "feat: add FontFamilyPicker toolbar component"
```

### Task 9: FontSizePicker

**Files:**
- Create: `frontend/src/components/toolbar/FontSizePicker.tsx`

- [ ] **Step 1: Create FontSizePicker component**

```typescript
import React from 'react';

const SIZE_STEPS = [8, 10, 12, 14, 18, 24, 32, 48, 64, 72];

interface FontSizePickerProps {
  currentSize: string; // e.g. "14px" or "—"
  onChangeSize: (size: string) => void;
}

export default function FontSizePicker({ currentSize, onChangeSize }: FontSizePickerProps) {
  const numericSize = parseInt(currentSize, 10) || 14;
  const currentIdx = SIZE_STEPS.indexOf(numericSize);

  const decrement = () => {
    const idx = currentIdx > 0 ? currentIdx - 1 : SIZE_STEPS.findIndex(s => s < numericSize);
    const newSize = idx >= 0 ? SIZE_STEPS[idx] : SIZE_STEPS[0];
    onChangeSize(`${newSize}px`);
  };

  const increment = () => {
    if (currentIdx >= 0 && currentIdx < SIZE_STEPS.length - 1) {
      onChangeSize(`${SIZE_STEPS[currentIdx + 1]}px`);
    } else {
      const next = SIZE_STEPS.find(s => s > numericSize);
      if (next) onChangeSize(`${next}px`);
    }
  };

  return (
    <div className="nft-section nft-size-picker">
      <button className="nft-btn nft-btn-small" onClick={decrement} title="Decrease font size">−</button>
      <span className="nft-size-display">{currentSize === '—' ? '—' : numericSize}</span>
      <button className="nft-btn nft-btn-small" onClick={increment} title="Increase font size">+</button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/toolbar/FontSizePicker.tsx
git commit -m "feat: add FontSizePicker toolbar component"
```

### Task 10: TextFormatGroup

**Files:**
- Create: `frontend/src/components/toolbar/TextFormatGroup.tsx`

- [ ] **Step 1: Create TextFormatGroup component**

```typescript
import React, { useState } from 'react';

interface TextFormatGroupProps {
  fontWeight: string;
  textAlign: string;
  verticalAlign: string;
  link: string | null;
  isAlignOpen: boolean;
  isLinkOpen: boolean;
  onToggleAlign: () => void;
  onToggleLink: () => void;
  onChangeFontWeight: (weight: string) => void;
  onChangeTextAlign: (align: string) => void;
  onChangeVerticalAlign: (align: string) => void;
  onChangeLink: (url: string | null) => void;
}

export default function TextFormatGroup({
  fontWeight, textAlign, verticalAlign, link,
  isAlignOpen, isLinkOpen, onToggleAlign, onToggleLink,
  onChangeFontWeight, onChangeTextAlign, onChangeVerticalAlign, onChangeLink,
}: TextFormatGroupProps) {
  const [linkInput, setLinkInput] = useState(link ?? '');

  return (
    <div className="nft-section nft-text-format">
      {/* Bold toggle */}
      <button
        className={`nft-btn ${fontWeight === 'bold' ? 'nft-btn-active' : ''}`}
        onClick={() => onChangeFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
        title="Bold"
      >
        <strong>B</strong>
      </button>

      {/* Alignment dropdown */}
      <button className={`nft-btn ${isAlignOpen ? 'nft-btn-active' : ''}`} onClick={onToggleAlign} title="Text alignment">
        <AlignIcon align={textAlign} />
      </button>
      {isAlignOpen && (
        <div className="nft-dropdown nft-align-dropdown">
          <div className="nft-align-row">
            <span className="nft-align-label">Horizontal</span>
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                className={`nft-btn nft-btn-small ${textAlign === a ? 'nft-btn-active' : ''}`}
                onClick={() => onChangeTextAlign(a)}
                title={a}
              >
                <AlignIcon align={a} />
              </button>
            ))}
          </div>
          <div className="nft-align-row">
            <span className="nft-align-label">Vertical</span>
            {(['top', 'middle', 'bottom'] as const).map((a) => (
              <button
                key={a}
                className={`nft-btn nft-btn-small ${verticalAlign === a ? 'nft-btn-active' : ''}`}
                onClick={() => onChangeVerticalAlign(a)}
                title={a}
              >
                <VAlignIcon align={a} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Link */}
      <button
        className={`nft-btn ${link ? 'nft-btn-active' : ''} ${isLinkOpen ? 'nft-btn-active' : ''}`}
        onClick={onToggleLink}
        title="Add link"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </button>
      {isLinkOpen && (
        <div className="nft-dropdown nft-link-dropdown">
          <input
            className="nft-link-input"
            type="url"
            placeholder="https://..."
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && linkInput.trim()) {
                onChangeLink(linkInput.trim());
              } else if (e.key === 'Enter' && !linkInput.trim()) {
                onChangeLink(null);
              }
            }}
            autoFocus
          />
          {link && (
            <button className="nft-link-remove" onClick={() => { onChangeLink(null); setLinkInput(''); }}>
              Remove link
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AlignIcon({ align }: { align: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {align === 'left' && <><line x1={3} y1={6} x2={15} y2={6}/><line x1={3} y1={12} x2={21} y2={12}/><line x1={3} y1={18} x2={15} y2={18}/></>}
      {align === 'center' && <><line x1={6} y1={6} x2={18} y2={6}/><line x1={3} y1={12} x2={21} y2={12}/><line x1={6} y1={18} x2={18} y2={18}/></>}
      {align === 'right' && <><line x1={9} y1={6} x2={21} y2={6}/><line x1={3} y1={12} x2={21} y2={12}/><line x1={9} y1={18} x2={21} y2={18}/></>}
    </svg>
  );
}

function VAlignIcon({ align }: { align: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {align === 'top' && <><line x1={3} y1={3} x2={21} y2={3}/><rect x={8} y={6} width={8} height={6} rx={1}/></>}
      {align === 'middle' && <><rect x={8} y={9} width={8} height={6} rx={1}/><line x1={3} y1={3} x2={21} y2={3}/><line x1={3} y1={21} x2={21} y2={21}/></>}
      {align === 'bottom' && <><line x1={3} y1={21} x2={21} y2={21}/><rect x={8} y={12} width={8} height={6} rx={1}/></>}
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/toolbar/TextFormatGroup.tsx
git commit -m "feat: add TextFormatGroup toolbar component (bold, alignment, link)"
```

### Task 11: ClearFormatting

**Files:**
- Create: `frontend/src/components/toolbar/ClearFormatting.tsx`

- [ ] **Step 1: Create ClearFormatting component**

```typescript
import React from 'react';

interface ClearFormattingProps {
  onClear: () => void;
}

export default function ClearFormatting({ onClear }: ClearFormattingProps) {
  return (
    <button className="nft-btn" onClick={onClear} title="Clear formatting">
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <line x1={4} y1={4} x2={20} y2={20}/>
        <path d="M8 20h8"/>
        <path d="M12 20l4-16"/>
      </svg>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/toolbar/ClearFormatting.tsx
git commit -m "feat: add ClearFormatting toolbar component"
```

### Task 12: EmojiPicker (lazy-loaded)

**Files:**
- Create: `frontend/src/components/toolbar/EmojiPicker.tsx`

- [ ] **Step 1: Create EmojiPicker component**

```typescript
import React, { lazy, Suspense } from 'react';

const Picker = lazy(() => import('@emoji-mart/react'));

interface EmojiPickerProps {
  currentEmoji: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectEmoji: (emoji: string | null) => void;
}

export default function EmojiPicker({ currentEmoji, isOpen, onToggle, onSelectEmoji }: EmojiPickerProps) {
  const handleSelect = (emojiData: any) => {
    const native = emojiData.native as string;
    if (native === currentEmoji) {
      onSelectEmoji(null); // toggle off
    } else {
      onSelectEmoji(native);
    }
  };

  return (
    <div className="nft-section">
      <button className={`nft-btn ${isOpen ? 'nft-btn-active' : ''}`} onClick={onToggle} title="Add emoji">
        {currentEmoji ?? '😀'}
      </button>
      {isOpen && (
        <div className="nft-dropdown nft-emoji-dropdown">
          <Suspense fallback={<div className="nft-emoji-loading">Loading...</div>}>
            <Picker
              data={undefined}
              onEmojiSelect={handleSelect}
              theme="dark"
              previewPosition="none"
              skinTonePosition="none"
              set="native"
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
```

Note: `@emoji-mart/react` with `data={undefined}` will use the default data from `@emoji-mart/data` if the package auto-resolves. If not, import data explicitly:

```typescript
import data from '@emoji-mart/data';
// then use data={data} in the Picker
```

Test both approaches during implementation. Use whichever works.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/toolbar/EmojiPicker.tsx
git commit -m "feat: add lazy-loaded EmojiPicker toolbar component"
```

### Task 13: LockToggle

**Files:**
- Create: `frontend/src/components/toolbar/LockToggle.tsx`

- [ ] **Step 1: Create LockToggle component**

```typescript
import React from 'react';

interface LockToggleProps {
  isLocked: boolean;
  onToggle: () => void;
}

export default function LockToggle({ isLocked, onToggle }: LockToggleProps) {
  return (
    <button
      className={`nft-btn ${isLocked ? 'nft-btn-active' : ''}`}
      onClick={onToggle}
      title={isLocked ? 'Unlock' : 'Lock'}
    >
      {isLocked ? (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x={3} y={11} width={18} height={11} rx={2}/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ) : (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x={3} y={11} width={18} height={11} rx={2}/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/toolbar/LockToggle.tsx
git commit -m "feat: add LockToggle toolbar component"
```

---

## Chunk 3: Toolbar Shell + CSS

### Task 14: Toolbar CSS

**Files:**
- Create: `frontend/src/styles/toolbar.css`

- [ ] **Step 1: Create toolbar stylesheet**

```css
/* Node Formatting Toolbar (nft-) */

.nft-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: rgba(30, 30, 36, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  pointer-events: all;
  white-space: nowrap;
  z-index: 1000;
}

.nft-toolbar.nft-locked {
  opacity: 0.7;
}

.nft-section {
  position: relative;
  display: flex;
  align-items: center;
}

.nft-separator {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}

.nft-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}

.nft-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.nft-btn-active {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.nft-btn-small {
  min-width: 24px;
  height: 24px;
  font-size: 12px;
}

.nft-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nft-btn:disabled:hover {
  background: transparent;
}

/* Font family button */
.nft-font-btn {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nft-font-label {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Font size picker */
.nft-size-picker {
  display: flex;
  align-items: center;
  gap: 2px;
}

.nft-size-display {
  min-width: 24px;
  text-align: center;
  font-size: 12px;
  color: #e0e0e0;
}

/* Dropdowns */
.nft-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 36, 0.97);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  padding: 6px;
  z-index: 1001;
  min-width: 120px;
}

/* Shape dropdown */
.nft-shape-dropdown {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  min-width: 180px;
}

.nft-shape-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 10px;
}

.nft-shape-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.nft-shape-option-active {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* Font dropdown */
.nft-font-dropdown {
  max-height: 260px;
  overflow-y: auto;
  min-width: 160px;
}

.nft-font-group-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 6px 8px 2px;
}

.nft-font-option {
  display: block;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
}

.nft-font-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.nft-font-option-active {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* Color picker */
.nft-color-picker {
  padding: 4px;
}

.nft-color-palette {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin-bottom: 6px;
}

.nft-color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}

.nft-color-swatch:hover {
  transform: scale(1.15);
}

.nft-color-swatch-active {
  outline: 2px solid #5b8def;
  outline-offset: 1px;
}

.nft-hex-row {
  margin-top: 4px;
}

.nft-hex-input {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #2e2e38;
  color: #e0e0e0;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}

.nft-hex-input:focus {
  border-color: #5b8def;
}

/* Color indicator on toolbar button */
.nft-color-indicator {
  width: 14px;
  height: 3px;
  border-radius: 1px;
  margin-top: 2px;
}

/* Alignment dropdown */
.nft-align-dropdown {
  padding: 8px;
  min-width: 160px;
}

.nft-align-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.nft-align-label {
  font-size: 10px;
  color: #888;
  min-width: 60px;
}

/* Link dropdown */
.nft-link-dropdown {
  padding: 8px;
  min-width: 220px;
}

.nft-link-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #2e2e38;
  color: #e0e0e0;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}

.nft-link-input:focus {
  border-color: #5b8def;
}

.nft-link-remove {
  display: block;
  margin-top: 6px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: rgba(232, 138, 138, 0.2);
  color: #e88a8a;
  font-size: 11px;
  cursor: pointer;
  width: 100%;
}

.nft-link-remove:hover {
  background: rgba(232, 138, 138, 0.3);
}

/* Text format group */
.nft-text-format {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* Emoji dropdown */
.nft-emoji-dropdown {
  min-width: auto;
  padding: 0;
  overflow: hidden;
}

.nft-emoji-loading {
  padding: 20px;
  color: #888;
  text-align: center;
  font-size: 12px;
}

/* Node badges */
.node-badge {
  position: absolute;
  z-index: 10;
  font-size: 12px;
  pointer-events: auto;
  cursor: pointer;
}

.node-badge-emoji {
  top: -6px;
  left: -6px;
}

.node-badge-link {
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  background: rgba(91, 141, 239, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-badge-link svg {
  width: 10px;
  height: 10px;
  color: white;
}

.node-lock-overlay {
  position: absolute;
  bottom: 2px;
  right: 2px;
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles/toolbar.css
git commit -m "feat: add toolbar CSS styles"
```

### Task 15: NodeFormattingToolbar shell

**Files:**
- Create: `frontend/src/components/toolbar/NodeFormattingToolbar.tsx`
- Create: `frontend/src/components/toolbar/index.ts`

- [ ] **Step 1: Create the shell component**

```typescript
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow, useViewport, type Node } from '@xyflow/react';
import type { NodeType } from '@shared/types';
import { DEFAULT_NODE_DIMENSIONS } from '@shared/types';
import { api } from '../../api';
import ShapeSelector from './ShapeSelector';
import FontFamilyPicker from './FontFamilyPicker';
import FontSizePicker from './FontSizePicker';
import TextFormatGroup from './TextFormatGroup';
import ColorPicker from './ColorPicker';
import ClearFormatting from './ClearFormatting';
import EmojiPicker from './EmojiPicker';
import LockToggle from './LockToggle';
import '../../styles/toolbar.css';

type DropdownId = 'shape' | 'fontFamily' | 'fillColor' | 'borderColor' | 'textColor' | 'emoji' | 'alignment' | 'link' | null;

interface NodeFormattingToolbarProps {
  selectedNodes: Node[];
  boardId: string;
  onRefetch: () => void;
}

function getSelectionBounds(nodes: Node[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const w = node.measured?.width ?? node.width ?? 150;
    const h = node.measured?.height ?? node.height ?? 80;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Get a style value shared across all nodes, or "—" if mixed */
function getSharedStyle(nodes: Node[], prop: string): string {
  const values = nodes.map(n => ((n.data?.style as Record<string, string>) ?? {})[prop] ?? '');
  const unique = new Set(values);
  return unique.size === 1 ? values[0] : '—';
}

function getSharedData<T>(nodes: Node[], key: string): T | '—' {
  const values = nodes.map(n => (n.data as Record<string, unknown>)?.[key]);
  const unique = new Set(values.map(v => JSON.stringify(v)));
  return unique.size === 1 ? (values[0] as T) : '—';
}

export default function NodeFormattingToolbar({ selectedNodes, boardId, onRefetch }: NodeFormattingToolbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<DropdownId>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { flowToScreenPosition } = useReactFlow();
  const viewport = useViewport();

  if (selectedNodes.length === 0) return null;

  const bounds = getSelectionBounds(selectedNodes);
  const screenPos = flowToScreenPosition({ x: bounds.x + bounds.width / 2, y: bounds.y });

  // Shared values for multi-select
  const currentType = getSharedStyle(selectedNodes, '') === '—' ? '—' :
    (() => { const types = selectedNodes.map(n => n.type ?? 'rectangle'); return new Set(types).size === 1 ? types[0] : '—'; })();
  const currentFontFamily = getSharedStyle(selectedNodes, 'fontFamily') || 'Arial';
  const currentFontSize = getSharedStyle(selectedNodes, 'fontSize') || '14px';
  const currentFontWeight = getSharedStyle(selectedNodes, 'fontWeight') || 'normal';
  const currentTextAlign = getSharedStyle(selectedNodes, 'textAlign') || 'center';
  const currentVerticalAlign = getSharedStyle(selectedNodes, 'verticalAlign') || 'middle';
  const currentFillColor = getSharedStyle(selectedNodes, 'backgroundColor') || '#ffffff';
  const currentBorderColor = getSharedStyle(selectedNodes, 'borderColor') || '#333333';
  const currentTextColor = getSharedStyle(selectedNodes, 'color') || '';
  const currentLink = getSharedData<string>(selectedNodes, 'link');
  const currentEmoji = getSharedData<string>(selectedNodes, 'emoji');
  const isLocked = selectedNodes.every(n => (n.data as Record<string, unknown>)?.locked === true);
  const anyLocked = selectedNodes.some(n => (n.data as Record<string, unknown>)?.locked === true);

  const toggleDropdown = (id: DropdownId) => {
    setActiveDropdown(prev => prev === id ? null : id);
  };

  const applyStyle = async (prop: string, value: string) => {
    const updates = selectedNodes.map(node => {
      const currentStyle = (node.data?.style as Record<string, string>) ?? {};
      return { id: node.id, style: { ...currentStyle, [prop]: value } };
    });
    await api.bulkUpdateNodes(boardId, updates);
    onRefetch();
  };

  const applyData = async (key: string, value: unknown) => {
    // Only send actual data keys — filter out React Flow internal fields
    // (label, style, width, height, nodeType, boardId, canvasLight, isEditing, etc.)
    const INTERNAL_KEYS = new Set(['label', 'style', 'width', 'height', 'nodeType', 'boardId', 'canvasLight', 'isEditing', 'onStartEdit', 'onFinishEdit', 'onCancelEdit']);
    for (const node of selectedNodes) {
      const rawData = (node.data as Record<string, unknown>) ?? {};
      const cleanData: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawData)) {
        if (!INTERNAL_KEYS.has(k)) cleanData[k] = v;
      }
      cleanData[key] = value;
      await api.updateNode(boardId, node.id, { data: cleanData });
    }
    onRefetch();
  };

  const handleChangeType = async (type: NodeType) => {
    const dims = DEFAULT_NODE_DIMENSIONS[type];
    for (const node of selectedNodes) {
      await api.updateNode(boardId, node.id, {
        type,
        width: dims.width,
        height: dims.height,
      });
    }
    onRefetch();
    setActiveDropdown(null);
  };

  const handleClearFormatting = async () => {
    for (const node of selectedNodes) {
      await api.updateNode(boardId, node.id, { style: {} });
    }
    onRefetch();
  };

  const handleToggleLock = async () => {
    const newLocked = !isLocked;
    await applyData('locked', newLocked);
  };

  const disabled = isLocked;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as HTMLElement)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={toolbarRef}
      className={`nft-toolbar ${disabled ? 'nft-locked' : ''}`}
      style={{
        position: 'fixed',
        left: screenPos.x,
        top: screenPos.y - 8,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <ShapeSelector
        currentType={currentType}
        isOpen={activeDropdown === 'shape'}
        onToggle={() => toggleDropdown('shape')}
        onChangeType={handleChangeType}
      />

      <div className="nft-separator" />

      <FontFamilyPicker
        currentFont={disabled ? '—' : currentFontFamily}
        isOpen={activeDropdown === 'fontFamily'}
        onToggle={() => !disabled && toggleDropdown('fontFamily')}
        onChangeFont={(f) => applyStyle('fontFamily', f)}
      />

      <FontSizePicker
        currentSize={disabled ? '—' : currentFontSize}
        onChangeSize={(s) => !disabled && applyStyle('fontSize', s)}
      />

      <div className="nft-separator" />

      <TextFormatGroup
        fontWeight={currentFontWeight}
        textAlign={currentTextAlign}
        verticalAlign={currentVerticalAlign}
        link={typeof currentLink === 'string' ? currentLink : null}
        isAlignOpen={activeDropdown === 'alignment'}
        isLinkOpen={activeDropdown === 'link'}
        onToggleAlign={() => !disabled && toggleDropdown('alignment')}
        onToggleLink={() => !disabled && toggleDropdown('link')}
        onChangeFontWeight={(w) => !disabled && applyStyle('fontWeight', w)}
        onChangeTextAlign={(a) => !disabled && applyStyle('textAlign', a)}
        onChangeVerticalAlign={(a) => !disabled && applyStyle('verticalAlign', a)}
        onChangeLink={(url) => !disabled && applyData('link', url)}
      />

      <div className="nft-separator" />

      {/* Text color */}
      <div className="nft-section">
        <button
          className={`nft-btn ${activeDropdown === 'textColor' ? 'nft-btn-active' : ''}`}
          onClick={() => !disabled && toggleDropdown('textColor')}
          disabled={disabled}
          title="Text color"
        >
          <span style={{ fontWeight: 'bold' }}>A</span>
          <div className="nft-color-indicator" style={{ backgroundColor: currentTextColor || '#e0e0e0' }} />
        </button>
        {activeDropdown === 'textColor' && (
          <div className="nft-dropdown">
            <ColorPicker
              currentColor={currentTextColor}
              onColorChange={(c) => applyStyle('color', c)}
              label="Text color"
            />
          </div>
        )}
      </div>

      {/* Fill color */}
      <div className="nft-section">
        <button
          className={`nft-btn ${activeDropdown === 'fillColor' ? 'nft-btn-active' : ''}`}
          onClick={() => !disabled && toggleDropdown('fillColor')}
          disabled={disabled}
          title="Fill color"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill={currentFillColor} stroke="currentColor" strokeWidth={2}>
            <rect x={3} y={3} width={18} height={18} rx={2}/>
          </svg>
        </button>
        {activeDropdown === 'fillColor' && (
          <div className="nft-dropdown">
            <ColorPicker
              currentColor={currentFillColor}
              onColorChange={(c) => applyStyle('backgroundColor', c)}
              label="Fill color"
            />
          </div>
        )}
      </div>

      {/* Border color */}
      <div className="nft-section">
        <button
          className={`nft-btn ${activeDropdown === 'borderColor' ? 'nft-btn-active' : ''}`}
          onClick={() => !disabled && toggleDropdown('borderColor')}
          disabled={disabled}
          title="Border color"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={currentBorderColor} strokeWidth={2.5}>
            <circle cx={12} cy={12} r={9}/>
          </svg>
        </button>
        {activeDropdown === 'borderColor' && (
          <div className="nft-dropdown">
            <ColorPicker
              currentColor={currentBorderColor}
              onColorChange={(c) => applyStyle('borderColor', c)}
              label="Border color"
            />
          </div>
        )}
      </div>

      <div className="nft-separator" />

      <ClearFormatting onClear={disabled ? () => {} : handleClearFormatting} />

      <EmojiPicker
        currentEmoji={typeof currentEmoji === 'string' ? currentEmoji : null}
        isOpen={activeDropdown === 'emoji'}
        onToggle={() => !disabled && toggleDropdown('emoji')}
        onSelectEmoji={(e) => !disabled && applyData('emoji', e)}
      />

      <div className="nft-separator" />

      <LockToggle isLocked={isLocked} onToggle={handleToggleLock} />
    </div>
  );
}
```

- [ ] **Step 2: Create barrel export**

```typescript
// frontend/src/components/toolbar/index.ts
export { default as NodeFormattingToolbar } from './NodeFormattingToolbar';
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/toolbar/NodeFormattingToolbar.tsx frontend/src/components/toolbar/index.ts
git commit -m "feat: add NodeFormattingToolbar shell with viewport-aware positioning"
```

---

## Chunk 4: Integration — CanvasView, useBoard, Node Components

### Task 16: Update CanvasView to use NodeFormattingToolbar

**Files:**
- Modify: `frontend/src/components/CanvasView.tsx`

- [ ] **Step 1: Replace FloatingStyleBar import**

Replace line 29:
```typescript
// Before:
import FloatingStyleBar from './FloatingStyleBar';
// After:
import { NodeFormattingToolbar } from './toolbar';
```

- [ ] **Step 2: Replace FloatingStyleBar JSX**

Replace lines 457-463:
```typescript
// Before:
{selectedNodes.length > 0 && (
  <FloatingStyleBar
    selectedNodes={selectedNodes}
    boardId={boardId}
    onRefetch={refetch}
  />
)}
// After:
{selectedNodes.length > 0 && (
  <NodeFormattingToolbar
    selectedNodes={selectedNodes}
    boardId={boardId}
    onRefetch={refetch}
  />
)}
```

- [ ] **Step 3: Block double-click edit for locked nodes**

In `onNodeDoubleClick` callback (line 333-337), add a lock check:

```typescript
const onNodeDoubleClick: NodeMouseHandler = useCallback(
  (_event, node) => {
    const isLocked = (node.data as Record<string, unknown>)?.locked === true;
    if (isLocked) return;
    setEditingNodeId(node.id);
  },
  [],
);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/CanvasView.tsx
git commit -m "feat: replace FloatingStyleBar with NodeFormattingToolbar in CanvasView"
```

### Task 17: Update useBoard for lock behavior

**Files:**
- Modify: `frontend/src/hooks/useBoard.ts`

- [ ] **Step 1: Set draggable false for locked nodes in toFlowNodes**

In `toFlowNodes` function (line 18-41), add lock handling after setting parentId:

```typescript
function toFlowNodes(canvasNodes: CanvasNode[]): Node[] {
  return canvasNodes.map((n) => {
    const isLocked = n.data?.locked === true;
    const node: Node = {
      id: n.id,
      type: n.type,
      position: { x: n.x, y: n.y },
      data: {
        ...(n.data ?? {}),
        label: n.label,
        style: n.style ?? {},
        width: n.width,
        height: n.height,
        nodeType: n.type,
      },
      zIndex: n.zIndex,
      style: { width: n.width, height: n.height },
      draggable: !isLocked,
    };
    if (n.parentId) {
      node.parentId = n.parentId;
      node.extent = 'parent';
    }
    return node;
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useBoard.ts
git commit -m "feat: set draggable false for locked nodes in toFlowNodes"
```

### Task 18: Update RectangleNode with useNodeStyle, foreignObject text, and badges

**Files:**
- Modify: `frontend/src/components/nodes/RectangleNode.tsx`

- [ ] **Step 1: Rewrite RectangleNode**

```typescript
import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';
import { useNodeStyle } from '../../hooks/useNodeStyle';
import NodeBadges from './NodeBadges';

export default function RectangleNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 150;
  const height = (data.height as number) ?? 80;
  const {
    fill, borderColor, color, fontSize, fontFamily, fontWeight,
    textAlign, verticalAlign, locked, link, emoji,
  } = useNodeStyle(data);
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  const alignItems = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';
  const justifyContent = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected && !locked} minWidth={50} minHeight={30} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <rect x={1} y={1} width={width - 2} height={height - 2} rx={4} ry={4} fill={fill} stroke={borderColor} strokeWidth={2} />
        {!isEditing && (
          <foreignObject x={4} y={4} width={width - 8} height={height - 8}>
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems, justifyContent,
              color, fontSize, fontFamily, fontWeight,
              textAlign, overflow: 'hidden', wordBreak: 'break-word',
            }}>
              {label}
            </div>
          </foreignObject>
        )}
      </svg>
      {isEditing && (
        <div className="node-edit-overlay">
          <input
            ref={inputRef}
            className="node-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={{ fontSize, fontFamily }}
          />
        </div>
      )}
      <NodeBadges link={link} emoji={emoji} locked={locked} />
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
    </div>
  );
}
```

- [ ] **Step 2: Create NodeBadges component**

Create `frontend/src/components/nodes/NodeBadges.tsx`:

```typescript
import React from 'react';

interface NodeBadgesProps {
  link: string | null;
  emoji: string | null;
  locked: boolean;
}

export default function NodeBadges({ link, emoji, locked }: NodeBadgesProps) {
  return (
    <>
      {emoji && (
        <span
          className="node-badge node-badge-emoji"
          onClick={(e) => e.stopPropagation()}
        >
          {emoji}
        </span>
      )}
      {link && (
        <a
          className="node-badge node-badge-link"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={link}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1={10} y1={14} x2={21} y2={3}/>
          </svg>
        </a>
      )}
      {locked && (
        <div className="node-lock-overlay">
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x={3} y={11} width={18} height={11} rx={2}/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/nodes/RectangleNode.tsx frontend/src/components/nodes/NodeBadges.tsx
git commit -m "feat: update RectangleNode with useNodeStyle, foreignObject text, badges"
```

### Task 19: Update remaining shape node components

**Files:**
- Modify: `frontend/src/components/nodes/CircleNode.tsx`
- Modify: `frontend/src/components/nodes/EllipseNode.tsx`
- Modify: `frontend/src/components/nodes/DiamondNode.tsx`
- Modify: `frontend/src/components/nodes/HexagonNode.tsx`
- Modify: `frontend/src/components/nodes/ParallelogramNode.tsx`
- Modify: `frontend/src/components/nodes/CylinderNode.tsx`
- Modify: `frontend/src/components/nodes/TriangleNode.tsx`
- Modify: `frontend/src/components/nodes/TextNode.tsx`
- Modify: `frontend/src/components/nodes/StickyNode.tsx`

Each node follows the same pattern as the updated RectangleNode:
1. Replace manual style extraction with `useNodeStyle(data)`
2. Replace SVG `<text>` with `<foreignObject>` containing a flex div (except StickyNode which already uses foreignObject)
3. Add `<NodeBadges link={link} emoji={emoji} locked={locked} />`
4. Conditionally hide `NodeResizer` when locked: `isVisible={!!selected && !locked}`
5. Add `fontFamily` to edit input style

**For each node:**

- [ ] **Step 1: Update the node component** — apply the same pattern as RectangleNode. The SVG shape markup (circle, polygon, path, etc.) stays the same; only the text rendering and style extraction change.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/nodes/
git commit -m "feat: update all node components with useNodeStyle, foreignObject text, badges"
```

### Task 20: Update ImageNode and GroupNode for lock support

**Files:**
- Modify: `frontend/src/components/nodes/ImageNode.tsx`
- Modify: `frontend/src/components/nodes/GroupNode.tsx`

- [ ] **Step 1: Add lock behavior to ImageNode**

Read `data.locked` and:
- Hide `NodeResizer` when locked
- Add lock overlay badge

- [ ] **Step 2: Add lock behavior to GroupNode**

Same pattern as ImageNode.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/nodes/ImageNode.tsx frontend/src/components/nodes/GroupNode.tsx
git commit -m "feat: add lock support to ImageNode and GroupNode"
```

### Task 21: Clean up old FloatingStyleBar

**Files:**
- Delete: `frontend/src/components/FloatingStyleBar.tsx`
- Modify: `frontend/src/styles/global.css` (remove lines 548-641 and line 1084 reference)

- [ ] **Step 1: Delete FloatingStyleBar.tsx**

```bash
rm frontend/src/components/FloatingStyleBar.tsx
```

- [ ] **Step 2: Remove old CSS classes from global.css**

Remove all `.floating-style-bar` and `.style-bar-*` CSS rules (lines 548-641). Also remove the `.floating-style-bar` reference in the export-hide-ui media rule near line 1084.

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx tsc --noEmit && npx vite build`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/FloatingStyleBar.tsx frontend/src/styles/global.css
git commit -m "refactor: remove old FloatingStyleBar component and CSS"
```

---

## Chunk 5: Update frontend API + Server Tests + Final Verification

### Task 22: Update frontend API for type changes

**Files:**
- Modify: `frontend/src/api.ts`

- [ ] **Step 1: Verify updateNode already passes arbitrary fields**

Check that `api.updateNode` passes `type` through to the server. The current implementation at line 25-30 uses `data: any`, so it should already work. If it destructures specific fields, add `type`.

- [ ] **Step 2: Verify bulkUpdateNodes passes style/data**

Check that `api.bulkUpdateNodes` passes style and data fields. The current implementation sends the full updates array. Should work as-is since the server PATCH route accepts style/data.

- [ ] **Step 3: Commit if changes were needed**

```bash
git add frontend/src/api.ts
git commit -m "feat: ensure API client passes type, style, data for node updates"
```

### Task 23: Run full test suite

- [ ] **Step 1: Run server tests**

Run: `cd server && npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run frontend build**

Run: `cd frontend && npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run dev servers and manual smoke test**

Run: `npm run dev`

Manual verification checklist:
1. Select a node → toolbar appears above it
2. Select multiple nodes → toolbar appears above selection
3. Change shape via ShapeSelector → node type changes, dimensions reset
4. Change font family → text renders in new font
5. Change font size with +/- → size steps correctly
6. Toggle bold → text weight changes
7. Change horizontal alignment → text aligns accordingly
8. Change vertical alignment → text aligns accordingly
9. Add a link → link badge appears, clicking opens URL
10. Change fill/border/text colors → colors apply
11. Add emoji → emoji badge appears on node
12. Clear formatting → all visual styles reset, link/emoji/lock preserved
13. Lock a node → can't move, resize, edit, or change styles; lock icon visible
14. Unlock → full functionality restored
15. Pan/zoom → toolbar follows selected nodes correctly

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```

### Task 24: Final cleanup commit

- [ ] **Step 1: Run linter/formatter if configured**

- [ ] **Step 2: Ensure all files are committed**

```bash
git status
```

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore: final cleanup for node formatting toolbar"
```
