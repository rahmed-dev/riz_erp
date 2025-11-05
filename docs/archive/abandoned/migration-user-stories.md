# User Stories: Project Overview Migration to Custom Page

**Epic:** Migrate Project Overview from Script Report to Custom Frappe Page
**Target Version:** 2.0
**Total Story Points:** 55
**Estimated Duration:** 3 weeks
**Priority:** Medium

---

## Story Point Guide
- 1 point = 1-2 hours
- 3 points = half day
- 5 points = 1 day
- 8 points = 1.5-2 days
- 13 points = 2-3 days

---

## WEEK 1: Foundation & Core Display (21 points)

### US-M001: Create Custom Page Structure
**As a** developer
**I want to** create a new Custom Frappe Page for Project Dashboard
**So that** I have the foundation for the new UI

**Acceptance Criteria:**
- [ ] New page created: `project_dashboard` in riz_erp module
- [ ] Page accessible at `/app/project-dashboard`
- [ ] Page structure includes HTML, JS, CSS files
- [ ] Page shows in ERPNext navigation (Workspace)
- [ ] Permissions set: Projects User role can access
- [ ] Basic layout renders (header + body)

**Technical Notes:**
```bash
cd apps/riz_erp
bench new-page project_dashboard --app riz_erp
```

**Files:**
- `riz_erp/riz_erp/page/project_dashboard/project_dashboard.py`
- `riz_erp/riz_erp/page/project_dashboard/project_dashboard.html`
- `riz_erp/riz_erp/page/project_dashboard/project_dashboard.js`
- `riz_erp/riz_erp/page/project_dashboard/project_dashboard.css`

**Story Points:** 3

---

### US-M002: Data Fetching Service
**As a** developer
**I want to** fetch projects and tasks data using existing backend API
**So that** I have data to display in the custom page

**Acceptance Criteria:**
- [ ] Create `fetchProjectData(filters)` function in JS
- [ ] Calls existing `riz_erp.riz_erp.report.project_overview.project_overview.execute`
- [ ] Handles loading state (show spinner)
- [ ] Handles errors gracefully (show error message)
- [ ] Returns data in tree structure
- [ ] Caches data in page state

**Technical Notes:**
```javascript
function fetchProjectData(filters) {
    return frappe.call({
        method: 'riz_erp.riz_erp.report.project_overview.project_overview.execute',
        args: { filters: filters || {} },
        callback: function(r) {
            if (r.message) {
                return r.message; // [columns, data]
            }
        }
    });
}
```

**Story Points:** 3

---

### US-M003: Tree View Component
**As a** project manager
**I want to** see projects and tasks in a hierarchical tree view
**So that** I can understand project structure at a glance

**Acceptance Criteria:**
- [ ] Tree displays projects as parent nodes
- [ ] Tasks display as child nodes under projects
- [ ] Indentation shows hierarchy (parent/child tasks)
- [ ] Expand/collapse functionality for each node
- [ ] Project names are bold
- [ ] Task names are clickable links to Task form
- [ ] Tree renders with 500+ tasks in <2 seconds

**Technical Notes:**
- Use `frappe.ui.Tree` or custom HTML/CSS
- Data from `fetchProjectData()`
- Indent calculation from `data.indent` field

**UI Structure:**
```
▼ Project Alpha
   Task 1
   Task 2
   ▼ Parent Task 3
      Child Task 3.1
      Child Task 3.2
▼ Project Beta
   Task 1
```

**Story Points:** 8

---

### US-M004: Status Badge Rendering
**As a** project manager
**I want to** see color-coded status badges for tasks
**So that** I can quickly identify task status

**Acceptance Criteria:**
- [ ] Status displayed as colored badge (not plain text)
- [ ] Colors match existing report:
  - Green: Completed, Done, Paid
  - Orange: Working, Pending, In Progress
  - Red: Cancelled, Failed, Overdue
  - Yellow: On Hold, Pending Review
  - Gray: Open, default
- [ ] Badge styling: rounded pill shape, proper padding
- [ ] Badge text is capitalized
- [ ] Accessible color contrast (WCAG AA)

**Technical Notes:**
Reuse CSS from current report (`project_overview.js` lines 98-134)

**Story Points:** 2

---

### US-M005: Basic Filters Panel
**As a** project manager
**I want to** filter projects and tasks by project, status, and visibility
**So that** I can focus on relevant work

**Acceptance Criteria:**
- [ ] Filter panel at top of page
- [ ] Three filters:
  1. Project (Link dropdown)
  2. Status (Select dropdown)
  3. Show Completed Tasks (Checkbox, default unchecked)
