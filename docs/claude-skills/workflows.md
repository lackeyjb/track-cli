# Track CLI - Common Workflows

Common patterns and workflows for using track CLI effectively. Load this when you need examples of multi-step scenarios.

## Workflow 1: Session Start - Resume Work

**Goal:** Resume work after interruption or new session.

```bash
# 1. Get current project state
track status --json

# 2. Parse JSON to find active work
# Look for status: in_progress, planned, or blocked
# Example with jq:
track status --json | jq '.tracks[] | select(.status == "in_progress" or .status == "planned")'

# 3. For each relevant track, examine:
#    - summary: what's been done
#    - next_prompt: what to do next
#    - files: which files to read
#    - children: if has sub-tasks

# 4. Inform user of current state and offer to resume or start new work
```

**Example Output Interpretation:**
```json
{
  "id": "abc12345",
  "title": "Login Form",
  "status": "in_progress",
  "summary": "Form component created. Email/password fields with validation. Not yet wired to API.",
  "next_prompt": "Wire up form submission to authAPI.login() in src/api/auth.ts. Handle success (redirect /dashboard) and error (show message) cases.",
  "files": ["src/components/LoginForm.tsx", "src/hooks/useForm.ts"]
}
```

**Action:** Read the files, understand current state, continue with next_prompt.

---

## Workflow 2: Create Feature with Tasks

**Goal:** Break down feature into manageable tasks.

```bash
# 1. Create feature track
track new "User Authentication" \
  --summary "Need login, logout, and session management" \
  --next "Break down into tasks: login form, logout button, session handling"

# Output: ✓ Track created: User Authentication (def67890)

# 2. Create tasks under feature (use returned ID as parent)
track new "Login Form" \
  --parent def67890 \
  --summary "Form component with email/password inputs" \
  --next "Create LoginForm.tsx component with Formik"

track new "Logout Button" \
  --parent def67890 \
  --summary "Button to trigger logout and clear session" \
  --next "Create LogoutButton.tsx and wire to authAPI.logout()"

track new "Session Management" \
  --parent def67890 \
  --summary "Token storage, refresh, and expiration handling" \
  --next "Implement token storage in localStorage with refresh logic"

# 3. View hierarchy
track status

# Output shows:
# [feature] def67890 - User Authentication
#   [task] ghi11111 - Login Form
#   [task] jkl22222 - Logout Button
#   [task] mno33333 - Session Management
```

---

## Workflow 3: Work on Task & Update Progress

**Goal:** Track progress incrementally as you work.

```bash
# 1. Start work on task
track update ghi11111 \
  --status in_progress \
  --summary "Starting work on login form component" \
  --next "Create component file and basic form structure"

# 2. Work, make changes...
# Create src/components/LoginForm.tsx

# 3. Update with progress
track update ghi11111 \
  --summary "Form component created. Email and password fields added. Basic structure in place." \
  --next "Add Formik integration for form state and validation" \
  --file src/components/LoginForm.tsx

# 4. Continue working...
# Add Formik, validation

# 5. Update again
track update ghi11111 \
  --summary "Form complete with Formik. Email format validation and password length validation implemented. Error messages display below fields." \
  --next "Wire up form submission to call authAPI.login(). Handle success (redirect) and error (show message) cases." \
  --file src/hooks/useFormValidation.ts

# 6. Final work...
# Add API integration

# 7. Mark as done
track update ghi11111 \
  --summary "Login form complete. Form fields, validation, API integration, error handling, loading states all implemented. Unit tests added and passing." \
  --next "None - ready for code review" \
  --status done \
  --file src/api/auth.ts \
  --file tests/LoginForm.test.tsx
```

---

## Workflow 4: Session End - Save State

**Goal:** Save complete context before ending session.

