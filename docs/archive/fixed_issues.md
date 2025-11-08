# Fixed Issues

## 2025-11-08

### Issue: Task Description Formatting Not Maintained in Project Overview Report

**Problem:**
When creating a task from the Project Overview Report, the description formatting was not maintained when added to the actual task. This was because the pop-up dialog used a Small Text field while the Task doctype uses a Text Editor field.

**Solution:**
Changed the description field type from `'Small Text'` to `'Text Editor'` in the Create Task dialog (`project_overview.js:539`). This now matches the actual Task doctype's description field type and preserves HTML formatting.

**Files Modified:**
- `/home/riz/work-bench/apps/riz_erp/riz_erp/riz_erp/report/project_overview/project_overview.js`

**Changes:**
- Line 539: Changed `fieldtype: 'Small Text'` to `fieldtype: 'Text Editor'`
