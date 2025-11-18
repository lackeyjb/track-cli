# AI Agent Integration Guide

This guide is specifically for AI agents (LLMs, autonomous systems) using Track CLI to maintain context across work sessions.

## Why Track CLI for AI Agents?

### The Context Problem

AI agents face unique challenges with long-running projects:

- **Session limits**: Token limits and context windows
- **Memory loss**: No persistence between conversations
- **Multi-agent**: Multiple agents need shared state
- **Resumption**: Must pick up where previous session left off

### Track CLI's Solution

- **Stable JSON API**: Programmatic access to project state
- **Current-state model**: No history noise, just what matters now
- **Comprehensive summaries**: Forced to capture complete context
- **Multi-agent safe**: SQLite WAL mode for concurrent access
- **Opaque storage**: Can't bypass CLI and corrupt data

## Core Pattern: Session Resumption

### At Session Start

**1. Check for existing project:**
```bash
track status --json
```

**2. If exists, read current state:**
```bash
# Get all in-progress work
track status --json | jq '.tracks[] | select(.status == "in_progress")'

# Get specific track by ID
track status --json | jq '.tracks[] | select(.id == "<track-id>")'
```

**3. Parse the JSON and extract:**
- `summary`: What's been done
- `next_prompt`: What to do next
- `files`: Associated files to read
- `status`: Current state
- `kind`: Track type (super/feature/task)

**4. Read associated files for context:**
```bash
# Extract file list
FILES=$(track status --json | jq -r '.tracks[] | select(.id == "<track-id>") | .files[]')

# Read each file
for file in $FILES; do
  cat "$file"
done
```

### During Session

**Update progress as you work:**
```bash
track continue <track-id> \
  --summary "Previous work + what I just did" \
  --next "What remains to be done" \
  --status in_progress \
  --file path/to/new/file.ts
```

**Create new tracks for subtasks:**
```bash
track new "Subtask discovered during work" \
  --parent <current-track-id> \
  --summary "Need to do X before Y" \
  --next "Start with Z"
```

### At Session End

**Update state before finishing:**
```bash
track continue <track-id> \
  --summary "Complete summary of ALL work done (not just this session)" \
  --next "Specific next step for next session" \
  --status in_progress  # or done/blocked
```

**Key principle:** Your summary must be **comprehensive** because there's no history to reference.

## The Breadcrumb Pattern

From the Track CLI specification (section 6.3):

### Problem

AI agents lose context between sessions. Even with summaries, critical details get lost.

### Solution: Breadcrumb Trail

Leave detailed breadcrumbs in `next_prompt` that guide the next session:

**Bad (vague):**
```bash
--next "Continue with authentication"
```

**Good (specific breadcrumb):**
```bash
--next "Wire up LoginForm component (src/components/LoginForm.tsx) to authAPI.login() in src/api/auth.ts. Handle success: redirect to /dashboard. Handle error: show error message below form. Then add loading spinner during API call."
```

### Breadcrumb Principles

1. **Be specific**: Exact file paths, function names, line numbers
2. **Be sequential**: First do X, then Y, then Z
3. **Include context**: Why this approach was chosen
4. **Anticipate questions**: Answer them preemptively
5. **Reference files**: Name specific files to check

### Example Breadcrumb

```bash
track continue abc12345 \
  --summary "Authentication API client created in src/api/auth.ts with login/logout methods. Uses axios with interceptors for token refresh. Error handling with custom AuthError class in src/errors/auth.ts. Unit tests in src/api/__tests__/auth.test.ts with 90% coverage." \
  --next "Next: Wire up the LoginForm component (src/components/LoginForm.tsx lines 45-67) to call authAPI.login(). On success, store token in localStorage and redirect to /dashboard using useNavigate(). On error, display error.message in <FormError> component below submit button. Add loading state during API call to disable submit button and show spinner. Pattern similar to SignupForm.tsx lines 89-112." \
  --file src/components/LoginForm.tsx \
  --file src/api/auth.ts
```

**Why this works:**
- Specific files and line numbers
- Clear success/error handling
- References similar pattern
- Includes implementation details
- Next agent knows exactly what to do

## JSON Parsing Examples

### JavaScript/Node.js

