# Project Overview Report

## Description

A comprehensive report that displays all projects and their associated tasks in a hierarchical tree structure, providing project managers with a clear overview of project status and progress.

**Location:** `riz_erp/riz_erp/report/project_overview/`

**Report Type:** Script Report (Python-based)

## Current Functionality

### Display Structure

The report shows data in a tree format:
```
Project Name
  └─ Task 1
  └─ Task 2
  └─ Task 3
```

### Columns Displayed

- Project/Task Name
- Status
- Additional columns (as configured in the report)

### Use Cases

1. **Project Monitoring** - Quick overview of all active projects
2. **Task Tracking** - See all tasks under each project at a glance
3. **Status Checking** - Review project and task statuses in one view

## Implemented Features

### ✅ Interactive Buttons (MVP - Completed 2025-10-31)

#### 1. Update Task Status Button ✅
**Purpose:** Allow project managers to update task status directly from the report

**Functionality:**
- Button appears on each task row
- Opens modal/dialog with status dropdown
- Updates task status without leaving the report
- Auto-fills `completed_on` date when status changed to "Completed"
- Shows confirmation after successful update
- Refreshes report data automatically

**User Flow:**
1. User clicks "Update Status" button on task row
2. Modal opens showing current status and dropdown with available statuses
3. User selects new status and clicks "Update"
4. Task status updates in ERPNext (with completed_on auto-filled if Completed)
5. Report refreshes to show updated status

#### 2. Create New Task Button ✅
**Purpose:** Streamline task creation process for project managers

**Functionality:**
- Button appears on project rows
- Opens form with essential task fields
- Pre-fills project context
- Creates task and assigns using Frappe's assignment API
- Adds to report view automatically

**User Flow:**
1. User clicks "Create Task" button on project row
2. Form opens with:
   - Project (pre-filled from current row)
   - Task Name (required)
   - Description (optional)
   - Status
   - Assigned To
   - Due Date
3. User fills in details and clicks "Create"
4. New task is created in ERPNext with proper assignment
5. Report refreshes to show new task under the project

## Future Enhancements (Planned)

- Bulk status updates (select multiple tasks)
- Advanced filtering options
- Task editing capabilities
- Quick task deletion
- Performance optimizations for large datasets

## Technical Details

### Files

- `project_overview.py` - Python script for data fetching
- `project_overview.js` - JavaScript for report rendering and interactions
- `project_overview.json` - Report configuration
- `__init__.py` - Module initialization

### Dependencies

- ERPNext Project doctype
- ERPNext Task doctype
- Frappe Report framework

### Permissions

Report respects standard ERPNext permissions:
- Users must have read access to Projects and Tasks
- Status update feature requires write permission on Task doctype
- Task creation requires create permission on Task doctype

## Usage Guide

### Accessing the Report

1. Navigate to **Project** module in ERPNext
2. Go to **Reports** section
3. Select **Project Overview**
4. Report displays with all accessible projects and tasks

### Current Workflow (Before Enhancements)

**To Update Task Status:**
1. View task in report
2. Navigate to task detail page
3. Update status field
4. Save
5. Return to report

**To Create New Task:**
1. Navigate to Project detail page
2. Click "New Task"
3. Fill in task details
4. Save
5. Return to report

### Future Workflow (After Enhancements)

**To Update Task Status:**
1. Click "Update Status" button on task row
2. Select new status
3. Done! (Report auto-refreshes)

**To Create New Task:**
1. Click "Create Task" button on project row
2. Enter task details in quick form
3. Click "Create"
4. Done! (New task appears in report)

## Known Limitations

- Tree structure may be slow with very large datasets (500+ tasks)
- Report requires page refresh for external task updates
- No offline capability

## Troubleshooting

**Issue:** Report not loading
- Check permissions on Project and Task doctypes
- Verify app is installed on the site

**Issue:** No data displayed
- Confirm projects exist in the system
- Check user has read permissions for projects

**Issue:** Performance is slow
- Consider adding filters to reduce dataset size
- Check database indexes on Project and Task doctypes

## Changelog

### Version 1.1 (Current - 2025-10-31)
- ✅ Interactive task status update button with auto-fill completed_on date
- ✅ Quick task creation button with description field
- ✅ Proper task assignment using Frappe API
- ✅ Actions column added to report

### Version 1.0 (2025-10-26)
- Initial implementation
- Tree structure display of projects and tasks
- Basic status and column display with custom badges
