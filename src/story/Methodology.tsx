import { sideOf, sides } from '../domain/model.ts';
import type { Dot, StoryData, StoryQuestion } from '../domain/model.ts';
import { arcBand, arcLayout, viewBox } from '../visualization/geometry.ts';
import { Arrow, integer, sharePercent } from './controls.tsx';
import { Wordmark } from './Story.tsx';
import './methodology.css';

function SampleArc({ dots }: { dots: Dot[] }) {
  const { dots: positions } = arcLayout(dots);
  const leftCount = dots.filter(dot => sideOf(dot.score) === 'left').length;
  return <figure className="method-arc">
    <svg viewBox={'0 0 ' + viewBox.width + ' 192'} aria-hidden="true">
      <path d={arcBand(0, Math.PI / 2)} fill="var(--left-pale)" />
      <path d={arcBand(Math.PI / 2, Math.PI)} fill="var(--right-pale)" />
      {positions.map(({ person, x, y, r }) => {
        if (sideOf(person.score) === 'left') {
          return <circle key={person.id} className="method-arc-dot left" cx={x} cy={y} r={r} />;
        }
        const offset = r / Math.SQRT2;
        return <rect key={person.id} className="method-arc-dot right"
          x={x - offset} y={y - offset} width={2 * offset} height={2 * offset} rx="1.6"
          transform={'rotate(45 ' + x + ' ' + y + ')'} />;
      })}
    </svg>
    <figcaption>
      <span className="left"><strong>{integer.format(leftCount)}</strong> left</span>
      <span>Dots in the story</span>
      <span className="right"><strong>{integer.format(dots.length - leftCount)}</strong> right</span>
    </figcaption>
  </figure>;
}

function QuestionMethod({ question }: { question: StoryQuestion }) {
  const left = question.stats.left.a.percent;
  const right = question.stats.right.a.percent;
  const gap = left === null || right === null ? null : Math.abs(left - right);

  return <details className="method-question">
    <summary>
      <span className="method-question-top">
        <span className="method-question-topic">{question.topic}</span>
        {gap !== null && <span className="method-gap">{sharePercent.format(gap)} pp gap</span>}
      </span>
      <span className="method-answer">Chose “{question.options[0]}”</span>
      <span className="method-shares">
        {sides.map(side => {
          const percent = question.stats[side].a.percent;
          return <span className={'method-share ' + side} key={side}>
            <span><strong>{percent === null ? '—' : sharePercent.format(percent) + '%'}</strong> {side}</span>
            <span className="method-share-track" aria-hidden="true">
              <span style={{ width: (percent ?? 0) + '%' }} />
            </span>
          </span>;
        })}
      </span>
    </summary>
    <div className="method-question-detail">
      <p><strong>{question.prompt}</strong></p>
      <p>{question.grouping}</p>
      {typeof question.correlation === 'number' && <p>Weighted correlation {question.correlation.toFixed(2)}</p>}
    </div>
  </details>;
}

