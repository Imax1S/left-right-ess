import { useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { scores, sideOf, sides } from '../domain/model.ts';
import type { Choice, Dot, Score, Side, StoryQuestion } from '../domain/model.ts';
import type { AnswerAlignment } from '../story/answerAlignment.ts';
import {
  answerLayout, arcBand, arcLayout, circleCentre, circleLayout, comparisonHeight, offArcAnswerColumns, offArcLayout, placementBand,
  readerOnArc, scoreBand, scoreFromArcPoint, scoreSectorOutline, unplacedMarker, viewBox,
} from './geometry.ts';
import type { Point } from './geometry.ts';

interface Props {
  dots: Dot[];
  score: Score | null;
  highlightedIds: ReadonlySet<string> | null;
  comparison: boolean;
  result: { question: StoryQuestion; choice: Choice; alignment: AnswerAlignment } | null;
  offArc?: { share: number; answerShare?: number | null; labels?: readonly [string, string] };
  understandingCircle?: { share: string | null };
  onPlace?: (score: Score) => void;
}

type MotionStyle = CSSProperties & { '--delay'?: string };

function moveTo({ x, y }: Point) {
  return `translate(${x}px, ${y}px)`;
}

export function RespondentShape({ side, radius }: { side: Side; radius: number }) {
  if (side === 'left') return <circle r={radius} />;
  const diameter = Math.SQRT2 * radius;
  return <rect x={-diameter / 2} y={-diameter / 2} width={diameter} height={diameter} rx="1.6"
    transform={side === 'right' ? 'rotate(45)' : undefined} />;
}

export function ReaderGlyph({ score }: { score: Score | null }) {
  return <>
    {score === null || sideOf(score) === 'right'
      ? <rect x="-12" y="-12" width="24" height="24" rx="4" transform="rotate(45)" />
      : score === 5 ? <rect x="-15" y="-15" width="30" height="30" rx="5" /> : <circle r="17" />}
    <text y="1">You</text>
  </>;
}

export function ArcChart({ dots, score, highlightedIds, comparison, result, offArc,
  understandingCircle, onPlace }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const previousScore = useRef(score);
  const dragPlacement = useRef(false);
  const canPlace = onPlace !== undefined;
  const arc = useMemo(() => arcLayout(dots, score), [dots, score]);
  const question = result?.question;
  const choice = result?.choice;
  const destination = result?.alignment.score;
  const inCircle = understandingCircle !== undefined;
  const groups = useMemo(
    () => !inCircle && question && choice && destination !== undefined
      ? answerLayout(dots, question, choice, destination, arc.radius)
      : null,
    [dots, inCircle, question, choice, destination, arc.radius],
  );
  const offArcShare = offArc?.share ?? 0;
  const offArcCount = offArcShare < 100 ? Math.round(dots.length * offArcShare / (100 - offArcShare)) : 0;
  const offArcIds = useMemo(
    () => Array.from({ length: offArcCount }, (_, index) => 'off-arc-' + index), [offArcCount],
  );
  const answerShare = offArc?.answerShare;
  const offArcPoints = offArcLayout(offArcCount, answerShare);
  const offArcHighlighted = answerShare == null ? offArcCount : Math.round(offArcCount * answerShare / 100);
  const circle = useMemo(() => inCircle ? circleLayout(dots, offArcIds) : null, [dots, inCircle, offArcIds]);
  const understandingShare = understandingCircle?.share;
  const pointers = score === null ? null : readerOnArc(score);
  const showPlacementHint = score === null && canPlace;
  const selected = circle?.marker ?? groups?.marker ?? pointers?.marker ?? unplacedMarker;
  const markerTransform = moveTo(selected);
  const captions = groups && (groups.middle
    ? [groups.bands[0], groups.middle, groups.bands[1]]
    : groups.bands);
  const omitted = groups && [
    groups.missing > 0 ? groups.missing + ' no recorded answer' : '',
    groups.other > 0 ? groups.other + ' outside the answer groups' : '',
  ].filter(Boolean).join(' · ');
  const arcPositions = new Map(arc.dots.map(dot => [dot.person.id, dot]));
  const answerPositions = groups && new Map(groups.dots.map(dot => [dot.person.id, dot]));
  const figureClass = `arc-figure${groups ? ' is-result' : ''}${onPlace ? ' is-interactive' : ''}${circle ? ' is-understanding' : offArc ? ' is-off-arc' : ''}`;
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
    <figure className={figureClass} aria-label={circle
      ? (offArcCount ? 'The respondents from the arc, yellow dots for those without a mark, and your marker form a circle.'
        : 'The same respondents and your marker form a circle.')
        + (understandingShare ? ' Among those without a mark, ' + understandingShare + ' chose “More like me”.' : '')
      : captions && question && choice
      ? 'Shown respondents by answer. ' + captions.map(({ option, count }) => count + ' ' + question.options[option]).join(', ')
        + '. Your answer: ' + question.options[choice] + (omitted ? '. ' + omitted : '')
      : 'Political self-placement of ' + dots.length + ' survey respondents. ' + (score === null
        ? 'Choose a sector for your mark.' : 'Your mark is ' + score + ' out of 10.')
        + (offArcCount ? ' Yellow dots inside the arc represent the weighted share without a mark.' : '')}>
      <div className="chart-surface">
        <svg ref={svgRef} className="arc-svg" viewBox={`0 0 ${viewBox.width} ${comparison ? comparisonHeight : viewBox.height}`} aria-hidden="true">
          <g className={groups || circle ? 'chart-layer is-hidden' : 'chart-layer'}>
            {sides.map(side => <path key={side} className={`placement-band ${side}`} d={placementBand(side)} fill={'var(--' + side + '-pale)'} />)}
            {showPlacementHint && scores.map(mark => <path key={mark} className="score-guide" d={scoreBand(mark)} />)}
            {score !== null && !offArc && <path className="score-band" d={scoreBand(score)} />}
            {pointerLine && !offArc && <path className="score-pointer" d={pointerLine} />}
            <text className="arc-end" x="68" y="211">0</text>
            {!offArc && <text className="arc-end" x="200" y="211">5</text>}
            <text className="arc-end" x="332" y="211">10</text>
          </g>
          <g className={groups ? 'chart-layer' : 'chart-layer is-hidden'}>
            {groups?.bands.map(({ option, path }) =>
              <path key={option} d={path} className={option === choice ? 'answer-band selected' : 'answer-band'} />)}
          </g>
          <g className={circle ? 'chart-layer circle-canvas' : 'chart-layer circle-canvas is-hidden'}>
            <circle cx={circleCentre.x} cy={circleCentre.y} r="124" className="circle-outline" />
            <circle cx={circleCentre.x} cy={circleCentre.y} r="82" className="circle-core" />
            {understandingShare && <text x={circleCentre.x} y={circleCentre.y - 7} className="circle-number">
              {understandingShare}
              <tspan x={circleCentre.x} dy="20" className="circle-label">of people without a mark</tspan>
              <tspan x={circleCentre.x} dy="14" className="circle-label">chose “More like me”</tspan>
            </text>}
          </g>
          {dots.map((person, index) => {
            const circlePoint = circle?.dots.get(person.id);
            const answerPoint = answerPositions?.get(person.id);
            const arcPoint = arcPositions.get(person.id)!;
            const point = circlePoint ?? answerPoint ?? arcPoint;
            const side = sideOf(person.score);
            const sameScore = person.score === score;
            const highlighted = highlightedIds?.has(person.id);
            const opacity = circlePoint ? (person.answers.understanding === 'a' ? 0.94 : 0.35)
              : offArc ? 0.38
              : groups ? (answerPoint ? 1 : 0) : highlightedIds
              ? highlighted ? 1 : 0.27
              : score === null ? 0.66 : sameScore ? 1 : 0.5;
            const style: MotionStyle = {
              transform: moveTo(point),
              opacity,
              '--delay': groups || circle ? (index % 15) * 20 + 'ms' : '0ms',
            };
            return <g key={person.id} className={`respondent ${side}`} style={style}
              data-highlighted={highlighted ? 'true' : undefined}
              data-same-score={sameScore && !offArc && !circle ? 'true' : undefined}>
              <RespondentShape side={side} radius={point.r} />
            </g>;
          })}
          {offArcIds.map((id, index) => {
            const point = circle?.dots.get(id) ?? offArcPoints[index];
            const style: MotionStyle = {
              transform: moveTo(point), opacity: index < offArcHighlighted ? 0.95 : 0.5,
              '--delay': circle ? index % 10 * 20 + 'ms' : '0ms',
            };
            return <g key={id} className="respondent off-arc-dot" style={style}><circle r={point.r} /></g>;
          })}
          {!circle && answerShare != null && offArc?.labels?.map((label, index) =>
            <text key={index} x={offArcAnswerColumns[index]} y="190" className="off-arc-plot-label">
              {label}
            </text>)}
          <g ref={markerRef} className="reader-marker" style={{ transform: markerTransform }}>
            <ReaderGlyph score={score} />
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
        {captions && question && <div className="cluster-caption">
          {captions.map(({ option, count }) => (
            <div key={option} className={choice === option ? 'selected' : undefined} data-answer={option}>
              <span>{question.options[option]}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>}
      </div>
      {!canPlace && !circle && !offArc && score !== null && <figcaption className="arc-caption">
        <span className="arc-legend">People at your starting mark ({score})</span>
        {omitted && <span className="arc-omitted">{omitted}</span>}
      </figcaption>}
    </figure>
  );
}
