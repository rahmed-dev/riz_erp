# Dev Agent Handoff - Project Overview Migration

**Date:** November 2, 2025
**Task:** Migrate Project Overview from Script Report to Custom Frappe Page
**Priority:** Medium
**Timeline:** 3 weeks
**Story Points:** 55

---

## Your Mission

Build a Custom Frappe Page to replace the existing Project Overview Script Report, maintaining all current functionality while improving UX, mobile experience, and code maintainability.

---

## What You're Building

**Custom Page:** Project Dashboard (`/app/project-dashboard`)
**Features:**
- Tree view of projects and tasks
- Task selection with checkboxes
- Bulk update status (multiple tasks)
- Bulk update dates (multiple tasks)
- Create new tasks
- Filters (project, status, show completed)
- Mobile responsive design

**Backend:** Reuse all existing APIs (no backend changes needed)

---

## Documents to Read (In Order)

### 1. MIGRATION-SUMMARY.md (2 min)
Quick overview of the migration - start here

### 2. migration-to-custom-page.md (15 min)
Complete technical plan with:
- Current implementation analysis
- Custom Page architecture
- Week-by-week breakdown
- Code structure
- Testing strategy

### 3. migration-user-stories.md (10 min) ⭐ **YOUR WORK ITEMS**
15 user stories with acceptance criteria - this is your roadmap

---

## Current Implementation (Reference)

**Location:** `/home/riz/work-bench/apps/riz_erp/riz_erp/riz_erp/report/project_overview/`

**Files:**
- `project_overview.py` (396 lines) - Backend APIs ✅ REUSE THESE
- `project_overview.js` (626 lines) - UI formatters (will be replaced)
- `project_overview.json` - Report config

**Do NOT modify these files** - we're building a new Custom Page alongside them.

---

## Backend APIs You'll Use (Already Working)

All in `riz_erp.riz_erp.report.project_overview.project_overview`:

1. **`execute(filters)`** - Fetch projects and tasks
   - Returns: `[columns, data]`
   - Handles tree building, filtering

2. **`update_task_status(task_name, new_status)`** - Update single task
   - Auto-fills `completed_on` when status = "Completed"

3. **`create_task_from_report(project, task_name, ...)`** - Create new task
   - Handles assignment via Frappe API

4. **`bulk_update_task_status(task_ids, new_status, auto_complete)`** - Bulk status
   - Processes in batches of 10
   - Returns: `{success, updated, failed, errors}`

5. **`bulk_update_task_dates(task_ids, exp_start_date, exp_end_date, only_empty)`** - Bulk dates
   - Returns: `{success, updated, skipped, failed, errors}`

**You don't need to write any backend code** - just call these methods.

---

## Your Development Plan

### Week 1: Foundation (21 points)
**Goal:** Get basic page working with tree view and filters

**Stories:**
- [ ] US-M001: Create Custom Page Structure (3 pts)
- [ ] US-M002: Data Fetching Service (3 pts)
- [ ] US-M003: Tree View Component (8 pts)
- [ ] US-M004: Status Badge Rendering (2 pts)
- [ ] US-M005: Basic Filters Panel (5 pts)

**Deliverable:** Page shows projects/tasks in tree with filters

---

### Week 2: Selection & Actions (21 points)
**Goal:** Add task selection, toolbar, and individual task actions

**Stories:**
- [ ] US-M006: Task Selection Checkboxes (5 pts)
- [ ] US-M007: Selection Counter & Toolbar (3 pts)
- [ ] US-M008: Action Buttons Visibility (2 pts)
- [ ] US-M009: Update Task Status Dialog (3 pts)
- [ ] US-M010: Create Task Dialog (5 pts)
- [ ] US-M011: Mobile Responsive Layout (3 pts)

**Deliverable:** Users can select tasks and perform individual actions

---

### Week 3: Bulk Operations (13 points)
**Goal:** Complete bulk operations and polish

**Stories:**
- [ ] US-M012: Bulk Update Status (5 pts)
- [ ] US-M013: Bulk Update Dates (5 pts)
- [ ] US-M014: Loading States (2 pts)
- [ ] US-M015: Keyboard Shortcuts (1 pt)

**Deliverable:** Full feature parity with old report + better UX

---

## Where to Start

### Step 1: Create Custom Page
```bash
cd /home/riz/work-bench/apps/riz_erp
bench new-page project_dashboard --app riz_erp
```

