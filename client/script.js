document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, starting authentication check...');

    // -- Authentication Check --
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.endsWith('login.html') || currentPath.endsWith('signup.html');
    console.log('📍 Current path:', currentPath);
    console.log('🔐 Is auth page?', isAuthPage);

  const token = getAuthToken();
  console.log('🎫 Token present?', !!token);

    if (!token && !isAuthPage) {
        console.log('❌ No token and not auth page, redirecting to login...');
        // Not logged in and trying to access a protected page
    redirectToLoginPage();
        return; // Stop execution
    }

    if (token && isAuthPage) {
        console.log('✅ Has token but on auth page, redirecting to dashboard...');
        // Logged in but trying to access login/signup
        window.location.href = '../dashboard.html';
        return;
    }

    // -- Update Profile DOM Method --
    function updateProfileDOM(userData) {
      const userNameEls = document.querySelectorAll(".user-info .name");
      const userDeptEls = document.querySelectorAll(".user-info .dept");
      const userAvatarEls = document.querySelectorAll(".user-profile .avatar");

      userNameEls.forEach((el) => {
        el.textContent = userData.name || "User";
      });

      userDeptEls.forEach((el) => {
        const normalized = normalizeDeptSubDept(
          userData.department,
          userData.subDepartment,
        );
        const dept = normalized.department;
        const sub = normalized.subDepartment;
        el.textContent = `${dept} - ${sub}`;
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
        const nextEl = profileEl.nextElementSibling;
        const hasAdjacentLogout =
          !!nextEl && nextEl.classList.contains("logout-btn");

        if (!hasAdjacentLogout) {
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
      clearAuthState();
      redirectToLoginPage();
    }

    // -- Role-Based Access Control --
    function applyRoleBasedAccess(userData) {
        const isAdmin = isAdminRole(userData);

        document.body.classList.remove(
          "role-pending",
          "role-admin",
          "role-employee",
        );
        document.body.classList.add(isAdmin ? "role-admin" : "role-employee");

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
      return false;
        }

    return true;
    }

    // -- Initialize page content based on verified role from API --
    function initPageContent(verifiedUser) {
        updateProfileDOM(verifiedUser);
    if (!applyRoleBasedAccess(verifiedUser)) {
      return;
    }

    const isAdmin = isAdminRole(verifiedUser);

        if (page === 'emp.html') {
            fetchAndDisplayUsers();
          setupSalaryAssignmentPanel();
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

        if (page === 'salary.html') {
            initSalaryPage();
        }
    }

    async function fetchCurrentUser(authToken) {
        try {
        const res = await apiFetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${authToken}` },
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
        if (
          !document.body.classList.contains("role-admin") &&
          !document.body.classList.contains("role-employee")
        ) {
          clearAuthState();
          redirectToLoginPage();
        }
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

    if (token && !isAuthPage) {
        console.log('🔐 Token found, initializing authenticated page...');
        console.log('📄 Current page:', page);

        const userData = getStoredUser();
        console.log('👤 User data:', userData);

        if (userData) {
            console.log('✅ User data found, applying profile and restrictions...');
            updateProfileDOM(userData);
            applyRoleBasedAccess(userData);

            // Initialize page content immediately
            if (page === 'dashboard.html' || page === 'index.html' || page === '') {
                console.log('🎯 Loading dashboard...', isAdminRole(userData) ? 'Admin' : 'Employee');
                if (isAdminRole(userData)) {
                    console.log('📊 Calling fetchDashboardData()');
                    fetchDashboardData();
                } else {
                    console.log('👨‍💼 Calling fetchEmployeeDashboardData()');
                    fetchEmployeeDashboardData();
                }
            }
        } else {
            console.warn('⚠️ No user data found in localStorage');
        }
        // Then fetch fresh user data
        console.log('🔄 Fetching fresh user data...');
        fetchCurrentUser(token);
    }
});

let allEmployeesData = []; // Store globally for client-side search
let filteredEmployeesData = [];
let employeeCurrentPage = 1;
const EMPLOYEE_PAGE_SIZE = 5;
let selectedCalDates = new Set(); // Dates selected on employee attendance calendar
const LOCAL_BACKEND_PORT = "5001";
const API_BASE_URL = resolveApiBaseUrl();
const DEPARTMENT_MAP = {
  "Sophia Academy": ["Teaching Staff", "Non-Teaching Staff"],
  "Global Online College": ["Sales Team", "Marketing Team"],
};

function normalizeBaseUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "");
}

function resolveApiBaseUrl() {
  if (
    typeof window !== "undefined" &&
    window.location?.hostname &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    // Keep the same hostname in local development to avoid localhost/127.0.0.1 CORS mismatches.
    return `http://${window.location.hostname}:${LOCAL_BACKEND_PORT}`;
  }

  const fromWindow =
    typeof window !== "undefined" &&
    typeof window.__HRMS_API_BASE_URL === "string"
      ? window.__HRMS_API_BASE_URL
      : "";

  let fromStorage = "";
  try {
    fromStorage =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("hrmsApiBaseUrl") || ""
        : "";
  } catch {
    fromStorage = "";
  }

  const fromMeta =
    typeof document !== "undefined"
      ? document
          .querySelector('meta[name="hrms-api-base"]')
          ?.getAttribute("content") || ""
      : "";

  const configured = normalizeBaseUrl(fromWindow || fromStorage || fromMeta);
  if (configured) {
    if (
      typeof window !== "undefined" &&
      window.location?.hostname &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1")
    ) {
      try {
        const parsed = new URL(configured);
        const isLocalConfigured =
          parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
        if (isLocalConfigured && parsed.port !== LOCAL_BACKEND_PORT) {
          return `http://${window.location.hostname}:${LOCAL_BACKEND_PORT}`;
        }
      } catch {
        // Keep configured value when it is not a parseable absolute URL.
      }
    }
    return configured;
  }

  if (typeof window !== "undefined" && window.location?.protocol === "file:") {
    return `http://localhost:${LOCAL_BACKEND_PORT}`;
  }

  // For local dev servers, keep the same hostname to avoid localhost/127.0.0.1 CORS mismatches.
  if (
    typeof window !== "undefined" &&
    window.location?.hostname &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return `http://${window.location.hostname}:${LOCAL_BACKEND_PORT}`;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeBaseUrl(window.location.origin);
  }

  return `http://localhost:${LOCAL_BACKEND_PORT}`;
}

function getAuthToken() {
  return localStorage.getItem("token") || "";
}

function getStoredUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

function clearAuthState() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function redirectToLoginPage() {
  const currentPath = window.location.pathname;
  window.location.href = currentPath.includes("/login/")
    ? "login.html"
    : "login/login.html";
}

function isAdminRole(userData) {
  return !!userData && String(userData.role || "").toLowerCase() === "admin";
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthState();
    redirectToLoginPage();
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (response.status === 403) {
    throw new Error("You do not have access to this resource.");
  }

  return response;
}

function getRecordId(entity) {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return String(entity.id || entity._id || "");
}

function normalizeDeptSubDept(department, subDepartment) {
  const deptRaw = String(department || "").trim();
  const normalizedDept = DEPARTMENT_MAP[deptRaw] ? deptRaw : "Sophia Academy";
  const validSubDepartments = DEPARTMENT_MAP[normalizedDept];

  const subRaw = String(subDepartment || "").trim();
  const normalizedSubDept = validSubDepartments.includes(subRaw)
    ? subRaw
    : validSubDepartments[0];

  return {
    department: normalizedDept,
    subDepartment: normalizedSubDept,
  };
}

function isSameUserRecord(recordUser, currentUser) {
  if (!recordUser || !currentUser) return false;

  const recordId = getRecordId(recordUser);
  const currentId = getRecordId(currentUser);
  if (recordId && currentId) {
    return recordId === currentId;
  }

  const recordEmail =
    typeof recordUser.email === "string" ? recordUser.email.toLowerCase() : "";
  const currentEmail =
    typeof currentUser.email === "string"
      ? currentUser.email.toLowerCase()
      : "";
  return !!recordEmail && recordEmail === currentEmail;
}

function toDateKey(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const datePrefixMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (datePrefixMatch) {
      return datePrefixMatch[1];
    }
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Calendar initialization for employee dashboard
function initializeEmployeeCalendar(year, month, attendanceMap, myLeaves) {
    const calendarGrid = document.getElementById('empCalendarGrid');
    if (!calendarGrid) return;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    // Update month label
    const monthLabel = document.getElementById('calMonthLabel');
    if (monthLabel) {
        monthLabel.textContent = new Date(year, month).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    }

    let calendarHTML = '';

    // Days of the week headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        calendarHTML += `<div style="font-size:12px;font-weight:700;padding:8px 4px;color:var(--text-muted);text-align:center;">${day}</div>`;
    });

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarHTML += '<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--bg-muted);border-radius:8px;"></div>';
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = toDateKey(date);
        const isToday = date.toDateString() === new Date().toDateString();

        let dayStyle = 'aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;';
        let dayContent = day;
        let bgColor = 'var(--bg)';

        // Check attendance status
        const attendanceStatus = attendanceMap[dateKey];
        if (attendanceStatus) {
            switch (attendanceStatus) {
                case 'present':
                case 'late':
                    bgColor = 'var(--success)';
                    dayStyle += 'color:white;';
                    break;
                case 'absent':
                    bgColor = 'rgba(239,68,68,0.3)';
                    dayStyle += 'color:var(--danger);';
                    break;
                case 'half-day':
                    bgColor = 'rgba(79, 70, 229, 0.18)';
                    dayStyle += 'border:1.5px dashed var(--primary);color:var(--primary);';
                    break;
                case 'leave-approved':
                    bgColor = 'var(--warning)';
                    dayStyle += 'color:white;';
                    break;
                case 'leave-pending':
                    bgColor = 'rgba(245, 158, 11, 0.18)';
                    dayStyle += 'border:1.5px dashed var(--warning);color:var(--warning);';
                    break;
            }
        }

        if (isToday) {
            dayStyle += 'box-shadow: 0 0 0 2px var(--primary);';
        }

        if (date.getDay() === 0) {
            bgColor = 'var(--border)';
            dayStyle += 'color:var(--text-muted);';
        }

        dayStyle += `background:${bgColor};`;

        calendarHTML += `<div style="${dayStyle}" data-date="${dateKey}">${dayContent}</div>`;
    }

    calendarGrid.innerHTML = calendarHTML;

    // Add click handlers for calendar navigation if they don't exist
    const prevBtn = document.getElementById('calPrevMonth');
    const nextBtn = document.getElementById('calNextMonth');

    if (prevBtn && !prevBtn.hasAttribute('data-handler-added')) {
        prevBtn.addEventListener('click', () => {
            const newMonth = month === 0 ? 11 : month - 1;
            const newYear = month === 0 ? year - 1 : year;
            // Refresh dashboard with new month
            fetchEmployeeDashboardData();
        });
        prevBtn.setAttribute('data-handler-added', 'true');
    }

    if (nextBtn && !nextBtn.hasAttribute('data-handler-added')) {
        nextBtn.addEventListener('click', () => {
            const newMonth = month === 11 ? 0 : month + 1;
            const newYear = month === 11 ? year + 1 : year;
            // Refresh dashboard with new month
            fetchEmployeeDashboardData();
        });
        nextBtn.setAttribute('data-handler-added', 'true');
    }
  }

function getTodayDateKey() {
  return toDateKey(new Date());
}

function getAttendanceDayCredit(status) {
  const normalizedStatus = String(status || "").toLowerCase();
  if (normalizedStatus === "present" || normalizedStatus === "late") return 1;
  if (normalizedStatus === "half-day") return 0.5;
  return 0;
}

function formatDashboardDayValue(value) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "");
}

