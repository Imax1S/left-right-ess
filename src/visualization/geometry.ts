import { answers, scores } from '../domain/model.ts';
import type { Answer, Choice, Dot, Score } from '../domain/model.ts';

export interface Point { x: number; y: number }
interface PlacedDot extends Point { person: Dot; r: number }

export const viewBox = { width: 400, height: 220 };
export const comparisonHeight = 256;
const origin = { x: 200, y: 190 };
const outer = 188;
const inner = 73;
const sectorAngle = Math.PI / scores.length;

function polar(angle: number, radius: number): Point {
  return {
    x: origin.x - Math.cos(angle) * radius,
    y: origin.y - Math.sin(angle) * radius,
  };
}

export function arcBand(start: number, end: number) {
  const bottom = polar(start, outer);
  const top = polar(end, outer);
  const insideEnd = polar(end, inner);
  const insideStart = polar(start, inner);
  return `M ${bottom.x} ${bottom.y} A ${outer} ${outer} 0 0 1 ${top.x} ${top.y}
    L ${insideEnd.x} ${insideEnd.y} A ${inner} ${inner} 0 0 0 ${insideStart.x} ${insideStart.y} Z`;
}

export function scoreBand(score: Score) {
  const start = scores.indexOf(score) * sectorAngle;
  return arcBand(start, start + sectorAngle);
}

export function readerOnArc(score: Score) {
  const angle = (scores.indexOf(score) + 0.5) * sectorAngle;
  return { marker: polar(angle, 47), start: origin, end: polar(angle, inner) };
}

export function scoreFromArcPoint({ x, y }: Point): Score | null {
  const dx = origin.x - x;
  const dy = origin.y - y;
  if (Math.hypot(dx, dy) < 12) return null;
  const angle = Math.atan2(Math.max(0, dy), dx);
  return scores[Math.min(scores.length - 1, Math.floor(angle / sectorAngle))];
}

function spread<T>(points: T[], count: number) {
  return Array.from({ length: count }, (_, index) => points[Math.floor((index + 0.5) * points.length / count)]);
}

function bandSlots(start: number, end: number, r: number, count: number) {
  const pitch = 2 * r + Math.min(2.1, r * 0.45);
  const slots: Point[] = [];
  const margin = r + Math.min(2, r * 0.45);
  if (!count) return slots;
  const firstRing = inner + margin;
  const lastRing = outer - margin;
  const rows = Math.min(count, Math.floor((lastRing - firstRing) / pitch) + 1);
  // Spread sparse bands through the depth of the arc as well as across its width.
  for (let row = 0; row < rows; row++) {
    const ring = rows === 1 ? (firstRing + lastRing) / 2 : firstRing + row * (lastRing - firstRing) / (rows - 1);
    const pad = Math.asin(margin / ring);
    const spacing = 2 * Math.asin(pitch / (2 * ring));
    const available = end - start - 2 * pad;
    const perRow = Math.floor(available / spacing) + 1;
    for (let column = 0; column < perRow; column++) {
      const angle = (start + end) / 2 + (column - (perRow - 1) / 2) * spacing;
      slots.push(polar(angle, ring));
    }
  }
  return slots;
}

export function arcLayout(dots: readonly Dot[]) {
  const groups = scores.map(score => dots.filter(dot => dot.score === score));
  let r = 6.7;
  let slots = groups.map((group, i) => bandSlots(i * sectorAngle, (i + 1) * sectorAngle, r, group.length));
  while (slots.some((points, i) => points.length < groups[i].length)) {
    r *= 0.88;
    slots = groups.map((group, i) => bandSlots(i * sectorAngle, (i + 1) * sectorAngle, r, group.length));
  }
  return { radius: r, dots: groups.flatMap((group, i) => spread(slots[i], group.length).map((point, j) => ({
    ...point, r, person: group[j],
  }))) };
}

const middleGap = 0.035;
const answerAngles: Record<Choice, [number, number]> = {
  a: [0, Math.PI / 2 - middleGap],
  b: [Math.PI / 2 + middleGap, Math.PI],
};

export function answerBand(choice: Choice) {
  return arcBand(...answerAngles[choice]);
}

function otherSlots(radius: number) {
  const points: Point[] = [];
  const pitch = radius * 2 + Math.min(2, radius * 0.45);
  for (let y = 147 + radius; y <= 188 - radius; y += pitch) {
    for (let x = 150 + radius; x <= 250 - radius; x += pitch) points.push({ x, y });
  }
  return points;
}

export function answerLayout(dots: readonly Dot[], questionId: string, choice: Choice, radiusLimit = 6.7) {
  const groups = Object.fromEntries(answers.map(answer => [
    answer, dots.filter(dot => dot.answers[questionId] === answer),
  ])) as Record<Answer, Dot[]>;
  const marker = polar(choice === 'a' ? Math.PI / 4 : 3 * Math.PI / 4, 131);
  let r = radiusLimit;
  const slotsInBand = (option: Choice) => bandSlots(...answerAngles[option], r, groups[option].length)
    .filter(point => option !== choice || Math.hypot(point.x - marker.x, point.y - marker.y) >= 22 + r);
  const makeSlots = () => ({
    a: slotsInBand('a'),
    b: slotsInBand('b'),
    other: otherSlots(Math.min(r, 3.2)),
  });
  let slots = makeSlots();
  while (answers.some(answer => slots[answer].length < groups[answer].length)) {
    r *= 0.88;
    slots = makeSlots();
  }
  const positioned: PlacedDot[] = answers.flatMap(answer => spread(slots[answer], groups[answer].length)
    .map((point, i) => ({ ...point, r: answer === 'other' ? Math.min(r, 3.2) : r, person: groups[answer][i] })));
  return {
    marker,
    dots: positioned,
    counts: { a: groups.a.length, b: groups.b.length, other: groups.other.length },
  };
}
