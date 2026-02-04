import type { Phase, Context } from './types';

export const USER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
];

export function findIndexByName(items: { name: string }[], searchName: string): number {
  let idx = items.findIndex(item => item.name === searchName);
  if (idx !== -1) return idx;
  idx = items.findIndex(item => item.name.includes(searchName) || searchName.includes(item.name));
  return idx !== -1 ? idx : 0;
}

export const MIN_PHASE_WIDTH = 250;
export const MIN_CONTEXT_HEIGHT = 200;
const CHAR_WIDTH = 10;
const LINE_HEIGHT = 30;
const PHASE_PADDING = 100;
const CONTEXT_PADDING = 80;
export const LABEL_OFFSET_X = 180;
export const LABEL_OFFSET_Y = 100;
export const CIRCULAR_RADIUS = 70;

export function calculatePhaseWidth(phase: Phase): number {
  return Math.max(MIN_PHASE_WIDTH, phase.name.length * CHAR_WIDTH + 60);
}

export function calculateContextHeight(context: Context): number {
  const nameLines = Math.ceil(context.name.length / 12);
  const descLines = context.description ? Math.ceil(context.description.length / 18) : 0;
  return Math.max(MIN_CONTEXT_HEIGHT, (nameLines + descLines) * LINE_HEIGHT + 80);
}

export function calculateCircularPosition(
  centerX: number, centerY: number, index: number, total: number, radius: number
): { x: number; y: number } {
  if (total === 1) return { x: centerX, y: centerY };
  const angle = -Math.PI / 2 + (2 * Math.PI / total) * index;
  return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
}

export function calculateLayout(phases: Phase[], contexts: Context[]) {
  const phaseWidths = phases.map(calculatePhaseWidth);
  const contextHeights = contexts.map(calculateContextHeight);
  
  const phasePositions: number[] = [];
  let currentX = LABEL_OFFSET_X;
  phaseWidths.forEach((width) => { phasePositions.push(currentX); currentX += width + PHASE_PADDING; });
  
  const contextPositions: number[] = [];
  let currentY = LABEL_OFFSET_Y;
  contextHeights.forEach((height) => { contextPositions.push(currentY); currentY += height + CONTEXT_PADDING; });
  
  return { phasePositions, phaseWidths, contextPositions, contextHeights };
}