async function fetchAndDisplayUsers() {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;

    try {
    const response = await apiFetch("/api/users");
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const users = await response.json();
        allEmployeesData = users; // Cache for the search bar

        employeeCurrentPage = 1;
        renderUsersTable(allEmployeesData);
        setupEmployeeSearch(); // Initialize search listener *after* data is loaded
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-danger">Failed to load employees.</td></tr>';
    }
}

function renderUsersTable(usersToRender) {
  const tbody = document.getElementById("employeeTableBody");
  if (!tbody) return;

  filteredEmployeesData = Array.isArray(usersToRender) ? usersToRender : [];

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployeesData.length / EMPLOYEE_PAGE_SIZE),
  );
  if (employeeCurrentPage > totalPages) {
    employeeCurrentPage = totalPages;
  }
  if (employeeCurrentPage < 1) {
    employeeCurrentPage = 1;
  }

  renderEmployeePage();
  renderEmployeePagination();
} // End renderUsersTable

function renderEmployeePage() {
  const tbody = document.getElementById("employeeTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!filteredEmployeesData.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">No employees found.</td></tr>';
    const countText = document.getElementById("employeeCountText");
    if (countText) countText.textContent = "Showing 0 to 0 of 0 entries";
    return;
  }

  const startIndex = (employeeCurrentPage - 1) * EMPLOYEE_PAGE_SIZE;
  const endIndex = startIndex + EMPLOYEE_PAGE_SIZE;
  const pageRows = filteredEmployeesData.slice(startIndex, endIndex);

  const colors = [
    { bg: "rgba(79, 70, 229, 0.1)", text: "var(--primary)" },
    { bg: "rgba(16, 185, 129, 0.1)", text: "var(--success)" },
    { bg: "rgba(245, 158, 11, 0.1)", text: "var(--warning)" },
    { bg: "rgba(239, 68, 68, 0.1)", text: "var(--danger)" },
  ];

  pageRows.forEach((user, index) => {
    const userId = getRecordId(user);
    const initials = user.name ? user.name.substring(0, 2).toUpperCase() : "U";
    const colorTheme = colors[(startIndex + index) % colors.length];

    const rawDate = user.joinDate || user.createdAt;
    const joinDate = rawDate
      ? new Date(rawDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        })
      : "N/A";

    const { department, subDepartment } = normalizeDeptSubDept(
      user.department,
      user.subDepartment,
    );
    const status = user.status || "Active";
    let badgeClass = "success";
    if (status.toLowerCase().includes("leave")) badgeClass = "warning";
    else if (status.toLowerCase().includes("onboarding"))
      badgeClass = "primary";
    else if (status.toLowerCase().includes("inactive")) badgeClass = "danger";

    const tr = document.createElement("tr");
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
      <td style="vertical-align: middle;">${subDepartment}</td>
      <td style="vertical-align: middle;" class="text-muted">${joinDate}</td>
      <td style="vertical-align: middle;"><span class="badge badge-${badgeClass}">${status}</span></td>

    `;
    // Actions column (admin-only)
    const actionsCell = document.createElement("td");
    actionsCell.style.verticalAlign = "middle";
    actionsCell.className = "admin-only";
    if (userId) {
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-outline";
      editBtn.style.cssText = "padding: 4px 10px; font-size: 12px;";
      editBtn.innerHTML = '<i class="ph ph-pencil"></i> Edit';
      editBtn.addEventListener("click", () => {
        openEditEmployeeModal(
          userId,
          department,
          subDepartment,
          status,
          user.email,
        );
      });
      actionsCell.appendChild(editBtn);
    } else {
      actionsCell.innerHTML =
        '<span class="text-muted" style="font-size: 12px;">Missing ID</span>';
    }
    tr.appendChild(actionsCell);
    tbody.appendChild(tr);
  });

  const countText = document.getElementById("employeeCountText");
  if (countText) {
    const from = startIndex + 1;
    const to = startIndex + pageRows.length;
    countText.textContent = `Showing ${from} to ${to} of ${filteredEmployeesData.length} entries`;
  }
}

function renderEmployeePagination() {
  const prevBtn = document.getElementById("employeePrevPageBtn");
  const nextBtn = document.getElementById("employeeNextPageBtn");
  const pageWrap = document.getElementById("employeePageNumberWrap");
  if (!prevBtn || !nextBtn || !pageWrap) return;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployeesData.length / EMPLOYEE_PAGE_SIZE),
  );

  prevBtn.disabled =
    employeeCurrentPage <= 1 || filteredEmployeesData.length === 0;
  nextBtn.disabled =
    employeeCurrentPage >= totalPages || filteredEmployeesData.length === 0;

  if (!prevBtn.dataset.pageBound) {
    prevBtn.addEventListener("click", () => {
      if (employeeCurrentPage <= 1) return;
      employeeCurrentPage -= 1;
      renderEmployeePage();
      renderEmployeePagination();
    });
    prevBtn.dataset.pageBound = "true";
  }

  if (!nextBtn.dataset.pageBound) {
    nextBtn.addEventListener("click", () => {
      if (employeeCurrentPage >= totalPages) return;
      employeeCurrentPage += 1;
      renderEmployeePage();
      renderEmployeePagination();
    });
    nextBtn.dataset.pageBound = "true";
  }

  pageWrap.innerHTML = "";
  if (!filteredEmployeesData.length) return;

  const createPageButton = (pageNumber) => {
    const btn = document.createElement("button");
    const isActive = pageNumber === employeeCurrentPage;
    btn.type = "button";
    btn.className = isActive ? "btn btn-primary" : "btn btn-outline";
    btn.style.cssText = "padding: 6px 12px; font-size: 13px;";
    btn.textContent = String(pageNumber);
    btn.addEventListener("click", () => {
      if (employeeCurrentPage === pageNumber) return;
      employeeCurrentPage = pageNumber;
      renderEmployeePage();
      renderEmployeePagination();
    });
    pageWrap.appendChild(btn);
  };

  const pageSet = new Set([
    1,
    totalPages,
    employeeCurrentPage - 1,
    employeeCurrentPage,
    employeeCurrentPage + 1,
  ]);
  const pagesToRender = [...pageSet]
    .filter((pageNum) => pageNum >= 1 && pageNum <= totalPages)
    .sort((a, b) => a - b);

  pagesToRender.forEach((pageNum, index) => {
    if (index > 0 && pageNum - pagesToRender[index - 1] > 1) {
      const spacer = document.createElement("span");
      spacer.style.cssText =
        "display:flex;align-items:center;padding:0 4px;color:var(--text-muted);";
      spacer.textContent = "...";
      pageWrap.appendChild(spacer);
    }
    createPageButton(pageNum);
  });
}

function setupEmployeeSearch() {
    const searchInput = document.getElementById('employeeSearchInput');
    const deptFilter = document.getElementById('empDeptFilter');
    const statusFilter = document.getElementById('empStatusFilter');

    const elements = [searchInput, deptFilter, statusFilter];

    elements.forEach(el => {
        if (!el) return;
      if (!el.dataset.employeeFilterBound) {
        el.addEventListener("input", runEmployeeFilter);
        el.addEventListener("change", runEmployeeFilter);
        el.dataset.employeeFilterBound = "true";
      }
    });

    function runEmployeeFilter() {
        if (!allEmployeesData) return;

        const term = (searchInput ? searchInput.value.toLowerCase().trim() : '');
        const dept = (deptFilter ? deptFilter.value.toLowerCase() : '');
        const status = (statusFilter ? statusFilter.value.toLowerCase() : '');

        const filtered = allEmployeesData.filter(user => {
            const nameMatch = user.name && user.name.toLowerCase().includes(term);
            const emailMatch = user.email && user.email.toLowerCase().includes(term);
            const deptTermMatch =
              (user.department &&
                user.department.toLowerCase().includes(term)) ||
              (user.subDepartment &&
                user.subDepartment.toLowerCase().includes(term));
            const textMatch =
              term === "" ? true : nameMatch || emailMatch || deptTermMatch;

            const normalized = normalizeDeptSubDept(
              user.department,
              user.subDepartment,
            );
            const userDept = normalized.department.toLowerCase();
            const userSubDept = normalized.subDepartment.toLowerCase();
            const deptMatch =
              dept === ""
                ? true
                : userDept.includes(dept) || userSubDept.includes(dept);

            const userStatus = (user.status || 'active').toLowerCase().replace(/\s+/g, '');
            const statusMatch = status === '' ? true : userStatus.includes(status.replace(/\s+/g, ''));

            return textMatch && deptMatch && statusMatch;
        });

        employeeCurrentPage = 1;
        renderUsersTable(filtered);
    }
}


// --- Attendance Logic ────────────────────────────────────────────────────────
let allAttendanceData = [];
let filteredAttendanceData = [];
let attendanceVisibleCount = 0;
const ATTENDANCE_LOAD_STEP = 10;

async function fetchAndDisplayAttendance() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    try {
        const [usersResponse, attendanceResponse] = await Promise.all([
          apiFetch("/api/users"),
          apiFetch("/api/attendance"),
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

        const todayStr = getTodayDateKey();

        records.forEach(r => {
          const recDateStr = toDateKey(r.date);
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
        const presentTodayCount = presentCount + lateCount;

        if (elTotal) elTotal.textContent = users.length;
        if (elPresent) elPresent.textContent = presentTodayCount;
        if (elAbsent) elAbsent.textContent = absentCount;
        if (elLate) elLate.textContent = lateCount;

        // Set today's date as default for the filter and modal date inputs
        const dateFilterEl = document.getElementById('attDateFilter');
        const modalDateEl = document.getElementById('attDate');
        if (dateFilterEl && !dateFilterEl.value) dateFilterEl.value = todayStr;
        if (modalDateEl && !modalDateEl.value) modalDateEl.value = todayStr;

        renderAttendanceTable(allAttendanceData);
        setupAttendanceSearch();
        setupAttendanceLoadMore();

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
  const tbody = document.getElementById("attendanceTableBody");
  if (!tbody) return;

  filteredAttendanceData = Array.isArray(recordsToRender)
    ? recordsToRender
    : [];
  attendanceVisibleCount = Math.min(
    ATTENDANCE_LOAD_STEP,
    filteredAttendanceData.length,
  );

  renderAttendanceRows();
  updateAttendanceLoadMoreButton();
}

function renderAttendanceRows() {
  const tbody = document.getElementById("attendanceTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (filteredAttendanceData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">No attendance records found.</td></tr>';
    return;
  }

  const colors = [
    { bg: "rgba(79, 70, 229, 0.1)", text: "var(--primary)" },
    { bg: "rgba(16, 185, 129, 0.1)", text: "var(--success)" },
    { bg: "rgba(245, 158, 11, 0.1)", text: "var(--warning)" },
    { bg: "rgba(239, 68, 68, 0.1)", text: "var(--danger)" },
  ];

  const recordsForDisplay = filteredAttendanceData.slice(
    0,
    attendanceVisibleCount,
  );

  recordsForDisplay.forEach((record, index) => {
    const user = record.employeeId;
    if (!user) return; // defensive

    const initials = user.name ? user.name.substring(0, 2).toUpperCase() : "U";
    const colorTheme = colors[index % colors.length];
    const displayDate = new Date(record.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

    let badgeClass = "success";
    if (record.status.toLowerCase() === "absent") badgeClass = "danger";
    else if (record.status.toLowerCase() === "late") badgeClass = "warning";
    else if (record.status.toLowerCase() === "half-day") badgeClass = "primary";
    const statusStr =
      record.status.charAt(0).toUpperCase() + record.status.slice(1);

    const checkInHtml =
      record.checkIn === "--:--"
        ? `<span class="text-muted">--:--</span>`
        : `<span class="${record.status === "late" ? "text-warning" : ""} fw-semibold">${record.checkIn}</span>`;

    const normalizedDept = normalizeDeptSubDept(
      user.department,
      user.subDepartment,
    );
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>
                <div class="d-flex align-center gap-3">
                    <div class="avatar" style="width: 36px; height: 36px; font-size: 13px; background-color: ${colorTheme.bg}; color: ${colorTheme.text};">
                        ${initials}
                    </div>
                    <div>
                        <div class="fw-semibold text-main">${user.name}</div>
                      <div class="text-muted" style="font-size: 12px;">${normalizedDept.department} - ${normalizedDept.subDepartment}</div>
                    </div>
                </div>
            </td>
            <td style="vertical-align: middle;">${displayDate}</td>
            <td style="vertical-align: middle;">${checkInHtml}</td>
            <td style="vertical-align: middle; ${record.checkOut === "--:--" ? "color: var(--text-muted);" : ""}">${record.checkOut}</td>
            <td style="vertical-align: middle;"><span class="badge badge-${badgeClass}">${statusStr}</span></td>
            <td style="vertical-align: middle;" class="text-muted">${record.notes || "-"}</td>
        `;
    tbody.appendChild(tr);
  });
}

    function updateAttendanceLoadMoreButton() {
      const loadMoreBtn = document.getElementById("attendanceLoadMoreBtn");
      if (!loadMoreBtn) return;

      const totalCount = filteredAttendanceData.length;
      const remaining = totalCount - attendanceVisibleCount;

      if (totalCount === 0 || remaining <= 0) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent =
          totalCount === 0 ? "No Records" : "All Records Loaded";
        return;
      }

      loadMoreBtn.disabled = false;
      const nextBatch = Math.min(ATTENDANCE_LOAD_STEP, remaining);
      loadMoreBtn.textContent = `Load ${nextBatch} More Record${nextBatch === 1 ? "" : "s"}`;
    }

    function setupAttendanceLoadMore() {
      const loadMoreBtn = document.getElementById("attendanceLoadMoreBtn");
      if (!loadMoreBtn || loadMoreBtn.dataset.bound) return;

      loadMoreBtn.addEventListener("click", () => {
        if (attendanceVisibleCount >= filteredAttendanceData.length) return;
        attendanceVisibleCount = Math.min(
          filteredAttendanceData.length,
          attendanceVisibleCount + ATTENDANCE_LOAD_STEP,
        );
        renderAttendanceRows();
        updateAttendanceLoadMoreButton();
      });

      loadMoreBtn.dataset.bound = "true";
    }

