import { useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { sideOf } from '../domain/model.ts';
import type { Choice, Dot, Score, StoryQuestion } from '../domain/model.ts';
import {
  answerBand, answerLayout, arcBand, arcLayout, comparisonHeight,
  readerOnArc, scoreBand, scoreFromArcPoint, viewBox,
} from './geometry.ts';

interface Props {
  dots: Dot[];
  score: Score;
  country: string | null;
  comparison: boolean;
  result: { question: StoryQuestion; choice: Choice } | null;
  onPlace?: (score: Score) => void;
}

type MotionStyle = CSSProperties & { '--delay': string };

export function ArcChart({ dots, score, country, comparison, result, onPlace }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const arc = useMemo(() => arcLayout(dots), [dots]);
  const questionId = result?.question.id;
  const choice = result?.choice;
  const groups = useMemo(
    () => questionId && choice ? answerLayout(dots, questionId, choice, arc.radius) : null,
    [dots, questionId, choice, arc.radius],
  );
  const pointers = readerOnArc(score);
  const selected = groups?.marker ?? pointers.marker;
  const leftLabel = result?.question.options[0] ?? '';
  const rightLabel = result?.question.options[1] ?? '';
  const positions = new Map((groups ?? arc).dots.map(dot => [dot.person.id, dot]));
  const figureClass = `arc-figure${groups ? ' is-result' : ''}${onPlace ? ' is-interactive' : ''}`;
  const pointerLine = `M ${pointers.start.x} ${pointers.start.y} L ${pointers.end.x} ${pointers.end.y}`;

  function placeAt(clientX: number, clientY: number) {
    const screen = svgRef.current?.getScreenCTM();
    if (!screen) return;
    const point = new DOMPoint(clientX, clientY).matrixTransform(screen.inverse());
    const mark = scoreFromArcPoint(point);
    if (mark !== null && mark !== score) onPlace?.(mark);
  }

  return (
    <figure className={figureClass} aria-label={groups
      ? `Shown respondents: ${groups.counts.a} ${leftLabel}, ${groups.counts.b} ${rightLabel}, ${groups.counts.other} other responses. Your answer: ${choice === 'a' ? leftLabel : rightLabel}.`
      : `Political self-placement of ${dots.length} survey respondents. Your mark is ${score} out of 10.`}>
      <div className="chart-surface">
        <svg ref={svgRef} className="arc-svg" viewBox={`0 0 ${viewBox.width} ${comparison ? comparisonHeight : viewBox.height}`} aria-hidden="true">
          <g className={groups ? 'chart-layer is-hidden' : 'chart-layer'}>
            <path d={arcBand(0, Math.PI / 2)} fill="var(--left-pale)" />
            <path d={arcBand(Math.PI / 2, Math.PI)} fill="var(--right-pale)" />
            <path className="score-band" d={scoreBand(score)} />
            <path className="score-pointer" d={pointerLine} />
            <text className="arc-end" x="68" y="211">0</text>
            <text className="arc-end" x="332" y="211">10</text>
          </g>
          <g className={groups ? 'chart-layer' : 'chart-layer is-hidden'}>
            {(['a', 'b'] as const).map(option => (
              <path key={option} d={answerBand(option)}
                className={choice === option ? 'answer-band selected' : 'answer-band'} />
            ))}
            {!!groups?.counts.other && <text className="other-caption" x="200" y="139">
              Other · {groups.counts.other}
            </text>}
          </g>
          {dots.map((person, index) => {
            const point = positions.get(person.id)!;
            const side = sideOf(person.score);
            const opacity = groups ? 1 : country
              ? person.country === country ? 1 : 0.27
              : person.score === score ? 1 : 0.5;
            const style: MotionStyle = {
              transform: `translate(${point.x}px, ${point.y}px)`,
              opacity,
              '--delay': groups ? `${(index % 15) * 20}ms` : '0ms',
            };
            const diameter = Math.SQRT2 * point.r;
            return <g key={person.id} className={`respondent ${side}`} style={style}
              data-highlighted={country && person.country === country ? 'true' : undefined}>
              {side === 'left'
                ? <circle r={point.r} />
                : <rect x={-diameter / 2} y={-diameter / 2} width={diameter} height={diameter} rx="1.6" transform="rotate(45)" />}
            </g>;
          })}
          <g className="reader-marker" style={{ transform: `translate(${selected.x}px, ${selected.y}px)` }}>
            {!groups && sideOf(score) === 'right'
              ? <rect x="-12" y="-12" width="24" height="24" rx="4" transform="rotate(45)" />
              : <circle r="17" />}
            <text y="1">You</text>
          </g>
          {onPlace && <path className="arc-tap-area" d={arcBand(0, Math.PI)}
            onClick={event => placeAt(event.clientX, event.clientY)} />}
        </svg>
        {onPlace && <div className="arc-drag-handle" aria-hidden="true"
          style={{
            left: `${pointers.start.x / viewBox.width * 100}%`,
            top: `${pointers.start.y / viewBox.height * 100}%`,
            width: `${Math.hypot(pointers.end.x - pointers.start.x, pointers.end.y - pointers.start.y) / viewBox.width * 100}%`,
            rotate: `${Math.atan2(pointers.end.y - pointers.start.y, pointers.end.x - pointers.start.x)}rad`,
          }}
          onPointerDown={event => {
            if (event.isPrimary && event.button === 0) {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
            }
          }}
          onPointerMove={event => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              placeAt(event.clientX, event.clientY);
            }
          }} />}
        {groups && <div className="cluster-caption">
          {(['a', 'b'] as const).map((option, index) => (
            <div key={option} className={choice === option ? 'selected' : undefined}>
              <span>{index === 0 ? leftLabel : rightLabel}</span>
              <strong>{groups.counts[option]}</strong>
            </div>
          ))}
        </div>}
      </div>
    </figure>
  );
}
