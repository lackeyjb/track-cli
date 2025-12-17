# Example: Track Dependencies Workflow

This example demonstrates how to use Track CLI's dependency features to model prerequisite relationships between tracks. Dependencies help you express "this must be done before that" relationships and automatically manage blocked/unblocked status transitions.

## Background

Track CLI's dependency system allows you to:

1. **Define blocking relationships**: Track A blocks Track B (B waits for A)
2. **Auto-manage status**: Blocked tracks automatically change status based on their blockers
3. **Prevent cycles**: Circular dependencies are rejected to maintain a valid DAG
4. **Cascade unblocking**: When a blocker is marked done, blocked tracks are automatically unblocked

## Basic Dependency Workflow

### Step 1: Create the Prerequisite Track

```bash
track init "E-commerce Platform"

# Create the database design task (prerequisite)
track new "Database Schema Design" \
  --summary "Design the database schema for users, products, and orders" \
  --next "Create ER diagram and migration files"
```

**Output:**
```
Created track: Database Schema Design
Track ID: DBSCH123
Parent: ROOT001
```

### Step 2: Create a Dependent Track

```bash
# Create the API track that depends on the database
track new "User API Endpoints" \
  --summary "REST API for user registration, login, profile" \
  --next "Waiting for database schema to be finalized" \
  --blocks DBSCH123
```

**Output:**
```
Created track: User API Endpoints
Track ID: USRAPI45
Parent: ROOT001
Blocks: DBSCH123
```

### Step 3: View Dependencies

```bash
track status
```

**Output:**
```
E-commerce Platform (ROOT001) [planned]
├── Database Schema Design (DBSCH123) [blocked]
│   summary: Design the database schema for users, products, and orders
│   next:    Create ER diagram and migration files
│   status:  blocked
│   blocked by: USRAPI45
│
└── User API Endpoints (USRAPI45) [planned]
    summary: REST API for user registration, login, profile
    next:    Waiting for database schema to be finalized
    status:  planned
    blocks:  DBSCH123
```

Notice that DBSCH123's status automatically changed to "blocked" because USRAPI45 blocks it.

### Step 4: Complete the Prerequisite

When the database schema is done:

```bash
track update USRAPI45 \
  --summary "All schema designs complete, migrations created and tested" \
  --next "" \
  --status done
```

**Output:**
```
Updated track: USRAPI45
Status: done
Unblocked tracks: DBSCH123
```

The Database Schema track is now automatically unblocked:

```bash
track status
```

**Output:**
```
E-commerce Platform (ROOT001) [planned]
├── Database Schema Design (DBSCH123) [planned]
│   summary: Design the database schema for users, products, and orders
│   next:    Create ER diagram and migration files
│   status:  planned
│   blocked by: (none)
│
└── User API Endpoints (USRAPI45) [done]
    summary: All schema designs complete, migrations created and tested
    next:
    status:  done
    blocks:  DBSCH123
```

## Complex Dependency Chains

### Multiple Blockers

A track can have multiple prerequisites:

```bash
# Create three prerequisite tracks
track new "Auth Service" \
  --summary "JWT authentication service" \
  --next "Implement token generation"

track new "User Service" \
  --summary "User management microservice" \
  --next "Build CRUD operations"

track new "Email Service" \
  --summary "Email notification system" \
  --next "Set up SMTP configuration"

# Create a track that depends on all three
track new "Dashboard" \
  --summary "Main user dashboard - needs auth, user data, and notifications" \
  --next "Waiting on all prerequisite services" \
  --blocks AUTH001 --blocks USER002 --blocks EMAIL03
```

The Dashboard track will remain blocked until ALL three services are marked done.

### Checking Dependencies in JSON

```bash
track status --json | jq '.tracks[] | {id, title, status, blocks, blocked_by}'
```

**Output:**
```json
[
  {
    "id": "AUTH001",
    "title": "Auth Service",
    "status": "blocked",
    "blocks": [],
    "blocked_by": ["DASH004"]
  },
  {
    "id": "USER002",
    "title": "User Service",
    "status": "blocked",
    "blocks": [],
    "blocked_by": ["DASH004"]
  },
  {
    "id": "EMAIL03",
    "title": "Email Service",
    "status": "blocked",
    "blocks": [],
    "blocked_by": ["DASH004"]
  },
  {
    "id": "DASH004",
    "title": "Dashboard",
    "status": "planned",
    "blocks": ["AUTH001", "USER002", "EMAIL03"],
    "blocked_by": []
  }
]
```

