# Example: Complex Multi-Feature Project

This example demonstrates a realistic complex project with multiple features, parallel work, blocked tracks, superseded approaches, and various status states.

## Scenario

Building an e-commerce platform with multiple features being developed concurrently. The project includes:
- User authentication (complete)
- Product catalog (in progress)
- Shopping cart (in progress)
- Payment integration (blocked - waiting for API keys)
- Search functionality (superseded - approach changed)

## Project Tree

```bash
track status
```

**Output:**
```
E-commerce Platform (a1b2c3d4) [in_progress]
├── User Authentication (e5f6g7h8) [done]
│   ├── Login Form (i9j0k1l2) [done]
│   │   Files: src/components/auth/LoginForm.tsx, src/api/auth.ts
│   ├── Registration (m3n4o5p6) [done]
│   │   Files: src/components/auth/RegisterForm.tsx
│   └── Password Reset (q7r8s9t0) [done]
│       Files: src/components/auth/ResetPassword.tsx, src/api/auth.ts
├── Product Catalog (u1v2w3x4) [in_progress]
│   ├── Product List Component (y5z6a7b8) [done]
│   │   Files: src/components/products/ProductList.tsx, src/components/products/ProductCard.tsx
│   ├── Product Detail Page (c9d0e1f2) [in_progress]
│   │   Files: src/pages/ProductDetail.tsx, src/api/products.ts
│   ├── Category Filtering (g3h4i5j6) [planned]
│   └── Search Bar (OLD - REST) (k7l8m9n0) [superseded]
│       Files: src/components/search/SearchBar.old.tsx
├── Shopping Cart (o1p2q3r4) [in_progress]
│   ├── Cart State Management (s5t6u7v8) [done]
│   │   Files: src/store/cartSlice.ts, src/hooks/useCart.ts
│   ├── Cart UI Component (w9x0y1z2) [in_progress]
│   │   Files: src/components/cart/Cart.tsx
│   └── Persist Cart to Backend (a3b4c5d6) [planned]
├── Payment Integration (e7f8g9h0) [blocked]
│   └── Stripe Setup (i1j2k3l4) [blocked]
│       Files: src/api/payment.ts
├── Search Functionality (NEW - GraphQL) (m5n6o7p8) [in_progress]
│   ├── GraphQL Client Setup (q9r0s1t2) [done]
│   │   Files: src/graphql/client.ts, src/graphql/queries.ts
│   └── Search UI with Autocomplete (u3v4w5x6) [in_progress]
│       Files: src/components/search/SearchBar.tsx
└── Admin Dashboard (y7z8a9b0) [planned]
```

## Detailed Walkthrough

### 1. Completed Feature: User Authentication

```bash
track status --json | jq '.tracks[] | select(.id == "e5f6g7h8")'
```

**Output:**
```json
{
  "id": "e5f6g7h8",
  "title": "User Authentication",
  "parent_id": "a1b2c3d4",
  "summary": "Complete authentication system with login, registration, and password reset. All forms use Formik with Yup validation. API integration done (src/api/auth.ts). JWT tokens stored in httpOnly cookies for security. Refresh token mechanism implemented. All components tested with 95% coverage. Production-ready.",
  "next_prompt": "None - feature complete",
  "status": "done",
  "kind": "feature",
  "files": []
}
```

**All child tasks are done:**
- Login Form ✓
- Registration ✓
- Password Reset ✓

### 2. In-Progress Feature: Product Catalog

```bash
track status --json | jq '.tracks[] | select(.id == "c9d0e1f2")'
```

