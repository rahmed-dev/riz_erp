# Project Overview Report - Bulk Operations & Enhanced UX

## Feature Overview

Enhancement of the Project Overview Report to support bulk operations, intelligent filtering, and streamlined task management through an improved toolbar interface.

**Status:** 📋 Planned
**Priority:** High
**Related Feature:** [Project Overview Report](./project-overview-report.md)
**Target Version:** 1.2

---

## Problem Statement

### Current Pain Points

1. **Completed Task Clutter** - Report shows all tasks including completed ones, making it difficult to focus on active work
2. **Repetitive Actions** - Users must click individual buttons for each task when updating multiple tasks
3. **Limited Date Management** - No way to update expected start/end dates without leaving the report
4. **Inefficient Workflow** - Bulk status updates require multiple clicks and dialog interactions

### User Impact

Project managers working with 10+ tasks per project spend unnecessary time:
- Scrolling through completed tasks to find active work
- Clicking "Update Status" repeatedly for similar tasks
- Navigating away from report to manage task dates

---

## Proposed Solution

### High-Level Approach

Transform the report from a **view-only tool with individual actions** to a **powerful task management interface** with:
- Smart filtering to reduce cognitive load
- Bulk selection capabilities for efficient updates
- Unified action toolbar for streamlined workflows
- In-line date management

---

## Detailed Requirements

### 1. Smart Task Filtering

#### 1.1 Hide Completed Tasks by Default
**Requirement:** Report should only show active tasks (non-completed) on initial load

**Rationale:**
- Reduces noise and focuses attention on actionable items
- Most common use case is managing active work, not reviewing history
- Improves performance with large datasets

**Implementation:**
- Default filter: `status != "Completed"`
- Applied on report load
- User preference persists across sessions (local storage)

#### 1.2 Show Completed Tasks Toggle
**Requirement:** Checkbox in report toolbar labeled "Show Completed Tasks"

**Behavior:**
- Unchecked (default): Only non-completed tasks visible
- Checked: All tasks visible including completed
- Toggle updates report instantly without page reload
- State persists in browser session

**UI Location:** Top-left of report toolbar, before action buttons

---

### 2. Bulk Task Selection System

#### 2.1 Task-Level Checkboxes
**Requirement:** Add checkbox column as first column in report

**Functionality:**
- Checkbox appears on each **task row only** (not project rows)
- Clicking checkbox selects/deselects the task
- Visual feedback: Selected rows highlighted with subtle background color
- Selection state shows in toolbar counter

**Visual Design:**
```
☑️ Project Alpha
  ☐ Task 1 - In Progress
  ☑ Task 2 - Working         [row highlighted]
  ☐ Task 3 - Open
```

#### 2.2 Select All Functionality
**Requirement:** "Select All" checkbox in column header

**Behavior:**
- Checking selects all **visible** tasks (respects current filters)
- Shows intermediate state (dash) when some tasks selected
- Deselecting clears all selections
- Updates dynamically when filters change

**States:**
- ☐ Unchecked - No tasks selected
- ☑ Checked - All visible tasks selected
- ⊟ Indeterminate - Some tasks selected

#### 2.3 Selection Counter
**Requirement:** Display count of selected tasks in toolbar

**UI Text Examples:**
- "No tasks selected"
- "1 task selected"
- "5 tasks selected"

**Location:** Center of toolbar, between filters and actions

---

### 3. Enhanced Action Toolbar

#### 3.1 Toolbar Layout
**Requirement:** Header toolbar with organized action zones

**Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [☐ Show Completed Tasks]  │  5 tasks selected  │  [Actions ▾]   │
└─────────────────────────────────────────────────────────────────┘
   ↑ Filters                    ↑ Selection Info    ↑ Actions
