# Privacy policy

*Last updated: 1 October 2026*

RustNotes is a local-first notes app. It has no account, no server of its own
and no analytics. Nothing you write is collected by the author.

## What stays on your computer

Your notes, folders and settings are plain files in the application data
directory (or in the folder you choose in Settings → About → Data). See
[Your data](README.md#your-data) in the README for the exact paths. The app
never uploads them anywhere.

## What leaves your computer

Only two things, and both are visible in the source code:

1. **Update check.** At startup the app sends one anonymous `GET` request to
   the public GitHub Releases API (`api.github.com`) to learn the latest
   version number. It carries no identifier beyond what any web request
   carries (your IP address, seen by GitHub). Nothing is downloaded or
   installed automatically. See
   [`update_check.rs`](src-tauri/src/update_check.rs).

2. **Claude assistant (optional).** If you use it, the selection or note you
   explicitly hand to the assistant is sent to Anthropic through the
   [Claude Code](https://claude.com/claude-code) command-line tool installed
   on your computer, using **your own** Claude account. The author never
   sees that text. How Anthropic handles it is governed by Anthropic's terms
   and privacy policy, not by this document. If Claude Code is not installed
   or you hide the assistant in Settings → Claude, nothing is ever sent. See
   [`claude.rs`](src-tauri/src/claude.rs).

There is no telemetry, no crash reporting and no third-party SDK.

## Spell check and system services

Spell checking uses your operating system's dictionaries and runs locally.

## Changes

This document lives in the repository; its history is the
[git log](https://github.com/sdiricco/rustnotes/commits/main/PRIVACY.md).

## Contact

Open an issue at <https://github.com/sdiricco/rustnotes/issues>.
