# Business Requirements Document
## Nexus ERP - Project Overview Report Enhancements

| Field | Value |
|-------|-------|
| **Project** | nexus_erp (rename from riz_erp) |
| **Client** | Internal + Client Installation |
| **Industry** | General Business / Project Management |
| **Current System** | ERPNext with riz_erp custom app |
| **Date** | 2025-11-18 |
| **Status** | Ready for Solution Architect |

---

## 1. Executive Summary

**Purpose:** Enhance Project Overview report with task assignment visibility and management capabilities, plus rename app for broader use.

**Current State:** riz_erp app with Project Overview report that has task status updates, task creation, and bulk operations - but no assignment visibility or management.

**Desired Outcome:** Project managers can see task ownership at a glance, assign/unassign tasks directly from report, and app is renamed for future expansion.

**Key Challenges:**
- Cannot see who is assigned to tasks without opening each task
- ERPNext native project management is too complex for simple oversight
- Current app name (riz_erp) doesn't scale for multi-purpose use

---

## 2. Business Context

| Aspect | Detail |
|--------|--------|
| **Industry** | General Business |
| **Current System** | ERPNext 15 with riz_erp custom app |
| **Pain Points** | No assignment visibility in report; slow to assign tasks; ERPNext PM too heavy |
| **Business Goals** | Quick task ownership visibility; streamlined assignment workflow; scalable app identity |
| **Success Criteria** | See all assignees in report; assign/unassign in <3 clicks; app renamed without breaking functionality |

---

## 3. Requirements Analysis

### 3.1 Assigned To Column Display

| Aspect | Detail |
|--------|--------|
| **Requirement** | Add column showing all users assigned to each task |
| **Business Value** | Instantly see task ownership without opening task form |
| **ERPNext Status** | ⚙️ Configure |
| **ERPNext Module** | Projects / Core (ToDo/Assignment system) |
| **Standard DocType** | ToDo (stores assignments) |
| **Display Format** | Multiple names in pill/badge styling for easy reading |
| **Integration** | Connects to Filter by Assigned To (3.5) |
| **Priority** | Must-Have |

### 3.2 Assign User Button

| Aspect | Detail |
|--------|--------|
| **Requirement** | Add button to assign user to individual task from report |
| **Business Value** | Quick assignment without leaving report view |
| **ERPNext Status** | ⚙️ Configure |
| **ERPNext Module** | Core (frappe.desk.form.assign_to.add) |
| **Standard DocType** | ToDo |
| **UI Pattern** | Button in Actions column opens user selection dialog |
| **Integration** | Updates Assigned To column (3.1) after assignment |
| **Priority** | Must-Have |

### 3.3 Remove Assignment Button

| Aspect | Detail |
|--------|--------|
| **Requirement** | Add button to remove user assignment from task |
| **Business Value** | Quick reassignment workflow - remove then assign new |
| **ERPNext Status** | ⚙️ Configure |
| **ERPNext Module** | Core (frappe.desk.form.assign_to.remove) |
| **Standard DocType** | ToDo |
| **UI Pattern** | Button shows current assignees, allows removal selection |
| **Integration** | Updates Assigned To column (3.1) after removal |
| **Priority** | Must-Have |

### 3.4 Bulk Assignment

| Aspect | Detail |
|--------|--------|
| **Requirement** | Assign user to multiple selected tasks at once |
| **Business Value** | Efficiently distribute work across team; batch operations |
| **ERPNext Status** | ⚙️ Configure |
| **ERPNext Module** | Core (frappe.desk.form.assign_to.add) |
| **Standard DocType** | ToDo |
| **UI Pattern** | Similar to existing bulk status update - select tasks, click bulk assign |
| **Integration** | Uses existing task selection system; updates Assigned To column |
| **Priority** | Must-Have |

### 3.5 Filter by Assigned To

