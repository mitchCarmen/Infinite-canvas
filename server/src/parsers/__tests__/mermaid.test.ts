import { describe, it, expect } from 'vitest';
import { parseMermaid } from '../mermaid.js';

describe('parseMermaid', () => {
  describe('flowcharts', () => {
    it('parses simple flowchart', () => {
      const result = parseMermaid(`graph TD
        A[Start] --> B[Process]
        B --> C[End]`);
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      expect(result.warnings).toHaveLength(0);
    });

    it('maps shapes to node types', () => {
      const result = parseMermaid(`graph TD
        A[Rectangle]
        B(Rounded)
        C{Diamond}
        D((Circle))
        E[(Cylinder)]
        F{{Hexagon}}`);
      expect(result.nodes.find(n => n.label === 'Rectangle')?.type).toBe('rectangle');
      expect(result.nodes.find(n => n.label === 'Diamond')?.type).toBe('diamond');
      expect(result.nodes.find(n => n.label === 'Circle')?.type).toBe('circle');
      expect(result.nodes.find(n => n.label === 'Cylinder')?.type).toBe('cylinder');
      expect(result.nodes.find(n => n.label === 'Hexagon')?.type).toBe('hexagon');
    });

    it('parses edge labels', () => {
      const result = parseMermaid(`graph TD
        A --> |yes| B
        A --> |no| C`);
      expect(result.edges.find(e => e.label === 'yes')).toBeDefined();
      expect(result.edges.find(e => e.label === 'no')).toBeDefined();
    });

    it('returns warnings for unparseable lines', () => {
      const result = parseMermaid(`graph TD
        A --> B
        ??? invalid line ???`);
      expect(result.nodes).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('sequence diagrams', () => {
    it('parses participants as nodes', () => {
      const result = parseMermaid(`sequenceDiagram
        participant A as Alice
        participant B as Bob
        A->>B: Hello
        B-->>A: Hi back`);
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes.find(n => n.label === 'Alice')).toBeDefined();
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].label).toBe('Hello');
    });
  });

  describe('ERDs', () => {
    it('parses entities and relationships', () => {
      const result = parseMermaid(`erDiagram
        CUSTOMER ||--o{ ORDER : places
        ORDER ||--|{ LINE-ITEM : contains`);
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].label).toContain('places');
    });
  });

  describe('offset', () => {
    it('applies offset to all node positions', () => {
      const result = parseMermaid(`graph TD\n  A --> B`, 100, 200);
      for (const node of result.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(100);
        expect(node.y).toBeGreaterThanOrEqual(200);
      }
    });
  });
});
