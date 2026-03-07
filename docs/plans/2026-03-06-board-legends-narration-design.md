# Enhanced Legends & Narration for Git Best Practices Board

**Date:** 2026-03-06
**Board:** `boards/examples/git-github-best-practices.json`

## Goal

Add per-diagram legends and expanded narration so users can understand every diagram independently without referencing a central legend.

## Per Diagram Additions (x20)

### Left Column (Understanding)
1. **Expanded Narration** (existing yellow sticky) — more detail, key concepts, command mentions
2. **ELI5 Sticky** (light blue `#e3f2fd`/`#1976d2`) — simple analogy-driven explanation

### Right Column (Reference)
3. **Full Legend** (grey `#f5f5f5`/`#9e9e9e`) — shapes, colors, edge styles specific to that diagram
4. **Common Mistakes** (red `#ffebee`/`#c62828`) — what beginners get wrong
5. **Pro Tips** (green `#e8f5e9`/`#2e7d32`) — power-user shortcuts
6. **Commands Reference** (indigo `#e8eaf6`/`#283593`) — key git commands with syntax
7. **When To Use** (amber `#fff8e1`/`#ff8f00`) — decision guidance

## Layout

```
LEFT (narration+ELI5) | CENTER (diagram) | RIGHT (legend+mistakes+tips+commands+when)
```

- Right column placed to the right of each diagram
- Diagrams shifted right as needed to prevent overlap
- Canvas width grows from ~7200px to ~9000-10000px

## Sticky Note Specs

| Type | Width | BG | Border | Text |
|------|-------|----|--------|------|
| Narration | 420 | `#fff3cd` | `#ffc107` | `#333` |
| ELI5 | 420 | `#e3f2fd` | `#1976d2` | `#333` |
| Legend | 380 | `#f5f5f5` | `#9e9e9e` | `#333` |
| Mistakes | 380 | `#ffebee` | `#c62828` | `#333` |
| Pro Tips | 380 | `#e8f5e9` | `#2e7d32` | `#333` |
| Commands | 380 | `#e8eaf6` | `#283593` | `#333` |
| When To Use | 380 | `#fff8e1` | `#ff8f00` | `#333` |

## Implementation

Node.js script reads board JSON, adds nodes per diagram, adjusts spacing, writes back.