- [ ] Filters apply immediately on change (no "Apply" button)
- [ ] Filter state persists in localStorage
- [ ] Changing filters triggers data refresh
- [ ] Loading indicator shows during refresh

**Technical Notes:**
- Use `frappe.ui.FieldGroup` for filters
- Store state: `localStorage.setItem('project_dashboard_filters', JSON.stringify(filters))`

**Story Points:** 5

---

## WEEK 2: Selection & Actions (21 points)

### US-M006: Task Selection Checkboxes
**As a** project manager
**I want to** select multiple tasks using checkboxes
**So that** I can perform bulk operations

**Acceptance Criteria:**
- [ ] Checkbox appears on each task row (not project rows)
- [ ] Checkbox has minimum 44x44px touch target
- [ ] Clicking checkbox selects/deselects task
- [ ] Selected rows highlighted with blue tint and left border
- [ ] Selection state tracked in `Set()` data structure
- [ ] Selection persists during tree expand/collapse
- [ ] Checkboxes clear on page refresh

**Technical Notes:**
```javascript
let selectedTaskIds = new Set();

function toggleTaskSelection(taskId, isChecked) {
    if (isChecked) {
        selectedTaskIds.add(taskId);
    } else {
        selectedTaskIds.delete(taskId);
    }
    updateSelectionUI();
}
```

**Styling:**
```css
.selected-task-row {
    background: rgba(66, 133, 244, 0.08);
    border-left: 3px solid #4285f4;
    transition: all 150ms ease;
}
```

**Story Points:** 5

---

### US-M007: Selection Counter & Toolbar
**As a** project manager
**I want to** see how many tasks are selected and access bulk actions
**So that** I know what I'm operating on

**Acceptance Criteria:**
- [ ] Toolbar appears at top of page (below filters)
- [ ] Selection counter shows:
  - "No tasks selected" (when 0)
  - "1 task selected" (when 1)
  - "X tasks selected" (when >1)
- [ ] Counter updates in real-time as selections change
- [ ] Toolbar has action buttons zone (right side)
- [ ] Toolbar has modern styling (subtle background, border)

**UI Layout:**
```
┌────────────────────────────────────────────────────┐
│ Filters: [Project ▾] [Status ▾] [☐ Show Completed] │
├────────────────────────────────────────────────────┤
│ 5 tasks selected              [Actions ▾] [Create] │
└────────────────────────────────────────────────────┘
```

**Story Points:** 3

---

### US-M008: Action Buttons Visibility Logic
**As a** project manager
**I want to** see action buttons only when relevant
**So that** the UI is clean and uncluttered

**Acceptance Criteria:**
- [ ] "Create Task" button always visible
- [ ] "Update Status" button only visible when tasks selected
- [ ] "Update Dates" button only visible when tasks selected
- [ ] Buttons smoothly fade in/out (CSS transition)
- [ ] Button states:
  - Enabled (blue/green)
  - Disabled (gray, cursor not-allowed)

**Technical Notes:**
```javascript
function updateButtonVisibility() {
    const hasSelection = selectedTaskIds.size > 0;
    $('#btn-update-status').toggle(hasSelection);
    $('#btn-update-dates').toggle(hasSelection);
}
```

**Story Points:** 2

---

### US-M009: Update Task Status Dialog
**As a** project manager
**I want to** update status for a single task via button
**So that** I can manage tasks without leaving the page

**Acceptance Criteria:**
- [ ] "Update Status" button appears on each task row (actions column)
- [ ] Click opens modal dialog
- [ ] Dialog shows:
  - Current status (read-only)
  - New status (dropdown with task statuses)
- [ ] "Update" button calls existing API: `update_task_status()`
- [ ] Success message shows after update
- [ ] Page auto-refreshes after update
- [ ] Dialog closes automatically

**Technical Notes:**
Reuse existing backend: `riz_erp.riz_erp.report.project_overview.project_overview.update_task_status`

**Story Points:** 3

---

### US-M010: Create Task Dialog
**As a** project manager
**I want to** create new tasks from the dashboard
**So that** I can quickly add work without navigating away

**Acceptance Criteria:**
- [ ] "Create Task" button in toolbar
- [ ] Click opens modal dialog with fields:
  - Project (Link, required)
  - Task Name (Data, required)
  - Description (Small Text)
  - Status (Select, default "Open")
  - Assigned To (Link - User)
  - Expected Start Date (Date)
  - Expected End Date (Date)
