import { choices, scores, sideOf } from '../domain/model.ts';
import type { Choice, Dot, Score, Side } from '../domain/model.ts';

export interface Point { x: number; y: number }
interface PlacedDot extends Point { person: Dot; r: number }

export const viewBox = { width: 400, height: 242 };
export const comparisonHeight = 256;
const origin = { x: 200, y: 190 };
const outer = 188;
const inner = 73;
const readerClearance = 21;
export const unplacedMarker: Point = { x: origin.x, y: 219 };
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

function scoreAngles(score: Score): [number, number] {
  const start = scores.indexOf(score) * sectorAngle;
  return [start, start + sectorAngle];
}

export function scoreBand(score: Score) {
  return arcBand(...scoreAngles(score));
}

export function scoreSectorOutline(score: Score): Point[] {
  const [from, to] = scoreAngles(score);
  const start = Math.max(0, from - 0.008);
  const end = Math.min(Math.PI, to + 0.008);
  const angles = Array.from({ length: 9 }, (_, i) => start + (end - start) * i / 8);
  // Extend through the outline stroke. The HTML hit area keeps touch scrolling
  // disabled only for the selected sector and the handle.
  return [
    ...angles.map(angle => polar(angle, outer + 1.2)),
    ...angles.reverse().map(angle => polar(angle, inner - 1.2)),
  ];
}

export function readerOnArc(score: Score) {
  const angle = (scores.indexOf(score) + 0.5) * sectorAngle;
  return { marker: polar(angle, 132), start: origin, end: polar(angle, inner) };
}

export function scoreFromArcPoint({ x, y }: Point, entering = false): Score | null {
  const dx = origin.x - x;
  const dy = origin.y - y;
  const radius = Math.hypot(dx, dy);
  if (radius < 12 || (entering && (dy < 0 || radius < inner || radius > outer))) return null;
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

function clearOfReader(point: Point, marker: Point, radius: number) {
  return Math.hypot(point.x - marker.x, point.y - marker.y) >= readerClearance + radius;
}

export function arcLayout(dots: readonly Dot[], selected: Score | null = null) {
  const groups = scores.map(score => dots.filter(dot => dot.score === score));
  let r = 6.7;
  const makeSlots = () => groups.map((group, i) => bandSlots(...scoreAngles(scores[i]), r, group.length));
  let slots = makeSlots();
  while (slots.some((points, i) => points.length < groups[i].length)) {
    r *= 0.88;
    slots = makeSlots();
  }

  return { radius: r, dots: groups.flatMap((group, i) => {
    const score = scores[i];
    let radius = r;
    let points = slots[i];
    if (selected === score) {
      const { marker } = readerOnArc(score);
      points = points.filter(point => clearOfReader(point, marker, radius));
      while (points.length < group.length) {
        radius *= 0.88;
        points = bandSlots(...scoreAngles(score), radius, group.length)
          .filter(point => clearOfReader(point, marker, radius));
      }
    }
    return spread(points, group.length).map((point, j) => ({ ...point, r: radius, person: group[j] }));
  }) };
}

const middleGap = 0.035;
const answerAngles: Record<Side, [number, number]> = {
  left: [0, Math.PI / 2 - middleGap],
  right: [Math.PI / 2 + middleGap, Math.PI],
};

export function answerBand(side: Side) {
  return arcBand(...answerAngles[side]);
}

export function answerLayout(
  dots: readonly Dot[], questionId: string, choice: Choice, markerScore: Score, radiusLimit = 6.7,
) {
  const groups = {
    a: dots.filter(dot => dot.answers[questionId] === 'a'),
    b: dots.filter(dot => dot.answers[questionId] === 'b'),
  };
  const marker = readerOnArc(markerScore).marker;
  const chosenSide = sideOf(markerScore);
  const otherSide = chosenSide === 'left' ? 'right' : 'left';
  const sides: Record<Choice, Side> = choice === 'a'
    ? { a: chosenSide, b: otherSide }
    : { a: otherSide, b: chosenSide };
  let r = radiusLimit;
  const slotsInBand = (option: Choice) => bandSlots(...answerAngles[sides[option]], r, groups[option].length)
    .filter(point => option !== choice || clearOfReader(point, marker, r));
  const makeSlots = () => ({
    a: slotsInBand('a'),
    b: slotsInBand('b'),
  });
  let slots = makeSlots();
  while (choices.some(answer => slots[answer].length < groups[answer].length)) {
    r *= 0.88;
    slots = makeSlots();
  }
  const positioned: PlacedDot[] = choices.flatMap(answer => spread(slots[answer], groups[answer].length)
    .map((point, i) => ({ ...point, r, person: groups[answer][i] })));
  return {
    marker,
    sides,
    dots: positioned,
    counts: { a: groups.a.length, b: groups.b.length },
  };
}
