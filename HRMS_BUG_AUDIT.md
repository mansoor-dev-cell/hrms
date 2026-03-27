# HRMS Bug Audit

Date: 2026-03-27
Scope: Full static audit of client + server code (functional issues + code-level issues)

## Summary

- Critical issues: 3
- High issues: 5
- Medium issues: 6
- Low issues: 3

This audit is based on full code review of the current codebase. It does not include browser automation or device-lab runtime checks, but issues below are directly traceable to implementation.

---

## Critical Issues

### 1) Password reset code is never sent to email (functional blocker)
- Severity: Critical
- Area: Authentication / Forgot Password
- Evidence:
  - `server/server.js:291` (`POST /api/auth/forgot-password`) generates reset code and stores hash/expiry.
  - No SMTP/nodemailer/mail-send implementation exists in `server/server.js`.
  - Only optional dev exposure is present (`ALLOW_DEV_RESET_CODE`) at `server/server.js:59`, `server/server.js:316`.
- Impact:
  - Users cannot receive reset code via email in normal production mode.
  - Matches your observed issue exactly.

### 2) `style.css` is corrupted with large invalid CSS blocks (breaks layout consistency + mobile behavior)
- Severity: Critical
- Area: Global UI / Responsiveness
- Evidence:
  - Corrupted/garbled CSS starts around `client/style.css:652` and continues through many lines (examples: `client/style.css:652`, `client/style.css:697`, `client/style.css:746`, `client/style.css:917`, `client/style.css:1173`).
- Impact:
  - Browser CSS parsing becomes unpredictable after this region.
  - Rules can be ignored or partially applied, causing inconsistent desktop/mobile rendering.
  - Strongly aligned with "whole website not responsive" complaint.

### 3) LOP/year-to-date values can inflate on every read (data corruption by GET calls)
- Severity: Critical
- Area: Salary + Leave calculations
- Evidence:
  - `server/server.js:1161` (`calculateLOP`) mutates and saves user salary/LOP fields.
  - `user.lopDetails.yearToDate += lopDays` at `server/server.js:1280` runs whenever function is called.
  - This function is called inside read APIs:
    - `GET /api/leaves/summary` at `server/server.js:1314`
    - `GET /api/salary/slip` at `server/server.js:1362`
    - `GET /api/calendar` at `server/server.js:1435`
- Impact:
  - Repeated viewing of pages can keep increasing year-to-date LOP and deductions incorrectly.

---

## High Issues

### 4) Employee calendar month navigation does not actually navigate month
- Severity: High
- Area: Employee dashboard calendar UX
- Evidence:
  - In `initializeEmployeeCalendar`, prev/next compute new month/year but do not use them; both just call `fetchEmployeeDashboardData()`.
  - See `client/script.js:570` and `client/script.js:580`.
- Impact:
  - Users cannot browse prior/next months reliably.

### 5) Employee dashboard calendar is display-only; date selection flow is missing from active implementation
- Severity: High
- Area: Leave calendar interaction
- Evidence:
  - Active path calls `initializeEmployeeCalendar(...)` at `client/script.js:2667`.
  - That function renders cells but does not add date-selection handlers for leave application.
  - Selection logic exists in old commented block (`selectedCalDates`, click handlers around `client/script.js:2235-2426`) and is not used by active path.
- Impact:
  - Matches reported issue: user cannot select dates from calendar.

### 6) Sensitive reset-token metadata is exposed in admin user listing
- Severity: High
- Area: Security / Data exposure
- Evidence:
  - `GET /api/users` selects `-password` only at `server/server.js:387`.
  - `User` model contains `resetTokenHash` and `resetTokenExpiry` fields (`server/models/user.js:65-66`).
- Impact:
  - Admin user payload can include password reset token hash metadata unnecessarily.

### 7) Leave API populate omits `subDepartment`, causing wrong department display fallback on UI
- Severity: High
- Area: Leaves table correctness
- Evidence:
  - `GET /api/leaves` populates only `name department role` at `server/server.js:792`.
  - Client expects both `department` and `subDepartment` in leave tables (`client/script.js:1885`).
- Impact:
  - UI can show incorrect/fallback sub-department values.

### 8) Salary update endpoint has no numeric/range validation
- Severity: High
- Area: Payroll integrity
- Evidence:
  - `POST /api/salary/update` directly casts and writes values at `server/server.js:1383-1398`.
  - No checks for negative/basic sanity constraints unlike `/api/salary/assign`.
- Impact:
  - Invalid salary/deduction values can be persisted and break payroll outputs.

---

## Medium Issues

