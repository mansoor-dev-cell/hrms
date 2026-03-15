document.addEventListener('DOMContentLoaded', () => {
    // -- Authentication Check --
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.endsWith('login.html') || currentPath.endsWith('signup.html');

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token && !isAuthPage) {
        // Not logged in and trying to access a protected page
        window.location.href = '../client/login/login.html';
        return; // Stop execution
    }

    if (token && isAuthPage) {
        // Logged in but trying to access login/signup
        window.location.href = '../client/dashboard.html';
        return;
    }

    // -- Update Profile DOM Method --
    function updateProfileDOM(userData) {
      const userNameEls = document.querySelectorAll(".user-info .name");
      const userRoleEls = document.querySelectorAll(".user-info .role");
      const userAvatarEls = document.querySelectorAll(".user-profile .avatar");

      userNameEls.forEach((el) => {
        el.textContent = userData.name || "User";
      });

      userRoleEls.forEach((el) => {
        el.textContent = userData.role === "admin" ? "HR Manager" : "Employee";
      });

      if (userData.name) {
        const initials = userData.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();
        userAvatarEls.forEach((el) => {
          el.textContent = initials || "U";
        });
      }

      // Inject logout button next to each user-profile if not already present
      document.querySelectorAll(".user-profile").forEach((profileEl) => {
        if (!profileEl.parentElement.querySelector(".logout-btn")) {
          const btn = document.createElement("button");
          btn.className = "logout-btn";
          btn.title = "Sign out";
          btn.setAttribute("aria-label", "Sign out");
          btn.innerHTML = '<i class="ph ph-sign-out"></i>';
          btn.addEventListener("click", handleLogout);
          profileEl.insertAdjacentElement("afterend", btn);
        }
      });
    }

    function handleLogout() {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login/login.html";
    }

    // -- Role-Based Access Control --
    function applyRoleBasedAccess(userData) {
        const role = (userData && userData.role) ? userData.role.toLowerCase() : 'employee';
        const isAdmin = role === 'admin';

        // Show/hide elements marked as admin-only
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });

        // Show/hide elements marked as employee-only
        document.querySelectorAll('.employee-only').forEach(el => {
            el.style.display = isAdmin ? 'none' : '';
        });

        // Page-level guard for admin-restricted pages
        const restrictedPages = ['emp.html', 'attendance.html'];
        if (!isAdmin && restrictedPages.includes(page)) {
            window.location.href = 'dashboard.html';
        }
    }

    // -- Initialize page content based on verified role from API --
    function initPageContent(verifiedUser) {
        updateProfileDOM(verifiedUser);
        applyRoleBasedAccess(verifiedUser);

        const isAdmin = verifiedUser && verifiedUser.role && verifiedUser.role.toLowerCase() === 'admin';

        if (page === 'emp.html') {
            fetchAndDisplayUsers();
            const saveEmpBtn = document.getElementById('saveEmployeeBtn');
            if (saveEmpBtn) saveEmpBtn.addEventListener('click', submitEmployeeForm);
        }

        if (page === 'attendance.html') {
            fetchAndDisplayAttendance();
            populateEmployeeDropdown('attEmployee');
            const saveBtn = document.getElementById('saveAttendanceBtn');
            if (saveBtn) saveBtn.addEventListener('click', submitAttendanceRecord);
        }

        if (page === "leave.html") {
          setupLeaveFormForRole(verifiedUser);
          fetchAndDisplayLeaves();
          if (verifiedUser && verifiedUser.role === "admin")
            populateEmployeeDropdown("leaveEmployee");
          const saveLeaveBtn = document.getElementById("saveLeaveBtn");
          if (saveLeaveBtn)
            saveLeaveBtn.addEventListener("click", submitLeaveRequest);
        }

        if (page === 'dashboard.html' || page === 'index.html' || page === '') {
            if (isAdmin) {
                fetchDashboardData();
            } else {
                fetchEmployeeDashboardData();
            }
        }
    }

    async function fetchCurrentUser(authToken) {
        try {
            const res = await fetch('http://localhost:5000/api/auth/me', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const freshUser = await res.json();
                // Always persist the latest role from the server
                localStorage.setItem('user', JSON.stringify(freshUser));
                // Re-run init with the authoritative user data
                initPageContent(freshUser);
            }
        } catch (error) {
            console.error('Failed to fetch current user profile:', error);
        }
    }

    // Determine which page we are on based on URL (needed before initPageContent)
    const pathname = window.location.pathname;
    const page = pathname.split('/').pop() || 'dashboard.html';

    // Set active link in sidebar
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === page || (page === '' && href === 'dashboard.html')) {
            link.classList.add('active');
        }
    });

    // Mobile Sidebar Toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    // Generic Modal handling
    const openModalBtns = document.querySelectorAll('[data-open-modal]');
    const closeBtns = document.querySelectorAll('.modal-close, [data-close-modal]');
    const modals = document.querySelectorAll('.modal-overlay');

    openModalBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-open-modal');
            const targetModal = document.getElementById(targetId);
            if (targetModal) {
                targetModal.classList.add('active');
            }
        });
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modals.forEach(m => m.classList.remove('active'));
        });
    });

    // Close modal on clicking outside
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Fast first-paint with cached user (updates sidebar/avatar instantly)
    // Then always fetch fresh from API which will call initPageContent again with authoritative role
    if (user && !isAuthPage) {
        updateProfileDOM(user);
        applyRoleBasedAccess(user);
    }
    if (token && !isAuthPage) {
        // This fetches fresh user from server and calls initPageContent with correct role
        fetchCurrentUser(token);
    } else if (!token && !isAuthPage) {
        // Fallback: use cached user to init page if somehow token is missing
        if (user) initPageContent(user);
    }
});

let allEmployeesData = []; // Store globally for client-side search
let selectedCalDates = new Set(); // Dates selected on employee attendance calendar

async function fetchAndDisplayUsers() {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;

    try {
        const response = await fetch('http://localhost:5000/api/users');
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const users = await response.json();
        allEmployeesData = users; // Cache for the search bar

        renderUsersTable(allEmployeesData);
        setupEmployeeSearch(); // Initialize search listener *after* data is loaded
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-danger">Failed to load employees.</td></tr>';
    }
}