```

#### 3.2 Unified Actions Dropdown
**Requirement:** Single "Actions" button with dropdown menu

**Rationale:**
- Cleaner UI - reduces button clutter
- Contextual actions - only relevant options shown
- Follows modern UI patterns (Gmail, Jira, etc.)

**Dropdown Menu Structure:**

**When NO tasks selected:**
```
Actions ▾
├─ 📝 Create Task
└─ (other options disabled/grayed)
```

**When tasks selected:**
```
Actions ▾
├─ ✏️ Update Status (5 tasks)
├─ 📅 Update Expected Dates (5 tasks)
├─ ───────────────────
└─ 📝 Create Task
```

#### 3.3 Action Availability Logic

| Action | Available When | Notes |
|--------|---------------|-------|
| Create Task | Always | Opens dialog with project context |
| Update Status | ≥1 task selected | Applies same status to all selected |
| Update Expected Dates | ≥1 task selected | Applies same dates to all selected |

---

### 4. Bulk Update Status

#### 4.1 Status Update Dialog
**Requirement:** Modal dialog for bulk status updates

**Trigger:** User selects tasks → Actions → Update Status

**Dialog Contents:**
```
┌─────────────────────────────────────────┐
│ Update Status for 5 Tasks               │
├─────────────────────────────────────────┤
│                                          │
│ Tasks to Update:                        │
│ • Task 1 (Project Alpha)                │
│ • Task 2 (Project Alpha)                │
│ • Task 5 (Project Beta)                 │
│ ...                                      │
│                                          │
│ New Status: [Dropdown ▾]                │
│             ├─ Open                      │
│             ├─ Working                   │
│             ├─ Completed                 │
│             └─ Cancelled                 │
│                                          │
│ ☑ Auto-fill completion date             │
│   (when status = Completed)             │
│                                          │
│     [Cancel]  [Update All Tasks]        │
└─────────────────────────────────────────┘
```

**Behavior:**
- Shows list of selected tasks (max 10 in dialog, "and X more..." if >10)
- Status dropdown with all valid task statuses
- Checkbox (checked by default): "Auto-fill completion date"
  - Only enabled when "Completed" status selected
  - Sets `completed_on` to current date/time
- Validates before update (permissions check)
- Shows progress indicator during update
- Success notification: "5 tasks updated successfully"
- Auto-refreshes report
- Clears selections after successful update

**Error Handling:**
- Partial failures: "3 of 5 tasks updated. 2 failed due to permissions."
- Network errors: "Update failed. Please try again."
- Shows which specific tasks failed in notification

---

### 5. Bulk Update Expected Dates

#### 5.1 Date Update Dialog
**Requirement:** Modal dialog for bulk date updates

**Trigger:** User selects tasks → Actions → Update Expected Dates

**Dialog Contents:**
```
┌─────────────────────────────────────────┐
│ Update Expected Dates for 5 Tasks       │
├─────────────────────────────────────────┤
│                                          │
│ Tasks to Update:                        │
│ • Task 1 (Project Alpha)                │
│ • Task 2 (Project Alpha)                │
│ • Task 5 (Project Beta)                 │
│ ...                                      │
│                                          │
│ Expected Start Date:  [📅 Date Picker]  │
│                                          │
│ Expected End Date:    [📅 Date Picker]  │
│                                          │
│ ☐ Only update if currently empty        │
│                                          │
│     [Cancel]  [Update All Tasks]        │
└─────────────────────────────────────────┘
```

**Behavior:**
- Both date fields optional - can update just start, just end, or both
- Date picker with calendar UI
- Validation: End date must be >= Start date (if both provided)
- Checkbox option: "Only update if currently empty"
  - When checked, skips tasks that already have dates set
  - Useful for bulk initialization without overwriting
- Shows count of tasks that will be updated
- Progress indicator during update
- Success notification with count
- Auto-refreshes report
- Clears selections after update

**Smart Features:**
- If all selected tasks are from same project, pre-fill dates from project expected dates
- Warning if dates fall on weekends (optional, configurable)

---

### 6. Enhanced Create Task

#### 6.1 Context-Aware Task Creation
**Requirement:** Improved task creation with smart defaults

**Access Points:**
1. Actions dropdown (when no tasks selected)
2. Project row click → Actions → Create Task (future enhancement)

**Dialog Contents:**
```
┌─────────────────────────────────────────┐
│ Create New Task                          │
├─────────────────────────────────────────┤
│                                          │
│ Project: [Dropdown ▾]                   │
│                                          │
│ Task Name: [________________]           │
│                                          │
│ Description:                             │
│ [_____________________________]         │
│ [_____________________________]         │
│                                          │
│ Status: [Open ▾]                        │
│                                          │
│ Assigned To: [User Selector]            │
│                                          │
│ Expected Start: [📅 Date Picker]        │
│ Expected End:   [📅 Date Picker]        │
│                                          │
│     [Cancel]  [Create Task]             │
└─────────────────────────────────────────┘
```

**Enhancements from v1.1:**
- Now includes Expected Start/End date fields
- Pre-fills project if user right-clicks on project row (context menu)
- Pre-fills dates from project defaults if available
- Status defaults to "Open"

---

## UI/UX Design Specifications

### Visual Design

#### Selection Highlighting
```css
Selected Row:
- Background: rgba(66, 133, 244, 0.08) /* Light blue tint */
- Border-left: 3px solid #4285f4 /* Blue accent */
- Transition: smooth 150ms
```

#### Toolbar
```css
Toolbar:
- Background: #f8f9fa
- Border-bottom: 1px solid #e0e0e0
- Padding: 12px 16px
- Display: flex
- Justify-content: space-between
```

#### Action Button States
```css
Actions Button:
- Default: Primary button style
- Disabled (no selection): Grayed out, cursor not-allowed
- Active: Dropdown open with shadow
- Hover: Slight elevation
```

### Interaction Patterns

#### Keyboard Shortcuts (Future Enhancement)
- `Ctrl/Cmd + A` - Select all visible tasks
- `Ctrl/Cmd + D` - Deselect all
- `Shift + Click` - Range selection
- `Escape` - Close dialogs, clear selections

#### Touch/Mobile Considerations
- Checkbox targets minimum 44x44px for touch
- Dropdown menus optimized for mobile taps
- Dialogs responsive, full-width on mobile
- Swipe gestures for selection (future)

---

## Technical Considerations

### Frontend (JavaScript)

#### State Management
```javascript
// Report state object
reportState = {
  showCompleted: false,  // Filter state
  selectedTasks: Set(),  // Selected task IDs
  allTaskIds: [],        // All visible task IDs
  isSelectAllChecked: false
}
```

#### Key Functions
- `toggleCompletedVisibility()` - Filter toggle
- `selectTask(taskId)` - Individual selection
- `selectAllTasks()` - Bulk selection
- `clearSelections()` - Clear all
- `bulkUpdateStatus(taskIds, newStatus)` - Bulk update
- `bulkUpdateDates(taskIds, startDate, endDate)` - Bulk dates
- `getSelectedTaskDetails()` - For dialog display

### Backend (Python)

#### API Endpoints
```python
# Bulk update status
@frappe.whitelist()
def bulk_update_task_status(task_ids, status, auto_complete=True):
    """
    Update status for multiple tasks

    Args:
        task_ids: List of task names
        status: New status value
        auto_complete: Auto-fill completed_on if status='Completed'

    Returns:
        {
            "success": True/False,
            "updated": count,
            "failed": count,
            "errors": [...]
        }
    """
    pass

