import { useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { scores, sideOf, sides } from '../domain/model.ts';
import type { Choice, Dot, Score, Side, StoryQuestion } from '../domain/model.ts';
import type { AnswerAlignment } from '../story/answerAlignment.ts';
import {
  answerLayout, arcBand, arcLayout, circleCentre, circleLayout, circleRadii, circleViewBox, closingArc, offArcLayout, placementBand,
  readerOnArc, scoreBand, scoreDivider, scoreFromArcPoint, scoreSectorOutline, unplacedMarker, viewBox,
} from './geometry.ts';
import type { Point } from './geometry.ts';

interface Props {
  dots: Dot[];
  score: Score | null;
  highlightedIds: ReadonlySet<string> | null;
  result: { question: StoryQuestion; choice: Choice; alignment: AnswerAlignment } | null;
  offArc?: { count: number; answerShare?: number | null };
  understandingShare?: string | null;
  onPlace?: (score: Score) => void;
}

type MotionStyle = CSSProperties & { '--delay'?: string };

const fullArc = arcBand(0, Math.PI);
const circleStageStyle = {
  '--arc-ratio': `${viewBox.width} / ${viewBox.height}`,
  '--circle-ratio': `${circleViewBox.width} / ${circleViewBox.height}`,
} as CSSProperties;

const closingThickness = circleRadii.outer - circleRadii.inner;
const closingPaths = (['left', 'right'] as const).map(closingArc);

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

export function ArcChart({ dots, score, highlightedIds, result, offArc,
  understandingShare, onPlace }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const previousScore = useRef(score);
  const dragPlacement = useRef(false);
  const canPlace = onPlace !== undefined;
  const arc = useMemo(() => arcLayout(dots, score), [dots, score]);
  const question = result?.question;
  const choice = result?.choice;
  const destination = result?.alignment.score;
  const inCircle = understandingShare !== undefined;
  const bounds = inCircle ? circleViewBox : viewBox;
  const groups = useMemo(
    () => !inCircle && question && choice && destination !== undefined
      ? answerLayout(dots, question, choice, destination, arc.radius)
      : null,
    [dots, inCircle, question, choice, destination, arc.radius],
  );
  const offArcCount = offArc?.count ?? 0;
  const onArcDots = useMemo(() => dots.slice(0, dots.length - offArcCount), [dots, offArcCount]);
  const offArcIds = useMemo(
    () => Array.from({ length: offArcCount }, (_, index) => 'off-arc-' + index), [offArcCount],
  );
  const answerShare = offArc?.answerShare;
  const offArcPoints = useMemo(() => offArcLayout(offArcCount), [offArcCount]);
  const offArcHighlighted = answerShare == null ? offArcCount : Math.round(offArcCount * answerShare / 100);
  const circle = useMemo(() => inCircle ? circleLayout(onArcDots, offArcIds) : null, [onArcDots, inCircle, offArcIds]);
  const pointers = score === null ? null : readerOnArc(score);
  const showPlacementHint = score === null && canPlace;
  const selected = circle?.marker ?? groups?.marker ?? pointers?.marker ?? unplacedMarker;
  const markerTransform = moveTo(selected);
  const bands = groups?.bands;
  const selectedBand = bands?.find(band => band.option === choice);
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
      ? (offArcCount ? 'The respondents on the chart, yellow dots for those without a mark, and your marker form a circle.'
        : 'The same respondents and your marker form a circle.')
        + (understandingShare ? ' Across the countries in this story, ' + understandingShare
          + ' of people who answered the question said the description was somewhat to very much like them.' : '')
      : bands && question && choice
      ? 'Shown respondents by answer. ' + bands.map(({ option, count }) => count + ' ' + question.options[option]).join(', ')
        + '. Your answer: ' + question.options[choice] + (omitted ? '. ' + omitted : '')
      : 'Political self-placement of ' + dots.length + ' survey respondents. ' + (score === null
        ? 'Choose a sector for your mark.' : 'Your mark is ' + score + ' out of 10.')
        + (offArcCount ? ' ' + offArcCount + ' yellow dots in the open space represent the weighted share without a mark.' : '')}>
      <div className="chart-surface" style={inCircle ? circleStageStyle : undefined}>
        <svg ref={svgRef} className="arc-svg" viewBox={`0 0 ${bounds.width} ${bounds.height}`} aria-hidden="true">
          <g className={groups || circle ? 'chart-layer placement-canvas is-hidden' : 'chart-layer placement-canvas'}>
            {sides.map(side => <path key={side} className={`placement-band ${side}${showPlacementHint ? ' is-unplaced' : ''}`} d={placementBand(side)} fill={'var(--' + side + '-pale)'} />)}
            {showPlacementHint && <>
              {scores.slice(1).map(mark => <path key={mark} className="score-guide" d={scoreDivider(mark)} />)}
              <path className="placement-outline" d={fullArc} />
            </>}
            {score !== null && !offArc && <path className="score-band" d={scoreBand(score)} />}
            {pointerLine && !offArc && <path className="score-pointer" d={pointerLine} />}
            <text className="arc-end" x="68" y="211">0</text>
            {!offArc && !showPlacementHint && <text className="arc-end" x="200" y="211">5</text>}
            <text className="arc-end" x="332" y="211">10</text>
          </g>
          <g className={bands ? 'chart-layer answer-canvas' : 'chart-layer answer-canvas is-hidden'}>
            {bands?.map(({ option, path }) => option !== choice && option !== 'neutral' &&
              <path key={option} d={path} className="answer-band" />)}
            {selectedBand && <path d={selectedBand.path} className="answer-band selected" />}
          </g>
          {circle && <g className="arc-closure">
            <g className="closure-upper"><path d={fullArc} /></g>
            <g className="closure-lower" fill="none">
              {closingPaths.map(path => <path key={path} d={path} pathLength="1" strokeWidth={closingThickness} />)}
            </g>
          </g>}
          {circle && <g className="circle-canvas">
            <circle cx={circleCentre.x} cy={circleCentre.y} r={circleRadii.outer} className="circle-outline" />
            <circle cx={circleCentre.x} cy={circleCentre.y} r={circleRadii.inner} className="circle-core" />
            {understandingShare && <text x={circleCentre.x} y={circleCentre.y} className="circle-number">
              {understandingShare}
            </text>}
          </g>}
          {dots.map((person, index) => {
            const circlePoint = circle?.dots.get(person.id);
            const answerPoint = answerPositions?.get(person.id);
            const arcPoint = arcPositions.get(person.id)!;
            const point = circlePoint ?? answerPoint ?? arcPoint;
            const side = sideOf(person.score);
            const sameScore = person.score === score;
            const highlighted = highlightedIds?.has(person.id);
            const opacity = index >= onArcDots.length ? 0
              : circlePoint ? (person.answers.understanding === 'a' ? 0.94 : 0.35)
              : offArc ? 0.38
              : groups ? (answerPoint ? 1 : 0) : highlightedIds
              ? highlighted ? 1 : 0.27
              : score === null ? 0.66 : sameScore ? 1 : 0.5;
            const style: MotionStyle = {
              transform: moveTo(point),
              opacity,
              '--delay': circle ? (index % 8) * 9 + 'ms' : undefined,
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
              transform: moveTo(point), opacity: index < offArcHighlighted ? 0.95 : 0.28,
              '--delay': circle ? index % 8 * 9 + 'ms' : '0ms',
            };
            return <g key={id} className="respondent off-arc-dot" style={style}><circle r={point.r} /></g>;
          })}
          <g ref={markerRef} className="reader-marker" style={{ transform: markerTransform }}>
            <ReaderGlyph score={score} />
          </g>
          {onPlace && <path className="arc-tap-area" d={fullArc}
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
        {bands && question && <div className="cluster-caption">
          {bands.map(({ option, count }) => (
            <div key={option} className={choice === option ? 'selected' : undefined} data-answer={option}>
              <span>{question.options[option]}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>}
      </div>
      {!canPlace && !circle && !offArc && score !== null && <figcaption className="arc-caption">
        <span className="arc-legend">People in your starting sector</span>
        {omitted && <span className="arc-omitted">{omitted}</span>}
      </figcaption>}
    </figure>
  );
}
