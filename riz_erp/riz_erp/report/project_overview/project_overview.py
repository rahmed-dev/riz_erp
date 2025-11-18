# Copyright (c) 2025, https://github.com/RAhmed-Dev?tab=repositories
# For license information, please see license.txt

"""
Project Overview Report - Server-side logic
============================================
Displays projects and tasks in a hierarchical tree structure with interactive features.

Features:
- Server-side filtering (hide completed tasks by default)
- Update task status directly from report (with auto-fill completed_on date)
- Create new tasks from project rows
- Tree structure with parent-child task relationships
- Task selection checkboxes for bulk operations
- Respects ERPNext permissions

Filters (defined in .json):
- project: Filter by specific project
- status: Filter by task status
- show_completed_tasks: Show/hide completed tasks (default: hidden)

Main Functions:
- execute(): Report data generation with server-side filtering
- update_task_status(): Update task status via button
- create_task_from_report(): Create new tasks via button (enhanced with expected dates in v1.2)
- bulk_update_task_status(): Bulk update status for multiple tasks (v1.2)
- bulk_update_task_dates(): Bulk update expected dates for multiple tasks (v1.2)
- build_task_tree(): Build hierarchical task structure
- flatten_task_tree(): Convert tree to flat list for display
"""

import frappe


# -------------------- Helper: Parse Boolean --------------------
# Converts string/bool to boolean for Frappe whitelisted methods
# Handles common string representations: 'true', '1', 'yes'
# ----------------------------------------------------------------
def parse_bool(value):
    """Parse boolean from string or bool value"""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes')
    return bool(value)


# -------------------- Helper: Parse Multi-Select --------------------
# Parses multi-select filter values (list or comma-separated string)
# Returns list of values - handles Frappe's varying serialization
# ---------------------------------------------------------------------
def parse_multi_select(value):
    """Parse multi-select filter value to list"""
    if not value:
        return []
    if isinstance(value, list):
        return [v.strip() for v in value if v and str(v).strip()]
    if isinstance(value, str):
        return [v.strip() for v in value.split(',') if v.strip()]
    return []


# -------------------- update_task ---------------------------
# Updates a task's status from the Project Overview report
# Update Task Next Action field from the Project Overview report.
# Auto-fills completed_on date when status is set to "Completed"
# Requires: Task write permission
# ------------------------------------------------------------
@frappe.whitelist()
def update_task(task_name, new_status=None, custom_next_action=None):
    """Update task status and/or custom next action

    Args:
        task_name (str): Task document name
        new_status (str): Optional new status value
        custom_next_action (str): Optional next action value

    Returns:
        dict: {"success": bool, "message": str}

    Note: At least one of new_status or custom_next_action must be provided
    """
    from frappe.utils import cstr

    # Type conversions - JavaScript sends everything as strings
    task_name = cstr(task_name).strip()
    new_status = cstr(new_status).strip() if new_status else None
    custom_next_action = cstr(custom_next_action).strip() if custom_next_action else None

    # Treat empty strings as None
    if new_status == "":
        new_status = None
    if custom_next_action == "":
        custom_next_action = None

    # Check permissions
    if not frappe.has_permission("Task", "write"):
        frappe.throw("You do not have permission to update tasks")

    # Validate at least one field is being updated
    if not new_status and not custom_next_action:
        frappe.throw("Please provide at least one field to update (status or next action)")

    try:
        # Get task document
        task = frappe.get_doc("Task", task_name)

        # Track what was updated for message
        updates = []

        # Update status if provided
        if new_status:
            task.status = new_status
            updates.append(f"status to {new_status}")

            # Auto-fill completed_on when status is Completed
            if new_status == "Completed":
                task.completed_on = frappe.utils.today()

        # Update custom_next_action if provided (and not empty)
        if custom_next_action:
            task.custom_next_action = custom_next_action
            updates.append(f"next action to '{custom_next_action}'")

        # Save task
        task.save()

        # Build success message
        message = "Task updated: " + " and ".join(updates)

        return {
            "success": True,
            "message": message
        }
    except Exception as e:
        frappe.log_error(f"Error updating task: {str(e)}", "Task Update Error")
        return {
            "success": False,
            "message": f"Failed to update task: {str(e)}"
        }

