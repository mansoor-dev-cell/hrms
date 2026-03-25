# Department & Role Enhancement Checklist

## Overview

Add structured two-tier department/sub-department hierarchy, tighten roles to admin/employee only, and expose department info throughout the UI.

## Department Structure

```
Sophia Academy├── Teaching Staff└── Non-Teaching StaffGlobal Online College├── Sales Team└── Marketing Team
```

## Roles (simplified)

-   `admin`
-   `employee`
    
    > Removed: `hr`, `manager`
    

---

## Backend

-    **User model** – replace flat `department` string with `department` enum + `subDepartment` string
-    **User model** – remove `hr` and `manager` from `role` enum
-    **server.js** – add `PATCH /api/users/:id` endpoint (admin-only: update role, department, subDepartment, status)
-    **server.js** – expose `subDepartment` in all user response objects (`/api/auth/me`, `/api/users`, register, login)

---

## Frontend – script.js

-    **Header profile** – show `department • subDepartment` instead of "HR Manager" / "Employee" below user name
-    **Employee table** – combine `department` + `subDepartment` in the Department column
-    **Employee dropdown** – show `name – dept / subDept` in attendance and leave dropdowns
-    **Dashboard recent hirings** – show `department / subDepartment` in department column
-    **Leave modal** – show `department / subDepartment` instead of raw role string
-    **Admin edit employee** – `openEditEmployeeModal()` + `saveEmployeeChanges()` wired to Add/Edit button
-    **Employee filter** – department filter matches against new dept/subDept values

---

## Frontend – HTML

-    **All page headers** (`dashboard.html`, `emp.html`, `attendance.html`, `leave.html`)
    -   Default `.role` span text → `Sophia Academy - Teaching Staff`
-    **emp.html** – department filter options updated to real dept/sub-dept values
-    **emp.html** – Actions column added to employee table
-    **emp.html** – Edit Employee modal added (role, department, subDepartment, status)

---

## Notes

-   New employees default to: department = `Sophia Academy`, subDepartment = `Teaching Staff`
-   Sub-department options are driven by the selected department (cascading select in edit modal)
-   All existing users with `department = "General"` will show as `Sophia Academy – Teaching Staff` until updated by admin