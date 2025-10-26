frappe.query_reports["Project Overview"] = {
    onload: function () {
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
    },

    formatter: function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

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

        return value;
    }
};
