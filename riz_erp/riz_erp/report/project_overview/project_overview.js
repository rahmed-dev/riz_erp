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
const TASK_STATUSES = ['Open', 'Working', 'Pending Review', 'Completed', 'Cancelled', 'Overdue', 'Template'];

// -------------------- Global Selection State --------------------
// Tracks selected task IDs for bulk operations
// ----------------------------------------------------------------
let selectedTaskIds = new Set();

frappe.query_reports["Project Overview"] = {
    // -------------------- Filters --------------------
    filters: [
        {
            fieldname: 'project',
            label: __('Project'),
            fieldtype: 'Link',
            width: '80',
            options: 'Project'
        },
        {
            fieldname: 'status',
            label: __('Status'),
            fieldtype: 'MultiSelectList',
            width: '80',
            options: ['Open', 'Working', 'Pending Review', 'Overdue', 'Template', 'Completed', 'Cancelled'],
            get_data: function(txt) {
                let statuses = ['Open', 'Working', 'Pending Review', 'Overdue', 'Template', 'Completed', 'Cancelled'];
                let options = [];
                for (let status of statuses) {
                    if (!txt || status.toLowerCase().includes(txt.toLowerCase())) {
                        options.push({
                            value: status,
                            label: __(status),
                            description: ''
                        });
                    }
                }
                return options;
            }
        },
        {
            fieldname: 'assigned_to',
            label: __('Assigned To'),
            fieldtype: 'MultiSelectList',
            width: '80',
            options: 'User',
            get_data: function(txt) {
                return frappe.db.get_link_options('User', txt);
            }
        },
        {
            fieldname: 'show_completed_tasks',
            label: __('Show Completed Tasks'),
            fieldtype: 'Check',
            width: '80',
            default: 0
        }
    ],

    // -------------------- onload --------------------
    // Initializes the report when loaded
    // Sets up CSS styles and event listeners for buttons
    // ------------------------------------------------
    onload: function (report) {
        // -------------------- Add Frappe Toolbar Buttons --------------------
        // Uses Frappe's built-in button system
        // Buttons visibility updates based on task selection
        // --------------------------------------------------------------------

        // Button: Update Task (only visible when tasks selected)
        report.page.add_inner_button(__('Update Task'), function() {
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

        // Assignment buttons (ungrouped, hidden by default, conditionally visible)
        report.page.add_inner_button(__('Assign'), function() {
            showAssignDialog(report);
        }).hide();  // Hidden by default

        report.page.add_inner_button(__('Unassign'), function() {
            showUnassignDialog(report);
        }).hide();  // Hidden by default

        // -------------------- Update Button Visibility --------------------
        // Shows/hides bulk operation buttons based on task selection
        // Assign button: always shown when tasks selected
        // Unassign button: only shown when at least one selected task has assignments
        // ------------------------------------------------------------------
        function updateButtonVisibility() {
            const hasSelection = selectedTaskIds.size > 0;

            // Show/hide buttons based on selection
            report.page.inner_toolbar.find('.btn-default:contains("Update Task")').toggle(hasSelection);
            report.page.inner_toolbar.find('.btn-default:contains("Update Dates")').toggle(hasSelection);

            // Assign button: show when any task is selected
            report.page.inner_toolbar.find('.btn-default:contains("Assign")').toggle(hasSelection);

            // Unassign button: only show if at least one selected task has assignments
            let hasAssignments = false;
            if (hasSelection && report && report.data) {
                for (const taskId of selectedTaskIds) {
                    const task = report.data.find(row => row.name === taskId);
                    if (task && task.assigned_to && task.assigned_to.trim()) {
                        hasAssignments = true;
                        break;
                    }
                }
            }
            report.page.inner_toolbar.find('.btn-default:contains("Unassign")').toggle(hasAssignments);
        }

        // Store reference for use in checkbox handler
        report.updateButtonVisibility = updateButtonVisibility;

        // Minimal functional styles for checkboxes and column alignment
        const styleId = "project-overview-functional";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.innerHTML = `
                .task-select-checkbox {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    margin: 0;
                }
                .selected-task-row {
                    background: rgba(66, 133, 244, 0.08) !important;
                }
                /* Left-align all column headers and cells */
                .dt-header .dt-cell__content,
                .dt-row .dt-cell__content {
                    text-align: left !important;
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

      // Create task update dialog
      let d = new frappe.ui.Dialog({
          title: 'Update Task',
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
                  options: ['', ...TASK_STATUSES],  // Empty option for "don't update"
                  description: 'Leave empty to keep current status'
              },
              {
                  label: 'Next Action',
                  fieldname: 'custom_next_action',
                  fieldtype: 'Data',
                  description: 'Leave empty to keep current next action'
              }
          ],
          primary_action_label: 'Update',
          primary_action(values) {
              // Validate at least one field is being updated
              if (!values.new_status && !values.custom_next_action) {
                  frappe.msgprint('Please provide at least one field to update');
                  return;
              }

              // Disable button to prevent duplicates
              d.get_primary_btn().prop('disabled', true);

              // Call server method to update task
              frappe.call({
                  method:
  "riz_erp.riz_erp.report.project_overview.project_overview.update_task",
                  args: {
                      task_name: task_name,
                      new_status: values.new_status || null,
                      custom_next_action: values.custom_next_action || null
                  },
                  freeze: true,
                  freeze_message: __('Updating task...'),
                  callback: function(r) {
                      if (r.message && r.message.success) {
                          frappe.msgprint(r.message.message);
                          report.refresh();
                          d.hide();
                      } else {
                          d.get_primary_btn().prop('disabled', false);
                          frappe.msgprint(r.message.message || "Error updating task");
                      }
                  },
                  error: function(r) {
                      d.get_primary_btn().prop('disabled', false);
                      console.error('Task update error:', r);
                      frappe.msgprint({
                          title: __('Error'),
                          message: r.message || __('Failed to update task'),
                          indicator: 'red'
                      });
                  }
              });
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

        // -------------------- Priority Rendering --------------------
        // Uses badge-pill class (like indicator-pill but without dot)
        // Low=blue, Medium=orange, High=red, Urgent=darkred
        // ---------------------------------------------------------------
        if (column.fieldname === "priority" && data && data.priority) {
            const priority = data.priority.toLowerCase();
            let colorClass = "gray";

            if (priority === "low") colorClass = "blue";
            else if (priority === "medium") colorClass = "orange";
            else if (priority === "high") colorClass = "red";
            else if (priority === "urgent") colorClass = "darkred";

            value = `<span class="badge-pill ${colorClass}">${frappe.utils.escape_html(data.priority)}</span>`;
        }

        // -------------------- Status Rendering --------------------
        // Use Frappe's built-in indicator pills with colors
        // ----------------------------------------------------------
        if (column.fieldname === "status" && data && data.status) {
            // Map status to Frappe indicator colors
            const status = data.status.toLowerCase();
            let indicator_color = "gray";

            if (status === "completed") indicator_color = "green";
            else if (status === "working" || status === "in progress") indicator_color = "orange";
            else if (status === "pending review") indicator_color = "yellow";
            else if (status === "cancelled" || status === "overdue") indicator_color = "red";
            else if (status === "open") indicator_color = "blue";

            value = `<span class="indicator-pill ${indicator_color}">${frappe.utils.escape_html(data.status)}</span>`;
        }

        // -------------------- Smart Progress Rendering --------------------
        // Project rows: CSS progress bar with color coding
        // Task rows: Simple percentage text
        // ------------------------------------------------------------------
        if (column.fieldname === "progress" && data && data.progress !== null && data.progress !== undefined) {
            const percent = data.progress;

            if (data.is_project === 1) {
                // Project row: Show progress bar
                const color = percent < 50 ? '#ff5858' : percent < 80 ? '#ffb65c' : '#36d399';
                value = `
                    <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:60px;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden">
                            <div style="width:${percent}%;height:100%;background:${color};border-radius:4px;transition:width 0.3s"></div>
                        </div>
                        <span style="font-size:12px;color:#6b7280">${percent}%</span>
                    </div>
                `;
            } else {
                // Task row: Show simple percentage
                value = `<span style="font-size:12px;color:#6b7280">${percent}%</span>`;
            }
        }

        // -------------------- Assigned To Rendering --------------------
        // Render circular avatars with single initial, left-aligned
        // Data format: "email1:fullname1,email2:fullname2,..."
        // ----------------------------------------------------------------
        if (column.fieldname === "assigned_to" && data && data.assigned_to) {
            const userEntries = data.assigned_to.split(',').filter(u => u.trim());
            if (userEntries.length > 0) {
                const maxDisplay = 3;
                const displayEntries = userEntries.slice(0, maxDisplay);
                const overflow = userEntries.length - maxDisplay;

                let avatarsHtml = displayEntries.map(entry => {
                    // Parse "email:full_name" format
                    const [email, fullName] = entry.split(':');
                    const displayName = fullName || email.split('@')[0];
                    // Single initial from first name
                    const initial = displayName.trim()[0].toUpperCase();
                    return `<span class="avatar avatar-small" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#d1d5db;color:#374151;font-size:11px;font-weight:500;margin-right:4px;cursor:default" title="${frappe.utils.escape_html(fullName || email)}">${initial}</span>`;
                }).join('');

                if (overflow > 0) {
                    const overflowNames = userEntries.slice(maxDisplay).map(e => e.split(':')[1] || e.split(':')[0]).join(', ');
                    avatarsHtml += `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#e5e7eb;color:#6b7280;font-size:10px;font-weight:500" title="${overflowNames}">+${overflow}</span>`;
                }

                value = `<div style="display:flex;align-items:center">${avatarsHtml}</div>`;
            } else {
                value = '';
            }
        }

        // -------------------- Update Task Button (Tasks Only) --------------------
        // Commented out - Option B minimal view removes Actions column
        // Users can click Task Subject link to open task, or use toolbar buttons
        // ---------------------------------------------------------------------------
        // if (column.fieldname === "actions" && data && data.indent > 0) {
        //     value = `<button class="btn btn-xs btn-primary btn-update-status"
        //              data-task-name="${data.name}"
        //              data-current-status="${data.status || ''}">
        //              Update Task
        //              </button>`;
        // }

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
// Displays dialog for bulk status and next action updates
// --------------------------------------------------------------------
function showBulkStatusUpdateDialog(report) {
    if (!validateSelection()) return;

    const count = selectedTaskIds.size;
    let d = new frappe.ui.Dialog({
        title: `Update ${count} ${count === 1 ? 'Task' : 'Tasks'}`,
        fields: [
            {
                fieldtype: 'HTML',
                options: buildTaskListHTML(selectedTaskIds, report)
            },
            {
                label: 'New Status',
                fieldname: 'new_status',
                fieldtype: 'Select',
                options: ['', ...TASK_STATUSES],  // Empty option for "don't update"
                description: 'Leave empty to keep current status'
            },
            {
                label: 'Next Action',
                fieldname: 'custom_next_action',
                fieldtype: 'Data',
                description: 'Leave empty to keep current next action'
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
            // Validate at least one field is being updated
            if (!values.new_status && !values.custom_next_action) {
                frappe.msgprint('Please provide at least one field to update');
                return;
            }

            // Disable button to prevent duplicates
            d.get_primary_btn().prop('disabled', true);

            frappe.call({
                method: "riz_erp.riz_erp.report.project_overview.project_overview.bulk_update_task_status",
                args: {
                    task_ids: Array.from(selectedTaskIds),
                    new_status: values.new_status || null,
                    custom_next_action: values.custom_next_action || null,
                    auto_complete: values.auto_complete || false
                },
                freeze: true,
                freeze_message: `Updating ${count} tasks...`,
                callback: function(r) {
                    if (r.message) {
                        handleBulkUpdateResponse(r.message, report);
                        d.hide();
                    } else {
                        d.get_primary_btn().prop('disabled', false);
                    }
                },
                error: function() {
                    d.get_primary_btn().prop('disabled', false);
                    frappe.msgprint({
                        title: 'Error',
                        message: 'Failed to update tasks. Please try again.',
                        indicator: 'red'
                    });
                }
            });
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

            // Disable button to prevent duplicates
            d.get_primary_btn().prop('disabled', true);

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
                    if (r.message) {
                        handleBulkUpdateResponse(r.message, report);
                        d.hide();
                    } else {
                        d.get_primary_btn().prop('disabled', false);
                    }
                },
                error: function() {
                    d.get_primary_btn().prop('disabled', false);
                    frappe.msgprint({
                        title: 'Error',
                        message: 'Failed to update task dates. Please try again.',
                        indicator: 'red'
                    });
                }
            });
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
                fieldtype: 'Text Editor'
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
            // Disable button to prevent duplicates
            d.get_primary_btn().prop('disabled', true);

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
                freeze_message: __('Creating task...'),
                callback: function(r) {
                    if (r.message && r.message.success) {
                        frappe.msgprint(r.message.message);
                        report.refresh();
                        d.hide();
                    } else {
                        d.get_primary_btn().prop('disabled', false);
                        frappe.msgprint({
                            title: __('Error'),
                            message: r.message.message || __('Failed to create task'),
                            indicator: 'red'
                        });
                    }
                },
                error: function(r) {
                    d.get_primary_btn().prop('disabled', false);
                    console.error('Task creation error:', r);
                    frappe.msgprint({
                        title: __('Error'),
                        message: r.message || __('An error occurred while creating the task'),
                        indicator: 'red'
                    });
                }
            });
        }
    });
    d.show();
}

