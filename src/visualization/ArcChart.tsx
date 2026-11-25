import { useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { scores, sideOf, sides } from '../domain/model.ts';
import type { Choice, Dot, Score, StoryQuestion } from '../domain/model.ts';
import type { AnswerAlignment } from '../story/answerAlignment.ts';
import {
  answerBand, answerLayout, arcBand, arcLayout, comparisonHeight,
  readerOnArc, scoreBand, scoreFromArcPoint, scoreSectorOutline, unplacedMarker, viewBox,
} from './geometry.ts';

interface Props {
  dots: Dot[];
  score: Score | null;
  highlightedIds: ReadonlySet<string> | null;
  comparison: boolean;
  result: { question: StoryQuestion; choice: Choice; alignment: AnswerAlignment } | null;
  onPlace?: (score: Score) => void;
}

type MotionStyle = CSSProperties & { '--delay': string };

export function ArcChart({ dots, score, highlightedIds, comparison, result, onPlace }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const previousScore = useRef(score);
  const dragPlacement = useRef(false);
  const canPlace = onPlace !== undefined;
  const arc = useMemo(() => arcLayout(dots, score), [dots, score]);
  const questionId = result?.question.id;
  const choice = result?.choice;
  const destination = result?.alignment.score;
  const groups = useMemo(
    () => questionId && choice && destination !== undefined
      ? answerLayout(dots, questionId, choice, destination, arc.radius)
      : null,
    [dots, questionId, choice, destination, arc.radius],
  );
  const pointers = score === null ? null : readerOnArc(score);
  const showPlacementHint = score === null && canPlace;
  const selected = groups?.marker ?? pointers?.marker ?? unplacedMarker;
  const markerTransform = `translate(${selected.x}px, ${selected.y}px)`;
  const leftLabel = result?.question.options[0] ?? '';
  const rightLabel = result?.question.options[1] ?? '';
  const arcPositions = new Map(arc.dots.map(dot => [dot.person.id, dot]));
  const answerPositions = groups && new Map(groups.dots.map(dot => [dot.person.id, dot]));
  const figureClass = `arc-figure${groups ? ' is-result' : ''}${onPlace ? ' is-interactive' : ''}`;
  const pointerLine = pointers && `M ${pointers.start.x} ${pointers.start.y} L ${pointers.end.x} ${pointers.end.y}`;
  const dragTargetStyle = pointers ? {
    left: `${pointers.start.x / viewBox.width * 100}%`,
    top: `${pointers.start.y / viewBox.height * 100}%`,
    width: `${Math.hypot(pointers.end.x - pointers.start.x, pointers.end.y - pointers.start.y) / viewBox.width * 100}%`,
    rotate: `${Math.atan2(pointers.end.y - pointers.start.y, pointers.end.x - pointers.start.x)}rad`,
  } : {
    left: `${unplacedMarker.x / viewBox.width * 100}%`,
    top: `${unplacedMarker.y / viewBox.height * 100}%`,
  };

  useLayoutEffect(() => {
    const entering = previousScore.current === null && score !== null;
    const fromDrag = dragPlacement.current;
    previousScore.current = score;
    dragPlacement.current = false;

    if (!canPlace || !entering || fromDrag || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const animation = markerRef.current?.animate([
      { transform: `translate(${unplacedMarker.x}px, ${unplacedMarker.y}px)` },
      { transform: markerTransform },
    ], { duration: 240, easing: 'cubic-bezier(0.33, 0, 0.22, 1)' });
    return () => animation?.cancel();
  }, [canPlace, markerTransform, score]);

  function placeAt(clientX: number, clientY: number, fromDrag = false) {
    const screen = svgRef.current?.getScreenCTM();
    if (!screen) return;
    const point = new DOMPoint(clientX, clientY).matrixTransform(screen.inverse());
    const mark = scoreFromArcPoint(point, score === null);
    if (mark !== null && mark !== score && onPlace) {
      dragPlacement.current = fromDrag;
      onPlace(mark);
    }
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.isPrimary && event.button === 0) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      markerRef.current?.getAnimations().forEach(animation => animation.cancel());
    }
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      placeAt(event.clientX, event.clientY, true);
    }
  }

  const sectorOutline = onPlace && score !== null && scoreSectorOutline(score)
    .map(({ x, y }) => `${x / viewBox.width * 100}% ${y / viewBox.height * 100}%`)
    .join(', ');

  return (
    <figure className={figureClass} aria-label={groups
      ? `Shown respondents: ${groups.counts.a} ${leftLabel}, ${groups.counts.b} ${rightLabel}. Your answer: ${choice === 'a' ? leftLabel : rightLabel}.`
      : `Political self-placement of ${dots.length} survey respondents. ${score === null
        ? 'Choose a sector for your mark.' : `Your mark is ${score} out of 10.`}`}>
      <div className="chart-surface">
        <svg ref={svgRef} className="arc-svg" viewBox={`0 0 ${viewBox.width} ${comparison ? comparisonHeight : viewBox.height}`} aria-hidden="true">
          <g className={groups ? 'chart-layer is-hidden' : 'chart-layer'}>
            <path d={arcBand(0, Math.PI / 2)} fill="var(--left-pale)" />
            <path d={arcBand(Math.PI / 2, Math.PI)} fill="var(--right-pale)" />
            {showPlacementHint && scores.map(mark => <path key={mark} className="score-guide" d={scoreBand(mark)} />)}
            {score !== null && <path className="score-band" d={scoreBand(score)} />}
            {pointerLine && <path className="score-pointer" d={pointerLine} />}
            <text className="arc-end" x="68" y="211">0</text>
            <text className="arc-end" x="332" y="211">10</text>
          </g>
          <g className={groups ? 'chart-layer' : 'chart-layer is-hidden'}>
            {sides.map(side => (
              <path key={side} d={answerBand(side)}
                className={groups && choice && groups.sides[choice] === side ? 'answer-band selected' : 'answer-band'} />
            ))}
          </g>
          {dots.map((person, index) => {
            const answerPoint = answerPositions?.get(person.id);
            const point = answerPoint ?? arcPositions.get(person.id)!;
            const side = sideOf(person.score);
            const highlighted = highlightedIds?.has(person.id);
            const opacity = groups ? (answerPoint ? 1 : 0) : highlightedIds
              ? highlighted ? 1 : 0.27
              : score === null ? 0.66 : person.score === score ? 1 : 0.5;
            const style: MotionStyle = {
              transform: `translate(${point.x}px, ${point.y}px)`,
              opacity,
              '--delay': groups ? `${(index % 15) * 20}ms` : '0ms',
            };
            const diameter = Math.SQRT2 * point.r;
            return <g key={person.id} className={`respondent ${side}`} style={style}
              data-highlighted={highlighted ? 'true' : undefined}>
              {side === 'left'
                ? <circle r={point.r} />
                : <rect x={-diameter / 2} y={-diameter / 2} width={diameter} height={diameter} rx="1.6" transform="rotate(45)" />}
            </g>;
          })}
          <g ref={markerRef} className="reader-marker" style={{ transform: markerTransform }}>
            {score === null || sideOf(score) === 'right'
              ? <rect x="-12" y="-12" width="24" height="24" rx="4" transform="rotate(45)" />
              : <circle r="17" />}
            <text y="1">You</text>
          </g>
          {onPlace && <path className="arc-tap-area" d={arcBand(0, Math.PI)}
            onClick={event => placeAt(event.clientX, event.clientY)} />}
        </svg>
        {showPlacementHint && <p className="arc-start-hint" aria-hidden="true">Pick a sector</p>}
        {onPlace && <>
          {sectorOutline && <div className="arc-drag-target arc-drag-sector" aria-hidden="true"
            style={{ clipPath: `polygon(${sectorOutline})` }}
            onPointerDown={startDrag} onPointerMove={moveDrag} />}
          <div className={`arc-drag-target ${pointers ? 'arc-drag-handle' : 'arc-drag-start'}`} aria-hidden="true"
            style={dragTargetStyle} onPointerDown={startDrag} onPointerMove={moveDrag} />
        </>}
        {groups && <div className="cluster-caption">
          {(groups.sides.a === 'left' ? ['a', 'b'] as const : ['b', 'a'] as const).map(option => (
            <div key={option} className={choice === option ? 'selected' : undefined}>
              <span>{option === 'a' ? leftLabel : rightLabel}</span>
              <strong>{groups.counts[option]}</strong>
            </div>
          ))}
        </div>}
      </div>
    </figure>
  );
}