- [ ] "Create" button calls existing API: `create_task_from_report()`
- [ ] Success message shows new task name
- [ ] Page auto-refreshes to show new task
- [ ] Dialog closes automatically

**Technical Notes:**
Reuse existing backend: `riz_erp.riz_erp.report.project_overview.project_overview.create_task_from_report`

**Story Points:** 5

---

### US-M011: Mobile Responsive Layout
**As a** mobile user
**I want to** use the dashboard on my tablet/phone
**So that** I can manage tasks on the go

**Acceptance Criteria:**
- [ ] Layout adapts to screen sizes:
  - Desktop (>1024px): Full layout
  - Tablet (768-1024px): Compact layout
  - Mobile (<768px): Single column
- [ ] Touch targets minimum 44x44px
- [ ] Buttons have adequate spacing (8px minimum)
- [ ] Font size minimum 14px
- [ ] No horizontal scrolling
- [ ] Filters stack vertically on mobile
- [ ] Tree view scrolls smoothly
- [ ] Tested on:
  - iPad Safari
  - Android Chrome
  - iPhone Safari

**Technical Notes:**
Use CSS media queries and flexbox/grid

**Story Points:** 3

---

## WEEK 3: Bulk Operations & Polish (13 points)

### US-M012: Bulk Update Task Status
**As a** project manager
**I want to** update status for multiple selected tasks at once
**So that** I can save time on repetitive updates

**Acceptance Criteria:**
- [ ] "Update Status" button appears when tasks selected
- [ ] Click opens modal dialog showing:
  - List of selected tasks (max 10 shown, "+ X more" if >10)
  - New status dropdown
  - "Auto-fill completion date" checkbox (default checked)
- [ ] "Update All Tasks" button calls existing API: `bulk_update_task_status()`
- [ ] Progress indicator shows during update
- [ ] Success/error notification shows results:
  - "X tasks updated successfully"
  - "Y tasks failed" (with error details)
- [ ] Page auto-refreshes after update
- [ ] Selections cleared after update
- [ ] Warning if >50 tasks selected

**Technical Notes:**
Reuse existing backend: `riz_erp.riz_erp.report.project_overview.project_overview.bulk_update_task_status`

**Story Points:** 5

---

### US-M013: Bulk Update Task Dates
**As a** project manager
**I want to** set expected dates for multiple tasks at once
**So that** I can efficiently plan sprints

**Acceptance Criteria:**
- [ ] "Update Dates" button appears when tasks selected
- [ ] Click opens modal dialog showing:
  - List of selected tasks (max 10 shown, "+ X more" if >10)
  - Expected Start Date field (optional)
  - Expected End Date field (optional)
  - "Only update if currently empty" checkbox (default checked)
- [ ] Client-side validation: End date >= Start date
- [ ] "Update All Tasks" button calls existing API: `bulk_update_task_dates()`
- [ ] Progress indicator shows during update
- [ ] Success/error notification shows results:
  - "X tasks updated successfully"
  - "Y tasks skipped" (if only_empty enabled)
  - "Z tasks failed" (with error details)
- [ ] Page auto-refreshes after update
- [ ] Selections cleared after update
- [ ] Smart pre-fill: If all tasks from same project, pre-fill project dates

**Technical Notes:**
Reuse existing backend: `riz_erp.riz_erp.report.project_overview.project_overview.bulk_update_task_dates`

**Story Points:** 5

---

### US-M014: Loading States & Indicators
**As a** project manager
**I want to** see clear feedback when actions are processing
**So that** I know the system is working

**Acceptance Criteria:**
- [ ] Initial page load: Skeleton loaders for tree rows
- [ ] Filter change: Overlay spinner + "Loading tasks..."
- [ ] Bulk update: Freezing UI with "Updating X tasks..."
- [ ] Task creation: Button shows spinner + "Creating..."
- [ ] Error states: Red error message with retry option
- [ ] Success states: Green toast notification (auto-dismiss after 3s)

**Technical Notes:**
- Use `frappe.freeze()` for blocking operations
- Use skeleton CSS for loading states
- Use `frappe.show_alert()` for toast notifications

**Story Points:** 2

---

### US-M015: Keyboard Shortcuts (Nice to Have)
**As a** power user
**I want to** use keyboard shortcuts for common actions
**So that** I can work more efficiently

**Acceptance Criteria:**
- [ ] `Ctrl/Cmd + A` - Select all visible tasks
- [ ] `Ctrl/Cmd + D` - Deselect all tasks
- [ ] `Escape` - Close open dialog, clear selections
- [ ] `Ctrl/Cmd + N` - Create new task
- [ ] Shortcuts shown in help tooltip (? icon)
- [ ] Shortcuts don't conflict with browser defaults
- [ ] Works on Mac (Cmd) and Windows/Linux (Ctrl)

