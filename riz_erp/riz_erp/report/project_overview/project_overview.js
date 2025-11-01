/**
 * Project Overview Report - Client-side logic
 * ============================================
 * Handles UI interactions for the Project Overview report
 *
 * Features:
 * - Server-side filtering (hide completed tasks by default)
 * - Custom status badges with color coding
 * - Task selection with checkboxes for bulk operations
 * - Update task status button with modal dialog
 * - Create new task button with form dialog
 * - Interactive buttons on task/project rows
 *
 * Important:
 * - Filters are defined in project_overview.json (server-side)
 * - Data filtering is done in Python execute() method
 * - This file only handles UI formatting and interactions
 *
 * Main Components:
 * - onload(): Initialize styles and event handlers
 * - formatter(): Render custom UI elements (buttons, badges, checkboxes)
 */

// -------------------- Constants --------------------
const STATUS_COLORS = {
    completed: "status-green",
    done: "status-green",
    paid: "status-green",
    working: "status-orange",
    pending: "status-orange",
    "in progress": "status-orange",
    processing: "status-orange",
    cancelled: "status-red",
    failed: "status-red",
    rejected: "status-red",
    overdue: "status-red",
    "on hold": "status-yellow",
    "pending review": "status-yellow"
};

const TASK_STATUSES = ['Open', 'Working', 'Pending Review', 'Completed', 'Cancelled', 'Overdue', 'Template'];

// -------------------- Global Selection State --------------------
// Tracks selected task IDs for bulk operations
// ----------------------------------------------------------------
let selectedTaskIds = new Set();

frappe.query_reports["Project Overview"] = {
    // -------------------- Filters --------------------
    // Filters are defined in project_overview.json
    // show_completed_tasks: Check (default: 0)
    // -------------------------------------------------

    // -------------------- onload --------------------
    // Initializes the report when loaded
    // Sets up CSS styles and event listeners for buttons
    // ------------------------------------------------
    onload: function (report) {
        // -------------------- Add Frappe Toolbar Buttons --------------------
        // Uses Frappe's built-in button system
        // Buttons visibility updates based on task selection
        // --------------------------------------------------------------------

        // Button: Update Status (only visible when tasks selected)
        report.page.add_inner_button(__('Update Status'), function() {
            showBulkStatusUpdateDialog(report);
        }).hide();  // Hidden by default

        // Button: Update Dates (only visible when tasks selected)
        report.page.add_inner_button(__('Update Dates'), function() {
            showBulkDateUpdateDialog(report);
        }).hide();  // Hidden by default

        // Button: Create Task (always visible)
        report.page.add_inner_button(__('Create Task'), function() {
            showCreateTaskDialog(report);
        });

        // -------------------- Update Button Visibility --------------------
        // Shows/hides bulk operation buttons based on task selection
        // ------------------------------------------------------------------
        function updateButtonVisibility() {
            const hasSelection = selectedTaskIds.size > 0;

            // Show/hide buttons based on selection
            report.page.inner_toolbar.find('.btn-default:contains("Update Status")').toggle(hasSelection);
            report.page.inner_toolbar.find('.btn-default:contains("Update Dates")').toggle(hasSelection);
        }

        // Store reference for use in checkbox handler
        report.updateButtonVisibility = updateButtonVisibility;

        // Inject modern pastel badge styles and v1.2 bulk operation styles
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

                /* v1.2 Bulk Operations Styles */
                .selected-task-row {
                    background: rgba(66, 133, 244, 0.08) !important;
                    border-left: 3px solid #4285f4 !important;
                    transition: all 150ms ease;
                }

                .task-select-checkbox {
                    width: 18px;
                    height: 18px;
                    min-width: 18px;
                    min-height: 18px;
                    cursor: pointer;
                    margin: 0;
                    padding: 12px;
                }
            `;
            document.head.appendChild(style);
        }

        // -------------------- Checkbox Selection Handler --------------------
        // Handles individual task checkbox clicks
        // Updates selection state and visual feedback
        // --------------------------------------------------------------------
        $(document).on("click", ".task-select-checkbox", function(e) {
            e.stopPropagation();
            const taskId = $(this).data("task-id");
            const isChecked = $(this).prop("checked");

            if (isChecked) {
                selectedTaskIds.add(taskId);
            } else {
                selectedTaskIds.delete(taskId);
            }

            // Update visual feedback
            $(this).closest("tr").toggleClass("selected-task-row", isChecked);

            // Update button visibility based on selection
            if (report.updateButtonVisibility) {
                report.updateButtonVisibility();
            }
        });

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
                        options: TASK_STATUSES,
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
        // Handles clicks on "Create Task" buttons on project rows
        // Calls unified showCreateTaskDialog with project pre-filled
        // --------------------------------------------------------------------
        $(document).on("click", ".btn-create-task", function() {
            let project_name = $(this).data("project-name");
            showCreateTaskDialog(report, project_name);
        });
    },

    // -------------------- formatter --------------------
    // Custom formatter for report columns
    // Renders checkboxes, status badges, and action buttons
    // ---------------------------------------------------
    formatter: function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        // -------------------- Checkbox Column Rendering --------------------
        // Renders checkbox only for task rows (indent > 0)
        // Checkbox has 44x44px touch target per NFR4
        // -------------------------------------------------------------------
        if (column.fieldname === "project" && data && data.indent > 0) {
            const checked = selectedTaskIds.has(data.name) ? 'checked' : '';
            const checkboxHtml = `
                <input type="checkbox"
                       class="task-select-checkbox"
                       data-task-id="${data.name}"
                       ${checked}
                       title="Select task">
            `;
            value = checkboxHtml + value;
        }

        // -------------------- Status Badge Rendering --------------------
        // Renders colored status badges based on task status
        // ----------------------------------------------------------------
        if (column.fieldname === "status" && data && data.status) {
            const colorClass = STATUS_COLORS[data.status.toLowerCase()] || "status-gray";
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
        // if (column.fieldname === "actions" && data && data.indent === 0) {
        //     value = `<button class="btn btn-xs btn-success btn-create-task"
        //              data-project-name="${data.name}">
        //              Create Task
        //              </button>`;
        // }

        return value;
    }
};