# -------------------- create_task_from_report --------------------
# Creates a new task from the Project Overview report
# Assigns task to user using Frappe's assignment API if provided
# Requires: Task create permission
# ------------------------------------------------------------------
@frappe.whitelist()
def create_task_from_report(project, task_name, description=None, status="Open", assigned_to=None,
                            due_date=None, exp_start_date=None, exp_end_date=None):
    """Create a new task from Project Overview report

    Args:
        project (str): Project name
        task_name (str): Task subject
        description (str): Task description
        status (str): Task status
        assigned_to (str): User to assign task to
        due_date (str): Due date (DEPRECATED - use exp_end_date)
        exp_start_date (str): Expected start date
        exp_end_date (str): Expected end date

    Returns:
        dict: {"success": bool, "message": str, "task_name": str}
    """
    from frappe.utils import cstr, getdate

    # Type conversions - JavaScript sends everything as strings
    project = cstr(project).strip()
    task_name = cstr(task_name).strip()
    description = cstr(description).strip() if description else None
    status = cstr(status).strip() if status else "Open"
    assigned_to = cstr(assigned_to).strip() if assigned_to else None

    # Convert dates
    if exp_start_date:
        exp_start_date = getdate(exp_start_date)
    if exp_end_date:
        exp_end_date = getdate(exp_end_date)
    elif due_date:
        exp_end_date = getdate(due_date)

    # Validate required fields
    if not project:
        frappe.throw("Project is required")
    if not task_name:
        frappe.throw("Task name is required")

    # Check permissions
    if not frappe.has_permission("Task", "create"):
        frappe.throw("You do not have permission to create tasks")

    try:
        # Create new task document
        task = frappe.get_doc({
            "doctype": "Task",
            "subject": task_name,
            "description": description,
            "project": project,
            "status": status,
            "exp_start_date": exp_start_date,
            "exp_end_date": exp_end_date
        })

        # Insert (save) the task first
        task.insert()

        # Add assignment using Frappe's assignment system if provided
        if assigned_to:
            try:
                from frappe.desk.form.assign_to import add
                add({
                    "assign_to": [assigned_to],
                    "doctype": "Task",
                    "name": task.name,
                    "description": f"Task assigned from Project Overview report"
                })
            except Exception as assign_error:
                # Log assignment error but don't fail task creation
                frappe.log_error(f"Error assigning task: {str(assign_error)}", "Task Assignment Error")

        return {
            "success": True,
            "message": f"Task '{task_name}' created successfully",
            "task_name": task.name
        }
    except Exception as e:
        frappe.log_error(f"Error creating task: {str(e)}", "Task Creation Error")
        return {
            "success": False,
            "message": f"Failed to create task: {str(e)}"
        }


# -------------------- bulk_update_task_status --------------------
# Updates status for multiple tasks with optional auto-complete date
# Processes in batches of 10 for performance
# Requires: Task write permission for each task
# Returns: Dict with success/failure counts and error details
# ------------------------------------------------------------------
@frappe.whitelist()
def bulk_update_task_status(task_ids, new_status=None, custom_next_action=None, auto_complete=True):
    """Bulk update status and/or custom next action for multiple tasks

    Args:
        task_ids (str|list): List of task IDs (sent as JSON string from client)
        new_status (str): Optional new status value
        custom_next_action (str): Optional next action value
        auto_complete (str|bool): Auto-fill completed_on date if status is Completed

    Returns:
        dict: {"success": bool, "updated": int, "failed": int, "errors": list}

    Note: At least one of new_status or custom_next_action must be provided
    """
    import json
    from frappe.utils import cstr

    # Type conversions - JavaScript sends everything as strings
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    auto_complete = parse_bool(auto_complete)

    # Convert to strings and handle None/empty values
    new_status = cstr(new_status).strip() if new_status else None
    custom_next_action = cstr(custom_next_action).strip() if custom_next_action else None

    # Treat empty strings as None
    if new_status == "":
        new_status = None
    if custom_next_action == "":
        custom_next_action = None

    # Validate at least one field is being updated
    if not new_status and not custom_next_action:
        return {
            "success": False,
            "updated": 0,
            "failed": 0,
            "errors": ["Please provide at least one field to update (status or next action)"]
        }

    updated = 0
    failed = 0
    errors = []

    # Process in batches of 10
    for i in range(0, len(task_ids), 10):
        batch = task_ids[i:i+10]

        for task_id in batch:
            try:
                # Get task document
                task = frappe.get_doc("Task", task_id)

                # Check write permission
                if not frappe.has_permission("Task", "write", task):
                    failed += 1
                    errors.append(f"{task_id}: Permission denied")
                    continue

                # Update status if provided
                if new_status:
                    task.status = new_status

                    # Auto-fill completed_on date if status is Completed
                    if new_status == "Completed" and auto_complete:
                        task.completed_on = frappe.utils.today()

                # Update custom_next_action if provided (and not empty)
                if custom_next_action:
                    task.custom_next_action = custom_next_action

                # Save task
                task.save()
                updated += 1

            except Exception as e:
                failed += 1
                errors.append(f"{task_id}: {str(e)}")
                frappe.log_error(f"Bulk update failed for {task_id}: {str(e)}", "Bulk Update Error")

    return {
        "success": failed == 0,
        "updated": updated,
        "failed": failed,
        "errors": errors
    }