```bash
# 1. Get current in-progress tracks
track status --json | jq '.tracks[] | select(.status == "in_progress")'

# 2. For each in-progress track, update with comprehensive summary
track update <track-id> \
  --summary "COMPLETE summary: what exists, what's implemented, what works, what's tested, what's left, key decisions made, any blockers or challenges" \
  --next "SPECIFIC next step: exact file paths, line numbers if relevant, clear first action, context needed" \
  --status in_progress

# 3. Verify state saved
track status --json

# Example comprehensive update:
track update abc12345 \
  --summary "Login form component fully implemented (src/components/LoginForm.tsx). Email and password fields with Formik state management. Validation working (email format check, password min 8 chars). Form submits to authAPI.login() with loading state (disables button, shows spinner). Success case redirects to /dashboard using useNavigate(). Error case displays error.message in FormError component below submit button. Unit tests in tests/LoginForm.test.tsx cover happy path and 3 error cases - all passing. Integration tested manually - working correctly. NOT YET DONE: accessibility audit (ARIA labels), mobile responsive layout, 'remember me' checkbox." \
  --next "Next session: 1) Add ARIA labels for screen readers (see WCAG guidelines). 2) Make form responsive for mobile (use CSS Grid, test on viewport < 768px). 3) Add 'remember me' checkbox that stores preference in localStorage. Reference ProfileForm.tsx lines 89-112 for similar checkbox pattern."
```

---

## Workflow 5: Multi-Agent Coordination

**Goal:** Multiple agents work on same project without conflicts.

### Pattern A: Parallel Work (Different Features)

```bash
# Agent 1: Claims authentication feature
track update auth-feature-id \
  --summary "Agent 1 working on authentication" \
  --status in_progress

# Agent 2: Claims dashboard feature (same time, different track)
track update dash-feature-id \
  --summary "Agent 2 working on dashboard" \
  --status in_progress

# No conflicts - different tracks
```

### Pattern B: Sequential Handoff

```bash
# Agent 1: Completes API work
track update abc12345 \
  --summary "API client complete. All endpoints working. Tests passing." \
  --next "HANDOFF: Wire up UI components to use this API. See API usage examples in tests/api.test.ts. Success/error handling patterns in src/api/README.md" \
  --status done

# Agent 2: Starts UI work (next session)
track status --json | jq '.tracks[] | select(.id == "abc12345")'
# Reads handoff message, proceeds with UI work
```

### Pattern C: Collaborative (Same Feature)

```bash
# Session 1 - Agent A
track update abc12345 \
  --summary "Started payment integration. Stripe SDK configured. Test credentials working. Created PaymentForm.tsx skeleton." \
  --next "Next: Add payment method selection (card/bank). Implement form validation for card number/CVV/expiry. Wire up to Stripe.createToken(). See Stripe docs: https://stripe.com/docs/..." \
  --status in_progress

# Session 2 - Agent B (different agent, later)
track status --json | jq '.tracks[] | select(.id == "abc12345")'
# Reads Agent A's summary and next steps
# Continues exactly where Agent A left off

track update abc12345 \
  --summary "Payment form complete. Card/bank selection working. Stripe.createToken() integration done. Form validation complete (Luhn algorithm for card, expiry date validation, CVV length). Token creation tested with Stripe test cards - working correctly." \
  --next "Next: Handle token creation success (save payment method to backend API) and errors (display user-friendly message). Add loading states. See backend API endpoint: POST /api/payment-methods" \
  --status in_progress
```

---

## Workflow 6: Handling Blocked Work

**Goal:** Track blockers and create unblocking tasks.

```bash
# 1. Discover blocker while working
track update abc12345 \
  --summary "Payment integration started but blocked - need Stripe API keys from ops team" \
  --next "Once credentials received: configure in .env, test connection with Stripe.test(), then implement payment flow" \
  --status blocked

# 2. Create unblocking task
track new "Obtain Stripe API Keys" \
  --summary "Need production Stripe keys for payment integration (track abc12345)" \
  --next "Email ops@company.com requesting keys. Include justification: payment feature for user story #456. CC manager." \
  --status in_progress

# 3. Later, when unblocked
track update abc12345 \
  --summary "Received API keys. Stripe SDK configured with production credentials. Test connection successful." \
  --next "Implement payment flow: create checkout session, handle webhooks, update order status" \
  --status in_progress
```

---

## Workflow 7: Superseding Approach

**Goal:** Abandon one approach for another, maintaining history.

```bash
# Original approach
track update abc12345 \
  --summary "Started with REST API approach but discovered GraphQL requirement in architecture meeting" \
  --next "See new track def67890 for GraphQL implementation. This approach abandoned." \
  --status superseded

# New approach
track new "GraphQL API Implementation" \
  --summary "Replacing REST API (track abc12345 superseded) with GraphQL per architecture decision doc v2.3. Using Apollo Server." \
  --next "Set up Apollo Server, define schema for User and Product types, implement resolvers" \
  --status in_progress
```

