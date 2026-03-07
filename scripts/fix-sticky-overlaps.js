#!/usr/bin/env node
/**
 * Fix sticky note overlaps in the Git/GitHub Best Practices board.
 *
 * Problem: Left-column stickies (narration + ELI5, width=420) extend into
 * diagram nodes, and some right-column stickies have incorrect rightEdge values.
 *
 * Approach: For each sticky, check if it overlaps any non-sticky node.
 * If so, shift the sticky so it no longer overlaps.
 */

const fs = require('fs');
const path = require('path');

const EXAMPLES_PATH = path.join(__dirname, '..', 'boards', 'examples', 'git-github-best-practices.json');
const RUNTIME_PATH = path.join(__dirname, '..', 'server', 'boards', 'boards', '155848bb-0f82-47ee-acc4-5fc37ffc3591.json');

const board = JSON.parse(fs.readFileSync(EXAMPLES_PATH, 'utf8'));
const nodes = board.nodes;

const stickies = nodes.filter(n => n.type === 'sticky');
const nonStickies = nodes.filter(n => n.type !== 'sticky');

const GAP = 25; // minimum gap between sticky edge and diagram node

function overlaps(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

function getOverlappingNodes(sticky) {
  return nonStickies.filter(n => {
    if (!n.width || !n.height) return false;
    // Skip text nodes that are section headers (they're above diagrams)
    if (n.type === 'text' && /^Section \d/.test(n.label)) return false;
    return overlaps(sticky, n);
  });
}

let fixes = 0;

for (const sticky of stickies) {
  const conflicts = getOverlappingNodes(sticky);
  if (conflicts.length === 0) continue;

  // Determine sticky's center relative to conflicts to decide shift direction
  const stickyCenterX = sticky.x + sticky.width / 2;
  const conflictCenterX = conflicts.reduce((sum, n) => sum + n.x + n.width / 2, 0) / conflicts.length;

  if (stickyCenterX < conflictCenterX) {
    // Sticky is to the LEFT of conflicts — shift sticky left so its right edge clears
    const leftmostConflictX = Math.min(...conflicts.map(n => n.x));
    const newX = leftmostConflictX - sticky.width - GAP;
    if (newX !== sticky.x) {
      console.log(`[LEFT SHIFT] "${sticky.label.substring(0, 45)}..." x: ${sticky.x} → ${newX}`);
      sticky.x = newX;
      fixes++;
    }
  } else {
    // Sticky is to the RIGHT of conflicts — shift sticky right so its left edge clears
    const rightmostConflictEdge = Math.max(...conflicts.map(n => n.x + n.width));
    const newX = rightmostConflictEdge + GAP;
    if (newX !== sticky.x) {
      console.log(`[RIGHT SHIFT] "${sticky.label.substring(0, 45)}..." x: ${sticky.x} → ${newX}`);
      sticky.x = newX;
      fixes++;
    }
  }
}

// Second pass: check for sticky-on-sticky overlaps within the same approximate region
// (stickies in the same column that might stack incorrectly after shifting)
let stickyFixes = 0;
for (let i = 0; i < stickies.length; i++) {
  for (let j = i + 1; j < stickies.length; j++) {
    const a = stickies[i], b = stickies[j];
    if (!overlaps(a, b)) continue;
    // Only fix if they're roughly in the same column (within 50px x)
    if (Math.abs(a.x - b.x) > 50) continue;
    // Push the lower one down
    const upper = a.y <= b.y ? a : b;
    const lower = a.y <= b.y ? b : a;
    const neededY = upper.y + upper.height + 15;
    if (lower.y < neededY) {
      console.log(`[STACK FIX] "${lower.label.substring(0, 45)}..." y: ${lower.y} → ${neededY}`);
      lower.y = neededY;
      stickyFixes++;
    }
  }
}

console.log(`\nFixed ${fixes} diagram overlaps and ${stickyFixes} sticky-on-sticky overlaps.`);

// Check remaining overlaps
let remaining = 0;
for (const sticky of stickies) {
  const conflicts = getOverlappingNodes(sticky);
  if (conflicts.length > 0) {
    remaining++;
    if (remaining <= 5) {
      console.log(`REMAINING: "${sticky.label.substring(0, 45)}..." overlaps ${conflicts.length} nodes`);
    }
  }
}
console.log(`Remaining diagram overlaps: ${remaining}`);

// Write output
const output = JSON.stringify(board, null, 2);
fs.writeFileSync(EXAMPLES_PATH, output);
console.log(`\nWrote ${EXAMPLES_PATH}`);

if (fs.existsSync(path.dirname(RUNTIME_PATH))) {
  fs.writeFileSync(RUNTIME_PATH, output);
  console.log(`Wrote ${RUNTIME_PATH}`);
}
