---
name: build-content-from-figma
description: >
  Extracts content from Figma designs and produces an authored HTML
  document following the C2 block authoring pattern. Downloads Figma
  assets locally, then uploads images and HTML directly to the DA
  admin API. Handles text, media, icons, and per-viewport variations.
---

# Build Content from Figma Skill

## UI interactions

When not in auto mode, use `AskUserQuestion` for all decisions and
confirmations — never as plain chat text.
- Binary confirmations (proceed, upload, publish, clean up): **Yes** / **No** options.
- Name confirmations: **Confirm** / **Use a different name** options.
- Production warnings: **Yes, publish to production** / **No, cancel** options.

Initial text inputs (Figma URLs, DA org / repo / path) are collected
as regular chat prompts since they require free-form text.

In auto mode, skip confirmations per the Modes section below. The
non-drafts safety gate (Phase 7a) always uses `AskUserQuestion`
regardless of mode.

## Modes

**Auto and quiet are always ON by default.** Do not check environment
variables or run any detection steps.

The only way to change this:
- Arguments include `Auto mode: false` or `Quiet mode: false`.
- User passed `--interactive` (disables auto) or `--verbose`
  (disables quiet).

If none of the above are present, auto + quiet are on. No exceptions.

### Auto mode

Skip these confirmations and proceed automatically:

- **Phase 1b** — accept the inferred block name without asking.
- **Phase 1c** — skip the input confirmation table.
- **Phase 3** — skip the diff analysis confirmation.
- **Phase 5** — skip the HTML review.
- **Phase 6** — proceed with upload without asking.
- **Phase 7** — proceed with preview & publish without asking.
- **Phase 8** — auto-clean temp folders without asking.

**Never skip in auto mode:**
- **Phase 7a** — the non-drafts publish safety gate is mandatory.
- **Auth failures** — always stop if `da-auth-helper` returns no token.

### Quiet mode

- Emit short, jargon-free progress updates ("Extracting content...",
  "Uploading images...", "Publishing page...").
- Do not show the diff table, HTML source, or curl output.
- Report only the DA edit URL and live URL on success.
- On failure, describe the problem in plain English and what the user
  should do.

### Side panel

Never open or display raw HTML files or SVG files in the side panel.
They lack images and styling, so they appear broken. Report file
paths in chat text instead.

---

You are creating an authored HTML document for the **C2 design system**
by extracting content from Figma designs. The document follows the
standard block authoring pattern and is uploaded to **DA** (Document
Authoring) for publishing via Adobe EDS.

> **Critical rules**
>
> - Assets are downloaded from Figma locally, then uploaded directly
>   to the DA admin API via `curl POST` to
>   `admin.da.live/source/...` with multipart form data.
> - Block content is authored as a `<table>` (see
>   `references/authoring-pattern.md`); `section-metadata` and
>   `metadata` remain div-based.
> - **Never embed images as base64 in DA HTML.**
> - The HTML references assets using their **final
>   `content.da.live` URLs** (computed from the DA destination and
>   the shadow folder convention). Since we upload assets ourselves,
>   we know the exact paths upfront.
> - Typography tokens from Figma (`--s2a-typography-*`) determine
>   heading levels, body sizes, and eyebrow classification.
> - Viewport-specific content follows the inheritance model:
>   only include what changes per viewport. Omit viewports and
>   columns that are identical to a lower viewport.
> - Link URLs use `https://www.adobe.com/` as a placeholder.
>   Link display text must match Figma.

## Bundled resources

Do **not** load these upfront. Each phase tells you which file to
read when it becomes relevant.

### references/
| File | Purpose |
|------|---------|
| `authoring-pattern.md` | HTML structure for DA block authoring: document skeleton, viewport rows, content columns, media placement, CTA wrapping, complete examples. |
| `token-mapping.md` | Maps `--s2a-typography-*` Figma tokens to heading levels (`h1`-`h4`), body sizes (`lg`, `md`, `sm`, `xs`), and eyebrow classification. |

