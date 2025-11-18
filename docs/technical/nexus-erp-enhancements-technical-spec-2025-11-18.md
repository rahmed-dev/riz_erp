# Technical Specification Document
## Nexus ERP - Project Overview Report Enhancements

| Field | Value |
|-------|-------|
| **Project** | nexus-erp-enhancements |
| **BRD Version** | 1.0 |
| **TSD Version** | 1.1 |
| **Date** | 2025-11-18 |
| **Status** | Ready for Implementation |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Solution Architecture Overview](#2-solution-architecture-overview)
3. [Technical Design](#3-technical-design)
   - 3.1 [Assigned To Column Display](#31-assigned-to-column-display)
   - 3.2 [Assign Users (Toolbar)](#32-assign-users-toolbar)
   - 3.3 [Remove Assignments (Toolbar)](#33-remove-assignments-toolbar)
   - 3.4 [Filter by Assigned To (Multi-Select)](#34-filter-by-assigned-to-multi-select)
   - 3.5 [Status Filter Multi-Select](#35-status-filter-multi-select)
   - 3.6 [Priority Column](#36-priority-column)
   - 3.7 [Project Progress Bar](#37-project-progress-bar)
   - 3.8 [App Migration to nexus_erp](#38-app-migration-to-nexus_erp)
4. [Data Model](#4-data-model)
5. [Configuration Requirements](#5-configuration-requirements)
6. [Testing Requirements](#6-testing-requirements)
7. [Performance Considerations](#7-performance-considerations)
8. [Upgrade Safety Assessment](#8-upgrade-safety-assessment)
9. [Next Steps](#9-next-steps)

---

## 1. Executive Summary

| Aspect | Specification |
|--------|---------------|
| **Technical Approach** | Scripting-heavy with existing report extension |
| **Complexity** | Medium |
| **Primary Tier** | Tier 3 (Scripting) |
| **Upgrade Safety** | ✅ Safe - Uses native Frappe APIs |
| **Key Decisions** | Extend existing report; use native assignment APIs; defer app rename |

**Architecture Decision:** All assignment features use Frappe's native `frappe.desk.form.assign_to` API which stores assignments in ToDo DocType. This ensures upgrade safety and leverages existing notification system.

---

## 2. Solution Architecture Overview

| Aspect | Specification |
|--------|---------------|
| **Approach** | Extend existing Script Report with assignment features |
| **Tier Classification** | Tier 2: 1, Tier 3: 7, Tier 4: 1 |
| **ERPNext Modules** | Projects, Core (ToDo/Assignment) |
| **Custom DocTypes** | 0 (uses existing Task, ToDo) |
| **Performance Profile** | Light - joins with indexed ToDo table |

### Tier Breakdown

| Requirement | Tier | Rationale |
|-------------|------|-----------|
| 3.1 Assigned To Column | 3 | Server query join + client formatter |
| 3.2 Assign Users (Toolbar) | 3 | Unified toolbar button for 1 or multiple tasks |
| 3.3 Remove Assignments (Toolbar) | 3 | Unified toolbar button for 1 or multiple tasks |
| 3.4 Filter by Assigned To | 3 | Multi-select filter with server query |
| 3.5 Status Filter Multi-Select | 3 | Refactor existing filter to multi-select |
| 3.6 Priority Column | 2 | Simple column addition |
| 3.7 Project Progress Bar | 3 | Server calculation + CSS progress bar |
| 3.8 App Migration | 4 | Migrate to new app - DEFERRED |

---

## 3. Technical Design

### 3.1 Assigned To Column Display

| Aspect | Specification |
|--------|---------------|
| BRD Reference | 3.1 |
| Tier | 3 |
| Complexity | Medium |

#### UX/UI Design

| Component | Specification |
|-----------|---------------|
| Form Layout | New column after Status, before E. Start |
| User Actions | View-only; clickable pills open user profile |
| Visual Indicators | Pills with user initials/names; max 3 shown + overflow count |
| Frappe Components | Indicator pills, HTML formatter |

#### Server-Side Design

**Modify execute() function:**

| Change | Details |
|--------|---------|
| New import | None needed (frappe already imported) |
| Query modification | Add subquery to fetch assignees per task |
| New field in data | `assigned_to_list` containing user emails/names |

**Logic (pseudo-code):**
```
In execute() after fetching tasks:
  For each task:
    Query ToDo where:
      - reference_type = 'Task'
      - reference_name = task.name
      - status = 'Open'
    Get allocated_to (user email)
    Join with User to get full_name
    Store as comma-separated or list in task['assigned_to']
```

**Alternative approach (more efficient):**
```
Create dict: task_assignments = {}
Single query: SELECT reference_name, allocated_to FROM ToDo
              WHERE reference_type='Task'
              AND status='Open'
              AND reference_name IN (all_task_names)
Group by reference_name
Lookup when building task data
```

#### Column Definition

```python
{
    "label": "Assigned To",
    "fieldname": "assigned_to",
    "fieldtype": "Data",
    "width": 150
}
```

#### Client-Side Design (Formatter)

**Render pills for assigned users:**
```
If column is 'assigned_to' and value exists:
  Split value by comma
  For each user (max 3):
    Create pill: <span class="indicator-pill gray">{initials or name}</span>
  If more than 3:
    Add overflow: <span class="indicator-pill no-indicator">+{count}</span>
  Return HTML string
```

#### Integration

| Reads From | Writes To | Purpose |
|------------|-----------|---------|
| ToDo | - | Fetch current assignments |
| User | - | Get user full names |

#### Performance

| Aspect | Specification |
|--------|---------------|
| Index | ToDo.reference_name (already indexed) |
| Query Strategy | Batch fetch all assignments, then lookup |
| Cache | None needed - real-time data required |

---

### 3.2 Assign Users (Toolbar)

| Aspect | Specification |
|--------|---------------|
| BRD Reference | 3.2, 3.4 |
| Tier | 3 |
| Complexity | Medium |

#### UX/UI Design

| Component | Specification |
|-----------|---------------|
| Form Layout | Toolbar button (same level as Update Task, Update Dates) |
| User Actions | Select 1 or more tasks → Click "Assign" → Select user → Confirm |
| Visual Indicators | Button shows/hides based on selection (like existing bulk ops) |
| Frappe Components | frappe.ui.Dialog with Link field |

**Key UX Decision:** Single toolbar button handles both single and multiple task assignment. No separate buttons in Actions column - keeps UI clean and consistent with existing patterns.

#### Toolbar Button

**In onload(), add grouped buttons:**
```javascript
report.page.add_inner_button(__('Assign'), function() {
    showAssignDialog(report);
}, __('Assignment'));

report.page.add_inner_button(__('Unassign'), function() {
    showUnassignDialog(report);
}, __('Assignment'));
```

**Button group "Assignment" - initially hidden, show when selectedTaskIds.size > 0**

**UX Note:** Both Assign and Unassign are grouped under "Assignment" dropdown for cleaner toolbar organization.

#### Dialog Design

| Field | Type | Options | Details |
|-------|------|---------|---------|
| task_list | HTML | - | List of selected tasks (max 10 + overflow) |
| assigned_to | Link | User | User to assign to selected task(s) |

**Dialog title:**
- Single task: "Assign User to Task"
- Multiple tasks: "Assign User to {count} Tasks"

**Primary action:** "Assign"

#### Server-Side Method

**New whitelisted method: assign_tasks()**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| task_ids | str/list | Yes | JSON list of task IDs (can be single) |
| user | str | Yes | User email to assign |

**Logic (pseudo-code):**
```
Parse task_ids from JSON
Validate user is not empty
Initialize counters: assigned=0, failed=0, already_assigned=0, errors=[]

For each task in batches of 10:
  Check write permission
  If no permission: failed++, add error, continue

  Check if already assigned to this user
  If already assigned: already_assigned++, continue

  Try:
    Call frappe.desk.form.assign_to.add({
        assign_to: [user],
        doctype: 'Task',
        name: task_id,
        description: 'Assigned from Project Overview'
    })
    assigned++
  Catch:
    failed++
    Add error to list

Return {
    success: failed == 0,
    assigned: assigned,
    already_assigned: already_assigned,
    failed: failed,
    errors: errors
}
```

#### Client-Side Handler

**Function: showAssignDialog(report)**

**Logic:**
```
Validate selection (validateSelection())
Build task list HTML (buildTaskListHTML())
Create dialog with user link field
On submit:
  Validate user selected
  Disable button
  Call assign_tasks method
  Handle response with handleAssignResponse()
```

**handleAssignResponse():** Similar to handleBulkUpdateResponse() pattern. Shows assigned/already_assigned/failed counts.

#### Integration

| Reads From | Writes To | Purpose |
|------------|-----------|---------|
| User (dialog) | ToDo | Create assignment record(s) |
| ToDo | - | Check existing assignments |

#### Performance

| Aspect | Specification |
|--------|---------------|
| Batch Size | 10 tasks per batch |
| Index | None additional |
| Background Jobs | Consider for > 50 tasks |

---

### 3.3 Remove Assignments (Toolbar)

| Aspect | Specification |
|--------|---------------|
| BRD Reference | 3.3 |
| Tier | 3 |
| Complexity | Medium |

#### UX/UI Design

| Component | Specification |
|-----------|---------------|
| Form Layout | Toolbar button (same level as Assign button) |
| User Actions | Select tasks → Click "Unassign" → Select user(s) to remove → Confirm |
| Visual Indicators | Button shows/hides based on selection |
| Frappe Components | frappe.ui.Dialog with MultiCheck field |

**Key UX Decision:** Toolbar button shows all assignees across selected tasks. User can select which assignee(s) to remove from all selected tasks.

#### Toolbar Button

**Grouped with Assign button under "Assignment" dropdown** (see 3.2 for implementation)

**Visibility:** Both Assignment group buttons hidden until selectedTaskIds.size > 0

#### Dialog Design

| Field | Type | Options | Details |
|-------|------|---------|---------|
| task_list | HTML | - | List of selected tasks |
| assignees | MultiCheck | Dynamic | Union of all assignees from selected tasks |

**Dialog title:** "Remove Assignments"

**Primary action:** "Remove"

#### Server-Side Method

**New whitelisted method: unassign_tasks()**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| task_ids | str/list | Yes | JSON list of task IDs |
| users | str/list | Yes | JSON list of user emails to unassign |

**Logic (pseudo-code):**
```
Parse task_ids and users from JSON
Initialize counters: removed=0, not_assigned=0, failed=0, errors=[]

For each task in batches of 10:
  Check write permission
  If no permission: failed++, add error, continue

  For each user to remove:
    Check if user is assigned to this task
    If not assigned: not_assigned++, continue

    Try:
      Call frappe.desk.form.assign_to.remove(
          doctype='Task',
          name=task_id,
          assign_to=user
      )
      removed++
    Catch:
      failed++
      Add error to list

Return {
    success: failed == 0,
    removed: removed,
    not_assigned: not_assigned,
    failed: failed,
    errors: errors
}
```

#### Client-Side Handler

**Function: showUnassignDialog(report)**

**Logic:**
```
Validate selection
Get all unique assignees from selected tasks (from report data)
If no assignees: show message "No assignments to remove", return
Build task list HTML
Create dialog with MultiCheck of assignees
On submit:
  Validate at least one assignee selected
  Disable button
  Call unassign_tasks method
  Handle response
```

**Helper function: getAssigneesFromSelectedTasks(report)**
- Iterate selectedTaskIds
- Collect all assigned_to values from report data
- Return unique list of {email, full_name}

#### Integration

| Reads From | Writes To | Purpose |
|------------|-----------|---------|
| ToDo | ToDo (delete) | Remove assignment records |

#### Performance

| Aspect | Specification |
|--------|---------------|
| Batch Size | 10 tasks per batch |
| Index | None needed |
| Background Jobs | None

---

### 3.4 Filter by Assigned To (Multi-Select)

| Aspect | Specification |
|--------|---------------|
| BRD Reference | 3.5 |
| Tier | 3 |
| Complexity | Medium |

#### UX/UI Design

| Component | Specification |
|-----------|---------------|
| Form Layout | Filter field in report filters section |
| User Actions | Select one or more users → Report shows tasks assigned to ANY selected user |
| Visual Indicators | MultiSelectLink or custom multi-select component |
| Frappe Components | MultiSelectLink field (if available) or custom implementation |

**Key UX Decision:** Multi-select allows viewing "my team's tasks" by selecting multiple users at once.

#### Filter Definition (project_overview.json)

**Add new filter:**
```json
{
    "fieldname": "assigned_to",
    "label": "Assigned To",
    "fieldtype": "MultiSelectLink",
    "options": "User"
}
```

**Note:** If MultiSelectLink not supported in report filters, implement as:
- Table field with Link to User
- Or custom HTML control with awesomplete

#### Server-Side Implementation

**Modify execute() function:**

**Logic (pseudo-code):**
```
If filters.get('assigned_to'):
  # Parse multi-select value (comma-separated or list)
  users = parse_multi_select(filters.get('assigned_to'))

  If users:
    # Get all tasks assigned to ANY of these users
    assigned_tasks = frappe.get_all('ToDo',
        filters={
            'reference_type': 'Task',
            'allocated_to': ['in', users],
            'status': 'Open'
        },
        pluck='reference_name'
    )

    # Add to task_filters
    If assigned_tasks:
      task_filters['name'] = ['in', list(set(assigned_tasks))]
    Else:
      # No tasks assigned to these users
      Return empty result
```

**Helper function: parse_multi_select(value)**
```
If value is string:
  Split by comma, strip whitespace
If value is list:
  Return as-is
Return list of user emails
```

**Integration with existing filters:**
- Works with project filter (intersection)
- Works with status filter (intersection)
- Works with show_completed_tasks checkbox

#### Integration

| Reads From | Writes To | Purpose |
|------------|-----------|---------|
| ToDo | - | Filter tasks by multiple assignees |

#### Performance

| Aspect | Specification |
|--------|---------------|
| Index | ToDo.allocated_to (verify exists) |
| Query | Single query with IN clause |

---

### 3.5 Status Filter Multi-Select

| Aspect | Specification |
|--------|---------------|
| BRD Reference | NEW (user request) |
| Tier | 3 |
| Complexity | Low-Medium |

#### UX/UI Design

| Component | Specification |
|-----------|---------------|
| Form Layout | Refactor existing status filter |
| User Actions | Select multiple statuses → Report shows tasks with ANY selected status |
| Visual Indicators | MultiSelect or checkboxes |
| Frappe Components | MultiSelect field |

**Key UX Decision:** Allows viewing "Open + Working" or "Pending Review + Overdue" simultaneously.

#### Filter Definition (project_overview.json)

**Refactor existing status filter:**
```json
{
    "fieldname": "status",
    "label": "Status",
    "fieldtype": "MultiSelect",
    "options": "Open\nWorking\nPending Review\nOverdue\nTemplate\nCompleted\nCancelled"
}
```

#### Server-Side Implementation

**Modify execute() function:**

**Logic (pseudo-code):**
```
# Handle multi-select status filter
If filters.get('status'):
  statuses = parse_multi_select(filters.get('status'))

  If statuses:
    task_filters['status'] = ['in', statuses]
Elif not filters.get('show_completed_tasks'):
  # Default behavior: hide completed/cancelled
  task_filters['status'] = ['not in', ['Completed', 'Cancelled']]
```

**Backward compatibility:** If status is single value (string without comma), treat as single status filter.

#### Client-Side Consideration

**MultiSelect filter rendering:**
- Frappe's report framework may need custom filter rendering
- Alternative: Use comma-separated Select with tag-like display

#### Integration

| Reads From | Writes To | Purpose |
|------------|-----------|---------|
| Task.status | - | Filter by multiple statuses |

#### Performance

| Aspect | Specification |
|--------|---------------|
| Index | Task.status (verify exists) |
| Query | Uses IN clause |

---

### 3.6 Priority Column

| Aspect | Specification |
|--------|---------------|
| BRD Reference | 3.6 |
| Tier | 2 |
| Complexity | Low |

#### UX/UI Design

| Component | Specification |
|-----------|---------------|
| Form Layout | Column after Type, before Status |
| User Actions | View-only |
| Visual Indicators | Color-coded pills (Low=blue, Medium=orange, High=red, Urgent=darkred) |
| Frappe Components | Indicator pill in formatter |

#### Column Definition

**Add to columns list:**
```python
{
    "label": "Priority",
    "fieldname": "priority",
    "fieldtype": "Data",
    "width": 80
}
```

#### Server-Side Implementation

**Add to task fields in execute():**
```python
fields=[..., "priority", ...]
```

**Add to task row building:**
```python
task_row["priority"] = task.priority
```

#### Client-Side Formatter

**Color mapping:**
```javascript
Priority colors:
  'Low' -> 'blue'
  'Medium' -> 'orange'
  'High' -> 'red'
  'Urgent' -> 'darkred' (custom CSS)
```

**Render:**
```
<span class="indicator-pill {color}">{priority}</span>
```

#### Integration

| Reads From | Writes To | Purpose |
|------------|-----------|---------|
| Task.priority | - | Display |

#### Performance

| Aspect | Specification |
|--------|---------------|
| Index | None needed |
| Background Jobs | None |

---

### 3.7 Project Progress Bar

| Aspect | Specification |
|--------|---------------|
| BRD Reference | 3.7 |
| Tier | 3 |
| Complexity | Low-Medium |

#### UX/UI Design

| Component | Specification |
|-----------|---------------|
| Form Layout | Column in project row (indent=0); empty for task rows |
| User Actions | View-only |
| Visual Indicators | Progress bar with percentage text |
| Frappe Components | CSS-based progress bar |

#### Technology Decision: CSS vs Vue.js

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **CSS** | Simple, no dependencies, fast, maintainable | Basic styling only | **Recommended** |
| **Vue.js** | Rich components, animations | Overkill for simple bar, adds complexity to Script Report | Not recommended |
| **Frappe Native** | Consistent styling | No dedicated progress bar component exists | N/A |

**Decision:** Use CSS-based progress bar.

**Rationale:**
- Script Reports use vanilla JS, not Vue components
- CSS is simpler, faster, and easier to maintain
- No additional dependencies or build complexity
- Progress bar is purely visual - CSS handles this well

#### Column Definition

**Add to columns list:**
```python
{
    "label": "Progress",
    "fieldname": "project_progress",
    "fieldtype": "Data",
    "width": 120
}
```

#### Server-Side Implementation

**Calculate progress for each project:**

**Logic (pseudo-code):**
```
For each project:
  Count total tasks (excluding templates)
  Count completed tasks
  Calculate percentage: round((completed / total) * 100)
  Add to project_row['project_progress'] = percentage

For task rows:
  project_progress = None (not displayed)
```

**Alternative:** Use Project.percent_complete if available and accurate.

#### Client-Side Formatter

**Render CSS progress bar:**
```
If column is 'project_progress' and value exists:
  percent = value
  color = percent < 50 ? '#ff5858' : percent < 80 ? '#ffb65c' : '#36d399'

  Return:
    <div style="display:flex;align-items:center;gap:8px">
      <div style="width:60px;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden">
        <div style="width:{percent}%;height:100%;background:{color};border-radius:4px;transition:width 0.3s"></div>
      </div>
      <span style="font-size:12px;color:#6b7280">{percent}%</span>
    </div>
```

**CSS variables (optional enhancement):**
- Can move colors to CSS variables for theming
- transition property adds subtle animation on refresh

#### Integration

| Reads From | Writes To | Purpose |
|------------|-----------|---------|
| Task (count) | - | Calculate completion |

#### Performance

| Aspect | Specification |
|--------|---------------|
| Calculation | Done during report generation |
| Index | None additional |
| Rendering | Pure CSS, no JS overhead |

---

### 3.8 App Migration to nexus_erp

| Aspect | Specification |
|--------|---------------|
| BRD Reference | 3.8 |
| Tier | 4 |
| Complexity | High |
| **Status** | **DEFERRED** |

#### Approach Decision: Migrate vs Rename

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Rename** | Keeps git history | High risk, complex rollback | Not recommended |
| **Migrate** | Clean start, safer, easier | New git history | **Recommended** |

**Decision:** Create new `nexus_erp` app and migrate features.

**Rationale:**
1. Cleaner approach - new app with proper naming from start
2. Easier to test - can run both apps side by side
3. Safer rollback - just uninstall new app, keep old
4. No database migration headaches
5. Fresh start for documentation and structure

#### Feasibility Assessment

| Risk | Level | Details |
|------|-------|---------|
| Breaking Changes | Low | New app doesn't affect existing |
| Database Impact | Low | New module name, new records |
| Testing Required | Medium | Test new app independently |
| Rollback Complexity | Low | Simply uninstall new app |

#### Recommendation

**Defer migration until after assignment features are stable in riz_erp.**

**Rationale:**
1. Assignment features provide immediate business value
2. Migration is organizational with no user-facing benefit
3. Can be done as separate release after features are stable
4. Allows thorough testing of new app before switching

#### Migration Approach

**Phase 1: Create New App**
```bash
bench new-app nexus_erp
```

**Phase 2: Migrate Code**
| Component | Action |
|-----------|--------|
| Report | Copy project_overview folder to new app |
| Fixtures | Copy custom_field.json, property_setter.json |
| Custom | Copy custom DocType modifications |
| Hooks | Configure hooks.py for new app |

**Phase 3: Update References**
| Area | Changes |
|------|---------|
| Python imports | Update to `from nexus_erp.` |
| JavaScript calls | Update method paths |
| Module name | Use "Nexus ERP" |

**Phase 4: Deploy**
1. Install nexus_erp on site
2. Test all functionality
3. Uninstall riz_erp when ready
4. Clean up old fixtures

#### Timeline

After assignment features are deployed and stable (2-4 weeks), consider migration as separate sprint.

---

## 4. Data Model

### ERD: Assignment Relationships

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Project   │ 1     * │    Task     │ 1     * │    ToDo     │
├─────────────┤─────────├─────────────┤─────────├─────────────┤
│ name        │         │ name        │         │ name        │
│ project_name│         │ subject     │◄────────│ reference_  │
│ status      │         │ status      │         │   type      │
│ percent_    │         │ priority    │         │ reference_  │
│   complete  │         │ project     │         │   name      │
│ exp_start_  │         │ parent_task │         │ allocated_to│──┐
│   date      │         │ exp_start_  │         │ status      │  │
│ exp_end_    │         │   date      │         │ description │  │
│   date      │         │ exp_end_    │         └─────────────┘  │
└─────────────┘         │   date      │                          │
                        │ custom_next_│         ┌─────────────┐  │
                        │   action    │         │    User     │  │
                        └─────────────┘         ├─────────────┤  │
                                                │ email       │◄─┘
                                                │ full_name   │
                                                └─────────────┘
```

### Integration Points

| From | To | Relationship | Purpose |
|------|-----|--------------|---------|
| Task | Project | Many-to-One | Task belongs to project |
| Task | Task | Self-referential | Parent/child hierarchy |
| ToDo | Task | Many-to-One | Multiple assignments per task |
| ToDo | User | Many-to-One | Assigned user |

---

## 5. Configuration Requirements

### Custom Fields

None required - using existing DocTypes.

### Property Setters

None required.

### Workflows

None required.

### Report Filters (project_overview.json)

| Filter | Type | Options | New/Existing |
|--------|------|---------|--------------|
| project | Link | Project | Existing |
| status | MultiSelect | Task statuses | **Refactored** |
| show_completed_tasks | Check | - | Existing |
| assigned_to | MultiSelectLink | User | **New** |

### Custom Development

| Component | File | Changes |
|-----------|------|---------|
| Server script | project_overview.py | Add 2 whitelisted methods (assign_tasks, unassign_tasks); modify execute() for multi-select filters and progress calculation |
| Client script | project_overview.js | Add 2 dialogs (assign, unassign); modify formatter for pills/progress; add toolbar buttons |
| Report config | project_overview.json | Add assigned_to filter; refactor status to MultiSelect |

---

## 6. Testing Requirements

### Form Validation Tests

| Test | Expected Result |
|------|-----------------|
| Assign with empty user | Error: "Please select a user" |
| Unassign with no selection | Error: "Please select user(s) to remove" |
| Bulk assign with no selection | Button hidden / validation message |

### Business Logic Tests

| Test | Expected Result |
|------|-----------------|
| Assign user to task | ToDo record created; user notified |
| Assign already-assigned user | No duplicate; graceful handling |
| Remove assignment | ToDo record deleted |
| Remove non-existent assignment | Graceful error |
| Bulk assign 10 tasks | All assigned; batch processed |
| Bulk assign with permission denied | Partial success; errors reported |

### Workflow Tests

| Test | Expected Result |
|------|-----------------|
| Assign → Refresh → See in column | User appears in Assigned To pills |
| Filter by single assignee | Only that user's tasks shown |
| Filter by multiple assignees | Tasks from any selected user shown |
| Filter by multiple statuses | Tasks with any selected status shown |
| Unassign → Refresh → Removed | User removed from column |
| Multi-select status + assignee | Intersection of both filters |

### Performance Tests

| Test | Expected Result |
|------|-----------------|
| Load report with 100 tasks | < 3 seconds; assignments fetched in batch |
| Bulk assign 50 tasks | < 10 seconds; progress indicated |
| Filter by assignee with 500 tasks | < 2 seconds |

### Integration Tests

| Test | Expected Result |
|------|-----------------|
| Assign + Check email notification | User receives assignment email |
| Filter by assignee + status filter | Intersection works |
| Progress bar + completed tasks | Percentage accurate |

---

## 7. Performance Considerations

### Query Optimization

| Feature | Strategy |
|---------|----------|
| Assigned To column | Batch fetch all ToDos for displayed tasks in single query |
| Filter by assignee | Query ToDo first, then fetch matching tasks |
| Project progress | Calculate during project iteration, not separate query |

### Indexing

| Table | Column | Status |
|-------|--------|--------|
| ToDo | reference_name | Already indexed |
| ToDo | allocated_to | Verify; add if missing |
| ToDo | status | Verify; add if missing |

**Verification command:**
```sql
SHOW INDEX FROM `tabToDo` WHERE Column_name IN ('reference_name', 'allocated_to', 'status');
```

### Batch Processing

| Operation | Batch Size | Rationale |
|-----------|------------|-----------|
| Bulk assign | 10 | Consistent with existing bulk operations |
| Assignment fetch | All at once | Single query more efficient than per-task |

### Caching

No caching for assignment data - real-time accuracy required.

---

## 8. Upgrade Safety Assessment

| Feature | Safety | Notes |
|---------|--------|-------|
| 3.1 Assigned To Column | ✅ Safe | Uses standard ToDo query |
| 3.2 Assign Users (Toolbar) | ✅ Safe | Uses native assign_to.add() |
| 3.3 Remove Assignments (Toolbar) | ✅ Safe | Uses native assign_to.remove() |
| 3.4 Filter by Assigned To | ✅ Safe | Standard query patterns |
| 3.5 Status Filter Multi-Select | ✅ Safe | Standard query patterns |
| 3.6 Priority Column | ✅ Safe | Standard Task field |
| 3.7 Progress Bar | ✅ Safe | CSS-only, no dependencies |
| 3.8 App Migration | ✅ Safe | New app, no breaking changes |

**Overall:** ✅ **Safe** - All features use Frappe's native APIs and standard patterns.

---

## 9. Next Steps

1. **Implementation Sequence:**
   - Phase 1: Column additions (Priority, Assigned To, Progress Bar) - Low risk
   - Phase 2: Toolbar assignment buttons (Assign/Unassign) - Medium risk
   - Phase 3: Multi-select filters (Status, Assigned To) - Medium risk
   - Phase 4: App migration to nexus_erp (separate release) - Low risk

2. **Handoff:** This TSD is ready for Implementation Planner to create phased implementation plan with story breakdown.

3. **Developer Notes:**
   - Follow existing patterns in project_overview.py/js
   - Use handleBulkUpdateResponse() pattern for assignment responses
   - Maintain batch size of 10 for consistency
   - Test permission scenarios thoroughly
   - Multi-select filters may need custom implementation if Frappe doesn't support natively

---

## Document History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-18 | 1.0 | Frappe SA | Initial TSD created |
| 2025-11-18 | 1.1 | Frappe SA | Updated per user feedback: consolidated assignment to toolbar buttons; added multi-select for filters; CSS progress bar decision; migrate vs rename approach; grouped Assign/Unassign under "Assignment" dropdown |

---

**Handoff:** This document is ready for Phase Master/Implementation Planner to create implementation phases and story breakdown.