function renderUsersTable(usersToRender) {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (usersToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">No employees found.</td></tr>';
        const countText = document.getElementById('employeeCountText');
        if (countText) countText.textContent = `Showing 0 to 0 entries`;
        return;
    }

    const colors = [
        { bg: 'rgba(79, 70, 229, 0.1)', text: 'var(--primary)' },
        { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--success)' },
        { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)' },
        { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)' }
    ];

    usersToRender.forEach((user, index) => {
        const initials = user.name ? user.name.substring(0, 2).toUpperCase() : 'U';
        const colorTheme = colors[index % colors.length];

        // Format Join Date from backend joinDate or fallback to createdAt
        const rawDate = user.joinDate || user.createdAt;
        const joinDate = rawDate ? new Date(rawDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : 'N/A';

        // Render actual department and role directly from db
        const department = user.department || 'General';
        const roleStr = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Employee';

        // Render action status badge correctly
        const status = user.status || 'Active';
        let badgeClass = 'success';
        if (status.toLowerCase().includes('leave')) badgeClass = 'warning';
        else if (status.toLowerCase().includes('onboarding')) badgeClass = 'primary';
        else if (status.toLowerCase().includes('inactive')) badgeClass = 'danger';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-center gap-3">
                    <div class="avatar" style="width: 40px; height: 40px; font-size: 14px; background-color: ${colorTheme.bg}; color: ${colorTheme.text};">
                        ${initials}
                    </div>
                    <div>
                        <div class="fw-semibold text-main">${user.name}</div>
                        <div class="text-muted" style="font-size: 13px;">${user.email}</div>
                    </div>
                </div>
            </td>
            <td style="vertical-align: middle;">${department}</td>
            <td style="vertical-align: middle;" class="text-main">${roleStr}</td>
            <td style="vertical-align: middle;" class="text-muted">${joinDate}</td>
            <td style="vertical-align: middle;"><span class="badge badge-${badgeClass}">${status}</span></td>

        `;
        tbody.appendChild(tr);
    });

    const countText = document.getElementById('employeeCountText');
    if (countText) {
        countText.textContent = `Showing 1 to ${usersToRender.length} of ${allEmployeesData.length} entries`;
    }
} // End renderUsersTable

async function submitEmployeeForm(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('saveEmployeeBtn');
    const feedback = document.getElementById('addEmpFeedback');

    const firstName = document.getElementById('addEmpFirstName').value;
    const lastName = document.getElementById('addEmpLastName').value;
    const email = document.getElementById('addEmpEmail').value;
    const department = document.getElementById('addEmpDept').value;
    const role = document.getElementById('addEmpRole').value;
    const joinDate = document.getElementById('addEmpDate').value;

    if (!firstName || !lastName || !email) {
        if (feedback) {
            feedback.style.color = 'var(--danger)';
            feedback.textContent = 'Name and Email are required.';
        }
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const payload = { firstName, lastName, email, department, role, joinDate };
        const response = await fetch('http://localhost:5000/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to save');

        if (feedback) {
            feedback.style.color = 'var(--success)';
            feedback.textContent = 'Employee added successfully!';
        }

        setTimeout(() => {
            document.getElementById('addEmployeeModal').classList.remove('active');
            if (feedback) feedback.textContent = '';
            document.getElementById('employeeForm').reset();
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Employee';
            fetchAndDisplayUsers();
        }, 1000);

    } catch (err) {
        console.error(err);
        if (feedback) {
            feedback.style.color = 'var(--danger)';
            feedback.textContent = err.message;
        }
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Employee';
    }
}

function setupEmployeeSearch() {
    const searchInput = document.getElementById('employeeSearchInput');
    const deptFilter = document.getElementById('empDeptFilter');
    const statusFilter = document.getElementById('empStatusFilter');

    const elements = [searchInput, deptFilter, statusFilter];

    elements.forEach(el => {
        if (!el) return;
        el.addEventListener('input', runEmployeeFilter);
        el.addEventListener('change', runEmployeeFilter);
    });

    function runEmployeeFilter() {
        if (!allEmployeesData) return;

        const term = (searchInput ? searchInput.value.toLowerCase().trim() : '');
        const dept = (deptFilter ? deptFilter.value.toLowerCase() : '');
        const status = (statusFilter ? statusFilter.value.toLowerCase() : '');

        const filtered = allEmployeesData.filter(user => {
            const nameMatch = user.name && user.name.toLowerCase().includes(term);
            const emailMatch = user.email && user.email.toLowerCase().includes(term);
            const roleMatch = user.role && user.role.toLowerCase().includes(term);
            const textMatch = term === '' ? true : (nameMatch || emailMatch || roleMatch);

            const userDept = (user.department || 'general').toLowerCase();
            const deptMatch = dept === '' ? true : userDept.includes(dept);

            const userStatus = (user.status || 'active').toLowerCase().replace(/\s+/g, '');
            const statusMatch = status === '' ? true : userStatus.includes(status.replace(/\s+/g, ''));

            return textMatch && deptMatch && statusMatch;
        });

        renderUsersTable(filtered);
    }
}


// --- Attendance Logic ────────────────────────────────────────────────────────
let allAttendanceData = [];

async function fetchAndDisplayAttendance() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    try {
        const [usersResponse, attendanceResponse] = await Promise.all([
            fetch('http://localhost:5000/api/users'),
            fetch('http://localhost:5000/api/attendance')
        ]);

        if (!usersResponse.ok || !attendanceResponse.ok) {
            throw new Error('Failed to fetch attendance data');
        }

        const users = await usersResponse.json();
        const records = await attendanceResponse.json();
        allAttendanceData = records;

        // Compute Daily Stats
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;

        const todayStr = new Date().toISOString().split('T')[0];

        records.forEach(r => {
            const recDateStr = r.date ? new Date(r.date).toISOString().split('T')[0] : '';
            if (recDateStr === todayStr) {
                if (r.status === 'present' || r.status === 'half-day') presentCount++;
                if (r.status === 'absent') absentCount++;
                if (r.status === 'late') lateCount++;
            }
        });

        // Update Stat Cards (if on attendance page)
        const elTotal = document.getElementById('attTotalEmployees');
        const elPresent = document.getElementById('attPresentToday');
        const elAbsent = document.getElementById('attAbsentToday');
        const elLate = document.getElementById('attLateArrivals');

        if (elTotal) elTotal.textContent = users.length;
        if (elPresent) elPresent.textContent = presentCount + lateCount;
        if (elPresent) elPresent.textContent = presentCount;
        if (elAbsent) elAbsent.textContent = absentCount;
        if (elLate) elLate.textContent = lateCount;

        // Set today's date as default for the filter and modal date inputs
        const dateFilterEl = document.getElementById('attDateFilter');
        const modalDateEl = document.getElementById('attDate');
        if (dateFilterEl && !dateFilterEl.value) dateFilterEl.value = todayStr;
        if (modalDateEl && !modalDateEl.value) modalDateEl.value = todayStr;

        renderAttendanceTable(allAttendanceData);
        setupAttendanceSearch();

        // Auto-apply today's date filter on first load
        if (dateFilterEl && dateFilterEl.value === todayStr) {
            const todayRecords = allAttendanceData.filter(r => r.date === todayStr);
            renderAttendanceTable(todayRecords.length > 0 ? todayRecords : allAttendanceData);
        }
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-danger">Failed to load attendance records.</td></tr>';
    }
}

function renderAttendanceTable(recordsToRender) {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (recordsToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">No attendance records found.</td></tr>';
        return;
    }

    const colors = [
        { bg: 'rgba(79, 70, 229, 0.1)', text: 'var(--primary)' },
        { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--success)' },
        { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)' },
        { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)' }
    ];

    recordsToRender.forEach((record, index) => {
        const user = record.employeeId;
        if (!user) return; // defensive

        const initials = user.name ? user.name.substring(0, 2).toUpperCase() : 'U';
        const colorTheme = colors[index % colors.length];
        const displayDate = new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });

        let badgeClass = 'success';
        if (record.status.toLowerCase() === 'absent') badgeClass = 'danger';
        else if (record.status.toLowerCase() === 'late') badgeClass = 'warning';
        else if (record.status.toLowerCase() === 'half-day') badgeClass = 'primary';
        const statusStr = record.status.charAt(0).toUpperCase() + record.status.slice(1);

        const checkInHtml = record.checkIn === '--:--' ? `<span class="text-muted">--:--</span>` : `<span class="${record.status === 'late' ? 'text-warning' : ''} fw-semibold">${record.checkIn}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-center gap-3">
                    <div class="avatar" style="width: 36px; height: 36px; font-size: 13px; background-color: ${colorTheme.bg}; color: ${colorTheme.text};">
                        ${initials}
                    </div>
                    <div>
                        <div class="fw-semibold text-main">${user.name}</div>
                        <div class="text-muted" style="font-size: 12px;">${user.department || 'General'}</div>
                    </div>
                </div>
            </td>
            <td style="vertical-align: middle;">${displayDate}</td>
            <td style="vertical-align: middle;">${checkInHtml}</td>
            <td style="vertical-align: middle; ${record.checkOut === '--:--' ? 'color: var(--text-muted);' : ''}">${record.checkOut}</td>
            <td style="vertical-align: middle;"><span class="badge badge-${badgeClass}">${statusStr}</span></td>
            <td style="vertical-align: middle;" class="text-muted">${record.notes || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function setupAttendanceSearch() {
    const dateFilter = document.getElementById('attDateFilter');
    const searchInput = document.getElementById('attSearchFilter');

    const elements = [dateFilter, searchInput];

    elements.forEach(el => {
        if (!el) return;
        el.addEventListener('input', runAttFilter);
        el.addEventListener('change', runAttFilter);
    });

    function runAttFilter() {
        if (!allAttendanceData) return;

        const dateVal = dateFilter ? dateFilter.value : '';
        const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = allAttendanceData.filter(record => {
            // Normalize: record.date may be "2026-03-10T00:00:00.000Z" or "2026-03-10"
            const recordDateStr = record.date ? new Date(record.date).toISOString().split('T')[0] : '';
            const dateMatch = dateVal === '' ? true : recordDateStr === dateVal;

            const user = record.employeeId || {};
            const nameMatch = user.name && user.name.toLowerCase().includes(term);
            const deptMatch = user.department && user.department.toLowerCase().includes(term);
            const textMatch = term === '' ? true : (nameMatch || deptMatch);

            return dateMatch && textMatch;
        });

        renderAttendanceTable(filtered);
    }
}

async function populateEmployeeDropdown(dropdownId = 'attEmployee') {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    try {
        const response = await fetch('http://localhost:5000/api/users');
        if (!response.ok) return;

        const users = await response.json();
        dropdown.innerHTML = '<option value="" disabled selected>Search & Select Employee...</option>';

        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u._id;
            opt.textContent = `${u.name} - ${u.department || 'General'}`;
            dropdown.appendChild(opt);
        });
    } catch (err) {
        console.error("Failed to load users for dropdown", err);
    }
}

async function submitAttendanceRecord(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('saveAttendanceBtn');
    const feedback = document.getElementById('attFeedback');

    const employeeId = document.getElementById('attEmployee').value;
    const date = document.getElementById('attDate').value;
    const status = document.getElementById('attStatus').value;
    const checkIn = document.getElementById('attCheckIn').value || '--:--';
    const checkOut = document.getElementById('attCheckOut').value || '--:--';
    const notes = document.getElementById('attNotes').value;

    if (!employeeId || !date) {
        if (feedback) {
            feedback.style.color = 'var(--danger)';
            feedback.textContent = 'Employee and Date are required.';
        }
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const payload = { employeeId, date, status, checkIn, checkOut, notes };
        const response = await fetch('http://localhost:5000/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to save');
        }

        if (feedback) {
            feedback.style.color = 'var(--success)';
            feedback.textContent = 'Attendance saved successfully!';
        }

        // Close modal and refresh
        setTimeout(() => {
            document.getElementById('markAttendanceModal').classList.remove('active');
            if (feedback) feedback.textContent = '';
            document.getElementById('attendanceForm').reset();
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Record';
            fetchAndDisplayAttendance();
        }, 1000);

    } catch (err) {
        console.error(err);
        if (feedback) {
            feedback.style.color = 'var(--danger)';
            feedback.textContent = err.message;
        }
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Record';
    }
}

let allLeavesData = [];

async function fetchAndDisplayLeaves() {
    const tbody = document.getElementById('leaveTableBody');
    if (!tbody) return;

    try {
        const response = await fetch('http://localhost:5000/api/leaves');
        if (!response.ok) throw new Error('Failed to fetch leave records');

        const leaves = await response.json();

        // If not admin, only show the current user's own leave requests
        const loggedInUser = JSON.parse(localStorage.getItem('user') || 'null');
        const isAdmin = loggedInUser && loggedInUser.role === 'admin';
        allLeavesData = isAdmin ? leaves : leaves.filter(l => {
            const emp = l.employeeId;
            return emp && (emp._id === loggedInUser._id || emp.email === loggedInUser.email);
        });

        // Update Stats
        let pending = 0;
        let approvedThisMonth = 0;
        let onLeaveToday = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Strip out time matching for "today"
        const todayStr = now.toISOString().split('T')[0];

        allLeavesData.forEach((l) => {
          if (l.status === "pending") pending++;
          if (l.status === "approved") {
            const sDate = new Date(l.startDate);
            if (
              sDate.getMonth() === currentMonth &&
              sDate.getFullYear() === currentYear
            ) {
              approvedThisMonth++;
            }
            if (todayStr >= l.startDate && todayStr <= l.endDate) {
              onLeaveToday++;
            }
          }
        });

        const pendingEl = document.getElementById('pendingRequestsCount');
        const todayEl = document.getElementById('onLeaveTodayCount');
        const approvedEl = document.getElementById('approvedThisMonthCount');

        if (pendingEl) pendingEl.textContent = pending;
        if (todayEl) todayEl.textContent = onLeaveToday;
        if (approvedEl) approvedEl.textContent = approvedThisMonth;

        // Update Notification Bell Globally
        updateNotificationBell(pending);

        renderLeavesTable(allLeavesData);
        setupLeaveSearch();
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-danger">Failed to load leave records.</td></tr>';
    }
}

function renderLeavesTable(leavesToRender) {
    const tbody = document.getElementById('leaveTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (leavesToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">No leave requests found.</td></tr>';
        return;
    }

    const colors = [
        { bg: 'rgba(79, 70, 229, 0.1)', text: 'var(--primary)' },
        { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--success)' },
        { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)' },
        { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)' }
    ];

    leavesToRender.forEach((l, index) => {
        const user = l.employeeId;
        if (!user) return; // defensive

        const initials = user.name ? user.name.substring(0, 2).toUpperCase() : 'U';
        const colorTheme = colors[index % colors.length];

        // Format Dates & Duration
        const sDate = new Date(l.startDate);
        const eDate = new Date(l.endDate);
        const durationDays = Math.max(1, Math.ceil(Math.abs(eDate - sDate) / (1000 * 60 * 60 * 24)) + 1);

        const dateStr = sDate.getTime() === eDate.getTime()
            ? sDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
            : `${sDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} - ${eDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}`;

        let badgeClass = 'warning';
        let badgeStyle = 'background-color: #fef08a; color: #854d0e;';
        if (l.status === 'approved') { badgeClass = 'success'; badgeStyle = ''; }
        if (l.status === 'rejected') { badgeClass = 'danger'; badgeStyle = ''; }

        const typeStr = l.type.charAt(0).toUpperCase() + l.type.slice(1) + " Leave";
        const statusStr = l.status.charAt(0).toUpperCase() + l.status.slice(1);

        let actionButtons = '';
        const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        const currentUserIsAdmin = currentUser && currentUser.role === 'admin';

        if (currentUserIsAdmin && l.status === 'pending') {
            actionButtons = `
                <button class="btn btn-outline" onclick="updateLeaveStatus('${l._id}', 'approved')" style="padding: 6px; border: none; color: var(--success); background-color: rgba(16, 185, 129, 0.1); margin-right: 4px;"><i class="ph ph-check" style="font-size: 16px;"></i></button>
                <button class="btn btn-outline" onclick="updateLeaveStatus('${l._id}', 'rejected')" style="padding: 6px; border: none; color: var(--danger); background-color: rgba(239, 68, 68, 0.1);"><i class="ph ph-x" style="font-size: 16px;"></i></button>
            `;
        } else {
            actionButtons = `
                <button class="btn btn-outline" style="padding: 6px; border: none; color: var(--text-muted);"><i class="ph ph-eye" style="font-size: 18px;"></i></button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-center gap-3">
                    <div class="avatar" style="width: 36px; height: 36px; font-size: 13px; background-color: ${colorTheme.bg}; color: ${colorTheme.text};">
                        ${initials}
                    </div>
                    <div>
                        <div class="fw-semibold text-main">${user.name}</div>
                        <div class="text-muted" style="font-size: 12px;">${user.department || 'General'}</div>
                    </div>
                </div>
            </td>
            <td style="vertical-align: middle;">
                <div class="fw-semibold">${typeStr}</div>
                <div class="text-muted" style="font-size: 12px;">${l.reason}</div>
            </td>
            <td style="vertical-align: middle;">
                <div class="text-main">${dateStr}</div>
            </td>
            <td style="vertical-align: middle;" class="fw-semibold">${durationDays} Day${durationDays > 1 ? 's' : ''}</td>
            <td style="vertical-align: middle;"><span class="badge badge-${badgeClass}" style="${badgeStyle}">${statusStr}</span></td>
            <td style="vertical-align: middle;">
                <div style="display: flex; gap: 8px;">
                    ${actionButtons}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setupLeaveSearch() {
    const searchInput = document.getElementById('leaveSearchFilter');
    const statusLinks = document.querySelectorAll('.leave-status-link');
    let currentStatus = '';

    if (searchInput) {
        searchInput.addEventListener('input', runLeaveFilter);
    }

    statusLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active styles from all
            statusLinks.forEach(l => {
                l.style.borderColor = 'transparent';
                l.style.color = 'var(--text-main)';
            });

            // Add active styles to clicked
            link.style.borderColor = 'var(--primary)';
            link.style.color = 'var(--primary)';

            currentStatus = link.getAttribute('data-status') || '';
            runLeaveFilter();
        });
    });

    function runLeaveFilter() {
        if (!allLeavesData) return;

        const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = allLeavesData.filter(record => {
            const user = record.employeeId || {};
            const nameMatch = user.name && user.name.toLowerCase().includes(term);
            const deptMatch = user.department && user.department.toLowerCase().includes(term);
            const textMatch = term === '' ? true : (nameMatch || deptMatch);

            const recordStatus = (record.status || '').toLowerCase();
            const statusMatch = currentStatus === '' ? true : recordStatus === currentStatus;

            return textMatch && statusMatch;
        });

        renderLeavesTable(filtered);
    }
}

async function submitLeaveRequest(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('saveLeaveBtn');
    const feedback = document.getElementById('leaveFeedback');

    const employeeId = document.getElementById('leaveEmployee').value;
    const type = document.getElementById('leaveType').value;
    const startDate = document.getElementById('leaveStartDate').value;
    const endDate = document.getElementById('leaveEndDate').value;
    const reason = document.getElementById('leaveReason').value;

    if (!employeeId || !type || !startDate || !endDate || !reason) {
        if (feedback) {
            feedback.style.color = 'var(--danger)';
            feedback.textContent = 'All fields are required.';
        }
        return;
    }

    if (new Date(endDate) < new Date(startDate)) {
        if (feedback) {
            feedback.style.color = 'var(--danger)';
            feedback.textContent = 'End date cannot be earlier than start date.';
        }
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Submitting...';

    try {
        const payload = { employeeId, type, startDate, endDate, reason };
        const response = await fetch('http://localhost:5000/api/leaves', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to submit request');

        if (feedback) {
            feedback.style.color = 'var(--success)';
            feedback.textContent = 'Leave request submitted successfully!';
        }

        setTimeout(() => {
            document.getElementById('applyLeaveModal').classList.remove('active');
            if (feedback) feedback.textContent = '';
            document.getElementById('leaveForm').reset();
            saveBtn.disabled = false;
            saveBtn.textContent = 'Submit Request';
            fetchAndDisplayLeaves();
        }, 1000);

    } catch (err) {
        console.error(err);
        if (feedback) {
            feedback.style.color = 'var(--danger)';
            feedback.textContent = err.message;
        }
        saveBtn.disabled = false;
        saveBtn.textContent = 'Submit Request';
    }
}

async function updateLeaveStatus(leaveId, newStatus) {
    try {
        const response = await fetch(`http://localhost:5000/api/leaves/${leaveId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            fetchAndDisplayLeaves(); // Refresh the table automatically
        }
    } catch (err) {
        console.error("Failed to update status", err);
    }
}

function updateNotificationBell(count) {
    const badge = document.getElementById('bellBadge');
    if (!badge) return;

    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// --- Employee Dashboard Logic ─────────────────────────────────────────────────
async function fetchEmployeeDashboardData() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) return;

    // Greet by name
    const welcomeEl = document.getElementById('empWelcomeTitle');
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${user.name ? user.name.split(' ')[0] : 'there'}! 👋`;

    try {
      const [attRes, leavesRes] = await Promise.all([
        fetch("http://localhost:5000/api/attendance"),
        fetch("http://localhost:5000/api/leaves"),
      ]);

      const allAttendance = attRes.ok ? await attRes.json() : [];
      const allLeaves = leavesRes.ok ? await leavesRes.json() : [];

      // Filter for current user only
      const myAttendance = allAttendance.filter((a) => {
        const emp = a.employeeId;
        return emp && (emp._id === user._id || emp.email === user.email);
      });

      const myLeaves = allLeaves.filter((l) => {
        const emp = l.employeeId;
        return emp && (emp._id === user._id || emp.email === user.email);
      });

      // --- Stats ---
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const myAttThisMonth = myAttendance.filter((a) => {
        const d = new Date(a.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const presentDays = myAttThisMonth.filter(
        (a) => a.status === "present" || a.status === "late",
      ).length;

      // Count working days so far (Mon–Sat; only Sunday is considered off by default)
      let workingDaysSoFar = 0;
      for (let d = 1; d <= now.getDate(); d++) {
        if (new Date(currentYear, currentMonth, d).getDay() !== 0)
          workingDaysSoFar++;
      }
      const absentDays = Math.max(0, workingDaysSoFar - presentDays);
      const approvedLeaves = myLeaves.filter(
        (l) => l.status === "approved",
      ).length;
      const pendingLeaves = myLeaves.filter(
        (l) => l.status === "pending",
      ).length;

      const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setEl("empDaysPresent", presentDays);
      setEl("empDaysAbsent", absentDays);
      setEl("empApprovedLeaves", approvedLeaves);
      setEl("empPendingLeaves", pendingLeaves);

      // ── Build attendance map: YYYY-MM-DD → status ──────────────────────────
      const attendanceMap = {};
      myAttendance.forEach((a) => {
        attendanceMap[new Date(a.date).toISOString().split("T")[0]] = a.status;
      });
      // Overlay approved leave ranges
      myLeaves.forEach((l) => {
        if (l.status !== "approved") return;
        for (
          let d = new Date(l.startDate);
          d <= new Date(l.endDate);
          d.setDate(d.getDate() + 1)
        ) {
          attendanceMap[d.toISOString().split("T")[0]] = "leave";
        }
      });

      // ── Calendar state ──────────────────────────────────────────────────────
      let calYear = currentYear;
      let calMonth = currentMonth;

      function updateSelBar() {
        const bar = document.getElementById("calSelectionBar");
        const countEl = document.getElementById("calSelCount");
        if (!bar) return;
        if (selectedCalDates.size > 0) {
          bar.style.display = "flex";
          if (countEl)
            countEl.textContent = `${selectedCalDates.size} day${selectedCalDates.size !== 1 ? "s" : ""} selected — click "Apply Leave" to continue`;
        } else {
          bar.style.display = "none";
        }
      }

      function renderCalendar(year, month) {
        const grid = document.getElementById("empCalendarGrid");
        const label = document.getElementById("calMonthLabel");
        if (!grid || !label) return;

        label.textContent = new Date(year, month, 1).toLocaleDateString(
          "en-US",
          { month: "long", year: "numeric" },
        );
        grid.innerHTML = "";

        // Day headers
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => {
          const hdr = document.createElement("div");
          hdr.textContent = d;
          hdr.style.cssText =
            "font-size:13px;font-weight:700;color:var(--text-muted);padding:8px 0 14px;text-transform:uppercase;letter-spacing:0.5px;";
          grid.appendChild(hdr);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = new Date().toISOString().split("T")[0];

        for (let i = 0; i < firstDay; i++)
          grid.appendChild(document.createElement("div"));

        for (let day = 1; day <= daysInMonth; day++) {
          const cell = document.createElement("div");
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dow = new Date(year, month, day).getDay();
          const isSun = dow === 0;
          const isWknd = dow === 0 || dow === 6;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const status = attendanceMap[dateStr];
          const isSel = selectedCalDates.has(dateStr);

          let bg = "transparent",
            color = "var(--text-main)",
            border = "none",
            cursor = "default",
            title = "",
            opacity = "1";

          if (isSel) {
            bg = "var(--primary)";
            color = "#fff";
            cursor = "pointer";
            title = "Selected — click to deselect";
          } else if (status === "leave") {
            bg = "var(--warning)";
            color = "#fff";
            title = "Approved Leave";
          } else if (status === "present") {
            bg = "var(--success)";
            color = "#fff";
            title = "Present";
          } else if (status === "late") {
            bg = "var(--success)";
            color = "#fff";
            title = "Late / Present";
          } else if (status === "absent") {
            bg = "rgba(239,68,68,0.22)";
            color = "var(--danger)";
            title = "Absent";
          } else if (isSun) {
            bg = "var(--border)";
            color = "var(--text-muted)";
            if (!isFuture) {
              cursor = "pointer";
              title = "Sunday — click to mark as working day";
            }
          } else if (isWknd) {
            bg = "var(--border)";
            color = "var(--text-muted)";
          } else {
            // Past or future selectable weekday
            cursor = "pointer";
            title = isFuture
              ? "Click to select for leave"
              : "Click to select for leave";
            if (isFuture) opacity = "0.65";
          }

          if (isToday && !isSel) border = "2px solid var(--primary)";

          cell.style.cssText = `
                    min-height:80px; display:flex; align-items:center; justify-content:center;
                    border-radius:10px; font-size:18px; font-weight:700;
                    background:${bg}; color:${color}; border:${border};
                    cursor:${cursor}; opacity:${opacity}; transition:background 0.15s, border 0.15s, transform 0.1s;
                `;
          if (cursor === "pointer" && !isSel && !status)
            cell.classList.add("cal-selectable");
          cell.textContent = day;
          if (title) cell.title = title;

          // Past Sundays: mark working day. All non-weekend, non-marked days (past or future): select for leave.
          if (!isWknd || (isSun && !isFuture && !status)) {
            cell.addEventListener("click", () => {
              if (isSun && !status && !isFuture) {
                // Mark Sunday as working day
                cell.title = "Saving…";
                fetch("http://localhost:5000/api/attendance", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    employeeId: user.id,
                    date: dateStr,
                    status: "present",
                    checkIn: "--:--",
                    checkOut: "--:--",
                    notes: "Working on Sunday",
                  }),
                })
                  .then((r) => {
                    if (r.ok) {
                      attendanceMap[dateStr] = "present";
                      renderCalendar(year, month);
                    }
                  })
                  .catch(console.error);
                return;
              }
              // Cannot select already marked days
              if (
                status === "leave" ||
                status === "present" ||
                status === "late" ||
                status === "absent"
              )
                return;
              if (isWknd) return;
              if (isSel) selectedCalDates.delete(dateStr);
              else selectedCalDates.add(dateStr);
              renderCalendar(year, month);
              updateSelBar();
            });
          }
          grid.appendChild(cell);
        }
        updateSelBar();
      }

      // Nav buttons — .onclick to avoid duplicate listeners on re-render
      const prevBtn = document.getElementById("calPrevMonth");
      const nextBtn = document.getElementById("calNextMonth");
      if (prevBtn)
        prevBtn.onclick = () => {
          calMonth--;
          if (calMonth < 0) {
            calMonth = 11;
            calYear--;
          }
          renderCalendar(calYear, calMonth);
        };
      if (nextBtn)
        nextBtn.onclick = () => {
          calMonth++;
          if (calMonth > 11) {
            calMonth = 0;
            calYear++;
          }
          renderCalendar(calYear, calMonth);
        };

      // Selection bar buttons
      const clearBtn = document.getElementById("calClearSelBtn");
      const calApplyBtn = document.getElementById("calApplyLeaveBtn");
      const empApplyBtn = document.getElementById("empApplyLeaveBtn");
      const qlSubmitBtnEl = document.getElementById("qlSubmitBtn");

      if (clearBtn)
        clearBtn.onclick = () => {
          selectedCalDates.clear();
          renderCalendar(calYear, calMonth);
        };
      if (calApplyBtn)
        calApplyBtn.onclick = () => openQuickLeaveModal(selectedCalDates);
      if (empApplyBtn)
        empApplyBtn.onclick = () => openQuickLeaveModal(selectedCalDates);
      if (qlSubmitBtnEl) qlSubmitBtnEl.onclick = submitQuickLeave;

      renderCalendar(calYear, calMonth);

      // ── Recent leaves sidebar ───────────────────────────────────────────────
      const leavesList = document.getElementById("empLeavesList");
      if (leavesList) {
        const sorted = [...myLeaves]
          .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
          .slice(0, 5);
        if (sorted.length === 0) {
          leavesList.innerHTML = `<p class="text-muted" style="font-size:13px;">No leave requests yet. <a href="leave.html" style="color:var(--primary);">Apply now →</a></p>`;
        } else {
          leavesList.innerHTML = sorted
            .map((l) => {
              const bColor =
                l.status === "approved"
                  ? "var(--success)"
                  : l.status === "rejected"
                    ? "var(--danger)"
                    : "#d97706";
              const bBg =
                l.status === "approved"
                  ? "var(--success-bg)"
                  : l.status === "rejected"
                    ? "rgba(239,68,68,0.12)"
                    : "var(--warning-bg)";
              const s = new Date(l.startDate).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
              });
              const e = new Date(l.endDate).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
              });
              const dStr = l.startDate === l.endDate ? s : `${s} – ${e}`;
              const tStr = l.type
                ? l.type.charAt(0).toUpperCase() + l.type.slice(1) + " Leave"
                : "Leave";
              return `<div style="display:flex;flex-direction:column;gap:6px;min-width:160px;padding:12px 16px;border-radius:10px;background:var(--bg-surface);border:1px solid var(--border);flex:0 0 auto;">
                        <div style="font-weight:600;font-size:13px;color:var(--text-main);">${tStr}</div>
                        <div style="font-size:12px;color:var(--text-muted);">${dStr}</div>
                        <span style="display:inline-block;margin-top:2px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:${bBg};color:${bColor};text-transform:uppercase;letter-spacing:0.5px;align-self:flex-start;">${l.status}</span>
                    </div>`;
            })
            .join("");
        }
      }
    } catch (err) {
        console.error('Employee dashboard error:', err);
    }
}

// ── Quick Leave Modal (employee dashboard) ─────────────────────────────────────
function openQuickLeaveModal(datesSet) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) return;

    const qlAvatar = document.getElementById('qlAvatar');
    const qlName   = document.getElementById('qlName');
    const qlEmail  = document.getElementById('qlEmail');
    const qlEmpId  = document.getElementById('qlEmployeeId');
    if (qlName)   qlName.textContent  = user.name  || 'You';
    if (qlEmail)  qlEmail.textContent = user.email || '';
    if (qlEmpId)  qlEmpId.value       = user.id    || '';
    if (qlAvatar) {
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'U';
        qlAvatar.textContent = initials;
    }

    const qlDateBadge = document.getElementById('qlDateBadge');
    const qlStart     = document.getElementById('qlStartDate');
    const qlEnd       = document.getElementById('qlEndDate');

    if (datesSet && datesSet.size > 0) {
        const sorted = [...datesSet].sort();
        if (qlStart) qlStart.value = sorted[0];
        if (qlEnd)   qlEnd.value   = sorted[sorted.length - 1];
        if (qlDateBadge) {
            qlDateBadge.style.display = 'block';
            qlDateBadge.innerHTML = sorted.length === 1
                ? `<i class="ph ph-calendar" style="margin-right:5px;"></i>Selected: <strong>${sorted[0]}</strong>`
                : `<i class="ph ph-calendar" style="margin-right:5px;"></i>Selected: <strong>${sorted[0]}</strong> → <strong>${sorted[sorted.length-1]}</strong> (${sorted.length} days)`;
        }
    } else {
        if (qlStart)     qlStart.value          = '';
        if (qlEnd)       qlEnd.value             = '';
        if (qlDateBadge) qlDateBadge.style.display = 'none';
    }

    const fb = document.getElementById('qlFeedback');
    if (fb) { fb.textContent = ''; fb.style.color = ''; }
    const modal = document.getElementById('quickLeaveModal');
    if (modal) modal.classList.add('active');
}

async function submitQuickLeave() {
    const btn       = document.getElementById('qlSubmitBtn');
    const feedback  = document.getElementById('qlFeedback');
    const employeeId = (document.getElementById('qlEmployeeId') || {}).value || '';
    const type       = (document.getElementById('qlLeaveType')  || {}).value || '';
    const startDate  = (document.getElementById('qlStartDate')  || {}).value || '';
    const endDate    = (document.getElementById('qlEndDate')    || {}).value || '';
    const reason     = ((document.getElementById('qlReason')    || {}).value || '').trim();

    if (!type || !startDate || !endDate || !reason) {
        if (feedback) { feedback.style.color = 'var(--danger)'; feedback.textContent = 'Please fill in all fields.'; }
        return;
    }
    if (new Date(endDate) < new Date(startDate)) {
        if (feedback) { feedback.style.color = 'var(--danger)'; feedback.textContent = 'End date cannot be before start date.'; }
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

    try {
        const res  = await fetch('http://localhost:5000/api/leaves', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, type, startDate, endDate, reason })
        });
        const data = await res.json();

        if (!res.ok) {
            if (feedback) { feedback.style.color = 'var(--danger)'; feedback.textContent = data.message || 'Submission failed.'; }
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-paper-plane-tilt" style="margin-right:4px;"></i>Submit Request'; }
            return;
        }

        if (feedback) { feedback.style.color = 'var(--success)'; feedback.textContent = '✓ Leave request submitted!'; }
        setTimeout(() => {
            const modal = document.getElementById('quickLeaveModal');
            if (modal) modal.classList.remove('active');
            document.getElementById('quickLeaveForm').reset();
            if (feedback) feedback.textContent = '';
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-paper-plane-tilt" style="margin-right:4px;"></i>Submit Request'; }
            selectedCalDates.clear();
            fetchEmployeeDashboardData();
        }, 1200);
    } catch {
        if (feedback) { feedback.style.color = 'var(--danger)'; feedback.textContent = 'Cannot reach server.'; }
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-paper-plane-tilt" style="margin-right:4px;"></i>Submit Request'; }
    }
}

// ── Leave page role setup ───────────────────────────────────────────────────────
function setupLeaveFormForRole(user) {
    const isAdmin       = user && user.role === 'admin';
    const dropdownGroup = document.getElementById('leaveEmpDropdownGroup');
    const empInfo       = document.getElementById('leaveEmpInfo');
    const leaveEmployee = document.getElementById('leaveEmployee');
    const searchWrap    = document.getElementById('leaveSearchWrap');

    if (isAdmin) {
        if (dropdownGroup) dropdownGroup.style.display = '';
        if (empInfo)       empInfo.style.display       = 'none';
    } else {
        if (dropdownGroup) dropdownGroup.style.display = 'none';
        if (empInfo)       empInfo.style.display       = 'flex';
        if (leaveEmployee) {
            // Add the employee's own ID as an option so .value can be set
            if (!leaveEmployee.querySelector(`option[value="${user.id}"]`)) {
                const opt = document.createElement('option');
                opt.value = user.id;
                opt.textContent = user.name || 'Me';
                leaveEmployee.appendChild(opt);
            }
            leaveEmployee.value = user.id;
        }
        if (searchWrap)    searchWrap.style.display    = 'none';

        const nameEl   = document.getElementById('leaveModalName');
        const roleEl   = document.getElementById('leaveModalRole');
        const avatarEl = document.getElementById('leaveModalAvatar');
        if (nameEl)   nameEl.textContent   = user.name || 'You';
        if (roleEl)   roleEl.textContent   = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Employee';
        if (avatarEl) {
            const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'U';
            avatarEl.textContent = initials;
        }

        // Tailor page labels for employee self-service
        const pageTitle = document.querySelector('.page-title');
        const pageSub   = document.querySelector('.page-subtitle');
        if (pageTitle) pageTitle.textContent = 'My Leaves';
        if (pageSub)   pageSub.textContent   = 'Your personal leave history and requests.';

        // Employee-specific stat card labels
        const pendingLabel = document.getElementById('pendingRequestsCount');
        if (pendingLabel) pendingLabel.closest('.card-body').querySelector('p.text-muted').textContent = 'MY PENDING';
        const approvedLabel = document.getElementById('approvedThisMonthCount');
        if (approvedLabel) approvedLabel.closest('.card-body').querySelector('p.text-muted').textContent = 'MY APPROVED THIS MONTH';
        const todayLabel = document.getElementById('onLeaveTodayCount');
        if (todayLabel) todayLabel.closest('.card-body').querySelector('p.text-muted').textContent = 'ON LEAVE TODAY';
    }
}

// --- Dashboard Logic ─────────────────────────────────────────────────────────
async function fetchDashboardData() {
    try {
        const [usersRes, attendanceRes, leavesRes] = await Promise.all([
            fetch('http://localhost:5000/api/users'),
            fetch('http://localhost:5000/api/attendance'),
            fetch('http://localhost:5000/api/leaves')
        ]);

        if (!usersRes.ok || !attendanceRes.ok || !leavesRes.ok) {
            throw new Error('Failed to fetch one or more dashboard data sources');
        }

        const users = await usersRes.json();
        const attendance = await attendanceRes.json();
        const leaves = await leavesRes.json();

        // Total Employees
        const totalEmployeesCountEl = document.getElementById('totalEmployeesCount');
        if (totalEmployeesCountEl) {
            totalEmployeesCountEl.textContent = users.length;
        }

        // Today's Attendance
        const todaysAttendanceCountEl = document.getElementById('todaysAttendanceCount');
        if (todaysAttendanceCountEl) {
            const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const presentTodayCount = attendance.filter(a =>
                a.date === todayStr &&
                ['present', 'late', 'half-day'].includes(a.status)
            ).length;

            // Format 118/124
            todaysAttendanceCountEl.innerHTML = `${presentTodayCount}<span style="font-size: 18px; color: var(--text-muted); font-weight: 500;">/${users.length}</span>`;

            // presence rate percentage
            const rate = users.length > 0 ? Math.round((presentTodayCount / users.length) * 100) : 0;
            const rateSpan = document.querySelector('.ph-user-check').parentElement.parentElement.nextElementSibling.querySelector('.text-success');
            if (rateSpan) {
                // Update color based on rate
                if (rate < 80) rateSpan.className = 'text-warning fw-semibold';
                if (rate < 50) rateSpan.className = 'text-danger fw-semibold';
                rateSpan.textContent = rate + '%';
            }
        }

        // Employees on Leave Today
        const employeesOnLeaveCountEl = document.getElementById('employeesOnLeaveCount');
        if (employeesOnLeaveCountEl) {
            const todayStr = new Date().toISOString().split('T')[0];
            const onLeaveToday = leaves.filter(l =>
                l.status === 'approved' &&
                todayStr >= l.startDate &&
                todayStr <= l.endDate
            ).length;
            employeesOnLeaveCountEl.textContent = onLeaveToday;

            // pending leave requests text
            const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
            const pendingSpan = document.querySelector('.ph-calendar-x').parentElement.parentElement.nextElementSibling.querySelector('.text-danger');
            if (pendingSpan) {
                if (pendingLeaves === 0) {
                    pendingSpan.className = 'text-success fw-semibold';
                    pendingSpan.textContent = "0 Pending";
                } else {
                    pendingSpan.textContent = `${pendingLeaves} Pending`;
                }
            }
        }

        // Recent Hirings
        const recentHiringsTbody = document.getElementById('recentHiringsTableBody');
        if (recentHiringsTbody) {
            // Sort users by created date descending
            const sortedUsers = [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const top5 = sortedUsers.slice(0, 5);

            recentHiringsTbody.innerHTML = '';

            if (top5.length === 0) {
                recentHiringsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;" class="text-muted">No hirings found.</td></tr>';
                return;
            }

            const colors = [
                { bg: 'rgba(79, 70, 229, 0.1)', text: 'var(--primary)' },
                { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--success)' },
                { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)' },
                { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)' }
            ];

            top5.forEach((user, index) => {
                const initials = user.name ? user.name.substring(0, 2).toUpperCase() : 'U';
                const colorTheme = colors[index % colors.length];
                const department = user.department || 'General';
                const roleStr = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Employee';
                const joinDate = user.joinDate || user.createdAt;
                const dateStr = joinDate ? new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : 'N/A';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="d-flex align-center gap-3">
                            <div class="avatar" style="width: 36px; height: 36px; font-size: 13px; background-color: ${colorTheme.bg}; color: ${colorTheme.text};">
                                ${initials}
                            </div>
                            <div>
                                <div class="fw-semibold text-main">${user.name}</div>
                                <div class="text-muted" style="font-size: 12px;">${user.email}</div>
                            </div>
                        </div>
                    </td>
                    <td style="vertical-align: middle;">${department}</td>
                    <td style="vertical-align: middle;" class="text-main">${roleStr}</td>
                    <td style="vertical-align: middle;" class="text-muted">${dateStr}</td>

                `;
                recentHiringsTbody.appendChild(tr);
            });
        }

    } catch (err) {
        console.error("Error fetching dashboard data:", err);
    }
}
