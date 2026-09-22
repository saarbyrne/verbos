# Verbos

Verbos is a local Spanish verb trainer modelled on Ella Verbs. It has 21 levels with a lesson and a typed-answer quiz each, a daily review, a custom practice quiz and a verb library with 633 verbs. It runs in the browser and has no dependencies, account or server.

The full spec is in Obsidian: `Leisure/Español/Verb trainer spec.md`.

## Running

You need Node 22 or later. There is nothing to install.

```sh
npm start
```

Then open http://localhost:5173.

To open it on a phone on the same Wi-Fi, run `npm run start:lan` and use the address it prints. The app works over that address while the Mac is running the server. Offline use on the phone needs HTTPS (for example GitHub Pages), because browsers only allow service workers on HTTPS or localhost.

## Tests

```sh
npm test            # engine, answer checking, schedule, storage, curriculum, precache list
npm run typecheck   # optional, needs TypeScript installed (npm i -g typescript)
```

## Structure

```
data/
  vendor/spanish-verbs/   verbs.json and template.json from fjarri/spanish-verbs (see SOURCE.md)
  additions.json          18 common verbs missing from the vendor data
  alternates.json         extra accepted spellings (evacúo, predeciré, hay, …)
  curriculum.json         the 21 levels
  top-verbs.json          top 200 verbs by frequency
content/lessons/          one Markdown lesson per level
src/
  engine/                 conjugation, answer checking, review schedule, letter diff, quiz pools
  store/                  localStorage with schema version, export and import
  components/             VerbTable, QuizRunner, AccentKeys, Lesson
  views/                  one file per screen
  lib/                    DOM helper and marked (Markdown parser, MIT)
scripts/serve.mjs         static server
scripts/precache.mjs      writes the offline file list into sw.js
sw.js                     service worker
tests/                    node --test
```

## Content

- **New verb.** Add it to `data/additions.json` in the same format as `verbs.json`. A regular verb needs only the English fields. An irregular verb also needs every form that differs from the regular pattern in `irregular_forms`.
- **New level.** Add it to `data/curriculum.json` and add its lesson to `content/lessons/`. `npm test` checks that the verbs exist and match the level's pattern.
- **Verb tables in lessons.** Write `{{table hablar comer vivir "Presente Indicativo"}}` on its own line. The tense name must match `template.json`.
- **New or removed files.** Run `npm run precache`, or the offline cache will miss them. A test fails when the list is out of date.

## Data

The forms come from fjarri/spanish-verbs, which is a cleaned version of Fred Jehle's verb database. Every non-reflexive verb was compared against verbecc: 33,713 forms, 148 differences. None of the differences were clear errors in fjarri. They were accepted alternative spellings, which are now in `alternates.json`, or errors in verbecc.

## Credits

- Verb data: Fred Jehle's Conjugated Spanish Verb Database (CC BY-NC-SA 3.0), compiled by Brian Ghidinelli and cleaned by fjarri. Verbos is for personal, non-commercial use for this reason.
- Markdown: marked (MIT).