### agents/
| File | Purpose |
|------|---------|
| `figma-content-extractor.md` | Extracts structured content (text, media, tokens) from a single Figma frame. Run once per viewport. |

---

## Inputs

Collect Figma URLs before starting extraction work. At least one is
required.

| Input | Required | Example |
|---|---|---|
| **Figma URL(s)** | At least one | One URL per viewport (mobile, tablet, desktop) |
| **DA destination** (org, repo, path) | Auto mode: use defaults | `adobecom / milo / drafts/ldap/my-page.html` |

Ask which viewport each Figma URL corresponds to. Valid viewports:
- **Mobile** (S, up to 767 px)
- **Tablet** (M, 768-1279 px)
- **Desktop** (L/XL, 1280 px +)

If only one URL is provided, the document has no viewport variations.

### Auto mode defaults

When auto mode is active and DA destination was not provided in the
arguments, generate it automatically:

```bash
LDAP=$(whoami)
RANDOM_SUFFIX=$(openssl rand -hex 3)
```

- **Organization**: `adobecom`
- **Repository**: `milo`
- **Path**: `drafts/$LDAP/block-$RANDOM_SUFFIX`

Do not ask the user for org, repo, or path in auto mode.

---

## Phase 1 — Gather requirements

### 1a. Collect inputs

Collect Figma frame URLs per the Inputs table above. The media
folder is derived automatically in Phase 4c.

**Auto mode**: if DA destination was not provided in arguments, use
the auto-generated defaults from the Inputs section. Do not prompt
the user for org, repo, or path.

**Interactive mode**: collect DA destination (org, repo, path) from
the user.

### 1b. Confirm block name (BLOCKING)

For each Figma URL, use **Figma MCP** `get_metadata` to inspect
the frame name. Look for a recognizable block name in the frame
label or parent component name (e.g. "aside", "marquee", "brick",
"media", "editorial-card").

This name becomes the class on the block's outer `<div>`.

**Auto mode**: accept the inferred name (or the override from
arguments) and proceed.

**Default**: present the suggested name and ask the user to confirm
or provide an alternative. Do NOT proceed until the user confirms.

### 1c. Confirm before proceeding

```
Block name:    <name>
Viewports:     Mobile [check] | Tablet [check/cross] | Desktop [check/cross]
DA target:     <org>/<repo>/<path>
Media folder:  <org>/<repo>/<media-folder>/
```

**Auto mode**: proceed without waiting.

**Default**: wait for user confirmation.

---

## Phase 2 — Extract content from Figma

**Load `references/token-mapping.md` now.**

For each provided Figma frame, **load `agents/figma-content-extractor.md`**
and follow its procedure. Run extractions in parallel if multiple.

Each extraction returns:
- Icon (Figma asset URL + node ID + alt text, if present)
- Eyebrow text (if present)
- Heading text + level (h1-h4)
- Body text + size class (body-lg, body-md, body-sm, body-xs)
- Links (display text + CTA style: primary/secondary/plain)
- Background (color string, or Figma asset URL + node ID if image)
- Foreground (Figma asset URL + node ID, if present)
- Additional media (if present)
- Fallback classifications (elements where tokens were not found)

---

## Phase 3 — Compute viewport differences

Compare extracted content across viewports to determine what needs
explicit authoring vs what can be inherited.

Viewports inherit upward: mobile → tablet → desktop. See
`references/authoring-pattern.md` for the full inheritance table.

### Comparison and diff table

For each viewport pair (mobile→tablet, tablet→desktop), compare
every element (icon, eyebrow, heading, body, links, background,
foreground). Present results as a diff table:

```
Element          | Mobile        | Tablet       | Desktop
---------------------------------------------------------
Heading (h3)     | "Get started" | = (inherit)  | "Get started today"
Background       | #1a1a1a       | gradient     | gradient
Foreground       | hero.png      | = (inherit)  | hero-wide.png
```

### Image comparison

