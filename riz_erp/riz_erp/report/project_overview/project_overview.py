# Copyright (c) 2025, https://github.com/RAhmed-Dev?tab=repositories
# For license information, please see license.txt

import frappe


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
            "progress": ""
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
    ]

    return columns, data


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
        }
        result.append(row)
        if t["children"]:
            result.extend(flatten_task_tree({c["name"]: c for c in t["children"]}, indent + 1))
    return result
