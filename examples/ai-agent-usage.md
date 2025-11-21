# Example: AI Agent Usage Pattern

This example demonstrates how an AI agent (like Claude, GPT-4, or custom autonomous agent) would use Track CLI to maintain context across multiple work sessions.

## Scenario

An AI agent is building an authentication system for a web application. The work spans 3 sessions with different agents potentially working on the same project.

---

## Session 1: Project Setup & Planning

### Agent A starts fresh

**Step 1: Check if project exists**

```bash
track status --json 2>/dev/null
```

**Output:** Error (no project exists)

**Step 2: Initialize project**

```bash
track init "User Authentication System"
```

**Output:**
```
✓ Project initialized: User Authentication System (x1y2z3a4)
  Database: /path/to/project/.track/track.db
```

**Step 3: Create high-level feature tracks**

```bash
# Create authentication feature
track new "Login/Logout Flow" \
  --summary "Implement complete authentication: login form, logout, session management" \
  --next "Break down into tasks: 1) login form component, 2) API integration, 3) session handling"

# Create authorization feature
track new "Protected Routes" \
  --summary "Implement route protection for authenticated pages" \
  --next "After login is complete, implement route guards"
```

**Output:**
```
✓ Track created: Login/Logout Flow (b5c6d7e8)
  Parent: x1y2z3a4 (User Authentication System)
  Status: planned
  Files: 0

✓ Track created: Protected Routes (f9g0h1i2)
  Parent: x1y2z3a4 (User Authentication System)
  Status: planned
  Files: 0
```

**Step 4: Break down first feature into tasks**

```bash
track new "Login Form Component" \
  --parent b5c6d7e8 \
  --summary "Need React component with email/password inputs, validation, submit handler" \
  --next "Create src/components/LoginForm.tsx. Use Formik for form state. Add Yup validation schema." \
  --file src/components/LoginForm.tsx
```

**Output:**
```
✓ Track created: Login Form Component (j3k4l5m6)
  Parent: b5c6d7e8 (Login/Logout Flow)
  Status: planned
  Files: 1
```

**Step 5: Start working on login form**

```bash
track update j3k4l5m6 \
  --status in_progress \
  --summary "Starting login form component" \
  --next "Create component skeleton with email and password inputs"
```

**Step 6: Agent does the work**

*Agent creates LoginForm.tsx file with basic structure...*

**Step 7: Update progress before ending session**

```bash
track update j3k4l5m6 \
  --summary "Created LoginForm component (src/components/LoginForm.tsx) with Formik integration. Fields: email (type=email, required), password (type=password, required, min 8 chars). Validation schema using Yup: email format check, password min length. Form renders correctly. Submit handler is placeholder onSubmit prop - not wired to API yet. Styling with Tailwind classes - responsive layout. No tests yet." \
  --next "NEXT SESSION: Wire up submit handler to authentication API. Create API client in src/api/auth.ts with login(email, password) method. On success: store auth token in localStorage, redirect to /dashboard. On error: display error message below form using <FormError> component (create if needed). See similar pattern in ProfileForm.tsx lines 89-156 for reference." \
  --status in_progress \
  --file src/components/LoginForm.tsx
```

**Output:**
```
✓ Track updated: j3k4l5m6
  Status: in_progress
  Files: 1
```