# -------------------- bulk_update_task_dates --------------------
# Updates expected dates for multiple tasks
# Supports "only empty" mode to skip tasks with existing dates
# Processes in batches of 10 for performance
# Requires: Task write permission for each task
# Returns: Dict with success/failure/skipped counts and error details
# ----------------------------------------------------------------
@frappe.whitelist()
def bulk_update_task_dates(task_ids, exp_start_date=None, exp_end_date=None, only_empty=False):
    """Bulk update expected dates for multiple tasks

    Args:
        task_ids (str|list): List of task IDs (sent as JSON string from client)
        exp_start_date (str): Expected start date in YYYY-MM-DD format
        exp_end_date (str): Expected end date in YYYY-MM-DD format
        only_empty (str|bool): Only update if currently empty

    Returns:
        dict: {"success": bool, "updated": int, "skipped": int, "failed": int, "errors": list}
    """
    import json
    from frappe.utils import getdate

    # Type conversions - JavaScript sends everything as strings
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    only_empty = parse_bool(only_empty)

    # Validate and convert dates using Frappe's getdate (handles various formats)
    if exp_start_date:
        try:
            exp_start_date = getdate(exp_start_date)
        except Exception:
            frappe.throw(f"Invalid start date format: {exp_start_date}")

    if exp_end_date:
        try:
            exp_end_date = getdate(exp_end_date)
        except Exception:
            frappe.throw(f"Invalid end date format: {exp_end_date}")

    # Validate date logic
    if exp_start_date and exp_end_date and exp_end_date < exp_start_date:
        frappe.throw("Expected End Date must be greater than or equal to Expected Start Date")

    updated = 0
    skipped = 0
    failed = 0
    errors = []

    # Process in batches of 10
    for i in range(0, len(task_ids), 10):
        batch = task_ids[i:i+10]

        for task_id in batch:
            try:
                # Get task document
                task = frappe.get_doc("Task", task_id)

                # Check write permission
                if not frappe.has_permission("Task", "write", task):
                    failed += 1
                    errors.append(f"{task_id}: Permission denied")
                    continue

                # Check if should skip due to only_empty mode
                should_skip = False
                if only_empty:
                    if exp_start_date and task.exp_start_date:
                        should_skip = True
                    if exp_end_date and task.exp_end_date:
                        should_skip = True

                if should_skip:
                    skipped += 1
                    continue

                # Update dates
                if exp_start_date:
                    task.exp_start_date = exp_start_date
                if exp_end_date:
                    task.exp_end_date = exp_end_date

                # Save task
                task.save()
                updated += 1

            except Exception as e:
                failed += 1
                errors.append(f"{task_id}: {str(e)}")
                frappe.log_error(f"Bulk date update failed for {task_id}: {str(e)}", "Bulk Date Update Error")

    return {
        "success": failed == 0,
        "updated": updated,
        "skipped": skipped,
        "failed": failed,
        "errors": errors
    }