# Bulk update dates
@frappe.whitelist()
def bulk_update_task_dates(task_ids, exp_start_date=None,
                           exp_end_date=None, only_empty=False):
    """
    Update expected dates for multiple tasks

    Args:
        task_ids: List of task names
        exp_start_date: Expected start date (optional)
        exp_end_date: Expected end date (optional)
        only_empty: Only update tasks with empty dates

    Returns:
        {
            "success": True/False,
            "updated": count,
            "skipped": count,
            "failed": count,
            "errors": [...]
        }
    """
    pass
```

#### Validation
- Permission checks: Verify user has write access to each task
- Date validation: End date >= Start date
- Status validation: New status is valid for Task doctype
- Atomic updates: All or nothing approach (with transaction rollback)

### Performance Optimization

#### Large Dataset Handling
- Limit bulk operations to 50 tasks at once (with warning if exceeded)
- Batch API calls in groups of 10 to avoid timeout
- Progress indicator for operations >5 tasks
- Client-side pagination for task list in dialogs

#### Caching
- Cache filter state in localStorage
- Debounce filter toggles (300ms)
- Memoize selected task calculations

---

## User Workflows

### Workflow 1: Daily Task Status Update
**Scenario:** PM reviews report and marks 10 tasks as completed

**Steps:**
1. Open Project Overview Report (completed tasks hidden by default)
2. Review active tasks
3. Check checkboxes for completed tasks (10 tasks)
4. Selection counter shows "10 tasks selected"
5. Click Actions → Update Status
6. Dialog opens showing 10 tasks
7. Select "Completed" from dropdown
8. "Auto-fill completion date" checked by default
9. Click "Update All Tasks"
10. Progress indicator → Success message: "10 tasks updated"
11. Report refreshes, completed tasks disappear (filter still active)
12. **Time Saved:** ~8 minutes vs. individual updates

### Workflow 2: Sprint Planning - Set Expected Dates
**Scenario:** PM plans next sprint, sets dates for 15 new tasks

**Steps:**
1. Open report, filter to "Open" status tasks
2. Select All (15 tasks)
3. Click Actions → Update Expected Dates
4. Dialog opens
5. Set Expected Start: 2025-11-04 (sprint start)
6. Set Expected End: 2025-11-18 (sprint end)
7. Check "Only update if currently empty" (to avoid overwriting)
8. Click "Update All Tasks"
9. Success: "15 tasks updated"
10. Report refreshes with new dates visible
11. **Time Saved:** ~20 minutes vs. individual date entry

### Workflow 3: Task Triage
**Scenario:** PM changes 5 "Open" tasks to "Working" after assignment

**Steps:**
1. Filter to assigned tasks (user filter - future enhancement)
2. Select 5 tasks with checkboxes
3. Actions → Update Status → "Working"
4. Quick update, report refreshes
5. **Time Saved:** ~3 minutes

---

## Success Metrics

### Quantitative
- **Time to update 10 tasks:** Reduce from ~10 minutes to <1 minute
- **Click reduction:** 80% fewer clicks for bulk operations
- **User adoption:** 70% of PMs use bulk features within 2 weeks
- **Error rate:** <5% failed bulk operations

### Qualitative
- Positive user feedback on workflow efficiency
- Reduced support tickets about repetitive tasks
- Increased report usage frequency

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Add checkbox column to report
- [ ] Implement task selection state management
- [ ] Add "Show Completed Tasks" toggle
- [ ] Create toolbar UI structure
- [ ] Implement selection counter

### Phase 2: Bulk Status Updates (Week 2)
- [ ] Build Actions dropdown component
- [ ] Create bulk status update dialog
- [ ] Implement `bulk_update_task_status` API
- [ ] Add auto-complete date logic
- [ ] Error handling and validation
- [ ] Unit tests for bulk status update

### Phase 3: Bulk Date Updates (Week 3)
- [ ] Create bulk date update dialog
- [ ] Implement `bulk_update_task_dates` API
- [ ] Date validation logic
- [ ] "Only empty" checkbox logic
- [ ] Unit tests for bulk date update

### Phase 4: Polish & Testing (Week 4)
- [ ] Add loading indicators and progress bars
- [ ] Implement success/error notifications
- [ ] Mobile responsive testing
- [ ] Performance testing with 500+ tasks
- [ ] User acceptance testing
- [ ] Documentation updates

### Phase 5: Enhancements (Future)
- [ ] Keyboard shortcuts
- [ ] Range selection with Shift+Click
- [ ] Undo last bulk action
- [ ] Export selected tasks
- [ ] Advanced filters (by status, assignee, date range)

---

## Testing Requirements

### Unit Tests
- Task selection/deselection logic
- Filter toggle functionality
- Bulk update API functions
- Date validation
- Permission checks

### Integration Tests
- End-to-end bulk status update workflow
- End-to-end bulk date update workflow
- Filter + selection interaction
- API error handling

### User Acceptance Tests
- PM completes daily task review (10+ tasks)
- PM sets sprint dates for 20 tasks
- PM creates new tasks from report
- Mobile user performs bulk update

### Performance Tests
- Load report with 1000+ tasks
- Bulk update 50 tasks
- Filter toggle with large dataset
- Selection state with 100+ selections

---

## Security & Permissions

### Permission Model
- **Task Selection:** No permission required (read-only)
- **Bulk Status Update:** Requires write permission on Task doctype for ALL selected tasks
- **Bulk Date Update:** Requires write permission on Task doctype for ALL selected tasks
- **Create Task:** Requires create permission on Task doctype

### Validation Rules
- Backend validates user permissions for each task individually
- Partial updates allowed: Update succeeded tasks, report failures
- Audit trail: Log bulk updates with user, timestamp, and affected tasks
- No privilege escalation: User can only update tasks they could individually update

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance issues with large selections | High | Medium | Limit to 50 tasks, batch processing |
| Accidental bulk updates | High | Low | Confirmation dialog, clear task list |
| Permission errors causing partial updates | Medium | Medium | Clear error messaging, rollback option |
| Filter state confusion | Low | Medium | Persistent state, clear visual indicators |
| Mobile usability issues | Medium | Low | Responsive design, touch-optimized targets |

---

## Open Questions & Decisions

### Questions for Product Owner
1. ✅ **Confirmed:** Hide completed tasks by default?
   **Answer:** Yes, hide by default with toggle

2. ✅ **Confirmed:** Limit on bulk selections (50 tasks reasonable)?
   **Answer:** Improvise - suggest best practice

3. **Pending:** Should we add "Undo" for bulk updates?
   **Decision:** Phase 5 enhancement

4. **Pending:** Include project-level bulk operations (e.g., update all tasks in a project)?
   **Decision:** Future consideration

5. ✅ **Confirmed:** Should expected dates be required or optional in bulk update?
   **Answer:** Optional - can update one or both

### Design Decisions Made
- ✅ Single "Actions" dropdown vs. multiple buttons → **Unified dropdown**
- ✅ Auto-fill completion date default behavior → **Enabled by default**
- ✅ Selection persistence after update → **Clear selections**
- ✅ Show all tasks in dialog or summarize if >10 → **Show max 10 + count**

---

## Dependencies

### Technical Dependencies
- Frappe Framework v14+
- ERPNext Project & Task doctypes
- jQuery (for DOM manipulation)
- Frappe UI components (Dialog, DatePicker)

### Feature Dependencies
- Requires existing Project Overview Report (v1.1)
- Builds on current task status update functionality

---

## Documentation Requirements

### User Documentation
- [ ] Updated user guide with bulk operations section
- [ ] Screenshot tutorials for workflows
- [ ] FAQ: Common bulk operation questions
- [ ] Video tutorial: Bulk updates walkthrough (3 min)

### Developer Documentation
- [ ] API documentation for new endpoints
- [ ] Frontend state management architecture
- [ ] Extension points for custom actions
- [ ] Testing guide

---

## Rollout Plan

### Beta Testing (Week 5)
- Release to 5 power-user PMs
- Collect feedback via form
- Monitor for errors/performance issues
- Iterate on UX pain points

### Production Release (Week 6)
- Deploy to all users
- In-app notification about new features
- Email announcement with quick guide
- Office hours for questions (2 sessions)

### Post-Release (Week 7+)
- Monitor usage analytics
- Collect user feedback
- Plan Phase 5 enhancements based on data
- Measure success metrics

---

## Changelog

### Version 1.2 (Planned - 2025-11-15)
- Bulk task selection with checkboxes
- Smart filtering: Hide completed tasks by default
- Unified Actions toolbar with dropdown
- Bulk status updates with auto-complete date
- Bulk expected date updates
- Enhanced task creation with date fields

### Version 1.1 (Current - 2025-10-31)
- Interactive task status update button
- Quick task creation button
- Individual task actions

### Version 1.0 (2025-10-26)
- Initial tree structure report
- Basic display of projects and tasks

---

## References

### Related Documents
- [Project Overview Report](./project-overview-report.md) - Current feature
- ERPNext Task Doctype Documentation
- Frappe Report Framework Guide

### Design Inspirations
- Gmail bulk actions pattern
- Jira issue selection and bulk edit
- GitHub PR bulk operations
- Notion database multi-select actions

---

**Document Status:** ✅ Ready for Review
**Last Updated:** 2025-11-01
**Author:** Mary (Business Analyst)
**Reviewers:** Product Owner, Lead Developer, UX Designer
