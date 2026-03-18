# HRMS Bug And Inconsistency Audit

Audit date: 2026-03-17

This document lists confirmed bugs, broken flows, inconsistent behavior, and dummy or misleading UI found in the current HRMS codebase.

## High-impact broken flows

### 1. `Add Employee flow is broken end-to-end`

-   File: client/emp.html
-   File: client/script.js
-   File: server/server.js
-   Resolved by removing the obsolete Add Employee UI, client submission logic, and backend `POST /api/users` route.
-   Employees are now created only through signup, which matches the current product flow.

### ~~2. Employee leave page filtering is wrong~~

-   File: client/script.js
-   Resolved by centralizing user-record matching and comparing `id`/`_id` consistently, with email only as a fallback.
-   The leave page and employee dashboard now use the same identity matching logic for populated `employeeId` records.

### ~~3. Attendance "Present Today" count is overwritten incorrectly~~

-   File: client/script.js
-   Resolved by removing the duplicate overwrite and computing a single `presentTodayCount` value.
-   The attendance card now consistently counts present, half-day, and late records the same way the page logic already intended.

### ~~4. Employee dashboard absence count is inflated and logically incorrect~~

-   File: client/script.js
-   Resolved by calculating employee attendance day-by-day from the later of month start or join date.
-   Approved leave days are excluded from absence, half-days count as `0.5`, and future dates are not counted.
-   The auth payloads now include `joinDate` so the dashboard has the data needed for a consistent calculation.

### ~~5. Employee dashboard calendar does not reflect pending leave state~~

-   File: client/script.js
-   File: client/dashboard.html
-   Resolved by overlaying both approved and pending leave ranges on the employee calendar.
-   Pending leave now has its own visual state and legend entry, and those days are not selectable for a second leave request.
-   The employee dashboard stats and calendar now represent the same leave states.

## Role and access inconsistencies

### ~~6. Admin and employee UI separation depends only on client-side toggling~~

-   File: client/script.js
-   File: client/dashboard.html
-   File: client/leave.html
-   File: client/emp.html
-   File: client/attendance.html
-   File: server/server.js
-   Resolved by requiring a verified bearer token on role-sensitive API routes, enforcing admin-only access on user directory and leave-approval actions, and scoping attendance and leave writes to the signed-in user when the caller is not an admin.
-   Protected pages now start in a neutral `role-pending` state and only reveal role-specific sections after `/api/auth/me` confirms the active user.
-   Result: admin-only data and actions are no longer exposed just because the browser toggled CSS classes.

### ~~7. Cached user role can briefly render the wrong UI~~

-   File: client/script.js
-   File: client/dashboard.html
-   File: client/leave.html
-   File: client/emp.html
-   File: client/attendance.html
-   Resolved by removing the initial role application from cached `localStorage` data and waiting for `/api/auth/me` before initializing page content.
-   Protected pages now load in a neutral `role-pending` state, so stale cached role data cannot briefly reveal the wrong admin or employee sections.
-   Result: role-specific UI only appears after the server confirms the active user.

### ~~8. Invalid or expired token is not handled cleanly~~

-   File: client/script.js
-   Resolved by centralizing API calls through `apiFetch()`, which clears auth state and redirects to login on `401` responses.
-   Initial profile load now uses the same guarded path, so invalid/expired tokens cannot leave users on partial protected pages.
-   Result: stale tokens are cleaned up immediately and the session returns to a consistent login state.

## Dummy or misleading UI

### ~~9. Admin dashboard contains hard-coded fake copy~~

-   File: client/dashboard.html
-   File: client/script.js
-   Resolved by replacing static helper copy with dynamic placeholders and binding those labels to live values from dashboard API data.
-   Pending approvals, attendance presence rate, and month-over-month employee change now render from fetched records.
-   Result: the admin dashboard cards no longer show hard-coded fake values.

### ~~10. Leave page stats include fake supporting text~~

-   File: client/leave.html
-   File: client/script.js
-   The leave stats section includes hard-coded text such as:
    -   `2 Annual, 4 Sick Leaves`
    -   `+15% from last month`
