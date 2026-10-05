# RustNotes

[![CI](https://github.com/sdiricco/rustnotes/actions/workflows/ci.yml/badge.svg)](https://github.com/sdiricco/rustnotes/actions/workflows/ci.yml)
[![E2E](https://github.com/sdiricco/rustnotes/actions/workflows/e2e.yml/badge.svg)](https://github.com/sdiricco/rustnotes/actions/workflows/e2e.yml)
![macOS tested](https://img.shields.io/badge/macOS-tested-success)
![Windows not manually tested](https://img.shields.io/badge/Windows-not_manually_tested-orange)
![Linux not manually tested](https://img.shields.io/badge/Linux-not_manually_tested-orange)

A simple, local-first notes app in the spirit of Apple Notes, for macOS, Windows and Linux.
Free and open source (MIT), no account, no cloud, no telemetry: your notes are files on your disk.

> **Status: public beta (0.x).** macOS is used daily by the author; Windows and
> Linux builds are produced by CI but have **not yet been run by a human**. See
> [Known limitations](#known-limitations) before you rely on it.

**Website: [sdiricco.github.io/rustnotes](https://sdiricco.github.io/rustnotes/)**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/editor-dark.png">
  <img alt="RustNotes editor" src="docs/assets/editor-light.png" width="900">
</picture>

<p>
  <img alt="Search across all notes" src="docs/assets/search-dark.png" width="445">
  <img alt="Settings" src="docs/assets/settings-light.png" width="445">
</p>

## Features

- Folders, favorites, trash, multi-select, drag to reorder folders
- Titles are note metadata, independent from the note body, and editable from the list or header
- Rich text editor (Quill) with headings, lists, checklists, code blocks with syntax highlighting, tables, images
- Instant full-text search across all notes, find inside a note
- Markdown import and export, per note or **all notes at once**
- Light and dark theme, follows the system
- Interface in English, Italian, Spanish, French, German, Portuguese, Chinese and Japanese, follows the system language
- Zoom the whole interface in and out (View menu, Cmd/Ctrl + / - / 0), remembered across launches
- Keyboard-first: every action has a shortcut (see Settings → Shortcuts)
- Small: a Tauri v2 app, native webview, a few MB installed
- Optional **Claude assistant**: fix, rephrase, summarize, continue or ask anything about a selection or the whole note, with a before/after diff. Runs through the [Claude Code](https://claude.com/claude-code) CLI already on your Mac, no API key in the app (see below)

## Install

### macOS (Homebrew)

```bash
brew trust sdiricco/rustnotes      # Homebrew requires this once for third-party taps
brew install --cask sdiricco/rustnotes/rustnotes
```

Upgrade with `brew upgrade --cask rustnotes`. If you installed the earlier
`mac-notes-tauri` cask from the `sdiricco/mac-notes` tap, run the `brew trust`
line above once and `brew upgrade` migrates it to the new name on its own.

Since 0.14.1 the app is **signed with an Apple Developer ID and notarized**: it
opens without warnings. Older builds were unsigned; if you still have one, either
upgrade or right-click the app → Open the first time.

### Windows and Linux

Download the installer for your platform from the
[Releases](https://github.com/sdiricco/rustnotes/releases) page
(NSIS `.exe` for Windows, `.AppImage` / `.deb` for Linux, x64 and arm64).

Windows will show a SmartScreen warning because the installer is not code-signed.

### Updates

Since 0.15 the app updates itself: it checks GitHub Releases a few seconds after
startup and every few hours, and when a newer version exists an *Update* button
appears at the bottom of the sidebar (also in Settings → About). One click
downloads the signed build, verifies it and restarts. On Linux this works for
the AppImage; `.deb`/`.rpm` installs are only notified and update through the
package manager. Homebrew users can keep using `brew upgrade --cask rustnotes`
as well.

## Your data

Notes live on your disk, one JSON file per note plus a `folders.json`, in the
platform's application data directory (Settings → About → *Show in Finder* opens it):

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/io.github.sdiricco.rustnotes/` |
| Windows | `%APPDATA%\io.github.sdiricco.rustnotes\` |
| Linux | `~/.local/share/io.github.sdiricco.rustnotes/` |

Upgrading from a 0.9.x build (then called "Mac Notes Tauri"): the data directory
changed with the name. On first launch the app copies your notes from the old
directory if the new one is empty; the old one is left in place as a backup.

Each note file holds the note's HTML content, title, folder, timestamps and flags.
Images are embedded as data URIs (8 MB limit per image).

You can **move the notes folder anywhere** from Settings → About → Data → *Change…*.
Point it at a folder synced by iCloud Drive, Dropbox or Syncthing and the same
notes are available on every computer that points at it: the app has no sync of
its own, and does not need one. If the folder you pick already contains a
RustNotes archive, the app switches to it instead of moving your current notes
(this is how you connect a second computer). The choice is stored in
`config.json` inside the default directory above. If the chosen folder is missing
at startup (external disk unplugged) the app falls back to the default one.

To get everything out as plain Markdown: Settings → About → **Export all notes**.
It writes one `.md` file per note, one subfolder per folder.

Nothing ever leaves your machine except requests to GitHub Releases to check for
updates and, only when you press *Update*, download the signed update; plus the
text you explicitly send to the Claude assistant if you use it (next section).
The full statement is in
[PRIVACY.md](PRIVACY.md).

## Claude assistant (optional)

RustNotes can hand a selection, or the whole note, to Claude: fix spelling and
grammar, rephrase, summarize, continue writing, or type your own instruction
("turn this into a bullet list", "translate to English"). The proposal streams
into a panel in the bottom-right corner, with a **Proposal / Changes** view that
shows a word-by-word before/after. Nothing touches the note until you press
*Replace* or *Insert below*; one Undo reverts it. You can refine a proposal
("shorter", "more formal") before applying it.

There is no API key to paste and no account inside RustNotes. The app runs the
[Claude Code](https://claude.com/claude-code) command-line tool that is already
installed and signed in on your computer, with all of its tools disabled: it can
only read the text you send and reply with text. Usage counts against your own
Claude subscription. If Claude Code is not installed the button simply does not
appear; if it is installed but not signed in, Settings → Claude has a *Sign in*
button that opens Terminal with the login.

Settings → Claude lets you hide the assistant, pick the model (Sonnet by
default, Opus or Haiku) and test the connection. Shortcut: Cmd/Ctrl + J.
Rich content goes through Markdown on its way to Claude and back, so on notes
with images or tables prefer working on a selection.

## Known limitations

Documented rather than hidden. Decisions, not oversights:

- **Windows is not code-signed**, so SmartScreen may warn on first launch.
  macOS builds are signed with a Developer ID and notarized by Apple.
- **Windows and Linux are untested by a human.** They compile in CI and a desktop
  smoke test creates, renames, edits and trashes a note on all three operating
  systems. This is useful coverage, not a substitute for a real person. The header
  leaves room on the left for the macOS window buttons and may show an empty
  strip on other OSes. Reports and screenshots are very welcome.
- **No sync of its own.** By design there is no account or server. Put the notes
  folder inside iCloud Drive, Dropbox or Syncthing (see *Your data*). Two
  computers editing the same note at the same time will conflict the way any
  synced file does: last write wins.
- **Storage format is HTML in JSON**, not Markdown files. Markdown is a first-class
  export, not the storage. Switching is under evaluation; the round trip through
  Markdown is lossy for some rich content.
- **Flat folders**, no nesting or tags yet.

## Development

Requirements: Node 22+, pnpm 10, Rust stable, and the
[Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
pnpm install
pnpm app:dev             # isolated development app; never touches installed-app data
```

Run all checks used by CI with one command:

```bash
pnpm check
```

`pnpm app:dev` uses the separate `io.github.sdiricco.rustnotes.dev` identifier,
so its notes, configuration and webview storage are isolated from the installed
app. `pnpm dev` runs only the Vite frontend and is also safe for UI work.

The desktop smoke suite uses another isolated identifier and a test-only binary:

```bash
pnpm build:e2e
pnpm test:e2e
```

GitHub Actions runs that same suite on macOS, Windows and Linux. The embedded
WebDriver server and its bridge are enabled only by the Cargo `e2e` feature and
are not present in release builds.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the layout of the code, how i18n works
and how to add a language.

## Release

Push a tag `vX.Y.Z`. The release workflow builds macOS (universal), Windows
(x64, arm64) and Linux (x64, arm64) and creates a **draft** GitHub release. The
in-app update check reads only the "latest release" endpoint, which ignores drafts:
nobody sees a version until you publish it from the Releases page. Update the
Homebrew cask in the `sdiricco/homebrew-rustnotes` tap at the same time.

## History

RustNotes started as [mac-notes](https://github.com/sdiricco/mac-notes), an
Electron app, and was ported to Tauri v2 with the Vue frontend left almost
untouched and the backend rewritten in Rust. Until version 0.11 the project was
called "Mac Notes Tauri"; old links to `sdiricco/mac-notes-tauri` redirect here.

## License

[MIT](LICENSE) © Simone Di Ricco
