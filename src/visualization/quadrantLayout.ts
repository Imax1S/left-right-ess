import { quadrantFor } from '../domain/actTwo.ts';
import { quadrantKeys } from '../domain/model.ts';
import type { Answer, Dot, QuadrantKey } from '../domain/model.ts';
import type { Point } from './geometry.ts';

interface Box extends Point { width: number; height: number }
type Zone = QuadrantKey | 'neutralAllow' | 'neutralLimit' | 'missing';

export const quadrantCells = Object.fromEntries(quadrantKeys.map((key, index) => [key, {
  x: index % 2 === 0 ? 10 : 204,
  y: index < 2 ? 26 : 147,
  width: 186,
  height: 87,
}])) as Record<QuadrantKey, Box>;

const zones: Record<Zone, Box> = {
  ...quadrantCells,
  neutralAllow: { x: 10, y: 114, width: 186, height: 32 },
  neutralLimit: { x: 204, y: 114, width: 186, height: 32 },
  missing: { x: 10, y: 235, width: 380, height: 28 },
};

function zone(inequality?: Answer, migration?: Answer): Zone {
  if (inequality === 'neutral' && migration === 'a') return 'neutralAllow';
  if (inequality === 'neutral' && migration === 'b') return 'neutralLimit';
  return quadrantFor(inequality, migration) ?? 'missing';
}

export function quadrantLayout(dots: readonly Dot[], inequality?: Answer, migration?: Answer) {
  const buckets: Record<Zone, Dot[]> = {
    reduceAllow: [], reduceLimit: [], opposeAllow: [], opposeLimit: [],
    neutralAllow: [], neutralLimit: [], missing: [],
  };
  const readerZone = zone(inequality, migration);
  for (const dot of dots) buckets[zone(dot.answers.inequality, dot.answers.migration)].push(dot);

  const dotsById = new Map<string, Point & { r: number; missing: boolean }>();
  let marker: Point | null = null;
  for (const name of Object.keys(zones) as Zone[]) {
    const box = zones[name];
    const group = buckets[name];
    const showReader = name === readerZone && name !== 'missing';
    const top = box.y + (name in quadrantCells ? 26 : 2);
    if (showReader) marker = { x: box.x + box.width - 22, y: top + (box.y + box.height - top) / 2 };
    if (!group.length) continue;

    const width = box.width - (showReader ? 53 : 16);
    const height = box.y + box.height - top - 2;
    const columns = Math.min(group.length, Math.ceil(Math.sqrt(group.length * width / height)));
    const rows = Math.ceil(group.length / columns);
    const pitch = Math.min(13, width / columns, height / rows);
    const r = Math.min(5.5, pitch * 0.415);
    const centreX = box.x + 8 + width / 2;
    const centreY = top + height / 2;
    group.forEach((dot, index) => {
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, group.length - row * columns);
      dotsById.set(dot.id, {
        x: centreX + (index % columns - (rowCount - 1) / 2) * pitch,
        y: centreY + (row - (rows - 1) / 2) * pitch,
        r,
        missing: name === 'missing',
      });
    });
  }
  return { dots: dotsById, marker };
}
