---
description: Author content from Figma to DA, then build the matching C2 block against the published page.
---

# build-c2-block

Orchestrates the `build-content-from-figma` and `build-block-from-figma` skills end-to-end: gather inputs once, author the content document, capture the resulting `.aem.live` URL, then build the C2 block against that page.

---

## Modes

**Auto and quiet are always ON by default.** Do not check environment
variables or run any detection steps. Both modes are active from the
start of every invocation.

The only way to disable them is an explicit flag in the user's
arguments:
- `--interactive` → auto is off.
- `--verbose` → quiet is off.

If no flags are present, auto + quiet are on. No exceptions.

### Auto mode

Skip all intermediate confirmations. Only stop for:
- **Initial input collection** (Phase A) — required, cannot be skipped.
- **Non-drafts publish safety gate** (Phase 7a of the content skill) —
  mandatory safety check, never auto-accepted.
- **Auth failures** — if `da-auth-helper` or git push fails, stop and
  tell the user what to fix.

When auto is active, pass `Auto mode: true` in the arguments to
both sub-skills so they skip their own confirmation prompts.

### Quiet mode

Tailor all output for non-technical users:
- **Progress updates**: brief, jargon-free phrases
  ("Extracting content from Figma...", "Uploading images...",
  "Building the component...", "Checking accessibility...",
  "Running speed test...").
- **No** CSS variable lists, token names, code snippets, git commit
  hashes, branch operation details, axe-core rule IDs, or Lighthouse
  metric breakdowns.
- **Accessibility and performance**: just "Passed" or
  "Issues found: [plain-English description]".
- **Final summary**: block name, test URL, edit URL, pass/fail status,
  and next steps only.

When quiet is active, pass `Quiet mode: true` in the arguments to
both sub-skills.

---

## Phase A — Gather inputs

Ask for Figma frame URLs only. At least one is required.

| Input | Notes |
|-------|-------|
| Figma URL — Mobile (≤767 px) | At least one of the three |
| Figma URL — Tablet (768–1279 px) | |
| Figma URL — Desktop (≥1280 px) | |

Everything else is auto-generated. Do not ask for org, repo, DA
path, block name, or base branch. Non-technical users should never
see these options.

### Resolved defaults

```bash
LDAP=$(whoami)
RANDOM_SUFFIX=$(openssl rand -hex 3)
```

| Setting | Value |
|---------|-------|
| DA organization | `adobecom` |
| DA repository | `milo` |
| DA file path | `drafts/$LDAP/block-$RANDOM_SUFFIX` |
| Block name | inferred from Figma metadata |
| Base branch | `stage` |

If the user explicitly provides an override for any of these (e.g.
`--repo da-playground`, `--branch my-experiment`), use theirs.
Otherwise use the defaults silently.

### Validation

- At least one Figma URL is mandatory.
- Do not proceed until at least one URL is provided.

**Auto mode**: show a one-line confirmation with the Figma viewport
count and proceed.

**Interactive mode** (`--interactive`): show all resolved values and
wait for confirmation.

---

## Side panel preview

Use the Claude Preview MCP to show the styled block on localhost
after the build completes. The side panel can only load localhost
URLs, so the dev server must serve the feature branch code.

### Setup

Ensure `.claude/launch.json` exists with a `"milo"` entry. If it
does not exist, create it:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "milo",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "libs"],
      "port": 6456
    }
  ]
}
```

### After block build (end of Phase D)

The dev server runs from the main milo repo, so it must be on the
feature branch for the block to load. ES modules are cached per
browser session, so a stale `utils.js` from a previous branch will
break block loading. To avoid this, stop and restart the server.

```bash
# 1. Record the current branch so we can restore it later
ORIGINAL_BRANCH=$(git -C <main-repo> branch --show-current)