// -------------------- showAssignDialog --------------------
// Displays dialog for assigning user to selected tasks
// ----------------------------------------------------------
function showAssignDialog(report) {
    if (!validateSelection()) return;

    const count = selectedTaskIds.size;
    let d = new frappe.ui.Dialog({
        title: count === 1 ? __('Assign User to Task') : __('Assign User to {0} Tasks', [count]),
        fields: [
            {
                fieldtype: 'HTML',
                options: buildTaskListHTML(selectedTaskIds, report)
            },
            {
                label: 'Assign To',
                fieldname: 'assigned_to',
                fieldtype: 'Link',
                options: 'User',
                reqd: 1
            }
        ],
        primary_action_label: 'Assign',
        primary_action(values) {
            if (!values.assigned_to) {
                frappe.msgprint(__('Please select a user'));
                return;
            }

            d.get_primary_btn().prop('disabled', true);

            frappe.call({
                method: "riz_erp.riz_erp.report.project_overview.project_overview.assign_tasks",
                args: {
                    task_ids: Array.from(selectedTaskIds),
                    user: values.assigned_to
                },
                freeze: true,
                freeze_message: __('Assigning user to {0} tasks...', [count]),
                callback: function(r) {
                    if (r.message) {
                        handleAssignmentResponse(r.message, report, 'assign');
                        d.hide();
                    } else {
                        d.get_primary_btn().prop('disabled', false);
                    }
                },
                error: function() {
                    d.get_primary_btn().prop('disabled', false);
                    frappe.msgprint({
                        title: __('Error'),
                        message: __('Failed to assign tasks. Please try again.'),
                        indicator: 'red'
                    });
                }
            });
        }
    });
    d.show();
}

