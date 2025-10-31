# RIZ ERP - Custom ERPNext App

## Overview

RIZ ERP is a custom Frappe application for ERPNext that extends project management capabilities with enhanced reporting and interactive features.

**Purpose:** Improve project manager efficiency by providing better visibility and quick actions for project and task management.

**Target Users:** Project managers using ERPNext

## Current Features

### Reports
- [Project Overview Report](features/project-overview-report.md) - Tree-structured view of projects and tasks with interactive management capabilities

## Current Features

### Project Overview Report
The Project Overview report displays all projects and tasks in a tree structure with the following interactive features:

**Completed Features:**
- ✅ **Update Task Status Button** - Update task status directly from report (completed 2025-10-31)
- ✅ **Create New Task Button** - Create tasks from project rows with description field (completed 2025-10-31)
- ✅ Auto-fills `completed_on` date when status changed to "Completed"
- ✅ Proper task assignment using Frappe's assignment API

## Development Stories

Active stories are in [stories/](stories/) folder.

**Completed stories** are archived in [archive/stories-completed/](archive/stories-completed/) - see [Archive README](archive/README.md).

## Planned Features

- Additional project management enhancements (TBD)
- Performance optimizations for large datasets
- Advanced filtering options

## Installation

This is a custom Frappe app for ERPNext. Install using:

```bash
bench get-app /path/to/riz_erp
bench --site [your-site] install-app riz_erp
```

## App Structure

```
riz_erp/
├── riz_erp/
│   └── riz_erp/
│       └── report/
│           └── project_overview/    # Project Overview Report
├── docs/                            # This documentation
│   ├── features/                    # Feature documentation
│   ├── stories/                     # Development user stories
│   ├── development-guide.md         # Developer guidelines
│   └── README.md                    # This file
├── license.txt
├── pyproject.toml
└── README.md
```

## Developer Notes

- Maintained by functional consultant with basic development knowledge
- Follows standard Frappe/ERPNext conventions
- See [Development Guide](development-guide.md) for contribution guidelines

## Support & Questions

For issues or questions about this app, contact your ERPNext administrator or development team.

## Version

Current Version: 1.0 (Initial Release)
