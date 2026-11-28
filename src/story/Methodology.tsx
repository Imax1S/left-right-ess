import { scores, sideLabels, sideOf, sides } from '../domain/model.ts';
import type { Dot, StoryData, StoryQuestion } from '../domain/model.ts';
import { arcLayout, placementBand, viewBox } from '../visualization/geometry.ts';
import { RespondentShape } from '../visualization/ArcChart.tsx';
import { Arrow, formatShare, integer, sharePercent } from './controls.tsx';
import { Wordmark } from './Story.tsx';
import './methodology.css';

function SampleArc({ dots }: { dots: Dot[] }) {
  const { dots: positions } = arcLayout(dots);
  return <figure className="method-arc">
    <svg viewBox={'0 0 ' + viewBox.width + ' 192'} aria-hidden="true">
      {sides.map(side => <path key={side} d={placementBand(side)} fill={'var(--' + side + '-pale)'} />)}
      {positions.map(({ person, x, y, r }) => {
        const side = sideOf(person.score);
        return <g key={person.id} className={'method-arc-dot ' + side}
          transform={'translate(' + x + ' ' + y + ')'}>
          <RespondentShape side={side} radius={r} />
        </g>;
      })}
    </svg>
    <figcaption>
      {sides.map(side => <span className={side} key={side}>
        <strong>{integer.format(dots.filter(dot => sideOf(dot.score) === side).length)}</strong> {sideLabels[side]}
      </span>)}
    </figcaption>
  </figure>;
}

