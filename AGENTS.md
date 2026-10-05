# AGENTS.md

Instructions for coding agents working in this repository.

## Project boundaries

- RustNotes is a local-first Tauri v2 desktop app: Vue 3/Pinia/PrimeVue in
  `src/`, Rust commands and persistence in `src-tauri/src/`.
- The frontend must call Tauri only through `src/utils/api.js`. Every new
  `invoke` must map to a registered `#[tauri::command]`.
- Note and folder schemas live in `src/stores/notes.js`; Rust deliberately
  persists them as untyped JSON.
- Preserve unrelated working-tree changes. Keep changes focused and do not
  refactor unrelated code while fixing a bug or adding a feature.

## Safety

- Never use the installed app's real data for development or automated checks.
  Start the desktop app with `pnpm app:dev`, which uses the separate
  `io.github.sdiricco.rustnotes.dev` identifier.
- Unit tests must use temporary directories or mocks. Do not read, move, or
  delete notes from the platform application-data directory.
- Do not run release or screenshot scripts unless the task explicitly requires
  them. They interact with signing credentials or native desktop state.

## User-facing changes

- Never hardcode user-facing text in Vue or JavaScript. Add keys to all eight
  locale trees under `src/i18n/`: `de`, `en`, `es`, `fr`, `it`, `ja`, `pt`,
  and `zh`.
- Native-menu labels are separate in `src-tauri/src/menu.rs`; keep every
  supported language aligned when changing a native menu entry.
- Behaviour changes need an automated test when practical. UI-only changes
  need manual verification and before/after screenshots in the pull request.
- Comments may be in Italian or English. Do not translate existing comments as
  part of unrelated work.

## Validation

- During development, run the narrowest relevant tests.
- Before handing off a completed change, run `pnpm check` from the repository
  root. It is the local equivalent of the required CI checks.
- Use `pnpm lint:fix` for safe lint fixes and `pnpm format` only on files in the
  scope of the current task; do not reformat unrelated files.
- Native dialogs, menus, window behaviour, printing, and responsive layout
  also need the manual checks documented in `CONTRIBUTING.md`.

## Release readiness

- Do not bump versions or create tags unless explicitly requested.
- Before every commit, verify the repository-local identity is exactly
  `sdiricco <92826738+sdiricco@users.noreply.github.com>`. Never create or
  amend a commit as `sdiricco-move`.
- Before every push or tag, verify the push remote is
  `https://github.com/sdiricco/rustnotes.git` and the active, authenticated
  GitHub CLI account is `sdiricco`. Stop if authentication is invalid or if
  `sdiricco-move` is active; never attempt the push in that state.
- For a release, keep the version identical in `package.json`,
  `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
- Confirm `pnpm check`, the manual release checklist in `CONTRIBUTING.md`, and
  the platform limitations in `README.md` before tagging `vX.Y.Z`.
- A tag starts the release workflow and creates a draft GitHub release. Review
  its artifacts and notes before publishing it and updating Homebrew.

See `CONTRIBUTING.md` for the detailed architecture, i18n workflow, and manual
test checklist.