// -------------------- showUnassignDialog --------------------
// Displays dialog for removing assignments from selected tasks
// Shows all assignees across selected tasks as checkboxes
// ------------------------------------------------------------
function showUnassignDialog(report) {
    if (!validateSelection()) return;

    // Get all unique assignees from selected tasks
    const assignees = getAssigneesFromSelectedTasks(report);
    if (assignees.length === 0) {
        frappe.msgprint(__('No assignments to remove from selected tasks'));
        return;
    }

    const count = selectedTaskIds.size;
    let d = new frappe.ui.Dialog({
        title: __('Remove Assignments'),
        fields: [
            {
                fieldtype: 'HTML',
                options: buildTaskListHTML(selectedTaskIds, report)
            },
            {
                label: 'Select Users to Remove',
                fieldname: 'users_to_remove',
                fieldtype: 'MultiCheck',
                options: assignees.map(email => ({
                    label: email,
                    value: email
                })),
                columns: 2
            }
        ],
        primary_action_label: 'Remove',
        primary_action(values) {
            const selectedUsers = values.users_to_remove || [];
            if (selectedUsers.length === 0) {
                frappe.msgprint(__('Please select at least one user to remove'));
                return;
            }

            d.get_primary_btn().prop('disabled', true);

            frappe.call({
                method: "riz_erp.riz_erp.report.project_overview.project_overview.unassign_tasks",
                args: {
                    task_ids: Array.from(selectedTaskIds),
                    users: selectedUsers
                },
                freeze: true,
                freeze_message: __('Removing assignments from {0} tasks...', [count]),
                callback: function(r) {
                    if (r.message) {
                        handleAssignmentResponse(r.message, report, 'unassign');
                        d.hide();
                    } else {
                        d.get_primary_btn().prop('disabled', false);
                    }
                },
                error: function() {
                    d.get_primary_btn().prop('disabled', false);
                    frappe.msgprint({
                        title: __('Error'),
                        message: __('Failed to remove assignments. Please try again.'),
                        indicator: 'red'
                    });
                }
            });
        }
    });
    d.show();
}

