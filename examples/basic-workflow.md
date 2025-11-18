# Example: Basic Workflow

This example demonstrates a complete Track CLI workflow from project initialization to completion, building a simple todo list application.

## Scenario

You're building a todo list web app with a single feature (task management) and three tasks:
1. Create the UI component
2. Add state management
3. Implement persistence

## Step-by-Step Workflow

### 1. Initialize the Project

```bash
cd ~/projects/todo-app
track init "Todo List App"
```

**Output:**
```
✓ Project initialized: Todo List App (a1b2c3d4)
  Database: /Users/you/projects/todo-app/.track/track.db
```

**What happened:**
- Created `.track/` directory
- Created SQLite database
- Created root track with ID `a1b2c3d4`

### 2. Check Initial Status

```bash
track status
```

**Output:**
```
Todo List App (a1b2c3d4) [planned]
```

The project starts with just the root track.

### 3. Create the Feature Track

```bash
track new "Task Management" \
  --summary "Core feature: users can add, complete, and delete tasks" \
  --next "Start with the UI component - task list and input form"
```

**Output:**
```
✓ Track created: Task Management (e5f6g7h8)
  Parent: a1b2c3d4 (Todo List App)
  Status: planned
  Files: 0
```

### 4. Check Status Again

```bash
track status
```

**Output:**
```
Todo List App (a1b2c3d4) [planned]
└── Task Management (e5f6g7h8) [planned]
```

Notice the hierarchy: feature under project.

### 5. Create First Task: UI Component

```bash
track new "TodoList UI Component" \
  --parent e5f6g7h8 \
  --summary "Need component to display tasks and input form" \
  --next "Create TodoList.tsx with task list and input field" \
  --file src/components/TodoList.tsx
```

**Output:**
```
✓ Track created: TodoList UI Component (i9j0k1l2)
  Parent: e5f6g7h8 (Task Management)
  Status: planned
  Files: 1
```

### 6. Start Working on the UI Component

```bash
track continue i9j0k1l2 \
  --summary "Starting work on TodoList component" \
  --next "Create component structure with task list and input" \
  --status in_progress
```

**Output:**
```
✓ Track updated: i9j0k1l2
  Status: in_progress
  Files: 1
```

### 7. Check Status During Work

```bash
track status
```

**Output:**
```
Todo List App (a1b2c3d4) [planned]
└── Task Management (e5f6g7h8) [planned]
    └── TodoList UI Component (i9j0k1l2) [in_progress]
        Files: src/components/TodoList.tsx
```

The tree shows your current work: `TodoList UI Component` is in progress.

### 8. Update Progress: Component Structure Done

```bash
track continue i9j0k1l2 \
  --summary "Created TodoList component with basic structure. Renders task list and has input form. Using map() for tasks. Input has onChange handler. No actual functionality yet - just UI skeleton." \
  --next "Add props interface: tasks array and onAddTask callback. Wire up input to call onAddTask on submit." \
  --status in_progress
```

**Output:**
```
✓ Track updated: i9j0k1l2
  Status: in_progress
  Files: 1
```

### 9. Complete the UI Component

```bash
track continue i9j0k1l2 \
  --summary "TodoList component complete. Props: tasks (Task[]), onAddTask (fn), onToggle (fn), onDelete (fn). Renders task list with checkboxes and delete buttons. Input form with controlled component pattern. Form submit calls onAddTask. All interactions working. Responsive CSS added." \
  --next "None - component complete and ready for integration" \
  --status done \
  --file src/components/TodoList.css
```

**Output:**
```
✓ Track updated: i9j0k1l2
  Status: done
  Files: 2
```

### 10. Create Second Task: State Management

```bash
track new "Add State Management" \
  --parent e5f6g7h8 \
  --summary "Need to manage task state (add, toggle, delete)" \
  --next "Create useTodos hook with useState and handlers" \
  --file src/hooks/useTodos.ts
```

**Output:**
```
✓ Track created: Add State Management (m3n4o5p6)
  Parent: e5f6g7h8 (Task Management)
  Status: planned
  Files: 1
```

### 11. Check Status with Multiple Tasks

```bash
track status
```

**Output:**
```
Todo List App (a1b2c3d4) [planned]
└── Task Management (e5f6g7h8) [planned]
    ├── TodoList UI Component (i9j0k1l2) [done]
    │   Files: src/components/TodoList.tsx, src/components/TodoList.css
    └── Add State Management (m3n4o5p6) [planned]
        Files: src/hooks/useTodos.ts
```

First task is done, second task is planned.

### 12. Work on State Management

```bash
track continue m3n4o5p6 \
  --summary "Created useTodos hook with useState<Task[]>. Implemented handlers: addTask (generates ID, appends), toggleTask (finds by ID, flips completed), deleteTask (filters out by ID). All handlers working correctly." \
  --next "None - hook complete" \
  --status done
```

**Output:**
```
✓ Track updated: m3n4o5p6
  Status: done
  Files: 1
```

### 13. Create Third Task: Persistence

```bash
track new "Add LocalStorage Persistence" \
  --parent e5f6g7h8 \
  --summary "Tasks should persist across page refreshes" \
  --next "Add localStorage.setItem on task changes, getItem on mount"
```