### 9) Duplicate/fragmented employee dashboard implementation in `script.js` increases regression risk
- Severity: Medium
- Area: Frontend maintainability
- Evidence:
  - Old large dashboard implementation remains commented and overlapping with active version.
  - Active function starts at `client/script.js:2483`; old block includes substantial alternate calendar logic around `client/script.js:2071-2432`.
- Impact:
  - Future edits can target wrong block and reintroduce bugs.

### 10) Attendance "today" filtering uses raw date string equality in one path
- Severity: Medium
- Area: Attendance filtering
- Evidence:
  - In `fetchAndDisplayAttendance`, initial date auto-filter uses `r.date === todayStr` at `client/script.js` (around `todayRecords` line near 1145).
  - Elsewhere, normalized `toDateKey` is used correctly.
- Impact:
  - Inconsistent behavior when API date includes time component.

### 11) Potential race on self-attendance create path can return 500 (duplicate key)
- Severity: Medium
- Area: Attendance reliability
- Evidence:
  - Unique index exists on `(employeeId, date)` in `server/models/attendance.js:35`.
  - `POST /api/attendance/mark-self` does find-then-create pattern (`server/server.js:633` onward) without duplicate-key handling.
- Impact:
  - Fast repeated clicks/network retries may cause 500 instead of graceful conflict response.

### 12) Register email normalization inconsistency can produce poor duplicate-account UX
- Severity: Medium
- Area: Auth
- Evidence:
  - Register checks existing user with raw `email` (`server/server.js:203`) instead of normalized value.
  - Model lowercases on save (`server/models/user.js:10`), so duplicate may fail late at DB unique index.
- Impact:
  - Users may get generic server error instead of clean "already exists".

### 13) Multiple pages rely heavily on inline style grids with fixed widths, reducing true mobile adaptability
- Severity: Medium
- Area: Responsiveness
- Evidence examples:
  - `client/emp.html:78` (`min-width: 250px`), `client/emp.html:85` (`width: 240px`), `client/emp.html:98` (`width: 200px`).
  - `client/leave.html` and `client/dashboard.html` contain many inline grid definitions not centrally controlled by media queries.
- Impact:
  - Narrow screens still overflow or compress poorly despite basic global media queries.

### 14) Mobile/sidebar behavior exists, but many page sections are not componentized for stack behavior
- Severity: Medium
- Area: UX consistency
- Evidence:
  - Global responsive rules are basic (`client/style.css:535+`).
  - Large section layouts in pages are inline and not governed by shared breakpoint classes.
- Impact:
  - Mixed behavior across pages/devices.

---

## Low Issues

### 15) Duplicate `@media (max-width: 576px)` block in `style.css`
- Severity: Low
- Evidence:
  - Duplicate block appears twice around `client/style.css:552-573`.
- Impact:
  - Redundant rules, harder maintenance.

### 16) Running server from repository root fails due wrong entry location
- Severity: Low
- Evidence:
  - App entry is `server/server.js`, but root `node server.js` fails (observed operationally).
- Impact:
  - Developer confusion during local startup.

### 17) Notification system is dynamic DOM-injected and inline-styled; no accessibility semantics
- Severity: Low
- Evidence:
  - `showNotification` in `client/script.js:3780+` builds toast without ARIA live region.
- Impact:
  - Reduced accessibility/readability for important status messages.

---

## User-Reported Issues Validation

### A) "Resend code on forgot password is not getting sent"
- Confirmed root cause:
  - There is no email delivery implementation in backend forgot-password flow.
  - Also no dedicated "Resend code" button/flow in `client/login/login.html`; only a single `Send Reset Code` action.

### B) "Whole website is not responsive to mobile"
- Confirmed root causes:
  - Corrupted global stylesheet (`client/style.css`) causing parser issues and inconsistent rule application.
  - Heavy inline fixed-width layout usage in multiple pages with limited centralized breakpoint coverage.

---

## Recommended Fix Order

1. Repair/replace corrupted section of `client/style.css` (highest impact for global UI/mobile).
2. Implement real email sending for forgot/reset flow (SMTP/nodemailer/provider API) and optional resend endpoint.
3. Refactor `calculateLOP` to be idempotent and separate read vs write paths.
4. Fix employee calendar month navigation and date-selection interactions in active dashboard path.
5. Patch security and data-shape issues (`/api/users` field projection, `/api/leaves` populate, salary update validation).
6. Replace inline width-heavy layout with reusable responsive classes.

---

## Notes

- JS syntax checks currently pass for `client/script.js` and `server/server.js`.
- This report focuses on functional and code-level defects visible from the current code state.
