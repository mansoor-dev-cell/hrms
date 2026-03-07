const API_BASE = 'http://localhost:5000/api';

// ── Element refs ──
const adminBtn      = document.getElementById('adminBtn');
const employeeBtn   = document.getElementById('employeeBtn');
const roleSelection = document.getElementById('roleSelection');
const adminForm     = document.getElementById('adminForm');
const employeeForm  = document.getElementById('employeeForm');
const cardTitle     = document.getElementById('cardTitle');
const cardDesc      = document.getElementById('cardDesc');
const adminBack     = document.getElementById('adminBack');
const empBack       = document.getElementById('empBack');
const adminError    = document.getElementById('adminError');
const adminErrorText = document.getElementById('adminErrorText');
const empError      = document.getElementById('empError');
const empErrorText  = document.getElementById('empErrorText');

// ── Show Admin form ──
adminBtn.addEventListener('click', () => {
    roleSelection.classList.add('hidden');
    adminForm.classList.remove('hidden');
    cardTitle.textContent = 'Admin Sign In';
    cardDesc.textContent = 'Enter your admin credentials to access the HR dashboard.';
    clearError(adminError);
});

// ── Show Employee form ──
employeeBtn.addEventListener('click', () => {
    roleSelection.classList.add('hidden');
    employeeForm.classList.remove('hidden');
    cardTitle.textContent = 'Employee Sign In';
    cardDesc.textContent = 'Enter your employee credentials to view your profile.';
    clearError(empError);
});

// ── Back buttons ──
adminBack.addEventListener('click', () => resetToRoleSelection());
empBack.addEventListener('click',   () => resetToRoleSelection());

function resetToRoleSelection() {
    adminForm.classList.add('hidden');
    employeeForm.classList.add('hidden');
    roleSelection.classList.remove('hidden');
    cardTitle.textContent = 'Sign In';
    cardDesc.textContent  = 'Access your dashboard to manage human resources or view your personal profile.';
    clearError(adminError);
    clearError(empError);
}

// ── Toggle password visibility ──
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input   = btn.previousElementSibling;
        const icon    = btn.querySelector('i');
        const isHidden = input.type === 'password';
        input.type    = isHidden ? 'text' : 'password';
        icon.className = isHidden ? 'ph ph-eye-slash' : 'ph ph-eye';
    });
});

// ── Admin form submit ──
adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(adminError);
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!username || !password) {
        showError(adminError, adminErrorText, 'Please fill in all fields.');
        return;
    }

    try {
        const res  = await fetch(`${API_BASE}/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) {
            showError(adminError, adminErrorText, data.message || 'Invalid credentials.');
            return;
        }

        // Store token and redirect
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', 'admin');
        window.location.href = '../dashboard.html';
    } catch (err) {
        showError(adminError, adminErrorText, 'Server error. Please try again.');
    }
});

// ── Employee form submit ──
employeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(empError);
    const empId    = document.getElementById('empId').value.trim();
    const password = document.getElementById('empPassword').value;

    if (!empId || !password) {
        showError(empError, empErrorText, 'Please fill in all fields.');
        return;
    }

    try {
        const res  = await fetch(`${API_BASE}/auth/employee/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId, password })
        });
        const data = await res.json();

        if (!res.ok) {
            showError(empError, empErrorText, data.message || 'Invalid credentials.');
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('role', 'employee');
        window.location.href = '../dashboard.html';
    } catch (err) {
        showError(empError, empErrorText, 'Server error. Please try again.');
    }
});

// ── Helpers ──
function showError(el, textEl, msg) {
    textEl.textContent = msg;
    el.classList.remove('hidden');
}

function clearError(el) {
    el.classList.add('hidden');
}