# -------------------- assign_tasks --------------------
# Assigns user to multiple tasks using Frappe's native assignment API
# Processes in batches of 10 for performance
# Requires: Task write permission for each task
# Returns: Dict with success/failure counts and error details
# -------------------------------------------------------
@frappe.whitelist()
def assign_tasks(task_ids, user):
    """Assign user to multiple tasks

    Args:
        task_ids (str|list): List of task IDs (sent as JSON string from client)
        user (str): User email to assign

    Returns:
        dict: {"success": bool, "assigned": int, "already_assigned": int, "failed": int, "errors": list}
    """
    import json
    from frappe.utils import cstr

    # Type conversions
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    user = cstr(user).strip()

    # Validate user
    if not user:
        return {
            "success": False,
            "assigned": 0,
            "already_assigned": 0,
            "failed": 0,
            "errors": ["Please select a user to assign"]
        }

    assigned = 0
    already_assigned = 0
    failed = 0
    errors = []

    # Get existing assignments for all tasks in one query
    existing_assignments = frappe.get_all(
        "ToDo",
        filters={
            "reference_type": "Task",
            "reference_name": ["in", task_ids],
            "allocated_to": user,
            "status": "Open"
        },
        pluck="reference_name"
    )
    existing_set = set(existing_assignments)

    # Process in batches of 10
    for i in range(0, len(task_ids), 10):
        batch = task_ids[i:i+10]

        for task_id in batch:
            try:
                # Check write permission
                if not frappe.has_permission("Task", "write", task_id):
                    failed += 1
                    errors.append(f"{task_id}: Permission denied")
                    continue

                # Check if already assigned
                if task_id in existing_set:
                    already_assigned += 1
                    continue

                # Assign using Frappe's native API
                from frappe.desk.form.assign_to import add
                add({
                    "assign_to": [user],
                    "doctype": "Task",
                    "name": task_id,
                    "description": "Assigned from Project Overview"
                })
                assigned += 1

            except Exception as e:
                failed += 1
                errors.append(f"{task_id}: {str(e)}")
                frappe.log_error(f"Assignment failed for {task_id}: {str(e)}", "Task Assignment Error")

    return {
        "success": failed == 0,
        "assigned": assigned,
        "already_assigned": already_assigned,
        "failed": failed,
        "errors": errors
    }


# -------------------- unassign_tasks --------------------
# Removes user assignments from multiple tasks
# Processes in batches of 10 for performance
# Requires: Task write permission for each task
# Returns: Dict with success/failure counts and error details
# ---------------------------------------------------------
@frappe.whitelist()
def unassign_tasks(task_ids, users):
    """Remove user assignments from multiple tasks

    Args:
        task_ids (str|list): List of task IDs (sent as JSON string from client)
        users (str|list): List of user emails to unassign

    Returns:
        dict: {"success": bool, "removed": int, "not_assigned": int, "failed": int, "errors": list}
    """
    import json
    from frappe.utils import cstr

    # Type conversions
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)
    if isinstance(users, str):
        users = json.loads(users)

    # Validate users
    if not users:
        return {
            "success": False,
            "removed": 0,
            "not_assigned": 0,
            "failed": 0,
            "errors": ["Please select user(s) to remove"]
        }

    removed = 0
    not_assigned = 0
    failed = 0
    errors = []

    # Get existing assignments for all tasks in one query
    existing_assignments = frappe.get_all(
        "ToDo",
        filters={
            "reference_type": "Task",
            "reference_name": ["in", task_ids],
            "allocated_to": ["in", users],
            "status": "Open"
        },
        fields=["reference_name", "allocated_to"]
    )

    # Build lookup: {task_id: set of assigned users}
    assignment_lookup = {}
    for assignment in existing_assignments:
        task_name = assignment.reference_name
        if task_name not in assignment_lookup:
            assignment_lookup[task_name] = set()
        assignment_lookup[task_name].add(assignment.allocated_to)

    # Process in batches of 10
    for i in range(0, len(task_ids), 10):
        batch = task_ids[i:i+10]

        for task_id in batch:
            try:
                # Check write permission
                if not frappe.has_permission("Task", "write", task_id):
                    failed += 1
                    errors.append(f"{task_id}: Permission denied")
                    continue

                task_assignees = assignment_lookup.get(task_id, set())

                for user_to_remove in users:
                    # Check if user is assigned to this task
                    if user_to_remove not in task_assignees:
                        not_assigned += 1
                        continue

                    try:
                        # Remove using Frappe's native API
                        from frappe.desk.form.assign_to import remove
                        remove("Task", task_id, user_to_remove)
                        removed += 1
                    except Exception as e:
                        failed += 1
                        errors.append(f"{task_id}/{user_to_remove}: {str(e)}")

            except Exception as e:
                failed += 1
                errors.append(f"{task_id}: {str(e)}")
                frappe.log_error(f"Unassignment failed for {task_id}: {str(e)}", "Task Unassignment Error")

    return {
        "success": failed == 0,
        "removed": removed,
        "not_assigned": not_assigned,
        "failed": failed,
        "errors": errors
    }