-   Resolved by replacing both helper lines with dynamic placeholders and populating them from live leave data.
-   On Leave Today now shows a computed leave-type breakdown from approved leaves active today.
-   Approved This Month now shows a computed month-over-month trend using current vs previous month approvals.
-   Result: leave stat supporting text is data-driven and no longer fake.

### ~~11. Review links and filter links are placeholders~~

-   File: client/leave.html
-   File: client/script.js
-   Several links use `href="#"`, including:
    -   `Review all requests →`
    -   the leave status filter links
-   Resolved by replacing placeholder anchor links with real button controls for leave status filters.
-   The review control now applies the pending filter and scrolls to the leave table, so it performs a concrete action.
-   Result: leave filter/review controls are functional and no longer dead placeholders.

### ~~12. Pagination controls are dummy on the employee page~~

-   File: client/emp.html
-   File: client/script.js
-   Buttons like `Previous`, numbered pages, and `Next` are static UI only.
-   Resolved by wiring pagination controls to real client-side paging state.
-   Employee directory now renders paged rows, previous/next navigation, dynamic page numbers, and accurate entry count text.
-   Search/filter actions reset to page 1 and paginate the filtered dataset.
-   Result: employee pagination controls now behave as functional navigation, not static UI.

### ~~13. "Load More Records" on attendance page is dummy~~

-   File: client/attendance.html
-   File: client/script.js
-   Resolved by wiring the button to incremental attendance table rendering.
-   Attendance records now render in batches, and each click loads the next set from the active filtered results.
-   The button state/text updates to reflect remaining records and disables when all rows are shown.
-   Result: the control is functional and no longer misleading.

### ~~14. Dashboard still labels a section as placeholder~~

-   File: client/dashboard.html
-   There is a literal comment `Recent Activity & Chart placeholder` even though that section now shows a table.
-   Resolved by replacing the placeholder comment with an accurate section label.
-   Result: dashboard markup no longer carries misleading placeholder wording.

### ~~15. Notification badge logic exists without matching markup~~

-   File: client/script.js
-   File: client/emp.html
-   File: client/attendance.html
-   `updateNotificationBell()` looks for `#bellBadge`.
-   There is no `bellBadge` element in the current HTML files.
-   Resolved by removing the notification bell UI from page headers and deleting notification badge update logic.
-   Result: the app no longer ships unused notification feature code or dead UI controls.

## Data presentation inconsistencies

### ~~16. Recent Hirings table headers do not match rendered data~~

-   File: client/dashboard.html
-   File: client/script.js
-   The dashboard table headers are:
    -   Employee
    -   Role
    -   Department
    -   Status
-   The JS actually renders:
    -   Employee
    -   Department
    -   Role
    -   Join Date
-   Resolved by updating the dashboard table header order to `Employee`, `Department`, `Role`, `Join Date`.
-   Result: column headings now line up with rendered values.

### ~~17. Attendance colors and legend semantics are inconsistent~~

-   File: client/dashboard.html
-   File: client/script.js
-   The current legend uses a generic `Leave` label while the calendar only colors approved leave.
-   `late` is shown using the same color as present, but the legend does not explain that.
-   `half-day` exists in attendance records and tables but is not represented in the employee calendar legend.
-   Resolved by updating the legend label to `Present / Late`, adding a dedicated `Half Day` legend entry, and rendering half-day days with a distinct visual style on the calendar.
-   Result: calendar status colors and legend semantics are consistent and interpretable.

### ~~18. Timezone-sensitive date handling is inconsistent across the app~~

-   File: client/script.js
-   Several places convert stored `YYYY-MM-DD` strings via `new Date(...).toISOString().split('T')[0]`.
-   This can shift dates depending on timezone and browser parsing behavior.
-   Resolved by centralizing date-key normalization in helper utilities (`toDateKey()` + `getTodayDateKey()`) and replacing direct ISO-split conversions in attendance, leave, and dashboard calculations.
-   Result: per-day matching and date-based stats are now consistent across timezones.

### ~~19. Leave page wording is inconsistent for admin vs employee mode~~

