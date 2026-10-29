# Content guide

All the words on the site live in `content/`:

| File | Holds |
|---|---|
| `africa.js` | 54 countries |
| `asia.js` | 48 entries (including the Middle East, the Caucasus, Central Asia, Palestine and Taiwan) |
| `europe.js` | 46 entries (including Kosovo and Vatican City) |
| `americas_oceania.js` | `na`: 23 North and Central American and Caribbean countries; `sa`: 12 South American; `oc`: 14 Oceanian |
| `extras.js` | Lookalike groups, flag families, records and oddities, glossary |

After any edit run `npm run build`. `tools/build_data.js` checks every entry and refuses to build if something is wrong, printing what to fix.

## A country entry

```js
{c:'gh', n:'Ghana', cap:'Accra', y:'1957', col:['red','yellow','green','black'], tags:['hstripes','star'],
 why:`Designed by Theodosia Okoh, the red is for those who died for independence, …`,
 tip:`Red-gold-green horizontal stripes with a black star in the middle.`,
 fact:`The black star was inspired by Marcus Garvey's Black Star Line shipping company, …`,
 like:['bo','lt','mm','et']},
```

| Field | Required | Meaning |
|---|---|---|
| `c` | yes | Lower-case ISO 3166-1 alpha-2 code (`xk` for Kosovo). Must match an image in `data/flagmeta.json`. |
| `n` | yes | Common English name, used everywhere including sorting and search. |
| `cap` | yes | Capital. Add a short note in brackets where it is disputed or split, e.g. `Sucre`, `Jerusalem (status disputed)`. |
| `y` | yes | Year the current design was adopted, as usually cited (a string, so it can hold a note). Used for the "newest/oldest" sort. |
| `col` | yes | Main colours, from: `red` `orange` `yellow` `green` `blue` `white` `black`. Gold counts as yellow, maroon as red, light blue as blue. Only colours you would name when describing the flag, not every colour in a coat of arms. Drives the colour filter, the swatches and Tricky quiz answers. |
| `tags` | yes | Layout: `hstripes` `vstripes` `diagonal` `cross` `triangle` `canton`. Symbols: `star` `crescent` `sun` `circle` `emblem` (coat of arms or seal) `animal` `plant` `weapon` `text` `map` `unionjack`. Drives the filters and Tricky answers. |
| `why` | yes | 2–4 sentences: why the flag looks the way it does (meaning of colours and symbols, origin). |
| `tip` | yes | One sentence a learner can use to recognise it, ideally contrasting it with a lookalike. Shown after every quiz answer. |
| `fact` | yes | One memorable fact. |
| `like` | yes | Codes of flags it is easily confused with (can be empty). The build makes the links two-way and keeps up to five. |
| `nick` | no | A well-known nickname, e.g. `Union Jack`, `Hinomaru`. Searchable. |
| `alt` | no | `{f: 'image-name', cap: 'caption'}`: an alternative or previous flag shown on the detail page. The image must exist in `data/flagmeta.json`. Used for `af-alt`, `sy-old`, `kg-old`. |
| `st` | no | A status note for partially recognised or observer states (Taiwan, Kosovo, Palestine, Vatican City). |

Text fields use backtick strings so apostrophes and quotes need no escaping.

### Writing style

- Plain, specific sentences a 14-year-old can follow. Say what each colour or symbol stands for and where the design came from.
- When symbolism is traditional or contested, say so ("often said to", "legend says").
- Avoid dashes as sentence glue; the build rejects ` — ` and `--` in story text.
- Tips should name the one feature that tells the flag apart from its lookalikes.
- Keep facts checkable. If you are not sure of a fact, leave it out.

## `extras.js`

```js
groups:   [{ id: 'byr', t: 'Blue, yellow, red', d: 'One-line intro',
             m: [['td', 'Plain. Dark indigo blue.'], ['ro', 'Plain. Brighter cobalt blue.'], …] }]