This creates:
- `riz_erp/riz_erp/page/project_dashboard/project_dashboard.py`
- `riz_erp/riz_erp/page/project_dashboard/project_dashboard.html`
- `riz_erp/riz_erp/page/project_dashboard/project_dashboard.js`
- `riz_erp/riz_erp/page/project_dashboard/project_dashboard.css`

### Step 2: Implement US-M001
Read `migration-user-stories.md` → US-M001 → Follow acceptance criteria

### Step 3: Continue with US-M002, US-M003, etc.

---

## Key Technical Details

### Data Fetching Pattern
```javascript
frappe.call({
    method: 'riz_erp.riz_erp.report.project_overview.project_overview.execute',
    args: { filters: filters || {} },
    callback: function(r) {
        if (r.message) {
            let [columns, data] = r.message;
            renderTree(data);
        }
    }
});
```

### Tree Structure (from data)
```javascript
// Each row has:
{
    indent: 0,              // 0 = project, >0 = task
    name: "TASK-001",       // Task/Project ID
    project: "PROJECT-A",   // Project name
    task_link: "<a href...>Task Name</a>",
    status: "Working",
    expected_start_date: "2025-11-01",
    expected_end_date: "2025-11-15",
    progress: 50
}
```

### Status Badge Colors (Reuse)
```javascript
const STATUS_COLORS = {
    completed: "status-green",
    working: "status-orange",
    cancelled: "status-red",
    "on hold": "status-yellow",
    // etc... (see project_overview.js lines 25-39)
};
```

---

## Code Style Guidelines

**Follow existing riz_erp conventions:**
- Inline comments for complex logic
- Use `frappe.call()` for API calls
- Use `frappe.ui.Dialog()` for modals
- Use `frappe.msgprint()` for notifications
- Use `frappe.freeze()` for blocking operations
- Error handling with try/catch and `frappe.log_error()`

**Example Dialog Pattern:**
```javascript
let d = new frappe.ui.Dialog({
    title: 'Dialog Title',
    fields: [
        { fieldname: 'field1', label: 'Label', fieldtype: 'Data', reqd: 1 }
    ],
    primary_action_label: 'Submit',
    primary_action(values) {
        frappe.call({
            method: 'path.to.api.method',
            args: values,
            callback: function(r) {
                frappe.msgprint('Success!');
                d.hide();
            }
        });
    }
});
d.show();
```

---

## Testing Checklist

After each story:
- [ ] Test on desktop browser
- [ ] Test on mobile (responsive)
- [ ] Check console for errors
- [ ] Test with 100+ tasks (performance)
- [ ] Verify permissions (Projects User role)

---

## Definition of Done (Each Story)

- [ ] All acceptance criteria met
- [ ] Code commented
- [ ] No console errors
- [ ] Tested on desktop and mobile
- [ ] Committed to git (optional)

---

## Important Notes

**Do NOT:**
- ❌ Modify existing report files (`project_overview.py`, `project_overview.js`)
- ❌ Change backend APIs
- ❌ Change database structure
- ❌ Skip acceptance criteria

**Do:**
- ✅ Reuse all backend APIs
- ✅ Follow user stories in order
- ✅ Test thoroughly
- ✅ Ask questions if acceptance criteria are unclear
- ✅ Report blockers immediately

---

## Success Criteria (Final)

**Feature Parity:**
- ✅ All features from old report work in new page
- ✅ Bulk operations work correctly
- ✅ Filters work correctly
- ✅ Permissions respected

**UX Improvements:**
- ✅ Better mobile experience
- ✅ Cleaner UI
- ✅ Faster interactions

**Performance:**
- ✅ Page loads in <2 seconds (1000 tasks)
- ✅ Smooth animations (60fps)

---

## Questions or Blockers?

If you encounter issues:
1. Check migration-to-custom-page.md for architecture details
2. Review existing report code for reference
3. Check Frappe docs: https://frappeframework.com/docs
4. Report blocker with specific error details

---

## Quick Reference

**Workspace:** `/home/riz/work-bench/apps/riz_erp`

**Docs:**
- `docs/MIGRATION-SUMMARY.md` - Overview
- `docs/migration-to-custom-page.md` - Full plan
- `docs/migration-user-stories.md` - Your work items ⭐

**Current Report:**
- `riz_erp/riz_erp/report/project_overview/` - Reference only

**New Page (you'll create):**
- `riz_erp/riz_erp/page/project_dashboard/` - Your code

---

**Ready to start? Begin with US-M001: Create Custom Page Structure**

Good luck! 🚀
