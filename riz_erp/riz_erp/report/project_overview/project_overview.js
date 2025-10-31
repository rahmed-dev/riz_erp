/**
 * Project Overview Report - Client-side logic
 * ============================================
 * Handles UI interactions for the Project Overview report
 *
 * Features:
 * - Custom status badges with color coding
 * - Update task status button with modal dialog
 * - Create new task button with form dialog
 * - Interactive buttons on task/project rows
 *
 * Main Components:
 * - onload(): Initialize styles and event handlers
 * - formatter(): Render custom UI elements (buttons, badges)
 */

frappe.query_reports["Project Overview"] = {
    // -------------------- onload --------------------
    // Initializes the report when loaded
    // Sets up CSS styles and event listeners for buttons
    // ------------------------------------------------
    onload: function (report) {
        // Inject modern pastel badge styles once
        const styleId = "custom-report-status-badges";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.innerHTML = `
                .status-badge {
                    padding: 4px 10px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 500;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    text-transform: capitalize;
                    letter-spacing: 0.2px;
                }

                .status-green {
                    background-color: #ecfdf5;
                    color: #047857;
                }

                .status-orange {
                    background-color: #fff7ed;
                    color: #b45309;
                }

                .status-red {
                    background-color: #fef2f2;
                    color: #b91c1c;
                }

                .status-yellow {
                    background-color: #fefce8;
                    color: #854d0e;
                }

                .status-gray {
                    background-color: #f3f4f6;
                    color: #374151;
                }
            `;
            document.head.appendChild(style);
        }

        // -------------------- Update Status Button Handler --------------------
        // Handles clicks on "Update Status" buttons
        // Opens modal dialog for status selection and updates task via API
        // -----------------------------------------------------------------------
        $(document).on("click", ".btn-update-status", function() {
            let task_name = $(this).data("task-name");
            let current_status = $(this).data("current-status");

            // Create status update dialog
            let d = new frappe.ui.Dialog({
                title: 'Update Task Status',
                fields: [
                    {
                        label: 'Current Status',
                        fieldname: 'current_status',
                        fieldtype: 'Data',
                        read_only: 1,
                        default: current_status
                    },
                    {
                        label: 'New Status',
                        fieldname: 'new_status',
                        fieldtype: 'Select',
                        options: ['Open', 'Working', 'Pending Review', 'Completed', 'Cancelled', 'Overdue', 'Template'],
                        reqd: 1
                    }
                ],
                primary_action_label: 'Update',
                primary_action(values) {
                    // Call server method to update task status
                    frappe.call({
                        method: "riz_erp.riz_erp.report.project_overview.project_overview.update_task_status",
                        args: {
                            task_name: task_name,
                            new_status: values.new_status
                        },
                        callback: function(r) {
                            if (r.message && r.message.success) {
                                frappe.msgprint(r.message.message);
                                report.refresh();
                            } else {
                                frappe.msgprint("Error updating status");
                            }
                        }
                    });
                    d.hide();
                }
            });
            d.show();
        });

        // -------------------- Create Task Button Handler --------------------
        // Handles clicks on "Create Task" buttons
        // Opens form dialog for task creation and creates task via API
        // --------------------------------------------------------------------
        $(document).on("click", ".btn-create-task", function() {
            let project_name = $(this).data("project-name");

            // Create task creation dialog
            let d = new frappe.ui.Dialog({
                title: 'Create New Task',
                fields: [
                    {
                        label: 'Project',
                        fieldname: 'project',
                        fieldtype: 'Link',
                        options: 'Project',
                        read_only: 1,
                        default: project_name
                    },
                    {
                        label: 'Task Name',
                        fieldname: 'task_name',
                        fieldtype: 'Data',
                        reqd: 1
                    },
                    {
                        label: 'Description',
                        fieldname: 'description',
                        fieldtype: 'Small Text'
                    },
                    {
                        label: 'Status',
                        fieldname: 'status',
                        fieldtype: 'Select',
                        options: ['Open', 'Working', 'Pending Review', 'Completed', 'Cancelled', 'Overdue', 'Template'],
                        default: 'Open'
                    },
                    {
                        label: 'Assigned To',
                        fieldname: 'assigned_to',
                        fieldtype: 'Link',
                        options: 'User'
                    },
                    {
                        label: 'Due Date',
                        fieldname: 'due_date',
                        fieldtype: 'Date'
                    }
                ],
                primary_action_label: 'Create',
                primary_action(values) {
                    // Call server method to create task
                    frappe.call({
                        method: "riz_erp.riz_erp.report.project_overview.project_overview.create_task_from_report",
                        args: {
                            project: values.project,
                            task_name: values.task_name,
                            description: values.description,
                            status: values.status,
                            assigned_to: values.assigned_to,
                            due_date: values.due_date
                        },
                        freeze: true,
                        freeze_message: "Creating task...",
                        callback: function(r) {
                            if (r.message && r.message.success) {
                                frappe.msgprint(r.message.message);
                                report.refresh();
                                d.hide();
                            } else {
                                frappe.msgprint({
                                    title: "Error",
                                    message: r.message.message || "Failed to create task",
                                    indicator: "red"
                                });
                            }
                        },
                        error: function(r) {
                            frappe.msgprint("An error occurred while creating the task");
                        }
                    });
                }
            });
            d.show();
        });
    },

    // -------------------- formatter --------------------
    // Custom formatter for report columns
    // Renders status badges and action buttons
    // ---------------------------------------------------
    formatter: function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        // -------------------- Status Badge Rendering --------------------
        // Renders colored status badges based on task status
        // ----------------------------------------------------------------
        if (column.fieldname === "status" && data && data.status) {
            let colorClass = "status-gray";

            switch (data.status.toLowerCase()) {
                case "completed":
                case "done":
                case "paid":
                    colorClass = "status-green";
                    break;
                case "working":
                case "pending":
                case "in progress":
                case "processing":
                    colorClass = "status-orange";
                    break;
                case "cancelled":
                case "failed":
                case "rejected":
                case "overdue":
                    colorClass = "status-red";
                    break;
                case "on hold":
                case "pending review":
                    colorClass = "status-yellow";
                    break;
                default:
                    colorClass = "status-gray";
            }

            value = `<span class="status-badge ${colorClass}">
                        ${frappe.utils.escape_html(data.status)}
                    </span>`;
        }

        // -------------------- Update Status Button (Tasks Only) --------------------
        // Adds "Update Status" button to task rows (indent > 0)
        // ---------------------------------------------------------------------------
        if (column.fieldname === "actions" && data && data.indent > 0) {
            value = `<button class="btn btn-xs btn-primary btn-update-status"
                     data-task-name="${data.name}"
                     data-current-status="${data.status || ''}">
                     Update Status
                     </button>`;
        }

        // -------------------- Create Task Button (Projects Only) --------------------
        // Adds "Create Task" button to project rows (indent == 0)
        // ----------------------------------------------------------------------------
        if (column.fieldname === "actions" && data && data.indent === 0) {
            value = `<button class="btn btn-xs btn-success btn-create-task"
                     data-project-name="${data.name}">
                     Create Task
                     </button>`;
        }

        return value;
    }
};
