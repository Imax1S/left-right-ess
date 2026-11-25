import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { sideOf } from '../domain/model.ts';
import type { Choice, Dot, Score, StoryQuestion } from '../domain/model.ts';
import { answerLayout, arcBand, arcLayout, readerOnArc, resultHeight, scoreBand, viewBox } from './geometry.ts';

interface Props {
  dots: Dot[];
  score: Score;
  country: string | null;
  result: { question: StoryQuestion; choice: Choice } | null;
}

type MotionStyle = CSSProperties & { '--delay': string };

export function ArcChart({ dots, score, country, result }: Props) {
  const arc = useMemo(() => arcLayout(dots), [dots]);
  const questionId = result?.question.id;
  const choice = result?.choice;
  const groups = useMemo(
    () => questionId && choice ? answerLayout(dots, questionId, choice) : null,
    [dots, questionId, choice],
  );
  const pointers = readerOnArc(score);
  const selected = choice && groups ? groups.circles[choice] : pointers.marker;
  const leftLabel = result?.question.options[0] ?? '';
  const rightLabel = result?.question.options[1] ?? '';
  const layout = groups ?? arc;
  const positions = new Map(layout.dots.map(dot => [dot.person.id, dot]));
  const groupClass = groups ? ' is-result' : '';

  return (
    <figure className={'arc-figure' + groupClass} aria-label={groups
      ? `Shown respondents: ${groups.counts.a} ${leftLabel}, ${groups.counts.b} ${rightLabel}, ${groups.counts.other} other responses. Your answer: ${choice === 'a' ? leftLabel : rightLabel}.`
      : `Political self-placement of ${dots.length} survey respondents. Your mark is ${score} out of 10.`}>
      <div className="chart-surface">
        <svg className="arc-svg" viewBox={`0 0 ${viewBox.width} ${groups ? resultHeight : viewBox.height}`} aria-hidden="true">
          <g className={groups ? 'chart-layer is-hidden' : 'chart-layer'}>
            <path d={arcBand(0, Math.PI / 2)} fill="var(--left-pale)" />
            <path d={arcBand(Math.PI / 2, Math.PI)} fill="var(--right-pale)" />
            <path className="score-band" d={scoreBand(score)} />
            <path className="score-pointer" d={`M ${pointers.start.x} ${pointers.start.y} L ${pointers.end.x} ${pointers.end.y}`} />
            <text className="arc-end" x="68" y="211">0</text>
            <text className="arc-end" x="332" y="211">10</text>
          </g>
          <g className={groups ? 'chart-layer' : 'chart-layer is-hidden'}>
            {groups && (['a', 'b'] as const).map(option => {
              const circle = groups.circles[option];
              return <circle key={option} cx={circle.x} cy={circle.y} r={circle.r}
                className={choice === option ? 'answer-disc selected' : 'answer-disc'} />;
            })}
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
          <g className={`reader-marker ${groups ? '' : sideOf(score)}`}
            style={{ transform: `translate(${selected.x}px, ${selected.y}px)` }}>
            {!groups && sideOf(score) === 'right'
              ? <rect x="-12" y="-12" width="24" height="24" rx="4" transform="rotate(45)" />
              : <circle r="17" />}
            <text y="1">You</text>
          </g>
        </svg>
        {groups && <div className="cluster-caption">
          {[leftLabel, rightLabel].map((label, index) => {
            const option = index === 0 ? 'a' : 'b';
            return <div key={option}>
              <span>{label}</span>
              <strong>{groups.counts[option]}</strong>
              <small>{choice === option ? 'You are here' : '\u00a0'}</small>
            </div>;
          })}
        </div>}
      </div>
      {!!groups?.counts.other && <p className="other-caption">
        {groups.counts.other} shown with other responses
      </p>}
    </figure>
  );
}
