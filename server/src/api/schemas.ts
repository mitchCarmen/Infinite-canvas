import { z } from 'zod';
import { NODE_TYPES, VALID_SOURCE_HANDLES, VALID_TARGET_HANDLES } from '../../../shared/types.js';
import type { ReorderAction } from '../../../shared/types.js';

// Request-body schemas shared by the REST routes and the MCP tool definitions.
// Lives in server/ (not shared/) because the frontend compiles shared/ and has no zod.

const REORDER_ACTIONS = [
  'bring_to_front', 'send_to_back', 'bring_forward', 'send_backward',
] as const satisfies readonly ReorderAction[];

// z.number() already rejects NaN and +/-Infinity.
const size = z.number().positive();
const style = z.record(z.string(), z.string());

export const createBoard = z.object({ name: z.string().min(1), description: z.string().optional() });

export const boardMetadata = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
});

export const duplicateBoard = z.object({ newName: z.string().min(1).optional() });

export const createNode = z.object({
  type: z.enum(NODE_TYPES),
  label: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: size.optional(),
  height: size.optional(),
  style: style.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const updateNode = createNode.partial();

export const bulkUpdateNodes = z.object({ updates: z.array(updateNode.extend({ id: z.string() })) });

export const reorderNode = z.object({ action: z.enum(REORDER_ACTIONS) });

export const createEdge = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  sourceHandle: z.enum(VALID_SOURCE_HANDLES).optional(),
  targetHandle: z.enum(VALID_TARGET_HANDLES).optional(),
  style: style.optional(),
});

export const updateEdge = createEdge.pick({ label: true, style: true });

export const createGroup = z.object({ label: z.string().min(1), nodeIds: z.array(z.string()) });

export const importMermaid = z.object({ mermaidSyntax: z.string().min(1) });

export const autoLayout = z.object({ direction: z.enum(['TB', 'LR', 'BT', 'RL']).optional() });

export const uploadImage = z.object({ imageData: z.string().min(1), filename: z.string().min(1) });

/** `validate(schema)(req.body)`: parsed body (unknown keys stripped) or an `Invalid request: ...` error (→ 400). */
export const validate = <T extends z.ZodType>(schema: T) => (body: unknown): z.infer<T> => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    throw new Error(`Invalid request: ${issues}`);
  }
  return result.data;
};