function setupAttendanceSearch() {
    const dateFilter = document.getElementById('attDateFilter');
    const searchInput = document.getElementById('attSearchFilter');

    const elements = [dateFilter, searchInput];

    elements.forEach(el => {
        if (!el) return;
      if (!el.dataset.attFilterBound) {
        el.addEventListener("input", runAttFilter);
        el.addEventListener("change", runAttFilter);
        el.dataset.attFilterBound = "true";
      }
    });

    function runAttFilter() {
        if (!allAttendanceData) return;

        const dateVal = dateFilter ? dateFilter.value : '';
        const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = allAttendanceData.filter(record => {
            // Normalize: record.date may be "2026-03-10T00:00:00.000Z" or "2026-03-10"
            const recordDateStr = toDateKey(record.date);
            const dateMatch = dateVal === '' ? true : recordDateStr === dateVal;

            const user = record.employeeId || {};
            const nameMatch = user.name && user.name.toLowerCase().includes(term);
            const deptMatch =
              (user.department &&
                user.department.toLowerCase().includes(term)) ||
              (user.subDepartment &&
                user.subDepartment.toLowerCase().includes(term));
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
    const response = await apiFetch("/api/users");
        if (!response.ok) return;

        const users = await response.json();
        dropdown.innerHTML = '<option value="" disabled selected>Search & Select Employee...</option>';

        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u._id;
          const normalized = normalizeDeptSubDept(
            u.department,
            u.subDepartment,
          );
          opt.textContent = `${u.name} - ${normalized.department} / ${normalized.subDepartment}`;
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
      const response = await apiFetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        const response = await apiFetch("/api/leaves");
        if (!response.ok) throw new Error('Failed to fetch leave records');

        const leaves = await response.json();

        allLeavesData = leaves;

        // Update Stats
        let pending = 0;
        let approvedThisMonth = 0;
        let onLeaveToday = 0;
        let approvedPreviousMonth = 0;
        const onLeaveTodayByType = {};

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const previousMonth = previousMonthDate.getMonth();
        const previousMonthYear = previousMonthDate.getFullYear();

        // Strip out time matching for "today"
        const todayStr = getTodayDateKey();

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
            if (
              sDate.getMonth() === previousMonth &&
              sDate.getFullYear() === previousMonthYear
            ) {
              approvedPreviousMonth++;
            }
            if (todayStr >= l.startDate && todayStr <= l.endDate) {
              onLeaveToday++;
              const leaveType = String(l.type || "other").toLowerCase();
              onLeaveTodayByType[leaveType] =
                (onLeaveTodayByType[leaveType] || 0) + 1;
            }
          }
        });

        const pendingEl = document.getElementById('pendingRequestsCount');
        const todayEl = document.getElementById('onLeaveTodayCount');
        const approvedEl = document.getElementById('approvedThisMonthCount');

        if (pendingEl) pendingEl.textContent = pending;
        if (todayEl) todayEl.textContent = onLeaveToday;
        if (approvedEl) approvedEl.textContent = approvedThisMonth;

        const todaySupportEl = document.getElementById(
          "onLeaveTodaySupportingText",
        );
        if (todaySupportEl) {
          const typeLabels = {
            annual: "Annual",
            sick: "Sick",
            unpaid: "Unpaid",
            maternity: "Maternity/Paternity",
            other: "Other",
          };
          const sortedTypes = Object.entries(onLeaveTodayByType).sort(
            (a, b) => b[1] - a[1],
          );

          if (!sortedTypes.length) {
            todaySupportEl.textContent = "No approved leaves active today";
          } else {
            todaySupportEl.textContent = sortedTypes
              .map(
                ([type, count]) => `${typeLabels[type] || "Other"}: ${count}`,
              )
              .join(", ");
          }
        }

        const approvedSupportEl = document.getElementById(
          "approvedThisMonthSupportingText",
        );
        if (approvedSupportEl) {
          if (approvedPreviousMonth === 0) {
            if (approvedThisMonth === 0) {
              approvedSupportEl.textContent =
                "No approvals this month or last month";
            } else {
              approvedSupportEl.textContent = `${approvedThisMonth} approved this month (last month: 0)`;
            }
          } else {
            const diff = approvedThisMonth - approvedPreviousMonth;
            const percent = Math.round(
              (Math.abs(diff) / approvedPreviousMonth) * 100,
            );
            const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
            approvedSupportEl.textContent = `${sign}${percent}% from last month (${approvedPreviousMonth})`;
          }
        }

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
        const currentUser = getStoredUser();
        const currentUserIsAdmin = isAdminRole(currentUser);

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

        const normalizedDept = normalizeDeptSubDept(
          user.department,
          user.subDepartment,
        );
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-center gap-3">
                    <div class="avatar" style="width: 36px; height: 36px; font-size: 13px; background-color: ${colorTheme.bg}; color: ${colorTheme.text};">
                        ${initials}
                    </div>
                    <div>
                        <div class="fw-semibold text-main">${user.name}</div>
                      <div class="text-muted" style="font-size: 12px;">${normalizedDept.department} - ${normalizedDept.subDepartment}</div>
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
            <td style="vertical-align: middle;" class="fw-semibold">${durationDays} Day${durationDays > 1 ? "s" : ""}</td>
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
  const reviewBtn = document.getElementById("reviewPendingRequestsBtn");
    let currentStatus = '';

    if (searchInput) {
    if (!searchInput.dataset.leaveFilterBound) {
      searchInput.addEventListener("input", runLeaveFilter);
      searchInput.dataset.leaveFilterBound = "true";
    }
    }

  function setActiveStatus(status) {
    currentStatus = status || "";
    statusLinks.forEach((link) => {
      const linkStatus = link.getAttribute("data-status") || "";
      const isActive = linkStatus === currentStatus;
      link.style.borderColor = isActive ? "var(--primary)" : "transparent";
      link.style.color = isActive ? "var(--primary)" : "var(--text-main)";
    });
  }

    statusLinks.forEach((link) => {
      if (link.dataset.leaveFilterBound) return;
      link.addEventListener("click", () => {
        setActiveStatus(link.getAttribute("data-status"));
        runLeaveFilter();
      });
      link.dataset.leaveFilterBound = "true";
    });

  if (reviewBtn && !reviewBtn.dataset.leaveFilterBound) {
    reviewBtn.addEventListener("click", () => {
      setActiveStatus("pending");
      runLeaveFilter();
      const tableBody = document.getElementById("leaveTableBody");
      if (tableBody) {
        tableBody.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    reviewBtn.dataset.leaveFilterBound = "true";
  }

  setActiveStatus(currentStatus);

    function runLeaveFilter() {
        if (!allLeavesData) return;

        const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = allLeavesData.filter(record => {
            const user = record.employeeId || {};
            const nameMatch = user.name && user.name.toLowerCase().includes(term);
            const deptMatch =
              (user.department &&
                user.department.toLowerCase().includes(term)) ||
              (user.subDepartment &&
                user.subDepartment.toLowerCase().includes(term));
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
      const response = await apiFetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    const response = await apiFetch(`/api/leaves/${leaveId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

        if (response.ok) {
            fetchAndDisplayLeaves(); // Refresh the table automatically
        }
    } catch (err) {
        console.error("Failed to update status", err);
    }
}

// --- Employee Dashboard Logic ─────────────────────────────────────────────────
// ✨ This function has been moved to enhanced version at end of file
/* ORIGINAL EMPLOYEE DASHBOARD FUNCTION - DISABLED
async function fetchEmployeeDashboardData() {
  const user = getStoredUser();
    if (!user) return;

    // Greet by name
    const welcomeEl = document.getElementById('empWelcomeTitle');
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${user.name ? user.name.split(' ')[0] : 'there'}! 👋`;

    try {
      const [attRes, leavesRes] = await Promise.all([
        apiFetch("/api/attendance"),
        apiFetch("/api/leaves"),
      ]);

      const allAttendance = attRes.ok ? await attRes.json() : [];
      const allLeaves = leavesRes.ok ? await leavesRes.json() : [];

      // Filter for current user only
      const myAttendance = allAttendance.filter((attendance) =>
        isSameUserRecord(attendance.employeeId, user),
      );

      const myLeaves = allLeaves.filter((leave) =>
        isSameUserRecord(leave.employeeId, user),
      );

      // --- Stats ---
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const today = new Date(currentYear, currentMonth, now.getDate());
      const monthStart = new Date(currentYear, currentMonth, 1);

      const joinDate = user.joinDate ? new Date(user.joinDate) : null;
      const hasValidJoinDate = joinDate && !Number.isNaN(joinDate.getTime());
      const activeStartDate =
        hasValidJoinDate && joinDate > monthStart
          ? new Date(
              joinDate.getFullYear(),
              joinDate.getMonth(),
              joinDate.getDate(),
            )
          : monthStart;

      const myAttThisMonth = myAttendance.filter((a) => {
        const d = new Date(a.date);
        return (
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear &&
          d <= today
        );
      });

      const attendanceCreditByDate = new Map();
      myAttThisMonth.forEach((attendance) => {
        const dateKey = toDateKey(attendance.date);
        if (!dateKey) return;

        const credit = getAttendanceDayCredit(attendance.status);
        const existingCredit = attendanceCreditByDate.get(dateKey) || 0;
        if (credit > existingCredit) {
          attendanceCreditByDate.set(dateKey, credit);
        }
      });

      const approvedLeaveDates = new Set();
      myLeaves.forEach((leave) => {
        if (leave.status !== "approved") return;

        const rangeStart = new Date(leave.startDate);
        const rangeEnd = new Date(leave.endDate);
        if (
          Number.isNaN(rangeStart.getTime()) ||
          Number.isNaN(rangeEnd.getTime())
        )
          return;

        for (
          let date = new Date(
            rangeStart.getFullYear(),
            rangeStart.getMonth(),
            rangeStart.getDate(),
          );
          date <= rangeEnd && date <= today;
          date.setDate(date.getDate() + 1)
        ) {
          if (date < activeStartDate || date.getDay() === 0) continue;
          approvedLeaveDates.add(toDateKey(date));
        }
      });

      let presentDays = 0;
      let absentDays = 0;
      if (activeStartDate <= today) {
        for (
          let date = new Date(
            activeStartDate.getFullYear(),
            activeStartDate.getMonth(),
            activeStartDate.getDate(),
          );
          date <= today;
          date.setDate(date.getDate() + 1)
        ) {
          if (date.getDay() === 0) continue;

          const dateKey = toDateKey(date);
          const attendanceCredit = attendanceCreditByDate.get(dateKey) || 0;
          presentDays += attendanceCredit;

          if (approvedLeaveDates.has(dateKey)) continue;
          absentDays += Math.max(0, 1 - attendanceCredit);
        }
      }

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
      setEl("empDaysPresent", formatDashboardDayValue(presentDays));
      setEl("empDaysAbsent", formatDashboardDayValue(absentDays));
      setEl("empApprovedLeaves", approvedLeaves);
      setEl("empPendingLeaves", pendingLeaves);

      // ── Build attendance map: YYYY-MM-DD → status ──────────────────────────
      const attendanceMap = {};
      myAttendance.forEach((a) => {
        const dateKey = toDateKey(a.date);
        if (!dateKey) return;
        attendanceMap[dateKey] = a.status;
      });
      // Overlay leave ranges so the calendar reflects approval state.
      myLeaves.forEach((l) => {
        if (l.status !== "approved" && l.status !== "pending") return;
        for (
          let d = new Date(l.startDate);
          d <= new Date(l.endDate);
          d.setDate(d.getDate() + 1)
        ) {
          const dateKey = toDateKey(d);
          if (!dateKey) continue;
          if (l.status === "approved") {
            attendanceMap[dateKey] = "leave-approved";
          } else if (!attendanceMap[dateKey]) {
            attendanceMap[dateKey] = "leave-pending";
          }
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
        const todayStr = getTodayDateKey();

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
          } else if (status === "leave-approved") {
            bg = "var(--warning)";
            color = "#fff";
            title = "Approved Leave";
          } else if (status === "leave-pending") {
            bg = "rgba(245, 158, 11, 0.18)";
            color = "var(--warning)";
            border = "1.5px dashed var(--warning)";
            title = "Pending Leave Request";
          } else if (status === "present") {
            bg = "var(--success)";
            color = "#fff";
            title = "Present";
          } else if (status === "late") {
            bg = "var(--success)";
            color = "#fff";
            title = "Late / Present";
          } else if (status === "half-day") {
            bg = "rgba(79, 70, 229, 0.18)";
            color = "var(--primary)";
            border = "1.5px dashed var(--primary)";
            title = "Half Day";
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
                apiFetch("/api/attendance", {
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
                status === "leave-approved" ||
                status === "leave-pending" ||
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
*/ // END ORIGINAL FUNCTION - USE ENHANCED VERSION INSTEAD

// Enhanced dashboard to show leave summary
async function fetchEmployeeDashboardData() {
    console.log('🎯 fetchEmployeeDashboardData: Starting...');
    try {
    const [attendanceRes, leavesRes, leaveSummaryRes] = await Promise.all([
            apiFetch("/api/attendance"),
            apiFetch("/api/leaves"),
            apiFetch("/api/leaves/summary")
        ]);

        console.log('📡 API responses:', {
            attendance: attendanceRes.status,
            leaves: leavesRes.status,
            summary: leaveSummaryRes.status
        });

        // Check for API errors
        if (!attendanceRes.ok) {
            throw new Error(`Attendance API failed: ${attendanceRes.status} ${attendanceRes.statusText}`);
        }
        if (!leavesRes.ok) {
            throw new Error(`Leaves API failed: ${leavesRes.status} ${leavesRes.statusText}`);
        }
        if (!leaveSummaryRes.ok) {
            console.warn('⚠️ Leave summary API failed, using fallback');
        }

        const [allAttendance, allLeaves, leaveSummary] = await Promise.all([
            attendanceRes.json(),
            leavesRes.json(),
            leaveSummaryRes.ok ? leaveSummaryRes.json() : { currentMonthLeaves: { sickLeave: 1, annualLeave: 1 }, lopDetails: null }
        ]);

        console.log('📊 Dashboard data loaded:', {
            attendanceCount: allAttendance.length,
            leavesCount: allLeaves.length,
            leaveSummary
        });

        const user = getStoredUser();
        if (!user) return;

        // Greet by name
        const welcomeEl = document.getElementById('empWelcomeTitle');
        if (welcomeEl) welcomeEl.textContent = `Welcome back, ${user.name ? user.name.split(' ')[0] : 'there'}! 👋`;

        // Filter for current user only
        const myAttendance = allAttendance.filter((attendance) =>
            isSameUserRecord(attendance.employeeId, user),
        );

        const myLeaves = allLeaves.filter((leave) =>
            isSameUserRecord(leave.employeeId, user),
        );

        // --- Stats calculations ---
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const today = new Date(currentYear, currentMonth, now.getDate());
        const monthStart = new Date(currentYear, currentMonth, 1);

        const joinDate = user.joinDate ? new Date(user.joinDate) : null;
        const hasValidJoinDate = joinDate && !Number.isNaN(joinDate.getTime());
        const activeStartDate = hasValidJoinDate && joinDate > monthStart
            ? new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate())
            : monthStart;

        const myAttThisMonth = myAttendance.filter((a) => {
            const d = new Date(a.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d <= today;
        });

        const attendanceCreditByDate = new Map();
        myAttThisMonth.forEach((attendance) => {
            const dateKey = toDateKey(attendance.date);
            if (!dateKey) return;
            const credit = getAttendanceDayCredit(attendance.status);
            const existingCredit = attendanceCreditByDate.get(dateKey) || 0;
            if (credit > existingCredit) {
                attendanceCreditByDate.set(dateKey, credit);
            }
        });

        const approvedLeaveDates = new Set();
        myLeaves.forEach((leave) => {
            if (leave.status !== "approved") return;
            const rangeStart = new Date(leave.startDate);
            const rangeEnd = new Date(leave.endDate);
            if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) return;

            for (let date = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
                 date <= rangeEnd && date <= today;
                 date.setDate(date.getDate() + 1)) {
                if (date < activeStartDate || date.getDay() === 0) continue;
                approvedLeaveDates.add(toDateKey(date));
            }
        });

        let presentDays = 0;
        let absentDays = 0;
        if (activeStartDate <= today) {
            for (let date = new Date(activeStartDate.getFullYear(), activeStartDate.getMonth(), activeStartDate.getDate());
                 date <= today;
                 date.setDate(date.getDate() + 1)) {
                if (date.getDay() === 0) continue;
                const dateKey = toDateKey(date);
                const attendanceCredit = attendanceCreditByDate.get(dateKey) || 0;
                presentDays += attendanceCredit;
                if (approvedLeaveDates.has(dateKey)) continue;
                absentDays += Math.max(0, 1 - attendanceCredit);
            }
        }

        const approvedLeaves = myLeaves.filter((l) => l.status === "approved").length;
        const pendingLeaves = myLeaves.filter((l) => l.status === "pending").length;

        // Update stats display
        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        setEl("empDaysPresent", formatDashboardDayValue(presentDays));
        setEl("empDaysAbsent", formatDashboardDayValue(absentDays));
        setEl("empApprovedLeaves", approvedLeaves);
        setEl("empPendingLeaves", pendingLeaves);

        // Update enhanced leave balance display
        const leaveBalanceEl = document.getElementById('empLeaveBalance');
        if (leaveBalanceEl && leaveSummary.currentMonthLeaves) {
            const sickRemaining = Math.max(0, leaveSummary.currentMonthLeaves.sickLeave - (leaveSummary.lopCalculation?.sickDaysUsed || 0));
            const annualRemaining = Math.max(0, leaveSummary.currentMonthLeaves.annualLeave - (leaveSummary.lopCalculation?.annualDaysUsed || 0));

            leaveBalanceEl.innerHTML = `
                <div class="leave-balance-row">
                    <span>Sick Leave:</span>
                    <span>${sickRemaining}/${leaveSummary.currentMonthLeaves.sickLeave}</span>
                </div>
                <div class="leave-balance-row">
                    <span>Annual Leave:</span>
                    <span>${annualRemaining}/${leaveSummary.currentMonthLeaves.annualLeave}</span>
                </div>
                ${leaveSummary.lopDetails && leaveSummary.lopDetails.currentMonth > 0 ?
                  `<div class="leave-balance-row lop-warning">
                     <span>⚠️ LOP Days:</span>
                     <span>${leaveSummary.lopDetails.currentMonth}</span>
                   </div>` : ''}
            `;
        }

        // Add salary summary link
        const salaryLinkEl = document.getElementById('empSalaryLink');
        if (salaryLinkEl) {
            salaryLinkEl.innerHTML = `
                <a href="salary.html" style="color: var(--primary); text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                    <i class="ph ph-currency-dollar"></i>
                    View Salary Details
                </a>
            `;
        }

        // Build attendance map for calendar
        const attendanceMap = {};
        myAttendance.forEach((a) => {
            const dateKey = toDateKey(a.date);
            if (!dateKey) return;
            attendanceMap[dateKey] = a.status;
        });

        // Overlay leave ranges
        myLeaves.forEach((l) => {
            if (l.status !== "approved" && l.status !== "pending") return;
            for (let d = new Date(l.startDate); d <= new Date(l.endDate); d.setDate(d.getDate() + 1)) {
                const dateKey = toDateKey(d);
                if (!dateKey) continue;
                if (l.status === "approved") {
                    attendanceMap[dateKey] = "leave-approved";
                } else if (!attendanceMap[dateKey]) {
                    attendanceMap[dateKey] = "leave-pending";
                }
            }
        });

        // Initialize calendar
        initializeEmployeeCalendar(currentYear, currentMonth, attendanceMap, myLeaves);

        // Update recent leaves list
        const leavesList = document.getElementById("empLeavesList");
        if (leavesList) {
            const sorted = [...myLeaves]
                .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
                .slice(0, 3);
            if (sorted.length === 0) {
                leavesList.innerHTML = `<p class="text-muted" style="font-size:13px;" >No recent leaves. <a href="leave.html" style="color:var(--primary);">Apply now →</a></p>`;
            } else {
                leavesList.innerHTML = sorted.map((l) => {
                    const statusColor = l.status === "approved" ? "var(--success)" :
                                      l.status === "rejected" ? "var(--danger)" : "var(--warning)";
                    const statusBg = l.status === "approved" ? "var(--success-bg)" :
                                   l.status === "rejected" ? "var(--danger-bg)" : "var(--warning-bg)";
                    const dateStr = l.startDate === l.endDate ?
                        new Date(l.startDate).toLocaleDateString("en-US", { month: "short", day: "2-digit" }) :
                        `${new Date(l.startDate).toLocaleDateString("en-US", { month: "short", day: "2-digit" })} – ${new Date(l.endDate).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}`;

                    return `<div style="padding:8px 12px;background:var(--bg-elevated);border-radius:8px;border:1px solid var(--border);min-width:120px;">
                        <div style="font-weight:600;font-size:12px;margin-bottom:4px;">${l.type.charAt(0).toUpperCase() + l.type.slice(1)}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">${dateStr}</div>
                        <div style="font-size:10px;padding:2px 6px;border-radius:4px;background:${statusBg};color:${statusColor};font-weight:600;text-transform:uppercase;">${l.status}</div>
                    </div>`;
                }).join("");
            }
        }

    } catch (err) {
        console.error('❌ Enhanced employee dashboard error:', err);
        console.error('❌ Stack trace:', err.stack);

      // Prevent persistent "Loading..." placeholders on any failure.
      ["empDaysPresent", "empDaysAbsent", "empApprovedLeaves", "empPendingLeaves"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "0";
      });

      const leaveBalanceEl = document.getElementById('empLeaveBalance');
      if (leaveBalanceEl) {
        leaveBalanceEl.innerHTML = '<div class="text-muted" style="font-size:13px;">Unable to load leave balance right now.</div>';
      }

      const leavesList = document.getElementById('empLeavesList');
      if (leavesList) {
        leavesList.innerHTML = '<p class="text-muted" style="font-size:13px;">Unable to load recent leaves.</p>';
      }
    }
}

// ── Quick Leave Modal (employee dashboard) ─────────────────────────────────────
function openQuickLeaveModal(datesSet) {
  const user = getStoredUser();
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
      const res = await apiFetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, type, startDate, endDate, reason }),
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

// ── Leave page access setup ─────────────────────────────────────────────────────
function setupLeaveFormForRole(user) {
  const isAdmin = isAdminRole(user);
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
        const deptEl = document.getElementById("leaveModalDept");
        const avatarEl = document.getElementById('leaveModalAvatar');
        if (nameEl)   nameEl.textContent   = user.name || 'You';
        if (deptEl) {
          const normalized = normalizeDeptSubDept(
            user.department,
            user.subDepartment,
          );
          deptEl.textContent = `${normalized.department} - ${normalized.subDepartment}`;
        }
        if (avatarEl) {
            const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'U';
            avatarEl.textContent = initials;
        }

    }
}

// --- Dashboard Logic ─────────────────────────────────────────────────────────
async function fetchDashboardData() {
    try {
        const [usersRes, attendanceRes, leavesRes] = await Promise.all([
          apiFetch("/api/users"),
          apiFetch("/api/attendance"),
          apiFetch("/api/leaves"),
        ]);

        if (!usersRes.ok || !attendanceRes.ok || !leavesRes.ok) {
            throw new Error('Failed to fetch one or more dashboard data sources');
        }

        const users = await usersRes.json();
        const attendance = await attendanceRes.json();
        const leaves = await leavesRes.json();

        // Total Employees
        const totalEmployeesCountEl = document.getElementById(
          "totalEmployeesCount",
        );
        if (totalEmployeesCountEl) {
          totalEmployeesCountEl.textContent = users.length;
        }

        const totalEmployeesDeltaEl = document.getElementById(
          "totalEmployeesDeltaText",
        );
        if (totalEmployeesDeltaEl) {
          const now = new Date();
          const currentMonthStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
          );
          const previousMonthStart = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1,
          );

          const hiresThisMonth = users.filter((u) => {
            const rawDate = u.joinDate || u.createdAt;
            if (!rawDate) return false;
            const d = new Date(rawDate);
            return d >= currentMonthStart;
          }).length;

          const hiresLastMonth = users.filter((u) => {
            const rawDate = u.joinDate || u.createdAt;
            if (!rawDate) return false;
            const d = new Date(rawDate);
            return d >= previousMonthStart && d < currentMonthStart;
          }).length;

          const delta = hiresThisMonth - hiresLastMonth;
          let deltaClass = "text-muted";
          if (delta > 0) deltaClass = "text-success fw-semibold";
          if (delta < 0) deltaClass = "text-danger fw-semibold";

          const deltaText =
            delta === 0
              ? "No change vs last month"
              : `${delta > 0 ? "+" : ""}${delta} vs last month`;
          totalEmployeesDeltaEl.className = deltaClass;
          totalEmployeesDeltaEl.textContent = deltaText;
        }

        // Today's Attendance
        const todaysAttendanceCountEl = document.getElementById(
          "todaysAttendanceCount",
        );
        if (todaysAttendanceCountEl) {
          const todayStr = getTodayDateKey(); // YYYY-MM-DD
          const presentTodayCount = attendance.filter(
            (a) =>
              toDateKey(a.date) === todayStr &&
              ["present", "late", "half-day"].includes(a.status),
          ).length;

          // Format 118/124
          todaysAttendanceCountEl.innerHTML = `${presentTodayCount}<span style="font-size: 18px; color: var(--text-muted); font-weight: 500;">/${users.length}</span>`;

          const presenceRateEl = document.getElementById(
            "attendancePresenceRateText",
          );
          if (presenceRateEl) {
            const rate =
              users.length > 0
                ? Math.round((presentTodayCount / users.length) * 100)
                : 0;
            let rateClass = "text-success fw-semibold";
            if (rate < 80) rateClass = "text-warning fw-semibold";
            if (rate < 50) rateClass = "text-danger fw-semibold";
            presenceRateEl.className = rateClass;
            presenceRateEl.textContent = `${rate}% presence rate`;
          }
        }

        // Employees on Leave Today
        const employeesOnLeaveCountEl = document.getElementById(
          "employeesOnLeaveCount",
        );
        if (employeesOnLeaveCountEl) {
          const todayStr = getTodayDateKey();
          const onLeaveToday = leaves.filter(
            (l) =>
              l.status === "approved" &&
              todayStr >= l.startDate &&
              todayStr <= l.endDate,
          ).length;
            employeesOnLeaveCountEl.textContent = onLeaveToday;

          const pendingLeaves = leaves.filter(
            (l) => l.status === "pending",
          ).length;
          const pendingRequestsEl = document.getElementById(
            "pendingRequestsText",
          );
          if (pendingRequestsEl) {
            pendingRequestsEl.className =
              pendingLeaves === 0
                ? "text-success fw-semibold"
                : "text-danger fw-semibold";
            pendingRequestsEl.textContent = `${pendingLeaves} pending approval request${pendingLeaves === 1 ? "" : "s"}`;
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
              recentHiringsTbody.innerHTML =
                '<tr><td colspan="4" style="text-align: center; padding: 20px;" class="text-muted">No hirings found.</td></tr>';
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
                const { department, subDepartment } = normalizeDeptSubDept(
                  user.department,
                  user.subDepartment,
                );
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
                    <td style="vertical-align: middle;">${department} - ${subDepartment}</td>
                    <td style="vertical-align: middle;" class="text-muted">${dateStr}</td>

                `;
                recentHiringsTbody.appendChild(tr);
            });
        }

    } catch (err) {
        console.error("Error fetching dashboard data:", err);
    }
}

// ── Edit Employee Modal ───────────────────────────────────────────────────────
const SUB_DEPT_MAP = {
  "Sophia Academy": ["Teaching Staff", "Non-Teaching Staff"],
  "Global Online College": ["Sales Team", "Marketing Team"],
};

function openEditEmployeeModal(id, department, subDepartment, status, email) {
  const modal = document.getElementById("editEmployeeModal");
  if (!modal) return;

  document.getElementById("editEmpId").value = id;
  const normalized = normalizeDeptSubDept(department, subDepartment);
  const deptSelect = document.getElementById("editEmpDept");
  deptSelect.value = normalized.department;
  refreshSubDeptOptions(deptSelect.value, normalized.subDepartment);
  document.getElementById("editEmpStatus").value = status || "Active";

  const feedback = document.getElementById("editEmpFeedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "feedback hidden";
  }

  modal.dataset.employeeEmail = String(email || "").trim();

  modal.classList.add("active");
}

async function patchEmployeeById(id, payload) {
  const requestPath = `/api/users/${encodeURIComponent(String(id || "").trim())}`;
  return apiFetch(requestPath, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function resolveEmployeeIdByEmail(email) {
  if (!email) return "";
  const usersRes = await apiFetch("/api/users");
  if (!usersRes.ok) return "";

  const users = await usersRes.json().catch(() => []);
  const target = String(email).toLowerCase();
  const matched = Array.isArray(users)
    ? users.find((u) => String(u?.email || "").toLowerCase() === target)
    : null;

  return getRecordId(matched);
}

function refreshSubDeptOptions(dept, selected) {
  const subSelect = document.getElementById("editEmpSubDept");
  if (!subSelect) return;
  const options = SUB_DEPT_MAP[dept] || [];
  subSelect.innerHTML = options.map(o => `<option value="${o}"${o === selected ? " selected" : ""}>${o}</option>`).join("");
}

// Cascade sub-department when department changes inside the modal
document.addEventListener("DOMContentLoaded", () => {
  const deptSel = document.getElementById("editEmpDept");
  if (deptSel) {
    deptSel.addEventListener("change", () => refreshSubDeptOptions(deptSel.value, ""));
  }

  const saveBtn = document.getElementById("saveEditEmpBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveEmployeeChanges);
  }
});

async function saveEmployeeChanges() {
  const id = String(document.getElementById("editEmpId").value || "").trim();
  const normalized = normalizeDeptSubDept(
    document.getElementById("editEmpDept").value,
    document.getElementById("editEmpSubDept").value,
  );
  const department = normalized.department;
  const subDepartment = normalized.subDepartment;
  const status = document.getElementById("editEmpStatus").value;
  const feedback = document.getElementById("editEmpFeedback");
  const saveBtn = document.getElementById("saveEditEmpBtn");
  const modal = document.getElementById("editEmployeeModal");
  const modalEmail = modal?.dataset?.employeeEmail || "";

  if (!id) return;

  setLoading(saveBtn, true);
  try {
    const payload = { department, subDepartment, status };
    let res = await patchEmployeeById(id, payload);
    const data = await res.json().catch(() => ({}));

    if (!res.ok && res.status === 404 && modalEmail) {
      const resolvedId = await resolveEmployeeIdByEmail(modalEmail);
      if (resolvedId && resolvedId !== id) {
        document.getElementById("editEmpId").value = resolvedId;
        res = await patchEmployeeById(resolvedId, payload);
      }
    }

    if (!res.ok) {
      const finalData = await res.json().catch(() => data || {});
      feedback.textContent =
        finalData.message || `Failed to save changes. (${res.status})`;
      feedback.className = "feedback error";
      return;
    }

    document.getElementById("editEmployeeModal").classList.remove("active");
    await fetchAndDisplayUsers();
  } catch (error) {
    feedback.textContent =
      error && error.message ? error.message : "Cannot reach server.";
    feedback.className = "feedback error";
  } finally {
    setLoading(saveBtn, false);
  }
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner"></i> Saving...';
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
  }
}

function refreshSalarySubDeptOptions() {
  const deptEl = document.getElementById("salaryDept");
  const subDeptEl = document.getElementById("salarySubDept");
  if (!deptEl || !subDeptEl) return;

  const options = DEPARTMENT_MAP[deptEl.value] || [];
  subDeptEl.innerHTML = options
    .map((opt) => `<option value="${opt}">${opt}</option>`)
    .join("");
}

function populateSalaryUserDropdown() {
  const userSelect = document.getElementById("salaryUserId");
  if (!userSelect) return;

  const users = Array.isArray(allEmployeesData) ? allEmployeesData : [];
  const rows = users
    .map((u) => {
      const userId = getRecordId(u);
      const normalized = normalizeDeptSubDept(u.department, u.subDepartment);
      return `<option value="${userId}">${u.name} (${u.email}) - ${normalized.department} / ${normalized.subDepartment}</option>`;
    })
    .join("");

  userSelect.innerHTML = `<option value="">Select employee</option>${rows}`;
}

function toggleSalaryScopeFields() {
  const scopeEl = document.getElementById("salaryScopeType");
  const deptWrap = document.getElementById("salaryDeptWrap");
  const subDeptWrap = document.getElementById("salarySubDeptWrap");
  const userWrap = document.getElementById("salaryUserWrap");
  if (!scopeEl || !deptWrap || !subDeptWrap || !userWrap) return;

  const scope = scopeEl.value;
  const showDept = scope === "department" || scope === "subDepartment";
  const showSubDept = scope === "subDepartment";
  const showUser = scope === "individual";

  deptWrap.style.display = showDept ? "" : "none";
  subDeptWrap.style.display = showSubDept ? "" : "none";
  userWrap.style.display = showUser ? "" : "none";
}

async function submitSalaryAssignment() {
  const scopeType = document.getElementById("salaryScopeType")?.value;
  const department = document.getElementById("salaryDept")?.value;
  const subDepartment = document.getElementById("salarySubDept")?.value;
  const userId = document.getElementById("salaryUserId")?.value;

  const monthlySalary = Number(
    document.getElementById("salaryMonthly")?.value || 0,
  );
  const annualLeaveQuota = Number(
    document.getElementById("salaryAnnualLeave")?.value || 0,
  );
  const sickLeaveQuota = Number(
    document.getElementById("salarySickLeave")?.value || 0,
  );
  const lopQuota = Number(
    document.getElementById("salaryLopQuota")?.value || 0,
  );
  const lopDeductionPercent = Number(
    document.getElementById("salaryLopDeduction")?.value || 0,
  );

  const feedback = document.getElementById("salaryAssignFeedback");
  const btn = document.getElementById("assignSalaryBtn");
  if (!feedback || !btn) return;

  if (scopeType === "individual" && !userId) {
    feedback.textContent = "Please select an employee.";
    feedback.className = "feedback error";
    return;
  }

  if (
    monthlySalary < 0 ||
    annualLeaveQuota < 0 ||
    sickLeaveQuota < 0 ||
    lopQuota < 0 ||
    lopDeductionPercent < 0 ||
    lopDeductionPercent > 100
  ) {
    feedback.textContent =
      "Please enter valid values. Deduction must be between 0 and 100.";
    feedback.className = "feedback error";
    return;
  }

  const payload = {
    scopeType,
    department,
    subDepartment,
    userId,
    monthlySalary,
    annualLeaveQuota,
    sickLeaveQuota,
    lopQuota,
    lopDeductionPercent,
  };

  setLoading(btn, true);
  try {
    const res = await apiFetch("/api/salary/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      feedback.textContent =
        data.message || `Assignment failed. (${res.status})`;
      feedback.className = "feedback error";
      return;
    }

    feedback.textContent = `Assignment applied to ${data.modifiedCount || 0} user(s).`;
    feedback.className = "feedback success";
    await fetchAndDisplayUsers();
    populateSalaryUserDropdown();
  } catch (err) {
    feedback.textContent = err?.message || "Cannot reach server.";
    feedback.className = "feedback error";
  } finally {
    setLoading(btn, false);
  }
}

function setupSalaryAssignmentPanel() {
  const scopeEl = document.getElementById("salaryScopeType");
  const deptEl = document.getElementById("salaryDept");
  const btn = document.getElementById("assignSalaryBtn");
  if (!scopeEl || !deptEl || !btn) return;

  if (!scopeEl.dataset.bound) {
    scopeEl.addEventListener("change", toggleSalaryScopeFields);
    scopeEl.dataset.bound = "true";
  }

  if (!deptEl.dataset.bound) {
    deptEl.addEventListener("change", refreshSalarySubDeptOptions);
    deptEl.dataset.bound = "true";
  }

  if (!btn.dataset.bound) {
    btn.addEventListener("click", submitSalaryAssignment);
    btn.dataset.bound = "true";
  }

  refreshSalarySubDeptOptions();
  toggleSalaryScopeFields();
  populateSalaryUserDropdown();
}

// ── Enhanced Leave Management & Salary Features ─────────────────────────────

// Initialize salary page functionality
if (page === 'salary.html') {
    initSalaryPage();
}

async function initSalaryPage() {
    const currentDate = new Date();

    // Set current month and year as defaults
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    if (monthFilter) monthFilter.value = currentDate.getMonth() + 1;
    if (yearFilter) yearFilter.value = currentDate.getFullYear();

    // Populate employee dropdown for admin
    populateEmployeeDropdown('employeeFilter');
    populateEmployeeDropdown('updateUserId');

    // Add event listeners
    if (monthFilter) monthFilter.addEventListener('change', loadSalaryData);
    if (yearFilter) yearFilter.addEventListener('change', loadSalaryData);

    const employeeFilter = document.getElementById('employeeFilter');
    if (employeeFilter) employeeFilter.addEventListener('change', loadSalaryData);

    const generateSlipBtn = document.getElementById('generateSlipBtn');
    if (generateSlipBtn) generateSlipBtn.addEventListener('click', loadSalaryData);

    const salaryUpdateForm = document.getElementById('salaryUpdateForm');
    if (salaryUpdateForm) salaryUpdateForm.addEventListener('submit', handleSalaryUpdate);

    // Load initial data
    loadSalaryData();
}

async function loadSalaryData() {
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    const employeeFilter = document.getElementById('employeeFilter');

    const month = monthFilter ? monthFilter.value : new Date().getMonth() + 1;
    const year = yearFilter ? yearFilter.value : new Date().getFullYear();
    const userId = employeeFilter ? employeeFilter.value : '';

    try {
        const user = getStoredUser();
        const isAdmin = isAdminRole(user);
        const targetUserId = isAdmin && userId ? userId : user.id;

        // Fetch salary slip data
        const response = await apiFetch(`/api/salary/slip?userId=${targetUserId}&month=${month}&year=${year}`);

        if (!response.ok) {
            throw new Error('Failed to fetch salary data');
        }

        const salaryData = await response.json();
        displaySalaryData(salaryData);

        // Fetch leave summary
        const leaveResponse = await apiFetch(`/api/leaves/summary?userId=${targetUserId}`);
        if (leaveResponse.ok) {
            const leaveData = await leaveResponse.json();
            displayLeaveSummary(leaveData);
        }

    } catch (error) {
        console.error('Error loading salary data:', error);
        showNotification('error', 'Failed to load salary data: ' + error.message);
    }
}

function displaySalaryData(data) {
    // Update summary cards
    document.getElementById('grossSalary').textContent = `₹${data.salary.grossSalary.toLocaleString()}`;
    document.getElementById('totalDeductions').textContent = `₹${data.deductions.totalDeductions.toLocaleString()}`;
    document.getElementById('netSalary').textContent = `₹${data.netSalary.toLocaleString()}`;
    document.getElementById('lopDeduction').textContent = `₹${data.deductions.lopDeduction.toLocaleString()}`;

    // Update employee details
    document.getElementById('empName').textContent = data.employee.name;
    document.getElementById('empEmail').textContent = data.employee.email;
    document.getElementById('empDepartment').textContent = data.employee.department;
    document.getElementById('empSubDepartment').textContent = data.employee.subDepartment;

    // Update salary breakdown
    document.getElementById('basicSalaryAmount').textContent = `₹${data.salary.basicSalary.toLocaleString()}`;
    document.getElementById('allowancesAmount').textContent = `₹${data.salary.allowances.toLocaleString()}`;
    document.getElementById('grossEarnings').textContent = `₹${data.salary.grossSalary.toLocaleString()}`;
    document.getElementById('standardDeductionsAmount').textContent = `₹${data.deductions.standardDeductions.toLocaleString()}`;
    document.getElementById('lopDeductionAmount').textContent = `₹${data.deductions.lopDeduction.toLocaleString()}`;
    document.getElementById('totalDeductionsAmount').textContent = `₹${data.deductions.totalDeductions.toLocaleString()}`;
    document.getElementById('finalNetSalary').textContent = `₹${data.netSalary.toLocaleString()}`;

    // Update leave summary
    document.getElementById('sickLeaveUsed').textContent = data.leaves.sickLeaveUsed;
    document.getElementById('sickLeaveAvailable').textContent = data.leaves.availableSick;
    document.getElementById('annualLeaveUsed').textContent = data.leaves.annualLeaveUsed;
    document.getElementById('annualLeaveAvailable').textContent = data.leaves.availableAnnual;
    document.getElementById('lopDaysCount').textContent = data.leaves.lopDays;
    document.getElementById('lopDaysValue').textContent = data.leaves.lopDays;

    // Update leave details table
    displayLeaveDetailsTable(data.leaveDetails);
}

function displayLeaveSummary(data) {
    // This function can be used to display additional leave summary information
    // from the /api/leaves/summary endpoint
    console.log('Leave summary data:', data);
}

function displayLeaveDetailsTable(leaveDetails) {
    const tbody = document.getElementById('leaveDetailsTable');

    if (!leaveDetails || leaveDetails.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No leave records found for selected period</td></tr>';
        return;
    }

    tbody.innerHTML = leaveDetails.map(leave => {
        const startDate = new Date(leave.startDate).toLocaleDateString();
        const endDate = new Date(leave.endDate).toLocaleDateString();
        const dateRange = leave.startDate === leave.endDate ? startDate : `${startDate} - ${endDate}`;

        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        const statusClass = leave.status === 'approved' ? 'approved' :
                           leave.status === 'rejected' ? 'rejected' : 'pending';

        return `
            <tr>
                <td>${dateRange}</td>
                <td>${leave.type.charAt(0).toUpperCase() + leave.type.slice(1)}</td>
                <td>${days}</td>
                <td>${leave.reason}</td>
                <td><span class="status-badge ${statusClass}">${leave.status.toUpperCase()}</span></td>
            </tr>
        `;
    }).join('');
}

async function handleSalaryUpdate(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const updateData = {
        userId: document.getElementById('updateUserId').value,
        basicSalary: document.getElementById('updateBasicSalary').value || undefined,
        allowances: document.getElementById('updateAllowances').value || undefined,
        deductions: document.getElementById('updateDeductions').value || undefined,
        lopDeductionPercent: document.getElementById('updateLopPercent').value || undefined
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
            delete updateData[key];
        }
    });

    if (!updateData.userId) {
        showNotification('error', 'Please select an employee');
        return;
    }

    try {
        const response = await apiFetch('/api/salary/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update salary');
        }

        showNotification('success', 'Salary updated successfully');
        document.getElementById('salaryUpdateForm').reset();
        loadSalaryData(); // Reload data to show updates

    } catch (error) {
        console.error('Error updating salary:', error);
        showNotification('error', 'Failed to update salary: ' + error.message);
    }
}

async function generateSalarySlip() {
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    const employeeFilter = document.getElementById('employeeFilter');

    const month = monthFilter ? monthFilter.value : new Date().getMonth() + 1;
    const year = yearFilter ? yearFilter.value : new Date().getFullYear();
    const user = getStoredUser();
    const isAdmin = isAdminRole(user);
    const userId = (isAdmin && employeeFilter && employeeFilter.value) ? employeeFilter.value : user.id;

    try {
        const response = await apiFetch(`/api/salary/slip?userId=${userId}&month=${month}&year=${year}`);

        if (!response.ok) {
            throw new Error('Failed to generate salary slip');
        }

        const data = await response.json();

        // Create printable salary slip
        const printWindow = window.open('', '_blank');
        const salarySlipHtml = generateSalarySlipHTML(data);

        printWindow.document.write(salarySlipHtml);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();

    } catch (error) {
        console.error('Error generating salary slip:', error);
        showNotification('error', 'Failed to generate salary slip: ' + error.message);
    }
}

function generateSalarySlipHTML(data) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Salary Slip - ${data.employee.name}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: bold; color: #333; }
                .slip-title { font-size: 18px; margin-top: 10px; }
                .employee-details, .salary-details { margin: 20px 0; }
                .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; background: #f0f0f0; padding: 10px; }
                .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .details-table td { padding: 8px; border: 1px solid #ddd; }
                .label { font-weight: bold; background: #f9f9f9; }
                .amount { text-align: right; }
                .total-row { font-weight: bold; background: #e6f3ff; }
                .net-pay { font-size: 18px; font-weight: bold; text-align: center; color: #2c5aa0; margin: 20px 0; padding: 15px; border: 2px solid #2c5aa0; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">SOPHIA-ACADEMY HR</div>
                <div class="slip-title">Salary Slip for ${monthNames[data.period.month - 1]} ${data.period.year}</div>
            </div>

            <div class="employee-details">
                <div class="section-title">Employee Details</div>
                <table class="details-table">
                    <tr><td class="label">Name:</td><td>${data.employee.name}</td></tr>
                    <tr><td class="label">Email:</td><td>${data.employee.email}</td></tr>
                    <tr><td class="label">Department:</td><td>${data.employee.department}</td></tr>
                    <tr><td class="label">Sub-Department:</td><td>${data.employee.subDepartment}</td></tr>
                </table>
            </div>

            <div class="salary-details">
                <div class="section-title">Earnings</div>
                <table class="details-table">
                    <tr><td class="label">Basic Salary</td><td class="amount">₹${data.salary.basicSalary.toLocaleString()}</td></tr>
                    <tr><td class="label">Allowances</td><td class="amount">₹${data.salary.allowances.toLocaleString()}</td></tr>
                    <tr class="total-row"><td class="label">Gross Earnings</td><td class="amount">₹${data.salary.grossSalary.toLocaleString()}</td></tr>
                </table>

                <div class="section-title">Deductions</div>
                <table class="details-table">
                    <tr><td class="label">Standard Deductions</td><td class="amount">₹${data.deductions.standardDeductions.toLocaleString()}</td></tr>
                    <tr><td class="label">LOP Deduction (${data.leaves.lopDays} days)</td><td class="amount">₹${data.deductions.lopDeduction.toLocaleString()}</td></tr>
                    <tr class="total-row"><td class="label">Total Deductions</td><td class="amount">₹${data.deductions.totalDeductions.toLocaleString()}</td></tr>
                </table>

                <div class="section-title">Leave Summary</div>
                <table class="details-table">
                    <tr><td class="label">Sick Leave Used</td><td>${data.leaves.sickLeaveUsed} / ${data.leaves.availableSick}</td></tr>
                    <tr><td class="label">Annual Leave Used</td><td>${data.leaves.annualLeaveUsed} / ${data.leaves.availableAnnual}</td></tr>
                    <tr><td class="label">LOP Days</td><td>${data.leaves.lopDays}</td></tr>
                </table>
            </div>

            <div class="net-pay">
                Net Salary: ₹${data.netSalary.toLocaleString()}
            </div>

            <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
                Generated on ${new Date().toLocaleDateString()} | This is a system-generated document.
            </div>
        </body>
        </html>
    `;
}

async function allocateMonthlyLeaves() {
    try {
        const response = await apiFetch('/api/leaves/allocate-monthly', {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to allocate monthly leaves');
        }

        const result = await response.json();
        showNotification('success', result.message);

        // Reload salary data to reflect updated leave balances
        loadSalaryData();

    } catch (error) {
        console.error('Error allocating monthly leaves:', error);
        showNotification('error', 'Failed to allocate monthly leaves: ' + error.message);
    }
}
// Utility function for notifications
function showNotification(type, message) {
    // Create or update notification element
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(notification);
    }

    // Set style based on type
    const bgColor = type === 'success' ? '#28a745' :
                   type === 'error' ? '#dc3545' :
                   type === 'warning' ? '#ffc107' : '#007bff';

    notification.style.backgroundColor = bgColor;
    notification.textContent = message;
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';

    // Auto-hide after 4 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}