Figma generates unique asset URLs per node even when the underlying
image is identical. After downloading in Phase 4, compare with
`sips -g pixelWidth -g pixelHeight`. Same dimensions = same image;
mark as `= (inherit)` and do not upload duplicates.

### Body size variant

`body-md` is the default (no variant needed). Other sizes must be
declared:

- **Same across viewports**: add to block header, e.g.
  `<p>aside (body-sm)</p>`.
- **Differs per viewport**: base size on block header, override in
  viewport row, e.g. `<p>Tablet-viewport (body-lg)</p>`.

Variants are comma-separated in parentheses.

**Auto mode**: proceed without waiting.

**Default**: wait for user confirmation of the diff analysis.

---

## Phase 4 — Download and prepare media

Collect all Figma asset URLs from Phase 2 and download them locally.

> **Critical constraints**
>
> - **No compression, no resizing, no Python scripts.** DA and EDS
>   handle image optimization.
> - **Never read image data into context.** Do not use the Read
>   tool on image files. Do not `cat` or print base64 output.

### 4a. Collect and deduplicate asset URLs

From Phase 2, collect every Figma asset URL (icons, backgrounds,
foregrounds, additional media). Deduplicate:
- Same Figma URL across viewports → include once.
- Different URLs but identical dimensions (Phase 3 image comparison)
  → keep only the mobile variant.

### 4b. Download assets locally

```bash
mkdir -p /tmp/figma-media/<page-name>
curl -sL "<figma-asset-url>" -o /tmp/figma-media/<page-name>/<filename>
```

Use descriptive filenames with proper extensions. Verify type with
`file <path>`. Common: SVG → `.svg`, PNG → `.png`, JPEG → `.jpg`.

#### SVG icons

Icons in Figma are multi-layer; individual layer asset URLs are
incomplete. Export the composite via the Figma Plugin API:

```javascript
// use_figma: Export icon node as composite SVG
const node = await figma.getNodeByIdAsync('<icon-node-id>');
const svgBytes = await node.exportAsync({ format: 'SVG' });
const svgString = String.fromCharCode(...svgBytes);
return svgString;
```

Save to a local `.svg` file. Then:
1. Upload to DA: `POST admin.da.live/source/<org>/<repo>/<parent-path>/<icon>.svg`
2. Preview: `POST admin.hlx.page/preview/<org>/<repo>/main/<parent-path>/<icon>.svg`
3. In HTML, use the `aem.page` preview URL as both `href` and
   display text of the icon `<a>` tag.

### 4c. Compute DA asset paths

Use the **dot-prefixed shadow folder** convention:
```
https://content.da.live/<org>/<repo>/<parent-path>/.<page-name>/<filename>
```

### 4d. Color backgrounds

Solid colors, gradients, and semi-transparent values go as text in
the media column (e.g. `#1a1a1a`, `linear-gradient(...)`).

---

## Phase 5 — Build HTML document

**Load `references/authoring-pattern.md` now** and follow its
document skeleton, viewport rows, content columns, and media
placement patterns exactly.

Key reminders:
- The block is a `<table>`; section-metadata and metadata remain
  div-based.
- First row: `<td colspan="2">` with `<p>block-name (variants)</p>`.
- `section-metadata` in the **same section** as the block:
  `style: container, wide`.
- `metadata` section (separate `<div>`) with `foundation: c2` is
  **required**.
- Left column: icon → eyebrow → heading → body → links. Use
  `rowspan` when multiple media sub-rows exist on the right.
- CTA wrapping: primary → `<strong><a>`, secondary → `<em><a>`,
  plain → bare `<a>`. All hrefs use `https://www.adobe.com/`.
- Right column order: background first, foreground second. First
  media shares the `<tr>` with text; subsequent media get own `<tr>`.
- Icon SVGs: use the `aem.page` preview URL as both `href` and
  display text.

### Save HTML to disk

Write to `/tmp/da-upload/<da-path>/<page-name>.html`.

**Auto mode**: proceed to upload without showing the HTML.

