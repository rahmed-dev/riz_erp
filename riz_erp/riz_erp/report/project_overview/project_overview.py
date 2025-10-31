# Copyright (c) 2025, https://github.com/RAhmed-Dev?tab=repositories
# For license information, please see license.txt

"""
Project Overview Report - Server-side logic
============================================
Displays projects and tasks in a hierarchical tree structure with interactive features.

Features:
- Update task status directly from report (with auto-fill completed_on date)
- Create new tasks from project rows
- Tree structure with parent-child task relationships
- Respects ERPNext permissions

Main Functions:
- execute(): Report data generation
- update_task_status(): Update task status via button
- create_task_from_report(): Create new tasks via button
- build_task_tree(): Build hierarchical task structure
- flatten_task_tree(): Convert tree to flat list for display
"""

import frappe


# -------------------- update_task_status --------------------
# Updates a task's status from the Project Overview report
# Auto-fills completed_on date when status is set to "Completed"
# Requires: Task write permission
# ------------------------------------------------------------
@frappe.whitelist()
def update_task_status(task_name, new_status):
    """Update task status from Project Overview report"""
    # Check permissions
    if not frappe.has_permission("Task", "write"):
        frappe.throw("You do not have permission to update tasks")

    try:
        # Get and update task
        task = frappe.get_doc("Task", task_name)
        task.status = new_status

        # Auto-fill completed_on when status is Completed
        if new_status == "Completed":
            task.completed_on = frappe.utils.today()

        task.save()

        return {
            "success": True,
            "message": f"Task status updated to {new_status}"
        }
    except Exception as e:
        frappe.log_error(f"Error updating task status: {str(e)}", "Task Status Update Error")
        return {
            "success": False,
            "message": "Failed to update task status"
        }


# -------------------- create_task_from_report --------------------
# Creates a new task from the Project Overview report
# Assigns task to user using Frappe's assignment API if provided
# Requires: Task create permission
# ------------------------------------------------------------------
@frappe.whitelist()
def create_task_from_report(project, task_name, description=None, status="Open", assigned_to=None, due_date=None):
    """Create a new task from Project Overview report"""
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
            "status": status or "Open",
            "exp_end_date": due_date
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


# -------------------- execute --------------------
# Main report execution function
# Fetches projects and tasks, builds tree structure
# Returns columns and data for the report display
# ------------------------------------------------
def execute(filters=None):
    if not filters:
        filters = {}

    data = []
    project_filters = {}
    if filters.get("project"):
        project_filters["name"] = filters.get("project")

    # fetch projects
    projects = frappe.get_all("Project", fields=["name", "project_name"], filters=project_filters)

    for p in projects:
        # Project node (parent row)
        project_node = {
            "indent": 0,
            "project": p.name,
            "task_link": f"<b>{p.project_name}</b>",
            "type": "",
            "status": "",
            "expected_start_date": "",
            "expected_end_date": "",
            "progress": "",
            "name": p.name,  # Add project name for button reference
            "actions": ""  # Placeholder for actions column
        }
        data.append(project_node)

        # Build task filter
        task_filters = {"project": p.name}
        if filters.get("status"):
            task_filters["status"] = filters.get("status")

        # fetch tasks for this project
        tasks = frappe.get_all(
            "Task",
            filters=task_filters,
            fields=["name", "subject", "type", "status", "exp_start_date", "exp_end_date", "progress", "parent_task"]
        )

        # build and flatten the task tree
        task_tree = build_task_tree(tasks)
        data.extend(flatten_task_tree(task_tree, indent=1))

    # column definitions
    columns = [
        {"label": "Project", "fieldname": "project", "fieldtype": "Link", "options": "Project", "width": 200},
        {"label": "Task Subject", "fieldname": "task_link", "fieldtype": "Data", "width": 250},
        {"label": "Type", "fieldname": "type", "fieldtype": "Data", "width": 100},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
        {"label": "Expected Start", "fieldname": "expected_start_date", "fieldtype": "Date", "width": 120},
        {"label": "Expected End", "fieldname": "expected_end_date", "fieldtype": "Date", "width": 120},
        {"label": "Progress %", "fieldname": "progress", "fieldtype": "Percent", "width": 100},
        {"label": "Actions", "fieldname": "actions", "fieldtype": "Data", "width": 150},
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
    lookup = {t["name"]: t for t in tasks}
    for t in tasks:
        t["children"] = []
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
def flatten_task_tree(tree, indent=1):
    """Flatten tree recursively for display"""
    result = []
    for name, t in tree.items():
        task_link = f"<a href='/app/task/{t['name']}' target='_blank'>{t['subject']}</a>"
        row = {
            "indent": indent,
            "project": "",
            "task_link": task_link,
            "type": t.get("type", "Task"),
            "status": t.get("status"),
            "expected_start_date": t.get("exp_start_date"),
            "expected_end_date": t.get("exp_end_date"),
            "progress": t.get("progress"),
            "name": t["name"],  # Add task name for button reference
            "actions": "",  # Placeholder for actions column
        }
        result.append(row)
        if t["children"]:
            result.extend(flatten_task_tree({c["name"]: c for c in t["children"]}, indent + 1))
    return result