```javascript
const { execSync } = require('child_process');

// Get project status
const output = execSync('track status --json', { encoding: 'utf-8' });
const data = JSON.parse(output);

// Find in-progress tracks
const inProgress = data.tracks.filter(t => t.status === 'in_progress');

// Get next steps
inProgress.forEach(track => {
  console.log(`Track: ${track.title}`);
  console.log(`Next: ${track.next_prompt}`);
  console.log(`Files:`, track.files);
});
```

### Python

```python
import subprocess
import json

# Get project status
result = subprocess.run(['track', 'status', '--json'],
                       capture_output=True, text=True)
data = json.loads(result.stdout)

# Find in-progress tracks
in_progress = [t for t in data['tracks'] if t['status'] == 'in_progress']

# Get next steps
for track in in_progress:
    print(f"Track: {track['title']}")
    print(f"Next: {track['next_prompt']}")
    print(f"Files: {track['files']}")
```

### Shell (jq)

```bash
# Get in-progress tracks
track status --json | jq '.tracks[] | select(.status == "in_progress")'

# Get next prompt for specific track
NEXT=$(track status --json | jq -r '.tracks[] | select(.id == "abc12345") | .next_prompt')
echo "$NEXT"

# Get all files from in-progress tracks
track status --json | jq -r '.tracks[] | select(.status == "in_progress") | .files[]'
```

## Multi-Agent Scenarios

### Parallel Work Pattern

Multiple agents work on different features simultaneously:

```bash
# Agent 1: Working on authentication
track continue auth-track-id \
  --summary "Agent 1: Implementing login form" \
  --next "Agent 1: Add validation" \
  --status in_progress

# Agent 2: Working on dashboard (same time)
track continue dash-track-id \
  --summary "Agent 2: Building widget system" \
  --next "Agent 2: Add drag-and-drop" \
  --status in_progress
```

**Safe because:**
- SQLite WAL mode allows concurrent reads
- Writes to different tracks don't conflict
- Each agent works on separate features

### Sequential Handoff Pattern

Agent 1 completes work and hands off to Agent 2:

```bash
# Agent 1 finishes
track continue abc12345 \
  --summary "API client complete. All endpoints working. Tests passing." \
  --next "HANDOFF to Agent 2: Wire up UI components to use this API. See API usage examples in tests/api.test.ts" \
  --status done

# Agent 2 starts (next session)
track status --json | jq '.tracks[] | select(.id == "abc12345")'
# Reads the handoff message in next_prompt
# Proceeds with UI work
```

### Collaborative Pattern

Agents work on same feature across sessions:

```bash
# Session 1 - Agent A
track continue abc12345 \
  --summary "Started form component. Built layout and input fields. No validation yet." \
  --next "Add Formik validation for email (required, email format) and password (required, min 8 chars). See validation patterns in ProfileForm.tsx." \
  --status in_progress

# Session 2 - Agent B (different agent, later)
track status --json | jq '.tracks[] | select(.id == "abc12345")'
# Reads summary and next_prompt
# Continues exactly where Agent A left off

track continue abc12345 \
  --summary "Form component with layout, inputs, and Formik validation (email format, password min 8). Validation working correctly." \
  --next "Wire up submit handler to call auth API. Handle success/error states." \
  --status in_progress
```

## Best Practices for AI Agents

### 1. Always Read Before Writing

```bash
# DON'T start immediately
track new "New Feature"

# DO check existing state first
track status --json | jq '.tracks[] | select(.status == "in_progress")'
# Then decide what to work on
```

### 2. Update Frequently

Update tracks at logical breakpoints:

- ✅ After implementing a function
- ✅ Before switching to different file
- ✅ When blocked on something
- ✅ Before ending session
- ❌ Not after every single line of code

### 3. Be Comprehensive in Summaries

**Bad (too brief):**
```bash
--summary "Fixed bug"
```

**Good (complete context):**
```bash
--summary "Fixed authentication bug where token refresh was failing. Issue was expired tokens not being caught properly. Added try-catch in auth interceptor (src/api/interceptors.ts line 34) to detect 401 errors and trigger refresh. Added unit test to verify fix. All auth tests now passing."
```

### 4. Be Specific in Next Steps

**Bad (vague):**
```bash
--next "Continue working on feature"
```

**Good (actionable):**
```bash
--next "Add error handling to API client. Specifically: 1) catch network errors in axios interceptor, 2) add retry logic (max 3 attempts, exponential backoff), 3) display user-friendly error messages. See similar pattern in old API client (src/legacy/api.ts lines 156-189)."
```