// -------------------- Helper: Build Task List HTML --------------------
// Generates HTML list of selected tasks for dialogs (max 10 + count)
// -----------------------------------------------------------------------
function buildTaskListHTML(taskIds, report) {
    const count = taskIds.size;
    const taskList = Array.from(taskIds).slice(0, 10).map(id => {
        const task = getTaskDetailsFromReport(id, report);
        return `• ${task.subject || id} (${task.project || 'Unknown'})`;
    }).join('<br>');
    const moreText = count > 10 ? `<br>and ${count - 10} more...` : '';
    return `<div style="margin-bottom: 15px;"><strong>Tasks to Update:</strong><br>${taskList}${moreText}</div>`;
}

// -------------------- Helper: Check Selection & Warn --------------------
// Validates selection count and shows warning if >50 tasks
// Returns true if valid, false if no selection
// ------------------------------------------------------------------------
function validateSelection() {
    const count = selectedTaskIds.size;
    if (count === 0) {
        frappe.msgprint('Please select at least one task.');
        return false;
    }
    if (count > 50) {
        frappe.msgprint({
            title: 'Warning',
            message: `You have selected ${count} tasks. Updating more than 50 tasks may take longer.`,
            indicator: 'orange'
        });
    }
    return true;
}

// -------------------- Helper: Handle Bulk Update Response --------------------
// Processes API response and shows appropriate success/error messages
// Auto-refreshes report and clears selections
// -----------------------------------------------------------------------------
function handleBulkUpdateResponse(result, report) {
    let msg = `${result.updated} task(s) updated successfully`;

    if (result.skipped > 0) msg += `, ${result.skipped} skipped`;
    if (result.failed > 0) {
        msg += `, ${result.failed} failed`;
        if (result.errors && result.errors.length > 0) {
            msg += `<br><br><strong>Errors:</strong><br>${result.errors.slice(0, 5).join('<br>')}`;
            if (result.errors.length > 5) msg += `<br>and ${result.errors.length - 5} more...`;
        }
    }

    frappe.msgprint({
        title: result.success ? 'Success' : 'Partial Success',
        message: msg,
        indicator: result.success ? 'green' : 'orange'
    });

    report.refresh();
    clearSelections(report);
}