# -------------------- execute --------------------
# Main report execution function
# Fetches projects and tasks, builds tree structure
# Returns columns and data for the report display
# ------------------------------------------------
def execute(filters=None):
    if not filters:
        filters = {}

    data = []
    all_task_names = []  # Collect all task names for batch assignment fetch
    project_filters = {}
    if filters.get("project"):
        project_filters["name"] = filters.get("project")

    # fetch projects with percent_complete for progress bar
    projects = frappe.get_all("Project", fields=["name", "project_name", "percent_complete"], filters=project_filters)

    # Handle assigned_to filter - get task IDs assigned to selected users (multi-select)
    assigned_to_values = parse_multi_select(filters.get("assigned_to"))
    assigned_task_ids = None
    if assigned_to_values:
        assigned_tasks = frappe.get_all(
            "ToDo",
            filters={
                "reference_type": "Task",
                "allocated_to": ["in", assigned_to_values],
                "status": "Open"
            },
            pluck="reference_name"
        )
        assigned_task_ids = set(assigned_tasks) if assigned_tasks else set()

    # First pass: collect all tasks per project
    project_tasks = {}
    for p in projects:
        # Build task filter
        task_filters = {"project": p.name}

        # Handle status filtering (multi-select)
        status_values = parse_multi_select(filters.get("status"))
        if status_values:
            task_filters["status"] = ["in", status_values]
        elif not filters.get("show_completed_tasks"):
            # No specific status selected AND show_completed unchecked - hide completed
            task_filters["status"] = ["not in", ["Completed", "Cancelled"]]

        # Apply assigned_to filter if set
        if assigned_task_ids is not None:
            if not assigned_task_ids:
                # No tasks assigned to selected users - skip this project
                continue
            task_filters["name"] = ["in", list(assigned_task_ids)]

        # fetch tasks for this project
        tasks = frappe.get_all(
            "Task",
            filters=task_filters,
            fields=["name", "subject", "custom_next_action", "type", "priority", "status", "exp_start_date", "exp_end_date", "progress", "parent_task"]
        )

        if tasks:
            project_tasks[p.name] = {"project": p, "tasks": tasks}
            all_task_names.extend([t.name for t in tasks])

    # Batch fetch all assignments for all tasks with user full names
    task_assignments = {}
    if all_task_names:
        assignments = frappe.get_all(
            "ToDo",
            filters={
                "reference_type": "Task",
                "reference_name": ["in", all_task_names],
                "status": "Open"
            },
            fields=["reference_name", "allocated_to"]
        )

        # Get full names for all assigned users
        assigned_users = list(set([a.allocated_to for a in assignments]))
        user_names = {}
        if assigned_users:
            users = frappe.get_all(
                "User",
                filters={"name": ["in", assigned_users]},
                fields=["name", "full_name"]
            )
            user_names = {u.name: u.full_name or u.name for u in users}

        # Group assignments by task (store as "email:full_name" for client parsing)
        for assignment in assignments:
            task_name = assignment.reference_name
            if task_name not in task_assignments:
                task_assignments[task_name] = []
            email = assignment.allocated_to
            full_name = user_names.get(email, email)
            task_assignments[task_name].append(f"{email}:{full_name}")

    # Second pass: build data with assignments
    for project_name, project_data in project_tasks.items():
        p = project_data["project"]
        tasks = project_data["tasks"]

        # Use Project's percent_complete field for progress bar
        project_progress = round(p.percent_complete or 0)

        # Project node (parent row)
        project_node = {
            "indent": 0,
            "project": "",  # Empty for project rows - ID shown in task_link
            "task_link": f"<a href='/app/project/{p.name}' target='_blank'><b>{p.name}</b> - {p.project_name}</a>",
            "custom_next_action": "",
            "status": "",
            "priority": "",
            "assigned_to": "",
            "expected_end_date": "",
            "progress": project_progress,  # Smart progress: project % for project rows
            "is_project": 1,  # Flag for formatter to render as progress bar
            "name": p.name,
            # Commented out fields - Option B minimal view
            # "type": "",
            # "expected_start_date": "",
            # "actions": "",
        }
        data.append(project_node)

        # build and flatten the task tree with assignments
        task_tree = build_task_tree(tasks)
        data.extend(flatten_task_tree(task_tree, indent=1, task_assignments=task_assignments))

    # column definitions - Option B minimal view
    columns = [
        {"label": "S.", "fieldname": "project", "fieldtype": "Link", "options": "Project", "width": 50},
        {"label": "Task Subject", "fieldname": "task_link", "fieldtype": "Data", "width": 400},
        {"label": "Next Action", "fieldname": "custom_next_action", "fieldtype": "Data", "width": 120, "align": "left"},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 80},
        {"label": "Priority", "fieldname": "priority", "fieldtype": "Data", "width": 72, "align": "left"},
        {"label": "Asg. To", "fieldname": "assigned_to", "fieldtype": "Data", "width": 110},
        {"label": "E. End", "fieldname": "expected_end_date", "fieldtype": "Date", "width": 85},
        {"label": "Progress", "fieldname": "progress", "fieldtype": "Data", "width": 100},
        # Commented out columns - Option B minimal view
        # {"label": "Type", "fieldname": "type", "fieldtype": "Data", "width": 100},
        # {"label": "E. Start", "fieldname": "expected_start_date", "fieldtype": "Date", "width": 90},
        # {"label": "Actions", "fieldname": "actions", "fieldtype": "Data", "width": 150},
    ]
    return columns, data


