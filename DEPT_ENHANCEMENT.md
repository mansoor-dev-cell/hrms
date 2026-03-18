# Department & Role Enhancement Checklist

## Overview
Add structured two-tier department/sub-department hierarchy, tighten roles to admin/employee only, and expose department info throughout the UI.

## Department Structure
```
Sophia Academy
├── Teaching Staff
└── Non-Teaching Staff

Global Online College
├── Sales Team
└── Marketing Team
```

## Roles (simplified)
- `admin`
- `employee`
> Removed: `hr`, `manager`

---

## Backend

- [x] **User model** – replace flat `department` string with `department` enum + `subDepartment` string
- [x] **User model** – remove `hr` and `manager` from `role` enum
- [x] **server.js** – add `PATCH /api/users/:id` endpoint (admin-only: update role, department, subDepartment, status)
- [x] **server.js** – expose `subDepartment` in all user response objects (`/api/auth/me`, `/api/users`, register, login)

---

## Frontend – script.js

- [x] **Header profile** – show `department • subDepartment` instead of "HR Manager" / "Employee" below user name
- [x] **Employee table** – combine `department` + `subDepartment` in the Department column
- [x] **Employee dropdown** – show `name – dept / subDept` in attendance and leave dropdowns
- [x] **Dashboard recent hirings** – show `department / subDepartment` in department column
- [x] **Leave modal** – show `department / subDepartment` instead of raw role string
- [x] **Admin edit employee** – `openEditEmployeeModal()` + `saveEmployeeChanges()` wired to Add/Edit button
- [x] **Employee filter** – department filter matches against new dept/subDept values

---

## Frontend – HTML

- [x] **All page headers** (`dashboard.html`, `emp.html`, `attendance.html`, `leave.html`)
  - Default `.role` span text → `Sophia Academy - Teaching Staff`
- [x] **emp.html** – department filter options updated to real dept/sub-dept values
- [x] **emp.html** – Actions column added to employee table
- [x] **emp.html** – Edit Employee modal added (role, department, subDepartment, status)

---

## Notes
- New employees default to: department = `Sophia Academy`, subDepartment = `Teaching Staff`
- Sub-department options are driven by the selected department (cascading select in edit modal)
- All existing users with `department = "General"` will show as `Sophia Academy – Teaching Staff` until updated by admin