---

## Workflow 8: Progressive Feature Development

**Goal:** Build feature incrementally with clear milestones.

```bash
# Milestone 1: Component skeleton
track update abc12345 \
  --summary "Component created. Props interface defined. Basic render working. No logic yet." \
  --next "Implement state management with useState for form fields" \
  --status in_progress

# Milestone 2: State management
track update abc12345 \
  --summary "Component with state management. Form fields controlled with useState. Input changes updating state correctly." \
  --next "Add validation logic: email format, password length, required fields" \
  --status in_progress

# Milestone 3: Validation
track update abc12345 \
  --summary "Validation complete. Email format check, password min 8 chars, required field checks. Error messages display correctly." \
  --next "Wire up form submission to API. Handle loading, success, error states" \
  --status in_progress

# Milestone 4: API integration
track update abc12345 \
  --summary "API integration done. Form submits to authAPI.login(). Loading state shows spinner. Success redirects to /dashboard. Errors display below form." \
  --next "Add unit tests for validation and submission logic" \
  --status in_progress

# Milestone 5: Testing
track update abc12345 \
  --summary "Unit tests complete. Tests cover validation rules, successful submission, error handling, loading states. All tests passing (95% coverage)." \
  --next "Manual testing, then mark as done" \
  --status in_progress

# Done!
track update abc12345 \
  --summary "Feature complete and tested. Unit tests passing. Manual testing complete. Ready for code review." \
  --next "None - submit PR for review" \
  --status done
```

---

## Workflow 9: Finding Work to Do

**Goal:** Determine what to work on next.

```bash
# Get all planned work (not started)
track status --json | jq '.tracks[] | select(.status == "planned") | {id, title, next_prompt}'

# Get all in-progress work (partially done)
track status --json | jq '.tracks[] | select(.status == "in_progress") | {id, title, next_prompt}'

# Get blocked work (might be unblocked now)
track status --json | jq '.tracks[] | select(.status == "blocked") | {id, title, summary}'

# Find tasks only (leaf nodes - concrete work)
track status --json | jq '.tracks[] | select(.kind == "task" and .status != "done") | {id, title, next_prompt}'

# Prioritize: in_progress > planned > blocked
# Pick one and start working
```

---

## Workflow 10: Debugging "Lost Context"

**Symptom:** Agent doesn't understand current state.

**Solution:** Improve summaries and breadcrumbs.

```bash
# Bad summary
track update abc12345 \
  --summary "Made some progress" \
  --next "Keep working"

# Good summary (comprehensive)
track update abc12345 \
  --summary "Login form component (src/components/LoginForm.tsx) has email/password inputs with Formik state management. Validation implemented: email format (regex /^[^@]+@[^@]+$/), password min 8 chars. authAPI.login() integration complete in handleSubmit() function (line 67). Success case redirects to /dashboard using useNavigate() hook. Error case shows error.message in FormError component (line 89). Loading state managed with isSubmitting from Formik. Unit tests (tests/LoginForm.test.tsx) cover: happy path login, invalid email, invalid password, API error response - all passing. Manual testing done on Chrome and Firefox - working. NOT YET DONE: Safari testing, accessibility ARIA labels, mobile responsive layout." \
  --next "Add ARIA labels: aria-label='Email address' on email input (line 34), aria-label='Password' on password input (line 45), aria-live='polite' on error message div (line 89). Test with screen reader (VoiceOver). Then make responsive: use CSS Grid, test on iPhone 12 viewport (390x844). Reference ProfileForm.tsx lines 23-67 for similar mobile-first pattern."
```

---

## Quick Reference: When to Update Tracks

**Update tracks:**
- ✅ After implementing a function/component
- ✅ Before switching to different feature
- ✅ When hitting a blocker
- ✅ At logical breakpoints (tests passing, feature working)
- ✅ **ALWAYS before ending session**

**Don't update tracks:**
- ❌ After every single line of code
- ❌ For trivial changes (typos, formatting)
- ❌ More than necessary (creates noise)