**Output:**
```json
{
  "id": "c9d0e1f2",
  "title": "Product Detail Page",
  "parent_id": "u1v2w3x4",
  "summary": "Product detail page showing single product with images, description, price, reviews. Fetches data from /api/products/:id endpoint. Image gallery working with thumbnails and main view. Add to cart button present but not yet wired up (waiting for cart integration). Reviews section UI done but static - not fetching real reviews yet. Responsive layout complete.",
  "next_prompt": "Wire up 'Add to Cart' button to cartSlice.addItem() action. Import useCart hook. On click: dispatch addItem with product data, show success toast. Then implement reviews fetching: create getProductReviews(productId) in src/api/products.ts, call on component mount, display in reviews section. Add loading and error states for reviews.",
  "status": "in_progress",
  "kind": "task",
  "files": ["src/pages/ProductDetail.tsx", "src/api/products.ts"]
}
```

**Feature status:** Mixed
- Product List Component ✓ (done)
- Product Detail Page ⚙️ (in progress - nearly done)
- Category Filtering ○ (planned)
- Search Bar (OLD) ✗ (superseded)

### 3. Superseded Track: Old Search Implementation

```bash
track status --json | jq '.tracks[] | select(.id == "k7l8m9n0")'
```

**Output:**
```json
{
  "id": "k7l8m9n0",
  "title": "Search Bar (OLD - REST)",
  "parent_id": "u1v2w3x4",
  "summary": "Started implementing search with REST API (/api/search endpoint). Component created with input and results dropdown. Auto-debounce on typing (300ms). SUPERSEDED: Architecture decision to use GraphQL instead of REST for search due to better autocomplete performance and filtering capabilities. New implementation in track m5n6o7p8.",
  "next_prompt": "Do not continue this approach. See new GraphQL search implementation: track m5n6o7p8",
  "status": "superseded",
  "kind": "task",
  "files": ["src/components/search/SearchBar.old.tsx"]
}
```

**Why superseded:** Architecture decision changed approach from REST to GraphQL.

**New implementation:**

```bash
track status --json | jq '.tracks[] | select(.id == "m5n6o7p8")'
```

```json
{
  "id": "m5n6o7p8",
  "title": "Search Functionality (NEW - GraphQL)",
  "parent_id": "a1b2c3d4",
  "summary": "GraphQL-based search replacing REST implementation (k7l8m9n0). Better performance for autocomplete and complex filtering.",
  "next_prompt": "Continue with search UI implementation in track u3v4w5x6",
  "status": "in_progress",
  "kind": "feature",
  "files": []
}
```

### 4. Blocked Track: Payment Integration

```bash
track status --json | jq '.tracks[] | select(.id == "i1j2k3l4")'
```

**Output:**
```json
{
  "id": "i1j2k3l4",
  "title": "Stripe Setup",
  "parent_id": "e7f8g9h0",
  "summary": "Started Stripe integration but blocked - need production API keys from ops team. Installed @stripe/stripe-js package. Created payment API client skeleton (src/api/payment.ts) with createPaymentIntent() method (implementation commented out until keys available). Environment variables set up in .env.example. Requested keys from ops@company.com on 2025-01-15. Following up in 2 days if no response.",
  "next_prompt": "BLOCKED - waiting for Stripe API keys. Once received: 1) Add keys to .env (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY), 2) Uncomment implementation in payment.ts, 3) Test connection with Stripe.createPaymentIntent for $1.00, 4) Verify webhook endpoint receives events. See Stripe docs: https://stripe.com/docs/payments/quickstart",
  "status": "blocked",
  "kind": "task",
  "files": ["src/api/payment.ts"]
}
```

**Blocking issue:** Waiting for API credentials from operations team.

**Unblocking track could be created:**

```bash
track new "Obtain Stripe Production Keys" \
  --summary "Need Stripe API keys to complete payment integration. Emailed ops@company.com on Jan 15. Following up." \
  --next "Check email for keys. If not received by Jan 20, escalate to CTO. Once received, update .env and notify track i1j2k3l4 can resume." \
  --status in_progress
```

### 5. Parallel In-Progress Work: Shopping Cart

```bash
track status --json | jq '.tracks[] | select(.id == "w9x0y1z2")'
```