export function Methodology({ data }: { data: StoryData }) {
  const agreement = data.questions.find(({ options }) => options[0] === 'Agree' && options[1] === 'Disagree');

  return <main className="story-page method-page">
    <header className="story-header">
      <Wordmark />
      <a className="back-button" href="#"><Arrow back /> Back to the story</a>
    </header>

    <section className="method-hero" aria-labelledby="method-heading">
      <div>
        <p className="method-source">European Social Survey · {data.source.years}</p>
        <h1 className="story-heading" tabIndex={-1} id="method-heading">Data &amp; <mark>methodology</mark></h1>
        <p className="method-lead">Follow the survey from interview records to the dots on the arc and the numbers behind each answer.</p>
      </div>
      <SampleArc dots={data.dots} />
    </section>

    <ol className="method-flow" aria-label="From the survey to the arc">
      <li><strong>{integer.format(data.source.records)}</strong><span>Survey records</span><small>{data.source.countries} countries in the extract</small></li>
      <li><strong>{integer.format(data.eligibleCount)}</strong><span>Eligible respondents</span><small>{data.countries.length} countries in the comparison</small></li>
      <li><strong>{integer.format(data.dots.length)}</strong><span>Dots on the arc</span><small>One respondent per dot</small></li>
    </ol>

    <section className="method-split" aria-label="From respondents to dots">
      <article className="method-card">
        <h2>Who makes it onto the arc?</h2>
        <p>The ESS asks people to place themselves on a scale from 0 (left) to 10 (right). We use positions 0–4 and 6–10. The midpoint, 5, sits outside the comparison.</p>
        <ol className="method-scale" aria-label="Left–right scale with the midpoint excluded">
          {Array.from({ length: 11 }, (_, score) =>
            <li key={score} className={score === 5 ? 'is-excluded' : score < 5 ? 'left' : 'right'}>{score}</li>)}
        </ol>
        <p>Respondents also need a recorded age from 15 to 110 and a positive survey weight.</p>
        <details className="method-disclosure">
          <summary>See all {data.countries.length} countries</summary>
          <ul className="method-country-list">{data.countries.map(country => <li key={country.code}>{country.name}</li>)}</ul>
        </details>
      </article>
      <article className="method-card">
        <h2>One dot, one respondent</h2>
        <p>Each selected country gets at least one dot. We allocate the remaining dots as close as possible to each country’s share of the survey weight. Within each country, we use those weights to select a sample that stays the same across visits.</p>
        <p className="method-orange-note">Orange dots share your starting position and keep their colour when they move into answer groups.</p>
        <details className="method-disclosure">
          <summary>How the filters are grouped</summary>
          <dl className="method-profile">
            <div><dt>Age</dt><dd>15–29, 30–44, 45–59 and 60+</dd></div>
            <div><dt>Gender</dt><dd>Categories recorded by ESS</dd></div>
            <div><dt>Education</dt><dd>ES-ISCED levels 1–2, 3–5 and 6–7</dd></div>
            <div><dt>Religiosity</dt><dd>Self-rating of 0–3, 4–6 or 7–10</dd></div>
            <div><dt>Country</dt><dd>Country of interview</dd></div>
          </dl>
          <p>Only recorded values match a filter. The two counts show matches at your starting position and across the dots shown.</p>
        </details>
      </article>
    </section>

    <section aria-labelledby="method-answers">
      <div className="method-split method-transform">
        <div>
          <h2 id="method-answers">From survey answers to two buttons</h2>
          <p>We combine related answers into the two choices shown. We exclude neutral, missing and other responses outside those groups for each question.</p>
          <p>The dots regroup by answer. Your marker crosses the arc if your answer is more common on the other political side at the displayed precision. Each question starts at your original position.</p>
        </div>
        {agreement && <figure className="method-card method-recode">
          <figcaption>{agreement.prompt}</figcaption>
          <dl>
            <div><dt>Strongly agree + agree</dt><dd>Agree</dd></div>
            <div><dt>Neither agree nor disagree</dt><dd>Excluded</dd></div>
            <div><dt>Disagree + strongly disagree</dt><dd>Disagree</dd></div>
          </dl>
        </figure>}
      </div>
      <div className="method-weight">
        <h3>Where the percentages come from</h3>
        <p>For each political side, we divide the weight of the selected answer by the total weight of both answer groups. This uses all eligible respondents with either answer. The count beside each percentage is unweighted.</p>
        <p>We combine the ESS post-stratification and population weights (<code>pspwght × pweight</code>) for the pooled comparison.</p>
      </div>
    </section>

    <section aria-labelledby="method-questions">
      <h2 id="method-questions">Question groupings and correlations</h2>
      <p>The gap is the difference between the two weighted shares, in percentage points. In the finale, a shared majority means more than half of each side chose the same answer.</p>
      <div className="method-question-grid">
        {data.questions.map(question => <QuestionMethod key={question.id} question={question} />)}
      </div>
      <details className="method-disclosure method-correlation">
        <summary>How to read the correlation</summary>
        <p>We calculate a weighted Pearson correlation between political side and answer group (phi). Positive values mean the first answer was more common on the right, and negative values mean it was more common on the left. These are pooled descriptive estimates for the questions and countries in this story.</p>
      </details>
    </section>

    <footer className="method-footer">
      <p>{data.source.title}. ESS ERIC and CST are not responsible for this adaptation or interpretation.</p>
      <div>
        <a href={data.source.doi}>European Social Survey dataset</a>
        <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">{data.source.license}</a>
        <a href="https://github.com/Imax1S/left-right-ess">Source code</a>
      </div>
    </footer>
  </main>;
}