**Default**: show the HTML to the user and ask for confirmation.

---

## Phase 6 — Upload to DA

**Auto mode**: proceed without asking. **Default**: present the
upload plan (HTML path, asset count, target) and wait for confirmation.

All curl commands use: `TOKEN=$(da-auth-helper token 2>/dev/null)`

### 6a. Check token

```bash
da-auth-helper token >/dev/null 2>&1 && echo "Token OK" || echo "No token"
```

If it fails: install `npm install -g github:adobe-rnd/da-auth-helper`,
log in `da-auth-helper login` (choose **Skyline** profile), verify.

### 6b. Upload images

Upload each to the shadow folder in parallel:

```bash
curl -s -w "\n%{http_code}" -X POST \
  "https://admin.da.live/source/<org>/<repo>/<parent-path>/.<page-name>/<filename>" \
  -H "Authorization: Bearer $TOKEN" \
  -F "data=@/tmp/figma-media/<page-name>/<filename>;type=<mime-type>"
```

MIME: `.png` → `image/png`, `.jpg` → `image/jpeg`,
`.svg` → `image/svg+xml`, `.webp` → `image/webp`. Expect **201**.

### 6c. Upload HTML

```bash
curl -s -w "\n%{http_code}" -X POST \
  "https://admin.da.live/source/<org>/<repo>/<da-path>/<page-name>.html" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: text/html" \
  --data-binary @/tmp/da-upload/<da-path>/<page-name>.html
```

Expect **200** or **201**.

### 6d. Verify and report

Verify images return **200** from their `content.da.live` URLs.

On success, report:
`Edit: https://da.live/edit#/<org>/<repo>/<da-path>/<page-name>`

### Error handling (Phases 6 and 7)

- **401** → token expired; run `da-auth-helper login` (Skyline).
- **403** → org/repo permissions issue.
- **Images 404** after upload → verify POST returned 201 and path
  matches HTML reference exactly.

---

## Phase 7 — Preview & Publish

**Auto mode**: proceed directly to 7a.

**Default**: ask the user whether to preview and publish. If they
decline, skip to Phase 8.

### 7a. Path safety check (BLOCKING)

If the path does **not** contain `/drafts/`, present this warning
and wait for explicit confirmation:

```
⚠️  You're about to publish to production. Are you sure? (y/n)
```

> **STOP**: This check is mandatory regardless of mode. Never bypass.

If the path contains `/drafts/`, proceed without warning.

### 7b. Preview and publish

```bash
# Preview
curl -s -w "\n%{http_code}" -X POST \
  "https://admin.hlx.page/preview/<org>/<repo>/main/<da-path>/<page-name>" \
  -H "Authorization: Bearer $TOKEN"

# Publish SVG icons first (if any), then the document
curl -s -w "\n%{http_code}" -X POST \
  "https://admin.hlx.page/live/<org>/<repo>/main/<da-path>/<page-name>" \
  -H "Authorization: Bearer $TOKEN"
```

Report on success:
- `Preview: https://main--<repo>--<org>.aem.page/<da-path>/<page-name>`
- `Live: https://main--<repo>--<org>.aem.live/<da-path>/<page-name>`

Errors: see Phase 6 error handling.

---

## Phase 8 — Cleanup

**Auto mode**: delete `/tmp/da-upload/` and `/tmp/figma-media/`
automatically.

**Default**: ask the user whether to keep or delete them.

---

## Phase 9 — Summary

Output:

1. **Block name** and DA file path.
2. **Viewports authored** and what differs per viewport.
3. **Content structure**: icon, eyebrow, heading level, body size,
   link count.
4. **Placeholder links**: remind the user to update the dummy
   `https://www.adobe.com/` URLs with real destinations.
5. **Fallback classifications**: elements where visual heuristics
   were used instead of tokens.
6. **Obstacles encountered**: Figma ambiguities, missing tokens, or
   content requiring manual judgment.
7. **Local files**: paths to temp folders, if not deleted.
