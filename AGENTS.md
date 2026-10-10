# AGENTS.md

verbos is part of Hecho. The rules for every Hecho repo are in `~/Github_Personal/hecho/AGENTS.md`. Read that file first, then the Obsidian notes it lists.

- Issues for verbos live in the hecho repo. In commits and pull requests, refer to them as `saarbyrne/hecho#12`, because a plain `#12` points at this repo's own issues.
- Pushing to `main` publishes verbos.hecho.fyi through GitHub Pages, so merging a pull request is a deploy.
- `npm test` runs the tests. `npm run typecheck` checks types and needs TypeScript. `npm run precache` updates the offline file list in `sw.js` after you add or remove files.
