import type { StoryData } from '../domain/model.ts';
import { Arrow, integer } from './controls.tsx';
import { Wordmark } from './Story.tsx';

export function Methodology({ data }: { data: StoryData }) {
  return <main className="method-page">
    <header><Wordmark /><a href="#"><Arrow back /> Back to the story</a></header>
    <h1 tabIndex={-1} id="method-heading">Data &amp; methodology</h1>
    <section>
      <h2>The survey</h2>
      <p>{data.source.title}. This release extract has {integer.format(data.source.records)} records from {data.source.countries} countries
        ({data.source.years}). This story draws on {integer.format(data.eligibleCount)} eligible records across {data.countries.length} selected countries.</p>
      <p>{data.countries.map(country => country.name).join(', ')}.</p>
    </section>
    <section>
      <h2>Left and right</h2>
      <p>The ESS asks people to place themselves from 0 (left) to 10 (right). We compare positions 0–4 and 6–10.
        The comparison requires a valid recorded age, an eligible position and a positive survey weight. The midpoint, 5, sits outside these two groups.</p>
    </section>
    <section>
      <h2>What the dots and percentages show</h2>
      <p>Each of the {integer.format(data.dots.length)} dots is a distinct survey respondent. Every selected country has at least one dot.
        We allocate the remaining places to get as close as possible to each country’s share of the survey weight.
        Within each country, we select respondents deterministically using their survey weights.
        Each result shows the people in this sample whose answers fall into one of the two groups. On the placement screen, a single country or profile filter highlights matching points in the sample.</p>
      <p>Profile filters use the categories recorded by ESS for gender, age bands of 15–29, 30–44, 45–59 and 60+,
        self-rated religiosity (0–3, 4–6 and 7–10) and education grouped by ES-ISCED levels 1–2, 3–5 and 6–7.
        Only recorded responses within a selected category match that filter.</p>
      <p>Your marker moves to the other side when your answer was more common there at the displayed precision.
        Each question starts from the position you chose.</p>
      <p>For each question, percentages compare respondents whose answers fall into one of the two groups. We exclude neutral, missing and other responses.
        Each percentage divides the weight of the selected answer by the weight of both answer groups on the same political side.
        The count beside each percentage is an unweighted count.
        We combine the ESS post-stratification and population weights (<code>pspwght × pweight</code>) for the pooled comparison.</p>
    </section>
    <section>
      <h2>Question groupings and correlations</h2>
      <p>The final screen compares the weighted shares choosing the same answer on each side. The gap is the absolute
        difference in those shares, in percentage points. A shared majority means more than half of each side chose the same answer.</p>
      <p>For each question we also calculate a weighted Pearson correlation for the two political sides and two answer groups (phi).
        Positive values mean the first answer was more common on the right, and negative values mean it was more common on the left.
        These are pooled descriptive estimates for the questions and countries in this story.</p>
      <ul>{data.questions.map(question => <li key={question.id}>
        <strong>{question.topic}</strong>
        <p>{question.prompt} {question.grouping}</p>
        {typeof question.correlation === 'number' && <p>Weighted correlation {question.correlation.toFixed(2)}</p>}
      </li>)}</ul>
    </section>
    <footer>
      <a href={data.source.doi}>European Social Survey dataset</a>
      <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">{data.source.license}</a>
      <a href="https://github.com/Imax1S/left-right-ess">Source code</a>
    </footer>
  </main>;
}