**Technical Notes:**
```javascript
$(document).on('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAllTasks();
    }
});
```

**Story Points:** 1

---

## Non-Functional Requirements

### NFR-M001: Performance
- Page loads in <2 seconds with 100 projects + 1000 tasks
- Bulk update 50 tasks in <5 seconds
- Tree expand/collapse <100ms
- Smooth 60fps animations

### NFR-M002: Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile: iOS 13+, Android 8+

### NFR-M003: Accessibility
- Keyboard navigation for all features
- ARIA labels for screen readers
- Color contrast WCAG AA compliant
- Focus indicators visible

### NFR-M004: Code Quality
- ESLint compliant (no errors)
- Inline comments for complex logic
- No console errors or warnings
- Proper error handling (try/catch)

---

## Testing Checklist

### Functional Tests
- [ ] All features from old report work identically
- [ ] Bulk operations handle 1, 10, 50 tasks correctly
- [ ] Filters work independently and combined
- [ ] Tree expand/collapse maintains state
- [ ] Dialogs validate input properly
- [ ] Permissions respected (Projects User only)

### UI Tests
- [ ] Desktop: Chrome, Firefox, Edge (latest)
- [ ] Mobile: iPhone Safari, Android Chrome
- [ ] Tablet: iPad, Android tablet
- [ ] Responsive breakpoints work correctly
- [ ] Touch targets are 44x44px minimum

### Performance Tests
- [ ] Load 1000+ tasks without lag
- [ ] Bulk update 50 tasks in <5s
- [ ] No memory leaks (test 1-hour session)
- [ ] Network requests optimized (no redundant calls)

### Accessibility Tests
- [ ] Keyboard navigation works
- [ ] Screen reader announces selections
- [ ] Focus trap in dialogs
- [ ] Color contrast passes WCAG AA

---

## Story Point Summary

| Week | Epic/Stories | Points |
|------|--------------|--------|
| Week 1 | Foundation & Display | 21 |
| | US-M001: Custom Page Structure | 3 |
| | US-M002: Data Fetching Service | 3 |
| | US-M003: Tree View Component | 8 |
| | US-M004: Status Badge Rendering | 2 |
| | US-M005: Basic Filters Panel | 5 |
| **Week 2** | **Selection & Actions** | **21** |
| | US-M006: Task Selection Checkboxes | 5 |
| | US-M007: Selection Counter & Toolbar | 3 |
| | US-M008: Action Buttons Visibility | 2 |
| | US-M009: Update Task Status Dialog | 3 |
| | US-M010: Create Task Dialog | 5 |
| | US-M011: Mobile Responsive Layout | 3 |
| **Week 3** | **Bulk Ops & Polish** | **13** |
| | US-M012: Bulk Update Status | 5 |
| | US-M013: Bulk Update Dates | 5 |
| | US-M014: Loading States | 2 |
| | US-M015: Keyboard Shortcuts | 1 |
| **TOTAL** | **All Stories** | **55** |

**Velocity Assumption:** 20 points/week → 55 points ≈ 3 weeks

---

## Definition of Done

A user story is complete when:
- [ ] All acceptance criteria met
- [ ] Code reviewed by peer
- [ ] Manual testing on desktop and mobile
- [ ] No console errors or warnings
- [ ] Inline documentation added
- [ ] User guide updated (if user-facing)
- [ ] Deployed to staging server
- [ ] Product owner approved

---

## Migration Cutover Checklist

After all stories complete:
- [ ] Beta test with 5 users for 1 week
- [ ] Fix critical bugs (P0/P1)
- [ ] Performance benchmark vs old report (must be ≥ same)
- [ ] Update navigation menu links
- [ ] Add redirect from old report (optional)
- [ ] Announce to users (email/workspace post)
- [ ] Monitor for 1 week post-launch
- [ ] Archive old report files after 1 month

---

## Rollback Plan

If critical issues found post-launch:
1. Restore old report to navigation menu
2. Hide Custom Page from menu
3. Notify users via banner
4. Fix issues in dev environment
5. Re-test before second launch attempt

**Rollback Trigger:** >10 critical bug reports OR >30% user complaints in first week

---

**Document Version:** 1.0
**Created:** November 2, 2025
**Author:** Mary (Business Analyst)
**Status:** ✅ Ready for Development
**Next Step:** Assign stories to developer and start Week 1 sprint
