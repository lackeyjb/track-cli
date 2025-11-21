# jq Recipes for Track CLI JSON

Practical one-liners that sit on top of `track status --json`. Copy/paste as-is; keep the CLI minimal and let jq do the shaping.

## Quick Picks
- **All in-progress tracks (id + title):**
  ```bash
  track status --json | jq '.tracks[] | select(.status=="in_progress") | {id, title, kind}'
  ```

- **Active next steps (title + next_prompt):**
  ```bash
  track status --json | jq '.tracks[] | select(.status=="in_progress") | {title, next: .next_prompt}'
  ```

- **Blocked tracks with parents (good for escalation lists):**
  ```bash
  track status --json | jq '.tracks[] | select(.status=="blocked") | {title, parent: .parent_id, why: .summary}'
  ```

- **Tracks missing next prompts (find weak breadcrumbs):**
  ```bash
  track status --json | jq '.tracks[] | select((.status!="done") and (.next_prompt|length==0)) | {id, title, status}'
  ```

- **Files grouped by feature (parent = feature id):**
  ```bash
  FEATURE="u1v2w3x4"; track status --json \
    | jq --arg f "$FEATURE" '.tracks[] | select(.parent_id==$f) | {title, files}'
  ```

- **Superseded tracks with their replacements (assumes title pattern \"(OLD\"/\"NEW\") or summary reference):**
  ```bash
  track status --json | jq '.tracks[] | select(.status=="superseded") | {title, note: .next_prompt}'
  ```

- **Per-feature completion snapshot (counts by status under a feature):**
  ```bash
  FEATURE="u1v2w3x4"; track status --json \
    | jq --arg f "$FEATURE" '[.tracks[] | select(.parent_id==$f)] | group_by(.status) | map({status: .[0].status, count: length})'
  ```

- **Stale in-progress work (needs timestamps in data):**
  ```bash
  CUTOFF="2025-01-15T00:00:00Z"; track status --json \
    | jq --arg cutoff "$CUTOFF" '.tracks[] | select(.status=="in_progress" and .updated_at < $cutoff) | {title, updated_at}'
  ```
  > If timestamps aren’t stored, skip this recipe.

## Why jq First?
- Zero new flags, zero surface area.
- Encourages power use of existing JSON API.
- Serves as a proving ground; commands that get reused can later “graduate” into CLI flags.