# 2. Switch to the feature branch
git -C <main-repo> fetch upstream <feature-branch>
git -C <main-repo> checkout <feature-branch>
```

Then stop any existing preview, start fresh, and navigate:

```
preview_stop(name: "milo")
preview_start(name: "milo")
preview_eval(serverId, expression: "window.location.href = 'http://localhost:6456/<da-path>/<page-name>'")
```

If `preview_start` fails (missing AEM CLI, port conflict), skip
silently and continue. The preview is informational, not a gate.

### Restore after summary

After presenting the final summary, switch back:

```bash
git -C <main-repo> checkout $ORIGINAL_BRANCH
```

---

## Phase B — Run the content skill (subagent)

Spawn a **subagent** using the Agent tool to run the content skill
in an isolated context. This prevents the content skill's Figma
extractions, HTML generation, and upload logs from consuming the
main conversation's context window.

**Agent prompt must include:**
- The full skill instructions: "Read and follow the skill at
  `.claude/skills/build-content-from-figma/SKILL.md`"
- All resolved inputs: Figma URLs (with viewport labels), DA
  org/repo/path, block name override (if any)
- Mode flags: `Auto mode: true` and/or `Quiet mode: true` if active
- Instruction to return a structured result containing:
  - `block_name`: the confirmed block name
  - `da_edit_url`: the DA edit URL
  - `live_url`: the published `.aem.live` URL (or empty if publish
    was declined/failed)
  - `obstacles`: any issues encountered

**`--auto` active**: the content skill will skip its own
confirmations (per its auto mode list) and proceed automatically.
The only exception is the non-drafts publish safety gate, which
always requires explicit user approval.

**Default**: the content skill has its own internal prompts (block name
confirmation, diff review, upload confirmation, preview/publish
confirmation). Let the user answer those directly.

When the content skill reaches Phase 7 (Preview & Publish), the user
**must** opt in to publishing for the chain to continue. If they
decline, stop here and tell the user the block skill needs an
`.aem.live` URL to run.

---

## Phase C — Capture the live URL

Parse the `live_url` from the content subagent's result. It has the
shape:

```
https://main--<repo>--<org>.aem.live/<da-path>/<page-name>
```

If the live URL is empty or missing (e.g. the user declined to
publish, or publishing failed), stop and report the situation. Do not
invent a URL or guess the path.

**Auto mode**: log the parsed live URL and proceed.

**Default**: show the parsed live URL to the user and confirm it
before proceeding.

---

## Phase D — Run the block skill (subagent)

Spawn a second **subagent** using the Agent tool to run the block
skill in its own isolated context. The content skill's context is
now fully discarded, giving the block skill a fresh context window.

**Agent prompt must include:**
- The full skill instructions: "Read and follow the skill at
  `.claude/skills/build-block-from-figma/SKILL.md`"
- **Preview URL**: the `.aem.live` URL from Phase C
- **Figma URLs**: the same per-viewport URLs collected in Phase A
- **Base branch**: the user's value, or `stage` if they did not
  provide one
- **Block name**: from the content subagent's result (pass as
  the block name override so it does not need to re-infer)
- Mode flags: `Auto mode: true` and/or `Quiet mode: true` if active
- Instruction to return a structured result containing:
  - `block_name`: the component name
  - `file_paths`: JS and CSS file paths created
  - `feature_branch`: the branch name
  - `test_url`: the `?milolibs=` URL
  - `accessibility`: pass/fail + summary
  - `performance`: pass/fail + summary
  - `obstacles`: any issues encountered

The block skill will detect remote-branch-mode from the `.aem.live`
URL and handle feature-branch creation, `?milolibs=` testing, visual
comparison, accessibility, and performance audits on its own.

---

## Phase E — Final summary

After the block skill finishes, output a combined summary.

**`--quiet` active** (non-technical summary):

1. **Block name**
2. **Edit URL** (DA)
3. **Test URL** (`?milolibs=...`)
4. **Accessibility**: Passed / Issues found
5. **Performance**: Passed / Issues found
6. **What to do next**: plain-English next steps

**Default** (full technical summary):

1. **DA document**: edit URL + live URL.
2. **Block component**: name, file paths, and feature branch.
3. **Audit results**: accessibility and performance highlights from the block skill.
4. **Suggested next steps**: open a PR from the feature branch, update placeholder `https://www.adobe.com/` links in the DA document, etc.

---

## Failure handling

- Content skill fails before publish: stop, report the failure, do not run the block skill.
- User declines preview/publish in the content skill: stop with a clear message that the block skill requires an `.aem.live` URL.
- Block skill fails the foundation gate (missing `foundation: c2` metadata): the block skill itself handles the recovery path, follow its instructions.