families: [{ t: 'Nordic cross', d: 'Paragraph', m: ['dk', 'se', 'no', 'fi', 'is'] }]
records:  [{ t: 'Not a rectangle', d: 'Sentence', m: ['np'] }]
glossary: [['Hoist', 'The half of the flag nearest the pole. …']]
```

A group's `id` is used to remember best quiz scores for that group, so keep it stable once published. Every code in `m` must exist.

## Regions

Each country belongs to exactly one region, for filters, quizzes and progress:

| Code | Region | Notes |
|---|---|---|
| `af` | Africa | All 54 UN members. |
| `as` | Asia | Includes the Middle East, Turkey, Georgia, Armenia, Azerbaijan and Kazakhstan, plus Palestine and Taiwan. |
| `eu` | Europe | Includes Russia and Cyprus, plus Kosovo and Vatican City. |
| `na` | North America | Includes Central America and the Caribbean. |
| `sa` | South America | |
| `oc` | Oceania | |

## Which countries

The 193 UN member states, the two UN observer states (Vatican City and Palestine), and Kosovo and Taiwan, which appear in most flag quizzes. Territories (Greenland, Puerto Rico, Hong Kong and so on) are not included.

## Editorial decisions

Where there is more than one reasonable answer, these are the choices made and why.

| Flag | Decision |
|---|---|
| **Afghanistan** | Shows the white flag with the Shahada, flown by the Taliban government since August 2021, because that is the flag flown in the country. The detail page also shows the black-red-green tricolour of the former Islamic Republic, still used by many Afghans abroad and some embassies. The calligraphy is adapted from the Saudi flag drawing, so its lettering style is an approximation. |
| **Syria** | Shows the green-white-black flag with three red stars, made official by the Constitutional Declaration of 13 March 2025. The 1980–2024 red-white-black flag with two green stars is shown as the previous design. Star size and spacing are not fixed precisely in the sources; they are drawn at a common size. |
| **Kyrgyzstan** | Shows the design adopted in December 2023: straight rays set slightly apart from the sun, and four laths each way in the tunduk instead of three. It was drawn by hand from published descriptions, so fine geometry is approximate. The 1992–2023 design is shown as the previous one. |
| **Spain** | Shown with the coat of arms, the version used by the state and in most references. |
| **Bolivia** | Shown as the plain civil tricolour (the drawing source has no version with the arms); the story mentions the state flag and the Wiphala. |
| **Peru, Venezuela** | Shown as the plain civil flags used in most references; the stories mention the state versions with arms. |
| **Costa Rica, El Salvador, Nicaragua, Guatemala, Haiti, Dominican Republic, Serbia, Ecuador, Paraguay** | Shown with their coats of arms, as in most references. |
| **Sierra Leone** | Uses the brighter green and blue seen in most depictions rather than the drawing source's olive green and pale blue. |
| **Honduras** | Shown in navy. Its 1949 law calls the blue turquoise, and both shades are in official use; the fact line explains this. |
| **Nepal** | Its proportions are shown as ≈1.22 : 1 (height to width), since it is not a rectangle. |
| **Proportions** | Taken from the drawings (`data/ratios.tsv`), which follow official specifications where they exist. A few countries define their proportions loosely; the site shows the drawing's value. |
| **Year adopted** | The year usually cited for the current design. For restored flags this is sometimes the original year and sometimes the restoration year; the story says which (for example Libya shows 2011, the year its 1951 flag returned). |
| **Status lines** | Taiwan, Kosovo, Palestine and Vatican City carry a neutral one-line note about their recognition. |
| **Capitals** | Where a country has several capitals or a disputed one, the one shown is the most commonly listed, with a short note in brackets where needed. |

## Sources

The stories, tips and facts were written for this project from general reference knowledge. Recent flag changes and a few specific details were checked against:

- [Flag of Syria](https://en.wikipedia.org/wiki/Flag_of_Syria), Wikipedia: the 2025 Constitutional Declaration and colours.
- [Kyrgyzstan's New Flag Debuts in Bishkek](https://thediplomat.com/2024/01/kyrgyzstans-new-flag-debuts-in-bishkek/), The Diplomat, and [Flag of Kyrgyzstan](https://cavac.at/cavacopedia/flag%20of%20Kyrgyzstan): the 2023 redesign.
- [Honduran National Congress Reintroduces Navy Blue Flags](https://flagchronicle.com/2026/02/03/honduran-national-congress-reintroduces-navy-blue-flags/), Flag Chronicle: the turquoise/navy question.
- [Flag of the Comoros](https://en.wikipedia.org/wiki/Flag_of_the_Comoros), Wikipedia: adoption date and the number of designs since 1975.

Not every sentence has been individually sourced. If you find an error, fix the entry, note the source in the commit message, and run `npm run build`.

## Adding a country

1. Add the image: follow [FLAG-ARTWORK.md](FLAG-ARTWORK.md) so the flag appears in `site/flags/` and `data/flagmeta.json` (and its proportions in `data/ratios.tsv`).
2. Add an entry to the right file in `content/`.
3. Update the expected count in `tools/build_data.js` (it checks for exactly 197) and the regional counts shown on the home page in `src/body.html`.
4. `npm run build && npm test`.