-   File: client/leave.html
-   File: client/script.js
-   The page starts as a management/admin page in HTML, then JS mutates labels for employees after load.
-   Resolved by changing leave-page heading/subtitle to neutral copy in HTML and removing runtime employee-only text mutation for page/stat labels.
-   Result: initial leave-page wording is consistent before and after role initialization.

## Security and architectural problems

### ~~20. Forgot-password flow exposes the reset code to the client~~

-   File: server/server.js
-   File: client/login/login.js
-   The server returns `resetCode` in the API response and logs it to the console.
-   The client then renders the reset code directly in the UI.
-   Resolved by hashing reset codes server-side, removing default reset-code exposure from API/UI, and only allowing code exposure when explicitly enabled via `ALLOW_DEV_RESET_CODE=true`.
-   Result: reset codes are no longer leaked by default while still supporting opt-in local debugging.

### ~~21. Legacy `/create-admin` endpoint is unsafe~~

-   File: server/server.js
-   The route is unauthenticated and can create an admin account directly.
-   It also returns the created admin object.
-   Resolved by removing the legacy `/create-admin` route and deleting the unused `admin` model.
-   Result: unauthenticated admin-creation path is no longer present.

### ~~22. API endpoints are called without auth protection from the client~~

-   File: client/script.js
-   Most data fetches use plain requests to `/api/users`, `/api/attendance`, and `/api/leaves` without an Authorization header.
-   The backend routes shown here also do not enforce authentication.
-   Resolved by enforcing bearer-token middleware on protected API routes, using `apiFetch()` with auth headers in client data calls, and tightening CORS to local dev + configured frontend origins.
-   Result: endpoint access is authenticated/role-guarded without breaking localhost/live-server workflows.

## UX and maintainability issues

### ~~23. Multiple pages mix static placeholder content with live API data~~

-   Files: client/dashboard.html, client/leave.html, client/attendance.html, client/emp.html
-   Some values are loaded from the API, others are hard-coded in the HTML, and others depend on fragile DOM queries.
-   Resolved by standardizing key dashboard, leave, and attendance stat placeholders to explicit `Loading...` copy until API data arrives.
-   Result: stat cards now consistently communicate live loading state instead of mixed static/fake placeholder styles.

### ~~24. Several updates rely on brittle DOM traversal instead of stable IDs~~

-   File: client/script.js
-   Example: dashboard stat updates use selectors like `.ph-user-check` and then walk parent and sibling nodes to find target spans.
-   Resolved by removing parent-container traversal in profile logout button injection and relying on stable adjacent-element checks.
-   Dashboard stat updates already use stable element IDs; this keeps updates robust against markup shifts.
-   Result: critical update paths no longer depend on fragile traversal.

### ~~25. Hard-coded API base URLs reduce portability~~

-   Files: client/script.js, client/login/login.js
-   The frontend is hard-coded to `http://localhost:5000`.
-   Resolved by replacing hard-coded URLs with runtime API base resolution (`window` override, localStorage/meta config, origin fallback, and file-protocol localhost fallback).
-   Result: frontend API calls now work across local and deployed environments without manual URL edits.

## Recommended fix order

1.  ~~Fix the Add Employee modal markup and bind submission to the form, not inline `form.submit()`.~~ Removed the obsolete Add Employee flow entirely.
2.  ~~Fix employee leave filtering to use `loggedInUser.id` and populated `_id` consistently.~~ Centralized record matching now handles `id` and `_id` correctly.
3.  ~~Fix role initialization so stale cached data does not render mixed admin/employee UI.~~ Protected pages now wait for verified role before rendering role-specific sections.
4.  ~~Remove or replace all hard-coded dashboard and leave stat copy with real calculated values.~~ Dashboard and leave stat copy is now driven by live data/loading states.
5.  ~~Add real auth enforcement to backend routes and remove the unsafe `/create-admin` route.~~ Protected routes are bearer-token enforced and the legacy admin-creation route has been removed.
6.  ~~Standardize all date handling on raw `YYYY-MM-DD` strings without timezone conversion.~~ Date-key normalization is centralized via `toDateKey()` and `getTodayDateKey()`.
7.  ~~Replace or remove all dummy buttons, fake pagination, and dead links.~~ Leave filters/review, employee pagination, and attendance load-more are now functional.