### 5. Track File Associations

Always associate files you create or modify:

```bash
track continue abc12345 \
  --file src/components/LoginForm.tsx \    # Created
  --file src/hooks/useAuth.ts \            # Created
  --file src/api/auth.ts \                 # Modified
  --file tests/auth.test.ts                # Created
```

**Why:** Next agent knows exactly which files to check.

### 6. Use Status Effectively

```bash
# Mark as blocked when stuck
track continue abc12345 \
  --summary "Implementation blocked - need API credentials" \
  --next "Request credentials from ops, then configure in .env" \
  --status blocked

# Create unblocking task
track new "Get API Credentials" \
  --summary "Need Stripe API keys for payment integration" \
  --next "Email ops@company.com with request" \
  --status in_progress
```

### 7. Handle Errors Gracefully

```bash
# If track doesn't exist
if ! track status --json | jq -e '.tracks[] | select(.id == "abc12345")' > /dev/null; then
  echo "Track not found, creating new one"
  track new "My Feature"
fi
```

### 8. Query Efficiently

```bash
# Get only what you need
track status --json | jq '.tracks[] | select(.status == "in_progress") | {id, title, next_prompt, files}'

# Instead of parsing everything
track status --json  # Returns all data
```

## Common Patterns

### Pattern: Feature Breakdown

```bash
# Agent analyzes requirement, breaks into tasks

# Create feature
FEATURE_ID=$(track new "User Profile Page" \
  --summary "User story: As a user I want to edit my profile" \
  --next "Break down into subtasks" | grep -oP '\(\K[^)]+')

# Create tasks
track new "Profile Form Component" \
  --parent "$FEATURE_ID" \
  --summary "Need form with name, email, avatar fields" \
  --next "Create ProfileForm.tsx with Formik"

track new "Avatar Upload" \
  --parent "$FEATURE_ID" \
  --summary "Need image upload with preview" \
  --next "Use react-dropzone, integrate with S3"

track new "Form Validation" \
  --parent "$FEATURE_ID" \
  --summary "Validate email format, name required" \
  --next "Add Yup schema validation"
```

### Pattern: Progressive Implementation

```bash
# Session 1: Setup
track continue abc12345 \
  --summary "Created component skeleton. Set up props interface. No logic yet." \
  --next "Implement form state management with useState" \
  --status in_progress

# Session 2: Core logic
track continue abc12345 \
  --summary "Component skeleton done. Form state management with useState. Controlled inputs working." \
  --next "Add validation logic and error display" \
  --status in_progress

# Session 3: Polish
track continue abc12345 \
  --summary "Component with state, validation, error display. All working correctly." \
  --next "Add loading states, success messages, and tests" \
  --status in_progress

# Session 4: Complete
track continue abc12345 \
  --summary "Component complete: state, validation, errors, loading, success. Unit tests added with 95% coverage. Integration tested manually." \
  --next "None - ready for code review" \
  --status done
```

### Pattern: Blocked Dependency

```bash
# Discover blocking dependency
track continue abc12345 \
  --summary "Started payment integration but need API keys from ops" \
  --next "Once credentials received, configure Stripe SDK with keys and test connection" \
  --status blocked

# Create unblocking track
track new "Obtain Stripe API Keys" \
  --summary "Need production Stripe keys for payment integration" \
  --next "Email ops@company.com requesting keys. Include justification: payment feature for user story #456" \
  --status in_progress

# Later, when unblocked
track continue abc12345 \
  --summary "Received API keys. Stripe SDK configured. Test connection successful." \
  --next "Implement payment flow: create checkout session, handle webhooks" \
  --status in_progress
```

### Pattern: Superseding Approach

```bash
# Original approach
track continue abc12345 \
  --summary "Started with REST API approach but discovered GraphQL requirement" \
  --next "See new track def67890 for GraphQL implementation" \
  --status superseded

# New approach
track new "GraphQL API Implementation" \
  --summary "Replacing REST API (track abc12345) with GraphQL per architecture decision in meeting notes" \
  --next "Set up Apollo Server, define schema, implement resolvers" \
  --status in_progress
```

## Integration Examples

### Example: LangChain Tool