**Output:**
```json
{
  "id": "w9x0y1z2",
  "title": "Cart UI Component",
  "parent_id": "o1p2q3r4",
  "summary": "Building cart UI component (src/components/cart/Cart.tsx). Connected to Redux cartSlice for state. Displays cart items with image, title, price, quantity. Quantity controls (+/-) working and updating state. Remove item button working. Subtotal calculation correct. Checkout button present but not yet functional (waiting for payment integration). Empty cart state with 'Continue shopping' link. Responsive design - drawer on mobile, sidebar on desktop. NOT DONE: persist cart to backend, loading states during updates, optimistic UI updates.",
  "next_prompt": "Add optimistic UI updates: when user clicks +/- or remove, immediately update UI before Redux action completes for better UX. Add loading indicators on quantity buttons during state updates. Then integrate with backend: create POST /api/cart endpoint to persist cart, call on every cart change (debounce 1 second to avoid too many requests). See similar pattern in wishlist component (src/components/Wishlist.tsx lines 67-89).",
  "status": "in_progress",
  "kind": "task",
  "files": ["src/components/cart/Cart.tsx"]
}
```

**Parallel work:** Different developer/agent can work on this while another works on Product Detail Page.

### 6. Planned Feature: Admin Dashboard

```bash
track status --json | jq '.tracks[] | select(.id == "y7z8a9b0")'
```

**Output:**
```json
{
  "id": "y7z8a9b0",
  "title": "Admin Dashboard",
  "parent_id": "a1b2c3d4",
  "summary": "Admin interface for managing products, orders, users. Low priority - scheduled for next sprint.",
  "next_prompt": "When starting: break down into tasks: 1) Admin authentication & role-based access, 2) Product management (CRUD), 3) Order management, 4) User management, 5) Analytics dashboard",
  "status": "planned",
  "kind": "feature",
  "files": []
}
```

**Not started yet** - will be broken down into tasks when work begins.

## Common Queries on Complex Projects

### Query 1: Find All In-Progress Work

```bash
track status --json | jq '.tracks[] | select(.status == "in_progress") | {id, title, kind}'
```

**Output:**
```json
{"id": "a1b2c3d4", "title": "E-commerce Platform", "kind": "super"}
{"id": "u1v2w3x4", "title": "Product Catalog", "kind": "feature"}
{"id": "c9d0e1f2", "title": "Product Detail Page", "kind": "task"}
{"id": "o1p2q3r4", "title": "Shopping Cart", "kind": "feature"}
{"id": "w9x0y1z2", "title": "Cart UI Component", "kind": "task"}
{"id": "m5n6o7p8", "title": "Search Functionality (NEW - GraphQL)", "kind": "feature"}
{"id": "u3v4w5x6", "title": "Search UI with Autocomplete", "kind": "task"}
```

### Query 2: Find Blocked Tracks

```bash
track status --json | jq '.tracks[] | select(.status == "blocked") | {title, summary}'
```

**Output:**
```json
{
  "title": "Payment Integration",
  "summary": "..."
}
{
  "title": "Stripe Setup",
  "summary": "Started Stripe integration but blocked - need production API keys..."
}
```

### Query 3: Count Tasks by Status

```bash
track status --json | jq '[.tracks | group_by(.status)[] | {status: .[0].status, count: length}]'
```

**Output:**
```json
[
  {"status": "planned", "count": 3},
  {"status": "in_progress", "count": 7},
  {"status": "done", "count": 6},
  {"status": "blocked", "count": 2},
  {"status": "superseded", "count": 1}
]
```

### Query 4: Get Next Steps for Active Tasks

```bash
track status --json | jq '.tracks[] | select(.status == "in_progress" and .kind == "task") | {title, next: .next_prompt}'
```

**Output:**
```json
{
  "title": "Product Detail Page",
  "next": "Wire up 'Add to Cart' button to cartSlice.addItem()..."
}
{
  "title": "Cart UI Component",
  "next": "Add optimistic UI updates: when user clicks +/- or remove..."
}
{
  "title": "Search UI with Autocomplete",
  "next": "..."
}
```