// -------------------- handleAssignmentResponse --------------------
// Processes API response for assign/unassign operations
// Auto-refreshes report and clears selections
// ------------------------------------------------------------------
function handleAssignmentResponse(result, report, action) {
    let msg = '';

    if (action === 'assign') {
        msg = `${result.assigned} task(s) assigned`;
        if (result.already_assigned > 0) msg += `, ${result.already_assigned} already assigned`;
    } else {
        msg = `${result.removed} assignment(s) removed`;
        if (result.not_assigned > 0) msg += `, ${result.not_assigned} not assigned`;
    }

    if (result.failed > 0) {
        msg += `, ${result.failed} failed`;
        if (result.errors && result.errors.length > 0) {
            msg += `<br><br><strong>Errors:</strong><br>${result.errors.slice(0, 5).join('<br>')}`;
            if (result.errors.length > 5) msg += `<br>and ${result.errors.length - 5} more...`;
        }
    }

    frappe.msgprint({
        title: result.success ? __('Success') : __('Partial Success'),
        message: msg,
        indicator: result.success ? 'green' : 'orange'
    });

    report.refresh();
    clearSelections(report);
}

// -------------------- getAssigneesFromSelectedTasks --------------------
// Gets all unique assignees from selected tasks
// Returns array of email addresses (parsed from "email:fullname" format)
// -----------------------------------------------------------------------
function getAssigneesFromSelectedTasks(report) {
    const assignees = new Set();

    if (!report || !report.data) return [];

    Array.from(selectedTaskIds).forEach(taskId => {
        const task = report.data.find(row => row.name === taskId);
        if (task && task.assigned_to) {
            task.assigned_to.split(',').filter(u => u.trim()).forEach(entry => {
                // Parse "email:fullname" format, extract email
                const email = entry.split(':')[0].trim();
                if (email) assignees.add(email);
            });
        }
    });

    return Array.from(assignees);
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
