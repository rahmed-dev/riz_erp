# Development Guide - RIZ ERP App

## Overview

This guide provides guidelines and best practices for developing and maintaining the RIZ ERP custom app.

## Development Philosophy

- **Keep it Simple** - Favor straightforward solutions over complex architectures
- **Follow Frappe Conventions** - Stick to ERPNext/Frappe standards and patterns
- **Document as You Go** - Update docs with each feature addition
- **Test with Real Data** - Validate features with realistic project/task scenarios

## Development Environment

### Prerequisites

- ERPNext development environment (bench)
- Basic knowledge of:
  - Python (for server-side logic)
  - JavaScript (for client-side interactions)
  - Frappe Framework concepts
  - ERPNext data model

### Setting Up

1. Navigate to your bench folder
2. App location: `apps/riz_erp/`
3. Development site: [your development site]

### Testing Changes

```bash
# After making changes
bench --site [site-name] migrate
bench --site [site-name] clear-cache
bench restart
```

## Code Structure

### Frappe App Structure

```
riz_erp/
├── riz_erp/               # App module
│   ├── __init__.py
│   ├── hooks.py           # App hooks and configuration
│   └── riz_erp/           # Main module
│       └── report/        # Custom reports
│           └── project_overview/
│               ├── __init__.py
│               ├── project_overview.py    # Data logic (Python)
│               ├── project_overview.js    # UI logic (JavaScript)
│               └── project_overview.json  # Report config
├── docs/                  # Documentation
├── license.txt
├── pyproject.toml
└── README.md
```

## Best Practices

### Core Principles (CRITICAL)

1. **Server-Side First** - Always prefer server-side logic over client-side
   - ✅ Filter data in Python `execute()` method
   - ❌ Filter data in JavaScript after receiving it
   - **Why:** More robust, no timing issues, respects permissions

2. **Use Frappe Standards** - Use built-in features, not custom implementations
   - ✅ Define filters in `.json` file
   - ❌ Build custom filter UI in JavaScript
   - **Why:** Maintainable, follows framework patterns

3. **Minimize Code** - Less code = fewer bugs
   - ✅ One simple server-side filter (5 lines)
   - ❌ 120 lines of complex client-side filtering
   - **Why:** Easier to debug, maintain, and understand

4. **Reload Properly** - JSON changes need database sync
   - Use: `bench --site [site] reload-doc [app] Report "[Name]"`
   - Or: Manually add filters through UI (Report List → Edit)
   - **Why:** JSON files don't auto-sync to database

### Python (Server-Side)

- Use Frappe's built-in methods (`frappe.get_doc()`, `frappe.db.get_list()`, etc.)
- Always check permissions before allowing actions
- Handle errors gracefully with try/except
- Follow PEP 8 style guidelines
- **PREFER server-side filtering** in report `execute()` method

**Example:**
```python
import frappe

@frappe.whitelist()
def update_task_status(task_name, new_status):
    # Check permissions
    if not frappe.has_permission("Task", "write"):
        frappe.throw("Insufficient permissions")

    # Update task
    task = frappe.get_doc("Task", task_name)
    task.status = new_status
    task.save()

    return {"success": True, "message": "Status updated"}
```

**Server-Side Filtering (Script Reports):**
```python
def execute(filters=None):
    if not filters:
        filters = {}

    # Build query filters based on report filters
    task_filters = {"project": filters.get("project")}

    # Handle custom filter logic
    if not filters.get("show_completed_tasks"):
        task_filters["status"] = ["!=", "Completed"]

    tasks = frappe.get_all("Task", filters=task_filters, fields=[...])
    return columns, data
```

### JavaScript (Client-Side)

- Use Frappe's built-in UI components (Dialog, msgprint, etc.)
- Make server calls using `frappe.call()`
- Refresh report data after updates
- Provide user feedback for all actions