# -------------------- build_task_tree --------------------
# Converts flat task list into nested tree structure
# Organizes tasks by parent-child relationships
# Returns: Dictionary with top-level tasks as keys
# ---------------------------------------------------------
def build_task_tree(tasks):
    """Convert flat task list into nested dict by parent_task"""
    tree = {}
    lookup = {}

    # Single loop: build lookup and initialize children
    for t in tasks:
        t["children"] = []
        lookup[t["name"]] = t

    # Build hierarchy
    for t in tasks:
        if t.get("parent_task") and t["parent_task"] in lookup:
            lookup[t["parent_task"]]["children"].append(t)
        else:
            tree[t["name"]] = t

    return tree


# -------------------- flatten_task_tree --------------------
# Recursively flattens task tree for report display
# Adds indent level and formats task links
# Returns: List of row dictionaries for the report
# -----------------------------------------------------------
def flatten_task_tree(tree, indent=1, task_assignments=None):
    """Flatten tree recursively for display"""
    if task_assignments is None:
        task_assignments = {}

    result = []
    for name, t in tree.items():
        task_link = f"<a href='/app/task/{t['name']}' target='_blank'>{t['subject']}</a>"

        # Get assignments for this task (comma-separated for formatter)
        assignees = task_assignments.get(t["name"], [])
        assigned_to = ",".join(assignees) if assignees else ""

        row = {
            "indent": indent,
            "project": "",
            "task_link": task_link,
            "custom_next_action": t.get("custom_next_action", ""),
            "status": t.get("status"),
            "priority": t.get("priority", ""),
            "assigned_to": assigned_to,
            "expected_end_date": t.get("exp_end_date"),
            "progress": t.get("progress"),  # Smart progress: task % for task rows
            "is_project": 0,  # Flag for formatter
            "name": t["name"],
            # Commented out fields - Option B minimal view
            # "type": t.get("type", "Task"),
            # "expected_start_date": t.get("exp_start_date"),
            # "actions": "",
        }
        result.append(row)
        if t["children"]:
            result.extend(flatten_task_tree({c["name"]: c for c in t["children"]}, indent + 1, task_assignments))
    return result