function QuestionMethod({ question }: { question: StoryQuestion }) {
  const shares = sides.map(side => question.stats[side].a.percent).filter(share => share !== null);
  const gap = shares.length === sides.length ? Math.max(...shares) - Math.min(...shares) : null;

  return <details className="method-question">
    <summary>
      <span className="method-question-top">
        <span className="method-question-topic">{question.topic}</span>
        {gap !== null && <span className="method-gap">{sharePercent.format(gap)} pp gap</span>}
      </span>
      <span className="method-answer">Chose “{question.options.a}”</span>
      <span className="method-shares">
        {sides.map(side => {
          const percent = question.stats[side].a.percent;
          return <span className={'method-share ' + side} key={side}>
            <span><strong>{formatShare(percent)}</strong> {sideLabels[side]}</span>
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
      {typeof question.association === 'number' && <p>Weighted Cramér’s V {question.association.toFixed(2)}</p>}
    </div>
  </details>;
}

export function Methodology({ data }: { data: StoryData }) {
  const agreement = data.questions.find(({ options }) => options.a === 'Agree' && options.b === 'Disagree' && options.neutral);

  return <main className="story-page method-page">
    <header className="story-header">
      <Wordmark />
      <a className="back-button" href="#"><Arrow back /> Back to the story</a>
    </header>

    <section className="method-hero" aria-labelledby="method-heading">
      <div>
        <p className="method-source">European Social Survey · {data.source.years}</p>
        <h1 className="story-heading" tabIndex={-1} id="method-heading">Data &amp; <mark>methodology</mark></h1>
        <p className="method-lead">Follow the survey from interview records to the dots on the chart and the numbers behind each answer.</p>
      </div>
      <SampleArc dots={data.dots} />
    </section>

    <ol className="method-flow" aria-label="From the survey to the chart">
      <li><strong>{integer.format(data.source.records)}</strong><span>Survey records</span><small>{data.source.countries} countries in the extract</small></li>
      <li><strong>{integer.format(data.eligibleCount)}</strong><span>Eligible respondents</span><small>{data.countries.length} countries in the comparison</small></li>
      <li><strong>{integer.format(data.dots.length)}</strong><span>Dots on the chart</span><small>One respondent per dot</small></li>
    </ol>

    <section className="method-split" aria-label="From respondents to dots">
      <article className="method-card">
        <h2>Who’s shown on the chart?</h2>
        <p>The chart is shaped like a parliamentary seating plan. Each dot represents a survey respondent.</p>
        <p>The ESS asks people to place themselves on a scale from 0 (left) to 10 (right). We group 0–4 on the left, 5 in the centre and 6–10 on the right.</p>
        <ol className="method-scale" aria-label="Left–right scale with an included midpoint">
          {scores.map(score => <li key={score} className={sideOf(score)}>{score}</li>)}
        </ol>
        <p>Respondents also need a recorded age from 15 to 110 and a positive survey weight.</p>
        <details className="method-disclosure">
          <summary>See all {data.countries.length} countries</summary>
          <ul className="method-country-list">{data.countries.map(country => <li key={country.code}>{country.name}</li>)}</ul>
        </details>
      </article>
      <article className="method-card">
        <h2>One dot, one respondent</h2>
        <p>Each selected country gets at least one dot. For the visual sample, we use people who gave one of the displayed answers on every story question. We allocate the remaining dots as close as possible to each country’s share of the eligible survey weight and keep the sample stable across visits.</p>
        <p className="method-orange-note">Orange dots share your starting position and keep their colour when they move into answer groups.</p>
        <details className="method-disclosure">
          <summary>How the filters are grouped</summary>
          <dl className="method-profile">
            <div><dt>Age</dt><dd>15–29, 30–44, 45–59 and 60+</dd></div>
            <div><dt>Gender</dt><dd>Categories recorded by ESS</dd></div>
            <div><dt>Education</dt><dd>Highest completed level. School / vocational groups all levels below a bachelor’s degree or equivalent (ES-ISCED codes 1–5). Bachelor’s groups code 6, and master’s or higher groups code 7. The groups include equivalent qualifications.</dd></div>
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
          <h2 id="method-answers">From survey answers to answer groups</h2>
          <p>We combine related answers and keep middle responses wherever the survey provides one. The weighted comparison uses everyone with a recorded position and a displayed answer to that question.</p>
          <p>The dots regroup by answer. Middle answers collect in the open space below the bands. For either outer answer, the reader marker lands in the selected band, toward the group where that answer is most common. Each question starts at the reader’s original mark.</p>
        </div>
        {agreement && <figure className="method-card method-recode">
          <figcaption>{agreement.prompt}</figcaption>
          <dl>
            <div><dt>Strongly agree + agree</dt><dd>Agree</dd></div>
            <div><dt>Neither agree nor disagree</dt><dd>Neither</dd></div>
            <div><dt>Disagree + strongly disagree</dt><dd>Disagree</dd></div>
          </dl>
        </figure>}
      </div>
      <div className="method-weight">
        <h3>Where the percentages come from</h3>
        <p>For each political group, we divide the weight of the selected answer by the total weight of all displayed answers, including the middle response when available. The response counts are unweighted.</p>
        <p>We combine the ESS post-stratification and population weights (<code>pspwght × pweight</code>) for the pooled comparison.</p>
      </div>
    </section>

    <section aria-labelledby="method-questions">
      <h2 id="method-questions">Question groupings and associations</h2>
      <p>The gap is the difference between the highest and lowest weighted shares, in percentage points. A shared majority means more than half of each political group chose the same answer.</p>
      <p>The personal result counts questions where your choice was the most common in your starting group. Tied shares at the displayed precision count as equally common.</p>
      {data.responsePatterns && <details className="method-disclosure">
        <summary>How we compared complete sets of answers</summary>
        <p>We kept respondents who gave one of the displayed answers on every question. For each person, we checked if every answer was among the most common choices in their own group. We also checked if their exact set of grouped answers appeared at least once in each of the three groups. The full-match card uses respondents from your starting group. The overlap card uses all complete responses. Both shares use survey weights.</p>
      </details>}
      {data.disillusioned && <details className="method-disclosure">
        <summary>Who the yellow dots represent</summary>
        <p>{integer.format(data.disillusioned.unplacedCount)} of {integer.format(data.disillusioned.eligibleTotalCount)} eligible respondents had no recorded mark from 0 to 10. Low trust in parliament is 0–4 on its 0–10 scale. The little-or-no-say share combines the two lowest responses about political influence.</p>
        <p>The yellow dots take the place of a rounded share of the original dots to illustrate the weighted proportion without a left–right mark. The highlighted dots illustrate this group’s weighted answers, rounded to the nearest dot.</p>
        <p>The closing circle uses valid answers to the understanding question from all {data.countries.length} countries in the story, including people without a left–right mark. “Somewhat to very much like me” combines the first three of the six original response options.</p>
      </details>}
      <div className="method-question-grid">
        {data.questions.map(question => <QuestionMethod key={question.id} question={question} />)}
      </div>
      <details className="method-disclosure method-correlation">
        <summary>How to read the association</summary>
        <p>Weighted Cramér’s V measures how strongly the distribution of answers varies across the three political groups. It runs from 0 (the same distribution) to 1 (the strongest possible association). These are pooled descriptive estimates for the countries in this story.</p>
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
