import RectangleNode from './RectangleNode';
import CircleNode from './CircleNode';
import EllipseNode from './EllipseNode';
import DiamondNode from './DiamondNode';
import HexagonNode from './HexagonNode';
import ParallelogramNode from './ParallelogramNode';
import CylinderNode from './CylinderNode';
import TriangleNode from './TriangleNode';
import StickyNode from './StickyNode';
import TextNode from './TextNode';
import ImageNode from './ImageNode';
import GroupNode from './GroupNode';

export const nodeTypes = {
  rectangle: RectangleNode,
  circle: CircleNode,
  ellipse: EllipseNode,
  diamond: DiamondNode,
  hexagon: HexagonNode,
  parallelogram: ParallelogramNode,
  cylinder: CylinderNode,
  triangle: TriangleNode,
  sticky: StickyNode,
  text: TextNode,
  image: ImageNode,
  group: GroupNode,
};
