# Left. Right.

An interactive story about political self-placement and where people on the left and right agree. Place yourself on the arc, answer questions from the European Social Survey (ESS), and see how often each group chose the same answer.

## Run locally

Requires Node 22.22.0 or newer.

```sh
npm ci
npm run dev
npm run verify
```

`npm run verify` type-checks the project, runs the tests, and builds the site into `dist/`. Use `npm run preview` to serve that build locally.

## Configure the story

Edit [story.config.ts](story.config.ts). Vite rebuilds the prepared data when the configuration changes.

- `questions` lists question IDs in display order. The [ESS11 catalogue](src/ess/questions.ts) defines the prompt, button labels and grouping for each supported question.
- `countries` lists the country codes in the comparison. These also determine which countries the reader can highlight on the placement screen.
- `dotCount` must be at least the number of selected countries. Each eligible country gets at least one dot, and the rest of the places follow their weighted proportions as closely as possible. The chart uses the same respondents on each question.

## Code

- `src/domain` defines the input model, weighted comparisons and deterministic sampling. `prepareStory` takes a survey adapter and a story configuration.
- `src/ess` translates the ESS11 extract to the domain model. To support a new release, validate the available questions, answer codes, countries and weights and wire its adapter into the build.
- `src/story` contains the session reducer and React screens. `src/visualization` lays out and renders the same points as an arc or as answer groups.
- `vite.config.ts` prepares `story.json` separately from the UI bundle. The raw extract stays out of `dist/`.

## Data and credits

Adapted from [European Social Survey Round 11, edition 4.2](https://doi.org/10.21338/ess11e04_2), 2023–2024, under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). The checked-in extract contains selected fields from 50,116 records across 30 countries. The default comparison uses 22 EU countries and positions 0–4 and 6–10. ESS ERIC and CST are not responsible for this adaptation or interpretation.

The build uses the extract in `data/ess11.json`. To regenerate it from the official edition 4.2 CSV, run `python3 scripts/import-ess11.py /path/to/ESS11e04_2.csv`. The importer checks the weights against the ESS analysis weight.

The browser receives a sample plus aggregate statistics. The denominator is the full eligible group on each side of the scale, weighted by `pspwght × pweight`. Midpoints, missing and other responses stay in the denominator. The “Data & methodology” page explains the comparison and the grouping for each question.

Manrope and Unbounded are distributed by Fontsource under the SIL Open Font License. See [font notices](public/LICENSE-FONTS.txt). The [previous release](https://github.com/Imax1S/left-right-ess/tree/531850324ac64a003163966b349ef478f917756b) included Canvas code adapted from [The Pudding’s Life After](https://github.com/the-pudding/lifeafter). Its notice is retained in [LICENSE-THE-PUDDING.txt](LICENSE-THE-PUDDING.txt). The survey data license is separate from the website code.

## GitHub Pages

Select **GitHub Actions** as the Pages source. PRs and pushes to `main` run verification. The **Build and publish** workflow deploys `dist/` when run manually from the default branch.