**Example:**
```javascript
frappe.ui.form.on("Task", {
    update_status: function(frm) {
        frappe.call({
            method: "riz_erp.riz_erp.report.project_overview.update_task_status",
            args: {
                task_name: frm.doc.name,
                new_status: "Completed"
            },
            callback: function(r) {
                if (r.message.success) {
                    frappe.msgprint("Status updated successfully");
                    frm.reload_doc();
                }
            }
        });
    }
});
```

### Script Report Development

Script Reports consist of 3 files:
1. **`.py`** - Server-side data logic (MOST IMPORTANT)
2. **`.json`** - Report configuration (filters, metadata)
3. **`.js`** - Client-side UI enhancements (buttons, formatters)

**Key Rules:**

1. **Define Filters in JSON** - Not in JavaScript
   ```json
   "filters": [
     {
       "fieldname": "show_completed_tasks",
       "fieldtype": "Check",
       "label": "Show Completed Tasks",
       "default": "0"
     }
   ]
   ```

2. **Filter Data in Python** - Use `filters` parameter in `execute()`
   ```python
   def execute(filters=None):
       task_filters = {}
       if not filters.get("show_completed_tasks"):
           task_filters["status"] = ["!=", "Completed"]

       tasks = frappe.get_all("Task", filters=task_filters)
       return columns, data
   ```

3. **Use JavaScript Only For:**
   - UI formatting (badges, colors, buttons)
   - Click handlers for buttons
   - Dialogs and user interactions
   - NOT for filtering data

4. **After JSON Changes:**
   ```bash
   # Option 1: Reload specific report
   bench --site [site] reload-doc [app] Report "[Name]"

   # Option 2: Run migrate
   bench --site [site] migrate

   # Option 3: Manual UI (if bench commands fail)
   # Go to Report List → Edit report → Add filter manually
   ```

**Performance:**
- Keep queries efficient (use proper filters and indexes)
- Test with large datasets (100+ projects, 500+ tasks)
- Let database do the filtering (server-side)
- Cache data when appropriate
- Document report columns and their purpose

## Code Documentation Standards

All code files must have clear documentation to help future developers understand the codebase quickly.

### File-Level Documentation

**Python Files:**
```python
"""
Module Name - Brief Description
================================
Detailed description of what this module does.

Features:
- Feature 1
- Feature 2

Main Functions:
- function1(): Description
- function2(): Description
"""

import frappe
```

**JavaScript Files:**
```javascript
/**
 * Module Name - Brief Description
 * ================================
 * Detailed description of what this module does.
 *
 * Features:
 * - Feature 1
 * - Feature 2
 *
 * Main Components:
 * - component1(): Description
 * - component2(): Description
 */

frappe.query_reports["Report Name"] = {
    // ...
};
```

### Function-Level Documentation

**Python Functions:**
```python
# -------------------- function_name --------------------
# Brief description of what the function does
# Additional details about requirements or behavior
# -------------------------------------------------------
def function_name(param1, param2):
    """Short docstring description"""
    # Implementation
    pass
```

**JavaScript Functions:**
```javascript
// -------------------- function_name --------------------
// Brief description of what the function does
// Additional details about requirements or behavior
// ------------------------------------------------------
function_name: function(param1, param2) {
    // Implementation
}
```

### Inline Comments

Use inline comments for:
- Complex logic that needs explanation
- Non-obvious business rules
- Temporary workarounds (mark with TODO or FIXME)

```python
# Auto-fill completed_on when status is Completed
if new_status == "Completed":
    task.completed_on = frappe.utils.today()
```

### Documentation Requirements

**When adding new code:**
1. Add file-level documentation at the top
2. Add function-level header comments for all functions
3. Add inline comments for complex logic
4. Update relevant documentation files in `/docs/`

**Comment Style Guidelines:**
- Keep comments concise and clear
- Use proper grammar and punctuation
- Explain "why" not just "what"
- Update comments when code changes

## Adding New Features

### Workflow

1. **Plan** - Document the feature in the relevant `/docs/features/` file
2. **Develop** - Implement the feature following Frappe conventions
3. **Test** - Test with realistic data and edge cases
4. **Document** - Update feature documentation with details
5. **Deploy** - Migrate and deploy to production

