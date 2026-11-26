import { scores, sideOf } from '../domain/model.ts';
import type { Choice, Dot, Question, Score, Side } from '../domain/model.ts';

export interface Point { x: number; y: number }
interface PlacedDot extends Point { person: Dot; r: number }

export const viewBox = { width: 400, height: 242 };
export const comparisonHeight = 264;
export const circleCentre: Point = { x: viewBox.width / 2, y: comparisonHeight / 2 };
const origin = { x: 200, y: 190 };
const outer = 188;
const inner = 73;
const readerClearance = 21;
export const unplacedMarker: Point = { x: origin.x, y: 219 };
const sectorAngle = Math.PI / scores.length;

export function circleLayout(dots: readonly Dot[], offArcIds: readonly string[] = []) {
  const marker = { x: circleCentre.x + 105, y: circleCentre.y };
  const gap = 0.3;
  const sweep = 2 * Math.PI - 2 * gap;
  const total = dots.length + offArcIds.length;
  const outerCount = Math.round(total * 0.55);
  const sizes = [outerCount, total - outerCount];
  let nextDot = 0;
  let nextOffArc = 0;
  const positions = new Map<string, Point & { r: number }>();
  for (const [index, radius] of [113, 91].entries()) {
    const count = sizes[index];
    if (!count) continue;
    const r = Math.min(5, radius * Math.sin(sweep / (2 * Math.max(count, 2))) * 0.77);
    for (let slot = 0; slot < count; slot++) {
      const angle = gap + sweep * (slot + 0.5) / count;
      const position = slot + (index === 0 ? 0 : outerCount);
      const offArc = Math.floor((position + 1) * offArcIds.length / total) > nextOffArc;
      const id = offArc ? offArcIds[nextOffArc++] : dots[nextDot++].id;
      positions.set(id, {
        x: circleCentre.x + radius * Math.cos(angle), y: circleCentre.y + radius * Math.sin(angle), r,
      });
    }
  }
  return { dots: positions, marker };
}

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

export function placementBand(side: Side) {
  const [start, end] = scoreAngles(5);
  if (side === 'centre') return arcBand(start, end);
  return side === 'left' ? arcBand(0, start) : arcBand(end, Math.PI);
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
      // Give a lone dot two rings to choose from when the marker occupies the middle.
      const candidates = Math.max(2, group.length);
      while (points.length < group.length) {
        radius *= 0.88;
        points = bandSlots(...scoreAngles(score), radius, candidates)
          .filter(point => clearOfReader(point, marker, radius));
      }
    }
    return spread(points, group.length).map((point, j) => ({ ...point, r: radius, person: group[j] }));
  }) };
}

function hollowSlots(radius: number) {
  const limit = inner - radius - 3;
  const pitch = 2 * radius + Math.min(2.1, radius * 0.45);
  const points: Point[] = [];
  for (let dy = radius + 4; dy <= limit; dy += pitch) {
    const halfWidth = Math.sqrt(limit ** 2 - dy ** 2);
    const columns = Math.floor(2 * halfWidth / pitch) + 1;
    for (let i = 0; i < columns; i++) {
      points.push({ x: origin.x + (i - (columns - 1) / 2) * pitch, y: origin.y - dy });
    }
  }
  return points;
}

export function answerLayout(
  dots: readonly Dot[], question: Pick<Question, 'id' | 'options'>, choice: Choice, markerScore: Score, radiusLimit = 6.7,
) {
  const middlePeople = question.options.neutral === undefined
    ? null : dots.filter(dot => dot.answers[question.id] === 'neutral');
  const side = sideOf(markerScore);
  const reversed = (choice === 'a' && side === 'right') || (choice === 'b' && side === 'left');
  const options = reversed ? ['b', 'a'] as const : ['a', 'b'] as const;
  const groups = options.map((option, i) => ({
    option,
    people: dots.filter(dot => dot.answers[question.id] === option),
    start: i === 0 ? 0 : Math.PI / 2 + 0.025,
    end: i === 0 ? Math.PI / 2 - 0.025 : Math.PI,
  }));

  let marker = { x: origin.x, y: origin.y - inner / 2 };
  const selected = groups.find(group => group.option === choice);
  if (selected) {
    const preferredAngle = (scores.indexOf(markerScore) + 0.5) * sectorAngle;
    marker = polar(Math.max(selected.start + 0.17, Math.min(selected.end - 0.17, preferredAngle)), 132);
  }
  let r = radiusLimit;
  const makeSlots = () => groups.map(({ option, people, start, end }) => bandSlots(start, end, r, people.length)
    .filter(point => option !== choice || clearOfReader(point, marker, r)));
  let slots = makeSlots();
  while (groups.some(({ people }, i) => slots[i].length < people.length)) {
    r *= 0.88;
    slots = makeSlots();
  }
  const placed: PlacedDot[] = groups.flatMap(({ people }, i) =>
    spread(slots[i], people.length).map((point, j) => ({ ...point, r, person: people[j] })));

  if (middlePeople?.length) {
    let middleRadius = radiusLimit;
    const available = () => hollowSlots(middleRadius)
      .filter(point => choice !== 'neutral' || clearOfReader(point, marker, middleRadius));
    let points = available();
    while (points.length < middlePeople.length) {
      middleRadius *= 0.88;
      points = available();
    }
    placed.push(...spread(points, middlePeople.length)
      .map((point, i) => ({ ...point, r: middleRadius, person: middlePeople[i] })));
  }
  const missing = dots.filter(dot => !dot.answers[question.id] || dot.answers[question.id] === 'missing').length;
  return {
    marker,
    dots: placed,
    bands: groups.map(({ option, people, start, end }) => ({ option, count: people.length, path: arcBand(start, end) })),
    middle: middlePeople === null ? null : { option: 'neutral' as const, count: middlePeople.length },
    missing,
    other: dots.length - placed.length - missing,
  };
}