// -------------------- showBulkStatusUpdateDialog --------------------
// Displays dialog for bulk status updates
// --------------------------------------------------------------------
function showBulkStatusUpdateDialog(report) {
    if (!validateSelection()) return;

    const count = selectedTaskIds.size;
    let d = new frappe.ui.Dialog({
        title: `Update Status for ${count} ${count === 1 ? 'Task' : 'Tasks'}`,
        fields: [
            {
                fieldtype: 'HTML',
                options: buildTaskListHTML(selectedTaskIds, report)
            },
            {
                label: 'New Status',
                fieldname: 'new_status',
                fieldtype: 'Select',
                options: TASK_STATUSES,
                reqd: 1
            },
            {
                label: 'Auto-fill completion date (when status = Completed)',
                fieldname: 'auto_complete',
                fieldtype: 'Check',
                default: 1,
                description: 'Automatically set completed_on date to today when status is Completed'
            }
        ],
        primary_action_label: 'Update All Tasks',
        primary_action(values) {
            frappe.call({
                method: "riz_erp.riz_erp.report.project_overview.project_overview.bulk_update_task_status",
                args: {
                    task_ids: Array.from(selectedTaskIds),
                    new_status: values.new_status,
                    auto_complete: values.auto_complete || false
                },
                freeze: true,
                freeze_message: `Updating ${count} tasks...`,
                callback: function(r) {
                    if (r.message) handleBulkUpdateResponse(r.message, report);
                },
                error: function() {
                    frappe.msgprint({
                        title: 'Error',
                        message: 'Failed to update tasks. Please try again.',
                        indicator: 'red'
                    });
                }
            });
            d.hide();
        }
    });
    d.show();
}

// -------------------- showBulkDateUpdateDialog --------------------
// Displays dialog for bulk expected date updates
// Shows selected tasks and allows user to set dates for all
// Includes "only empty" checkbox and smart pre-fill
// ------------------------------------------------------------------
function showBulkDateUpdateDialog(report) {
    if (!validateSelection()) return;

    const count = selectedTaskIds.size;

    // Check if all tasks from same project for smart pre-fill
    const projects = new Set();
    Array.from(selectedTaskIds).forEach(taskId => {
        const task = getTaskDetailsFromReport(taskId, report);
        if (task.project) projects.add(task.project);
    });

    let d = new frappe.ui.Dialog({
        title: `Update Expected Dates for ${count} ${count === 1 ? 'Task' : 'Tasks'}`,
        fields: [
            {
                fieldtype: 'HTML',
                options: buildTaskListHTML(selectedTaskIds, report)
            },
            {
                label: 'Expected Start Date',
                fieldname: 'exp_start_date',
                fieldtype: 'Date',
                description: 'Leave empty to keep existing dates'
            },
            {
                label: 'Expected End Date',
                fieldname: 'exp_end_date',
                fieldtype: 'Date',
                description: 'Leave empty to keep existing dates'
            },
            {
                label: 'Only update if currently empty',
                fieldname: 'only_empty',
                fieldtype: 'Check',
                default: 1,
                description: 'Skip tasks that already have dates set'
            }
        ],
        primary_action_label: 'Update All Tasks',
        primary_action(values) {
            // Client-side validation
            if (values.exp_start_date && values.exp_end_date) {
                if (new Date(values.exp_end_date) < new Date(values.exp_start_date)) {
                    frappe.msgprint('Expected End Date must be greater than or equal to Expected Start Date');
                    return;
                }
            }

            frappe.call({
                method: "riz_erp.riz_erp.report.project_overview.project_overview.bulk_update_task_dates",
                args: {
                    task_ids: Array.from(selectedTaskIds),
                    exp_start_date: values.exp_start_date || null,
                    exp_end_date: values.exp_end_date || null,
                    only_empty: values.only_empty || false
                },
                freeze: true,
                freeze_message: `Updating ${count} tasks...`,
                callback: function(r) {
                    if (r.message) handleBulkUpdateResponse(r.message, report);
                },
                error: function() {
                    frappe.msgprint({
                        title: 'Error',
                        message: 'Failed to update task dates. Please try again.',
                        indicator: 'red'
                    });
                }
            });
            d.hide();
        }
    });

    // Smart pre-fill: If all tasks from same project, pre-fill with project dates
    if (projects.size === 1) {
        const projectName = Array.from(projects)[0];
        frappe.db.get_value('Project', projectName, ['expected_start_date', 'expected_end_date'], (r) => {
            if (r) {
                if (r.expected_start_date) d.set_value('exp_start_date', r.expected_start_date);
                if (r.expected_end_date) d.set_value('exp_end_date', r.expected_end_date);
            }
        });
    }

    d.show();
}