### Feature Documentation Template

When adding a new feature, create or update documentation with:

- **Description** - What the feature does
- **Location** - Where the code lives
- **Functionality** - How it works
- **User Flow** - Step-by-step user interaction
- **Technical Details** - Implementation notes
- **Dependencies** - What it depends on
- **Permissions** - Required user permissions

## Common Tasks

### Adding Interactive Buttons to Reports

```javascript
// In project_overview.js
frappe.query_reports["Project Overview"] = {
    formatter: function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (column.fieldname == "action_buttons" && data.is_task) {
            value = `<button class="btn btn-xs btn-primary update-status"
                     data-task="${data.task_name}">Update Status</button>`;
        }

        return value;
    },

    onload: function(report) {
        // Add button click handlers
        $(document).on("click", ".update-status", function() {
            let task = $(this).data("task");
            // Show dialog and update status
        });
    }
};
```

### Creating Dialogs

```javascript
let d = new frappe.ui.Dialog({
    title: 'Update Task Status',
    fields: [
        {
            label: 'Status',
            fieldname: 'status',
            fieldtype: 'Select',
            options: ['Open', 'Working', 'Completed', 'Cancelled'],
            reqd: 1
        }
    ],
    primary_action_label: 'Update',
    primary_action(values) {
        // Handle update
        d.hide();
    }
});
d.show();
```

### Making Server Calls

```javascript
frappe.call({
    method: "riz_erp.api.update_something",
    args: {
        param1: "value1",
        param2: "value2"
    },
    freeze: true,
    freeze_message: "Updating...",
    callback: function(r) {
        if (r.message) {
            frappe.msgprint("Success!");
        }
    },
    error: function(r) {
        frappe.msgprint("An error occurred");
    }
});
```

## Debugging Tips

### Enable Developer Mode

```bash
bench --site [site-name] set-config developer_mode 1
bench --site [site-name] clear-cache
```

### Check Logs

```bash
# Watch error logs
tail -f sites/[site-name]/logs/error.log

# Watch web logs
tail -f sites/[site-name]/logs/web.log
```

### Browser Console

- Use `console.log()` in JavaScript for debugging
- Check browser Network tab for failed API calls
- Use frappe's `frappe.msgprint()` for user-facing messages

### Python Debugging

```python
# Print to console
print("Debug message")

# Use Frappe's logger
frappe.log_error("Error message", "Error Title")
```

## Helpful Resources

### Official Documentation

- [Frappe Framework Docs](https://frappeframework.com/docs)
- [ERPNext Developer Guide](https://frappeframework.com/docs/user/en/tutorial)
- [Frappe Report Guide](https://frappeframework.com/docs/user/en/guides/reports-and-printing)

### Community Resources

- [Frappe Forum](https://discuss.frappe.io/)
- [ERPNext GitHub](https://github.com/frappe/erpnext)
- [Frappe School](https://frappe.school/)

## Version Control

- Commit regularly with clear messages
- Document breaking changes
- Tag releases in git
- Keep main branch stable

## Deployment Checklist

Before deploying to production:

- [ ] Test thoroughly in development environment
- [ ] Update documentation
- [ ] Run migrations (`bench migrate`)
- [ ] Clear cache (`bench clear-cache`)
- [ ] Test with production-like data
- [ ] Verify permissions work correctly
- [ ] Inform users of new features
- [ ] Monitor error logs after deployment

## Getting Help

- Check Frappe/ERPNext official documentation first
- Search Frappe Forum for similar issues
- Review ERPNext source code for examples
- Ask specific questions on the forum with code examples

## Future Development Areas

### Short-term (Next 3-6 months)
- Complete interactive buttons for Project Overview report
- Performance optimization for large datasets
- Additional project management reports

### Long-term (6-12 months)
- Project dashboard views
- Custom project templates
- Integration with external tools
- Mobile-friendly interfaces

---

**Remember:** Keep it simple, document everything, and test thoroughly!
