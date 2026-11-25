import { answers, scores } from '../domain/model.ts';
import type { Answer, Choice, Dot, Score } from '../domain/model.ts';

export interface Point { x: number; y: number }
interface PlacedDot extends Point { person: Dot; r: number }
interface Circle extends Point { r: number }

export const viewBox = { width: 400, height: 220 };
export const resultHeight = 278;
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

function spread<T>(points: T[], count: number) {
  return Array.from({ length: count }, (_, index) => points[Math.floor((index + 0.5) * points.length / count)]);
}

function sectorSlots(sector: number, r: number, count: number) {
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
    const available = sectorAngle - 2 * pad;
    const perRow = Math.floor(available / spacing) + 1;
    for (let column = 0; column < perRow; column++) {
      const angle = (sector + 0.5) * sectorAngle + (column - (perRow - 1) / 2) * spacing;
      slots.push(polar(angle, ring));
    }
  }
  return slots;
}

export function arcLayout(dots: readonly Dot[]) {
  const groups = scores.map(score => dots.filter(dot => dot.score === score));
  let r = 6.7;
  let slots = groups.map((group, i) => sectorSlots(i, r, group.length));
  while (slots.some((points, i) => points.length < groups[i].length)) {
    r *= 0.88;
    slots = groups.map((group, i) => sectorSlots(i, r, group.length));
  }
  return { dots: groups.flatMap((group, i) => spread(slots[i], group.length).map((point, j) => ({
    ...point, r, person: group[j],
  }))) };
}

function circleSlots(circle: Circle, radius: number, reserve: boolean) {
  const pitch = radius * 2 + Math.min(1.8, radius * 0.45);
  const limit = circle.r - radius - 4;
  const slots: Point[] = [];
  const rows = Math.ceil(limit / (pitch * Math.sqrt(3) / 2));
  const columns = Math.ceil(limit / pitch);
  for (let row = -rows; row <= rows; row++) {
    const dy = row * pitch * Math.sqrt(3) / 2;
    for (let column = -columns; column <= columns; column++) {
      const dx = (column + (Math.abs(row) % 2) * 0.5) * pitch;
      const distance = Math.hypot(dx, dy);
      if (distance <= limit && (!reserve || distance >= 23 + radius)) {
        slots.push({ x: circle.x + dx, y: circle.y + dy });
      }
    }
  }
  return slots;
}

function otherSlots(radius: number) {
  const points: Point[] = [];
  const pitch = radius * 2 + Math.min(2, radius * 0.45);
  for (let y = 253 + radius; y <= resultHeight - radius; y += pitch) {
    for (let x = 18 + radius; x <= 382 - radius; x += pitch) points.push({ x, y });
  }
  return points;
}

function answerRadius(count: number, maxCount: number) {
  return 49 + 33 * Math.sqrt(count / Math.max(1, maxCount));
}

export function answerLayout(dots: readonly Dot[], questionId: string, choice: Choice) {
  const groups = Object.fromEntries(answers.map(answer => [
    answer, dots.filter(dot => dot.answers[questionId] === answer),
  ])) as Record<Answer, Dot[]>;
  const max = Math.max(groups.a.length, groups.b.length);
  const circles = {
    a: { x: 100, y: 88, r: answerRadius(groups.a.length, max) },
    b: { x: 300, y: 88, r: answerRadius(groups.b.length, max) },
  };
  let r = 6.3;
  const makeSlots = () => ({
    a: circleSlots(circles.a, r, choice === 'a'),
    b: circleSlots(circles.b, r, choice === 'b'),
    other: otherSlots(Math.min(r, 4)),
  });
  let slots = makeSlots();
  while (answers.some(answer => slots[answer].length < groups[answer].length)) {
    r *= 0.88;
    slots = makeSlots();
  }
  const positioned: PlacedDot[] = answers.flatMap(answer => spread(slots[answer], groups[answer].length)
    .map((point, i) => ({ ...point, r: answer === 'other' ? Math.min(r, 4) : r, person: groups[answer][i] })));
  return {
    circles,
    dots: positioned,
    counts: { a: groups.a.length, b: groups.b.length, other: groups.other.length },
  };
}