```python
from langchain.tools import Tool
import subprocess
import json

def track_status():
    """Get current project status from Track CLI"""
    result = subprocess.run(['track', 'status', '--json'],
                          capture_output=True, text=True)
    return json.loads(result.stdout)

def track_continue(track_id, summary, next_step, status='in_progress'):
    """Update a track's state"""
    subprocess.run([
        'track', 'continue', track_id,
        '--summary', summary,
        '--next', next_step,
        '--status', status
    ])
    return f"Track {track_id} updated"

track_status_tool = Tool(
    name="TrackStatus",
    func=track_status,
    description="Get current project status and in-progress tracks"
)

track_update_tool = Tool(
    name="TrackUpdate",
    func=track_continue,
    description="Update track with summary and next steps"
)
```

### Example: Custom Agent Loop

```javascript
// Simple agent loop with Track CLI integration
async function agentLoop() {
  // 1. Get current context
  const status = JSON.parse(
    execSync('track status --json').toString()
  );

  const inProgress = status.tracks.filter(t => t.status === 'in_progress');

  if (inProgress.length === 0) {
    console.log('No work in progress');
    return;
  }

  // 2. Pick a track to work on
  const track = inProgress[0];
  console.log(`Working on: ${track.title}`);
  console.log(`Next: ${track.next_prompt}`);

  // 3. Do work (your agent logic here)
  const result = await doWork(track);

  // 4. Update track with results
  execSync(`track continue ${track.id} \
    --summary "${result.summary}" \
    --next "${result.nextStep}" \
    --status ${result.done ? 'done' : 'in_progress'}`
  );

  console.log('Track updated');
}
```

## Debugging AI Agent Issues

### Issue: Agent Forgets Context

**Symptom:** Agent repeats work or misses important details.

**Solution:** Improve summary and breadcrumbs:
```bash
track continue abc12345 \
  --summary "COMPLETE context: what files exist, what's implemented, what works, what doesn't" \
  --next "SPECIFIC breadcrumb with file paths, line numbers, exact steps"
```

### Issue: Agent Works on Wrong Track

**Symptom:** Agent picks wrong task from multiple in-progress tracks.

**Solution:** Better status management:
```bash
# Finish current track before starting new one
track continue abc12345 --status done

# Or use different status
track continue abc12345 --status blocked  # Don't work on this now
track continue def67890 --status in_progress  # Work on this
```

### Issue: Multiple Agents Conflict

**Symptom:** Agents overwrite each other's work.

**Solution:** Separate tracks per agent:
```bash
# Agent 1 owns authentication feature
track continue auth-feature-id ...

# Agent 2 owns dashboard feature
track continue dash-feature-id ...

# No overlap in tracks = no conflicts
```

### Issue: Summaries Too Brief

**Symptom:** Next session has no context, starts over.

**Solution:** Comprehensive summaries:
```bash
# Include: what exists, what works, what's tested, what's left
--summary "Login form component exists (src/components/LoginForm.tsx) with email/password inputs. Formik integration done with validation schema (email required + format, password required + min 8 chars). Form submits to authAPI.login() (src/api/auth.ts line 45). Success case redirects to /dashboard. Error case shows message below form. Loading state disables submit button. Unit tests in tests/LoginForm.test.ts cover happy path + 3 error cases. Manual testing done - all working. NOT YET DONE: integration tests, accessibility audit, mobile responsive layout."
```

## Advanced: Query Optimization

### Caching Status

```python
import subprocess
import json
import time

class TrackCache:
    def __init__(self, ttl=60):
        self.cache = None
        self.cache_time = 0
        self.ttl = ttl

    def get_status(self):
        now = time.time()
        if self.cache is None or (now - self.cache_time) > self.ttl:
            result = subprocess.run(['track', 'status', '--json'],
                                  capture_output=True, text=True)
            self.cache = json.loads(result.stdout)
            self.cache_time = now
        return self.cache

# Use cached status
cache = TrackCache(ttl=60)  # Cache for 60 seconds
status = cache.get_status()
```

### Filtering Early

```bash
# Instead of: get all, filter in code
track status --json | jq '.tracks[]'  # Then filter in Python/JS

# Do: filter with jq first
track status --json | jq '.tracks[] | select(.status == "in_progress")'
```

## See Also

- [Usage Guide](usage.md) - General usage patterns
- [Command Reference](commands.md) - Command details
- [Examples](../examples/ai-agent-usage.md) - Complete AI agent example
***REMOVED***