// -------------------- showCreateTaskDialog --------------------
// Displays dialog for creating new task from Actions menu or project row
// Enhanced with expected date fields
// projectName: Optional project name to pre-fill (from project row button)
// --------------------------------------------------------------
function showCreateTaskDialog(report, projectName = null) {
    let d = new frappe.ui.Dialog({
        title: 'Create New Task',
        fields: [
            {
                label: 'Project',
                fieldname: 'project',
                fieldtype: 'Link',
                options: 'Project',
                reqd: 1,
                read_only: projectName ? 1 : 0,
                default: projectName
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
                options: TASK_STATUSES,
                default: 'Open'
            },
            {
                label: 'Assigned To',
                fieldname: 'assigned_to',
                fieldtype: 'Link',
                options: 'User'
            },
            {
                label: 'Expected Start Date',
                fieldname: 'exp_start_date',
                fieldtype: 'Date'
            },
            {
                label: 'Expected End Date',
                fieldname: 'exp_end_date',
                fieldtype: 'Date'
            }
        ],
        primary_action_label: 'Create Task',
        primary_action(values) {
            frappe.call({
                method: "riz_erp.riz_erp.report.project_overview.project_overview.create_task_from_report",
                args: {
                    project: values.project,
                    task_name: values.task_name,
                    description: values.description,
                    status: values.status,
                    assigned_to: values.assigned_to,
                    exp_start_date: values.exp_start_date,
                    exp_end_date: values.exp_end_date
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
                error: function() {
                    frappe.msgprint("An error occurred while creating the task");
                }
            });
        }
    });
    d.show();
}

// -------------------- getTaskDetailsFromReport --------------------
// Helper function to get task details from report data
// Used for displaying task information in dialogs
// ------------------------------------------------------------------
function getTaskDetailsFromReport(taskId, report) {
    if (!report || !report.data) return {subject: taskId, project: 'Unknown'};

    const task = report.data.find(row => row.name === taskId);
    return task ? {
        subject: task.task_link ? $(task.task_link).text() : taskId,
        project: task.project || 'Unknown'
    } : {subject: taskId, project: 'Unknown'};
}

// -------------------- clearSelections --------------------
// Clears all task selections and updates UI
// Used for cleanup after bulk operations
// ---------------------------------------------------------
function clearSelections(report) {
    selectedTaskIds.clear();
    $('.task-select-checkbox').prop('checked', false);
    $('.selected-task-row').removeClass('selected-task-row');

    // Hide bulk operation buttons
    if (report && report.updateButtonVisibility) {
        report.updateButtonVisibility();
    }
}