| Aspect | Detail |
|--------|--------|
| **Requirement** | Add filter to show tasks assigned to specific user |
| **Business Value** | Quickly see "my tasks" or check team member workload |
| **ERPNext Status** | ⚙️ Configure |
| **ERPNext Module** | Projects / Core |
| **Standard DocType** | ToDo (join query) |
| **UI Pattern** | Link field filter in report filters section |
| **Integration** | Works with Assigned To column (3.1) |
| **Priority** | Should-Have |

### 3.6 Priority Column

| Aspect | Detail |
|--------|--------|
| **Requirement** | Add column showing task priority |
| **Business Value** | See urgency at a glance for better task triage |
| **ERPNext Status** | ✅ Standard |
| **ERPNext Module** | Projects |
| **Standard DocType** | Task.priority |
| **Display Format** | Text or color-coded indicator |
| **Integration** | Independent column |
| **Priority** | Should-Have |

### 3.7 Project Progress Bar

| Aspect | Detail |
|--------|--------|
| **Requirement** | Show completion percentage at project row level |
| **Business Value** | Quick project health overview without drilling into tasks |
| **ERPNext Status** | ⚙️ Configure |
| **ERPNext Module** | Projects |
| **Standard DocType** | Project.percent_complete or calculated from tasks |
| **Display Format** | Progress bar or percentage in project row |
| **Integration** | Aggregates from task completion status |
| **Priority** | Should-Have |

### 3.8 Rename App to nexus_erp

| Aspect | Detail |
|--------|--------|
| **Requirement** | Rename app from riz_erp to nexus_erp |
| **Business Value** | Professional name for client installations; scalable for future features |
| **ERPNext Status** | 🔨 Custom |
| **Impact Areas** | Folder names, module names, imports, hooks.py, setup files, fixtures |
| **Risk** | Breaking changes if not done carefully |
| **Integration** | Affects entire app structure |
| **Priority** | Should-Have |
| **Note** | Requires feasibility analysis from Solution Architect |

---

## 4. ERPNext Module Coverage

| Module | Used For | Standard Features Leveraged |
|--------|----------|----------------------------|
| **Projects** | Task management, project tracking | Task DocType, Project DocType, priority field, progress tracking |
| **Core** | Assignment system | ToDo DocType, frappe.desk.form.assign_to API (add/remove) |

---

## 5. Gaps Summary

| Gap Type | Count | Details |
|----------|-------|---------|
| ✅ **Standard** | 1 | Priority column (Task.priority field exists) |
| ⚙️ **Configuration** | 6 | Assigned To column, Assign button, Remove button, Bulk assign, Filter by assignee, Project progress |
| 🔨 **Custom** | 1 | App rename (structural change) |
| **Total** | **8** | |

---

## 6. Technical Considerations for Solution Architect

### Assignment System Notes:
- ERPNext uses ToDo DocType for assignments, not a direct field on Task
- Query pattern: Join Task with ToDo where ToDo.reference_type='Task' and ToDo.reference_name=task.name
- Multiple assignments per task are possible
- Use `frappe.desk.form.assign_to` API for add/remove operations

### App Rename Considerations:
- All Python imports reference `riz_erp`
- hooks.py app_name and other identifiers
- Fixture references
- Any hardcoded paths
- Database entries (if any custom DocTypes exist)
- Client-side references in JS

### Existing Code to Extend:
- `project_overview.py` - Add assignment query to execute(), new whitelist methods
- `project_overview.js` - Add column formatter for pills, new dialog functions
- `project_overview.json` - Add filter definition

---

## 7. Next Steps

1. **Solution Architect Review** - Feasibility analysis especially for app rename
2. **Technical Specification** - Detailed design for assignment features
3. **Implementation** - Prioritize Must-Have requirements first
4. **Testing** - Verify all CRUD operations on assignments work correctly

---

## 8. Document History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-18 | 1.0 | ERPNext BA | Initial BRD created |

---

**Handoff:** This document is ready for Frappe Solution Architect to create Technical Specification.