**Output:**
```
✓ Track created: Add LocalStorage Persistence (q7r8s9t0)
  Parent: e5f6g7h8 (Task Management)
  Status: planned
  Files: 0
```

### 14. Work on Persistence

```bash
track continue q7r8s9t0 \
  --status in_progress \
  --summary "Working on localStorage integration" \
  --next "Add useEffect to save tasks on change, load on mount" \
  --file src/hooks/useTodos.ts
```

**Output:**
```
✓ Track updated: q7r8s9t0
  Status: in_progress
  Files: 1
```

### 15. Complete Persistence

```bash
track continue q7r8s9t0 \
  --summary "Added localStorage persistence to useTodos hook. useEffect saves tasks to 'todos' key on any change. Initial state loads from localStorage with fallback to empty array. Tested: tasks persist across page refresh. Works correctly." \
  --next "None - persistence complete" \
  --status done
```

**Output:**
```
✓ Track updated: q7r8s9t0
  Status: done
  Files: 1
```

### 16. Update Feature Track

Now that all tasks are done, mark the feature as complete:

```bash
track continue e5f6g7h8 \
  --summary "Task management feature complete. UI component (TodoList.tsx), state management (useTodos hook), and localStorage persistence all implemented and tested. Users can add, complete, and delete tasks. Data persists across sessions." \
  --next "None - feature ready for testing and code review" \
  --status done
```

**Output:**
```
✓ Track updated: e5f6g7h8
  Status: done
  Files: 0
```

### 17. Final Status Check

```bash
track status
```

**Output:**
```
Todo List App (a1b2c3d4) [planned]
└── Task Management (e5f6g7h8) [done]
    ├── TodoList UI Component (i9j0k1l2) [done]
    │   Files: src/components/TodoList.tsx, src/components/TodoList.css
    ├── Add State Management (m3n4o5p6) [done]
    │   Files: src/hooks/useTodos.ts
    └── Add LocalStorage Persistence (q7r8s9t0) [done]
        Files: src/hooks/useTodos.ts
```

All tasks and the feature are marked `done`.

### 18. View JSON Output

```bash
track status --json
```

**Output (truncated for readability):**
```json
{
  "tracks": [
    {
      "id": "a1b2c3d4",
      "title": "Todo List App",
      "parent_id": null,
      "summary": "",
      "next_prompt": "",
      "status": "planned",
      "kind": "super",
      "files": []
    },
    {
      "id": "e5f6g7h8",
      "title": "Task Management",
      "parent_id": "a1b2c3d4",
      "summary": "Task management feature complete. UI component...",
      "next_prompt": "None - feature ready for testing and code review",
      "status": "done",
      "kind": "feature",
      "files": []
    },
    {
      "id": "i9j0k1l2",
      "title": "TodoList UI Component",
      "parent_id": "e5f6g7h8",
      "summary": "TodoList component complete. Props: tasks...",
      "next_prompt": "None - component complete and ready for integration",
      "status": "done",
      "kind": "task",
      "files": [
        "src/components/TodoList.tsx",
        "src/components/TodoList.css"
      ]
    }
  ]
}
```

## Key Takeaways

### Hierarchy Structure

```
Project (super)
└── Feature (feature)
    ├── Task 1 (task)
    ├── Task 2 (task)
    └── Task 3 (task)
```

- **Super**: Root project (`a1b2c3d4`)
- **Feature**: Has children (`e5f6g7h8`)
- **Tasks**: Leaf nodes (`i9j0k1l2`, `m3n4o5p6`, `q7r8s9t0`)

### Status Progression

1. **planned** → Created but not started
2. **in_progress** → Currently working on
3. **done** → Completed

### Summary Evolution

Summaries became more detailed as work progressed:

- **Start**: "Starting work on TodoList component"
- **Mid**: "Created TodoList component with basic structure..."
- **End**: "TodoList component complete. Props: tasks..."

Each update adds more context, building a complete picture.

### File Associations

Files were associated as created:
- `TodoList.tsx` - Added during task creation
- `TodoList.css` - Added when completed
- `useTodos.ts` - Added during state management task

The final status shows which files belong to which tracks.

### Workflow Pattern

1. **Initialize project** - `track init`
2. **Create feature** - `track new` (defaults to root parent)
3. **Break into tasks** - `track new` with `--parent`
4. **Work sequentially** - Start task → Update → Complete → Next task
5. **Update feature** - Mark feature done when all tasks complete

## Common Queries

### Find in-progress work:
```bash
track status --json | jq '.tracks[] | select(.status == "in_progress")'
```

### Count tasks by status:
```bash
track status --json | jq '[.tracks | group_by(.status)[] | {status: .[0].status, count: length}]'
```

### Get all files:
```bash
track status --json | jq -r '.tracks[].files[]' | sort | uniq
```

Output:
```
src/components/TodoList.css
src/components/TodoList.tsx
src/hooks/useTodos.ts
```

### List task titles:
```bash
track status --json | jq -r '.tracks[] | select(.kind == "task") | .title'
```

Output:
```
TodoList UI Component
Add State Management
Add LocalStorage Persistence
```

## Next Steps

- See [AI Agent Usage Example](ai-agent-usage.md) for AI session patterns
- See [Complex Project Example](complex-project.md) for multi-feature projects
- Read [Usage Guide](../docs/usage.md) for detailed workflows