### Partial Completion

Mark services as done one by one:

```bash
# Complete Auth Service
track update AUTH001 --summary "Auth complete" --next "" --status done

# Dashboard remains blocked (User and Email not done yet)
track show DASH004 --json | jq '{status, blocked_by}'
# Output: {"status": "blocked", "blocked_by": ["DASH004"]}

# Complete User Service
track update USER002 --summary "User service complete" --next "" --status done

# Dashboard still blocked (Email not done yet)

# Complete Email Service
track update EMAIL03 --summary "Email complete" --next "" --status done
# Output: Unblocked tracks: DASH004

# Now Dashboard is unblocked
track show DASH004 --json | jq '{status}'
# Output: {"status": "planned"}
```

## Adding Dependencies Later

Use `--blocks` with `track update` to add dependencies to existing tracks:

```bash
# Create tracks without dependencies
track new "Frontend App" --summary "React frontend" --next "Set up project"
track new "Backend API" --summary "Node.js backend" --next "Set up Express"

# Later, realize frontend depends on API
track update FRONT01 --summary "React frontend" --next "Waiting on API" --blocks BACK002
```

## Removing Dependencies

Use `--unblocks` to remove a blocking relationship:

```bash
# Decided these can be done in parallel after all
track update FRONT01 \
  --summary "Can develop frontend in parallel using mock data" \
  --next "Start with mock API" \
  --unblocks BACK002
```

## Cycle Prevention

Track CLI prevents circular dependencies:

```bash
# A blocks B
track new "Track A" --summary "A"
track new "Track B" --summary "B" --blocks TRACKA

# B blocks A - ERROR!
track update TRACKB --blocks TRACKA
```

**Error Output:**
```
Error: Adding dependency would create a cycle.
Track TRACKB cannot block TRACKA.
```

This also catches indirect cycles:

```bash
# A blocks B, B blocks C
# C trying to block A would create: A -> B -> C -> A (cycle)
```

## Querying Dependencies

### Find All Blocked Tracks

```bash
track status --json | jq '.tracks[] | select(.status == "blocked") | {id, title, blocked_by}'
```

### Find Tracks That Block Others

```bash
track status --json | jq '.tracks[] | select(.blocks | length > 0) | {id, title, blocks}'
```

### Find Tracks Ready to Start

Tracks that have no blockers or all blockers done:

```bash
track status --json | jq '.tracks[] | select(.status == "planned" and (.blocked_by | length == 0)) | {id, title}'
```

### Build Dependency Graph

```bash
track status --json | jq '[.tracks[] | {id, title, blocks}] | map(select(.blocks | length > 0))'
```

## Best Practices

### 1. Model True Prerequisites

Only use `--blocks` for genuine dependencies where one task truly cannot start until another completes:

```bash
# Good: API needs database schema
track new "API" --blocks DATABASE_SCHEMA_ID

# Bad: These can actually be done in parallel
track new "Write docs" --blocks IMPLEMENT_FEATURE  # Don't do this
```

### 2. Keep Chains Short

Avoid long dependency chains (A -> B -> C -> D -> E). They create bottlenecks and are hard to manage.

### 3. Document Why

Use the summary to explain the dependency:

```bash
track new "Deploy to Production" \
  --summary "Waiting for security audit approval before deploy" \
  --blocks SECURITY_AUDIT
```

### 4. Review Regularly

Dependencies can become stale. Review blocked tracks periodically:

```bash
# What's blocked and why?
track status --json | jq '.tracks[] | select(.status == "blocked") | {title, summary, blocked_by}'
```

### 5. Consider Multiple Small Dependencies

Instead of one big blocker, break into smaller dependencies:

```bash
# Instead of one monolithic dependency
track new "Big Feature" --blocks HUGE_PREREQ

# Consider multiple smaller ones
track new "Big Feature" --blocks STEP1 --blocks STEP2 --blocks STEP3
```

## Summary

| Action | Command |
|--------|---------|
| Create with dependency | `track new "X" --blocks <id>` |
| Add dependency later | `track update <id> --blocks <other-id>` |
| Remove dependency | `track update <id> --unblocks <other-id>` |
| View all blocked | `track status --json \| jq '.tracks[] \| select(.status == "blocked")'` |
| Complete blocker | `track update <id> --status done` (auto-unblocks dependents) |
