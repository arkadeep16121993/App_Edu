# Matt Pocock skills

Source: https://github.com/mattpocock/skills

Version: 1.3.1

Pinned source commit: `5beb35b040e3de97e54fa9e386d7e42d15c295c2`

Installed 27 official skills under `.agents/skills/`, including `grill-me`, `grill-with-docs`, `tdd`, `to-spec` and `code-review`. Upstream MIT license is retained in `.agents/skills/MATT-POCOCK-LICENSE.txt`. Skill contents are unmodified. This is a repository-local skill installation, not a registered managed plugin, and does not auto-update. Start/reload a Codex session in this project for filesystem-skill discovery. If this host does not discover local skills, the SKILL.md files remain available to read and follow explicitly.

The managed-plugin installer in this cloud session failed because `/run/codex-environment/codex-home` is read-only. No protected directory was altered and no global installation is claimed.

On your own computer, with Codex CLI installed, you can instead use the upstream managed-plugin commands:

```sh
codex plugin marketplace add mattpocock/skills
codex plugin add mattpocock-skills@mattpocock
```

Pick the managed plugin or the repository-local skills to avoid duplicate discovery. The source download includes the repository-local skills. Invoke `grill-me` when you want an interview; installing it does not start an interview automatically. No skill setup, issue publication, messages or agent delegation was run as part of installation.