### Query 5: List All Files in Project

```bash
track status --json | jq -r '.tracks[].files[]' | sort | uniq
```

**Output:**
```
src/api/auth.ts
src/api/payment.ts
src/api/products.ts
src/components/auth/LoginForm.tsx
src/components/auth/RegisterForm.tsx
src/components/auth/ResetPassword.tsx
src/components/cart/Cart.tsx
src/components/products/ProductCard.tsx
src/components/products/ProductList.tsx
src/components/search/SearchBar.old.tsx
src/components/search/SearchBar.tsx
src/graphql/client.ts
src/graphql/queries.ts
src/hooks/useCart.ts
src/pages/ProductDetail.tsx
src/store/cartSlice.ts
```

### Query 6: Find Features by Completion Status

```bash
# Features that are done
track status --json | jq '.tracks[] | select(.kind == "feature" and .status == "done") | .title'

# Features that are in progress
track status --json | jq '.tracks[] | select(.kind == "feature" and .status == "in_progress") | .title'
```

**Output:**
```
"User Authentication"

"Product Catalog"
"Shopping Cart"
"Search Functionality (NEW - GraphQL)"
```

### Query 7: Get Feature Completion Percentage

```bash
# For Product Catalog feature (u1v2w3x4)
track status --json | jq '
  .tracks[] |
  select(.parent_id == "u1v2w3x4") |
  group_by(.status) |
  map({status: .[0].status, count: length})
'
```

**Output:**
```json
[
  {"status": "done", "count": 1},
  {"status": "in_progress", "count": 1},
  {"status": "planned", "count": 1},
  {"status": "superseded", "count": 1}
]
```

Calculation: 1 done / 3 active tasks (excluding superseded) = 33% complete

## Workflow Patterns Demonstrated

### Pattern 1: Parallel Feature Development

```
Product Catalog (in progress)    Shopping Cart (in progress)
      ↓                                  ↓
Product Detail Page              Cart UI Component
(Agent A working)                (Agent B working)
```

Both features progress independently without conflicts.

### Pattern 2: Blocked Dependency

```
Payment Integration (blocked)
      ↓
Waiting for: Stripe API Keys
      ↓
Create separate track: "Obtain Stripe Keys"
      ↓
When unblocked: Resume payment work
```

### Pattern 3: Superseding Implementation

```
Search Bar (REST) → superseded
      ↓
Architecture decision: Use GraphQL
      ↓
Search Functionality (GraphQL) → new implementation
```

Old track marked `superseded` with reference to new approach.

### Pattern 4: Progressive Feature Completion

```
User Authentication (feature)
├── Login Form (done)
├── Registration (done)
└── Password Reset (done)
      ↓
All children done → Mark feature as done
```

### Pattern 5: Feature Breakdown

```
Admin Dashboard (planned)
      ↓
When starting work:
      ↓
Break into tasks:
- Admin auth
- Product CRUD
- Order management
- User management
- Analytics
```

Don't pre-create all tasks - create as you start work.

## Status Summary

**Project health:**
- ✅ 6 tracks completed (User auth feature complete)
- ⚙️ 7 tracks in progress (Product catalog, cart, search)
- ⚠️ 2 tracks blocked (Payment integration)
- ○ 3 tracks planned (Category filter, cart persistence, admin)
- ✗ 1 track superseded (Old search implementation)

**Next priorities:**
1. Unblock payment (get API keys)
2. Complete product detail page (nearly done)
3. Complete cart UI (nearly done)
4. Finish search autocomplete
5. Start category filtering

## See Also

- [Basic Workflow](basic-workflow.md) - Simple single-feature example
- [AI Agent Usage](ai-agent-usage.md) - AI agent patterns across sessions
- [Usage Guide](../docs/usage.md) - Comprehensive usage guide
- [Command Reference](../docs/commands.md) - All commands and options