**Key Practices:**
- ✅ Comprehensive summary (what exists, what works, what doesn't)
- ✅ Detailed breadcrumb in `next_prompt` (specific files, line numbers, steps)
- ✅ Referenced similar pattern for context
- ✅ Left clear handoff for next session

---

## Session 2: Resume & Continue

### Agent B resumes work (different agent, next day)

**Step 1: Get project context**

```bash
track status --json
```

**Step 2: Parse JSON to find in-progress work**

```bash
track status --json | jq '.tracks[] | select(.status == "in_progress")'
```

**Output:**
```json
{
  "id": "j3k4l5m6",
  "title": "Login Form Component",
  "parent_id": "b5c6d7e8",
  "summary": "Created LoginForm component (src/components/LoginForm.tsx) with Formik integration. Fields: email (type=email, required), password (type=password, required, min 8 chars). Validation schema using Yup...",
  "next_prompt": "NEXT SESSION: Wire up submit handler to authentication API. Create API client in src/api/auth.ts with login(email, password) method. On success: store auth token in localStorage, redirect to /dashboard...",
  "status": "in_progress",
  "kind": "task",
  "files": ["src/components/LoginForm.tsx"]
}
```

**Step 3: Read associated files for context**

```bash
cat src/components/LoginForm.tsx
```

*Agent reads the file to understand current state...*

**Step 4: Agent understands the breadcrumb**

The `next_prompt` tells Agent B exactly what to do:
1. Create API client in `src/api/auth.ts`
2. Implement `login(email, password)` method
3. Wire up submit handler
4. Handle success: store token, redirect
5. Handle error: display message
6. Reference similar pattern in `ProfileForm.tsx:89-156`

**Step 5: Agent does the work**

*Agent creates src/api/auth.ts with authentication methods...*
*Agent updates LoginForm.tsx to call the API...*

**Step 6: Update progress mid-session**

```bash
track update j3k4l5m6 \
  --summary "LoginForm component exists with Formik validation (previous work). Created auth API client (src/api/auth.ts) with login() method using axios. Method posts to /api/auth/login with email/password, returns {token, user}. Wired up LoginForm submit handler to call authAPI.login(). Success case: stores token in localStorage key 'authToken', redirects to /dashboard using useNavigate(). Error case: displays error.message in FormError component below submit button. Loading state: disables submit button, shows spinner during API call. Pattern matches ProfileForm.tsx reference. NOT YET DONE: error handling for network failures, token refresh logic, logout functionality." \
  --next "Add comprehensive error handling: 1) Network errors (show 'Connection failed' message), 2) 401 errors (show 'Invalid credentials'), 3) 500 errors (show 'Server error'). Then add tests: unit tests for form validation, integration tests for API calls with mock server. Finally implement logout: create logout() method in auth API, add logout button in navbar, clear localStorage on logout." \
  --file src/api/auth.ts \
  --file tests/LoginForm.test.tsx
```

**Step 7: Create logout task**

Agent realizes logout is a separate concern:

```bash
track new "Logout Functionality" \
  --parent b5c6d7e8 \
  --summary "Need logout button and logout API method" \
  --next "Create authAPI.logout() method. Add logout button to Navbar component. On click: call logout(), clear localStorage, redirect to /login." \
  --file src/components/Navbar.tsx
```

**Output:**
```
✓ Track created: Logout Functionality (n7o8p9q0)
  Parent: b5c6d7e8 (Login/Logout Flow)
  Status: planned
  Files: 1
```

**Step 8: Complete login form task**

```bash
track update j3k4l5m6 \
  --summary "Login form component complete. Formik validation working. API integration done (src/api/auth.ts). Submit handler calls API, stores token, redirects. Error handling for network, 401, 500 errors all working with appropriate messages. Loading states implemented. Unit tests added (tests/LoginForm.test.tsx) covering validation, submit success, submit error, loading states. Integration tests with mock API server. All tests passing. Component production-ready." \
  --next "None - login form complete and tested" \
  --status done
```

**Step 9: Work on logout task**

```bash
track update n7o8p9q0 \
  --status in_progress \
  --summary "Implementing logout functionality" \
  --next "Create logout API method and wire up button"
```

*Agent implements logout...*

**Step 10: End session with comprehensive update**

```bash
track update n7o8p9q0 \
  --summary "Logout functionality complete. Added authAPI.logout() method in src/api/auth.ts (posts to /api/auth/logout, clears server session). Added logout button to Navbar component (src/components/Navbar.tsx). On click: calls logout(), removes authToken from localStorage, redirects to /login using useNavigate(). Tested manually: logout works correctly, user is logged out on both client and server. No tests yet." \
  --next "Add unit tests for logout flow. Test: 1) logout API call, 2) localStorage clearing, 3) redirect to /login. Then test edge case: logout when already logged out (should gracefully handle)." \
  --status in_progress \
  --file src/api/auth.ts \
  --file src/components/Navbar.tsx
```

---

## Session 3: Completion & New Feature

### Agent C joins to finish and start next feature

**Step 1: Query current state**

```bash
# Get all in-progress tracks
track status --json | jq '.tracks[] | select(.status == "in_progress") | {id, title, next_prompt}'
```

**Output:**
```json
{
  "id": "n7o8p9q0",
  "title": "Logout Functionality",
  "next_prompt": "Add unit tests for logout flow. Test: 1) logout API call, 2) localStorage clearing, 3) redirect to /login. Then test edge case: logout when already logged out (should gracefully handle)."
}
```

**Step 2: Complete logout tests**

*Agent adds tests...*

```bash
track update n7o8p9q0 \
  --summary "Logout functionality fully complete. API method, navbar button, localStorage clearing, redirect all working. Tests added (tests/logout.test.tsx): logout API call test, localStorage clearing test, redirect test, edge case test (logout when not logged in). All 4 tests passing. Feature production-ready." \
  --next "None - logout complete" \
  --status done \
  --file tests/logout.test.tsx
```

**Step 3: Mark parent feature as complete**

```bash
track update b5c6d7e8 \
  --summary "Login/Logout flow feature complete. Login form component (LoginForm.tsx) with Formik validation, API integration (src/api/auth.ts), error handling, loading states. Logout functionality (Navbar.tsx) with API integration, localStorage clearing, redirect. All components tested. All tests passing. Feature ready for production." \
  --next "None - feature complete" \
  --status done
```

**Step 4: Check what's next**

```bash
track status
```

**Output:**
```
User Authentication System (x1y2z3a4) [planned]
├── Login/Logout Flow (b5c6d7e8) [done]
│   ├── Login Form Component (j3k4l5m6) [done]
│   │   Files: src/components/LoginForm.tsx, src/api/auth.ts, tests/LoginForm.test.tsx
│   └── Logout Functionality (n7o8p9q0) [done]
│       Files: src/api/auth.ts, src/components/Navbar.tsx, tests/logout.test.tsx
└── Protected Routes (f9g0h1i2) [planned]
```

**Step 5: Start next feature**

```bash
track update f9g0h1i2 \
  --summary "Starting protected routes feature. Need route guards to prevent unauthenticated access to protected pages." \
  --next "Create ProtectedRoute component (src/components/ProtectedRoute.tsx). Check localStorage for authToken. If token exists: render children. If no token: redirect to /login. Wrap protected pages with this component in App.tsx routing." \
  --status in_progress \
  --file src/components/ProtectedRoute.tsx \
  --file src/App.tsx
```

*Agent continues work...*

---

## Key AI Agent Patterns

### 1. Session Start Checklist

```bash
# Always start with these commands:
track status --json                                    # Get full context
track status --json | jq '.tracks[] | select(.status == "in_progress")'  # Find active work
cat <file-from-next-prompt>                           # Read relevant files
```

**Warm-up jq trio (copy/paste):**
```bash
track status --json | jq '.tracks[] | select(.status=="in_progress") | {id, title, kind}'
track status --json | jq '.tracks[] | select(.status=="in_progress") | {title, next: .next_prompt}'
track status --json | jq -r '.tracks[] | select(.status=="in_progress") | .files[]?'
```

### 2. Comprehensive Summaries

**Why:** No history to reference, next agent needs complete picture.

**Include:**
- ✅ What files exist and their paths
- ✅ What's implemented and working
- ✅ What's tested vs not tested
- ✅ What's remaining (NOT YET DONE: ...)
- ✅ Any important decisions or patterns

### 3. Breadcrumb Next Prompts

**Why:** Next agent might be different, needs exact instructions.

**Include:**
- ✅ Specific file paths to create/modify
- ✅ Line numbers for references
- ✅ Step-by-step instructions
- ✅ Edge cases to consider
- ✅ References to similar patterns
- ✅ Testing requirements

### 4. Frequent Updates

Update tracks:
- ✅ When starting work (status: in_progress)
- ✅ After major milestones (update summary)
- ✅ When blocked (status: blocked, explain why)
- ✅ When creating subtasks
- ✅ Before ending session (comprehensive update)

### 5. File Associations

Always associate files:

```bash
--file src/component.tsx \
--file src/api.ts \
--file tests/component.test.tsx
```

**Why:** Next agent knows exactly which files to read.

### 6. Task Breakdown

When encountering large work:

```bash
# Don't cram everything in one track
# Create separate tracks for each concern:
track new "Login Form" --parent <feature-id>
track new "Logout Functionality" --parent <feature-id>
track new "Session Management" --parent <feature-id>
```

### 7. Status Discipline

Use status meaningfully:

```bash
planned      # Not started
in_progress  # Actively working
done         # Complete and tested
blocked      # Waiting for something (explain in summary)
superseded   # Replaced by different approach
```

### 8. JSON Parsing in Code

**Python example:**

```python
import subprocess
import json

# Get current work
result = subprocess.run(['track', 'status', '--json'],
                       capture_output=True, text=True)
data = json.loads(result.stdout)

# Find in-progress track
for track in data['tracks']:
    if track['status'] == 'in_progress':
        print(f"Working on: {track['title']}")
        print(f"Next: {track['next_prompt']}")

        # Read associated files
        for filepath in track['files']:
            with open(filepath) as f:
                content = f.read()
                # Process content...
```

## Benefits for AI Agents

### 1. Context Preservation

**Without Track CLI:**
```
Session 1: Agent creates login form
Session 2: New agent has no context, recreates similar form
Session 3: Another agent, confused by duplicates
```

**With Track CLI:**
```
Session 1: Agent creates login form, updates track with details
Session 2: New agent reads track, continues exactly where left off
Session 3: Agent sees complete history in summaries, makes progress
```

### 2. Multi-Agent Coordination

```bash
# Agent 1 works on login (track abc123)
# Agent 2 works on dashboard (track def456)
# No conflicts, both update different tracks
# Both can read full project state
```

### 3. Explicit Handoffs

```bash
track update abc123 \
  --summary "API integration 80% done. Auth endpoints working. Token refresh NOT implemented yet." \
  --next "HANDOFF: Next agent should implement token refresh in src/api/auth.ts using refresh_token from login response. Store refresh_token in localStorage. On 401 error, attempt refresh before showing error. Max 1 retry attempt. See RFC 6749 for OAuth2 refresh flow." \
  --status in_progress
```

## Common Pitfalls to Avoid

### ❌ Vague Summaries

```bash
--summary "Made progress on login"
```

### ✅ Detailed Summaries

```bash
--summary "LoginForm component created with email/password fields. Formik validation working. API integration done. Error handling for 401/500. Tests: 8/10 scenarios covered. Missing: network timeout test, rate limit test."
```

### ❌ Generic Next Steps

```bash
--next "Continue working"
```

### ✅ Specific Breadcrumbs

```bash
--next "Add network timeout handling in src/api/auth.ts axios config (timeout: 5000ms). On timeout: retry once, then show 'Connection timeout' error. Test with mock slow server in tests/auth.test.tsx."
```

### ❌ Forgetting File Associations

```bash
track update abc123 --summary "Added new file" --next "..."
```

### ✅ Always Associate Files

```bash
track update abc123 \
  --summary "Added new auth interceptor" \
  --next "..." \
  --file src/api/interceptors.ts
```

## See Also

- [Usage Guide](../docs/usage.md) - General usage patterns
- [AI Agent Integration](../docs/AGENTS.md) - Comprehensive AI agent guide
- [Basic Workflow](basic-workflow.md) - Simple project example
- [Complex Project](complex-project.md) - Multi-feature example
