const LOCAL_BACKEND_PORT = "5001";
const API_BASE = resolveAuthApiBase();

function normalizeBaseUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "");
}

function resolveAuthApiBase() {
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
  if (configured) return `${configured}/api/auth`;

  if (typeof window !== "undefined" && window.location?.protocol === "file:") {
    return `http://localhost:${LOCAL_BACKEND_PORT}/api/auth`;
  }

  // For local dev servers, keep the same hostname to avoid localhost/127.0.0.1 CORS mismatches.
  if (
    typeof window !== "undefined" &&
    window.location?.hostname &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return `http://${window.location.hostname}:${LOCAL_BACKEND_PORT}/api/auth`;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${normalizeBaseUrl(window.location.origin)}/api/auth`;
  }

  return `http://localhost:${LOCAL_BACKEND_PORT}/api/auth`;
}

// ── Element refs
const tabSignIn = document.getElementById("tabSignIn");
const tabSignUp = document.getElementById("tabSignUp");
const authTabs = document.getElementById("authTabs");
const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");
const forgotForm = document.getElementById("forgotForm");
const resetForm = document.getElementById("resetForm");
const goSignUp = document.getElementById("goSignUp");
const goSignIn = document.getElementById("goSignIn");
const siFeedback = document.getElementById("siFeedback");
const suFeedback = document.getElementById("suFeedback");
const fpFeedback = document.getElementById("fpFeedback");
const rpFeedback = document.getElementById("rpFeedback");
const siSubmit = document.getElementById("siSubmit");
const suSubmit = document.getElementById("suSubmit");
const fpSubmit = document.getElementById("fpSubmit");
const rpSubmit = document.getElementById("rpSubmit");
const resendCodeBtn = document.getElementById("resendCodeBtn");
const tabSlider = document.getElementById("tabSlider");
const strengthBar = document.getElementById("strengthBar");
const strengthLabel = document.getElementById("strengthLabel");
const panelTitle = document.getElementById("panelTitle");
const panelSubtitle = document.getElementById("panelSubtitle");

// Track email used for forgot flow
let forgotEmail = "";

// ── View helpers
function showSignIn() {
  tabSignIn.classList.add("active");
  tabSignUp.classList.remove("active");
  tabSlider.classList.remove("right");
  authTabs.style.display = "";
  signInForm.classList.remove("hidden");
  signUpForm.classList.add("hidden");
  forgotForm.classList.add("hidden");
  resetForm.classList.add("hidden");
  panelTitle.textContent = "Welcome back";
  panelSubtitle.textContent = "Sign in to your account to continue";
  clearFeedback(siFeedback);
}

function showSignUp() {
  tabSignUp.classList.add("active");
  tabSignIn.classList.remove("active");
  tabSlider.classList.add("right");
  authTabs.style.display = "";
  signUpForm.classList.remove("hidden");
  signInForm.classList.add("hidden");
  forgotForm.classList.add("hidden");
  resetForm.classList.add("hidden");
  panelTitle.textContent = "Create account";
  panelSubtitle.textContent = "Join SOPHIA-ACADEMY HR today";
  clearFeedback(suFeedback);
}

function showForgotPassword() {
  authTabs.style.display = "none";
  signInForm.classList.add("hidden");
  signUpForm.classList.add("hidden");
  resetForm.classList.add("hidden");
  forgotForm.classList.remove("hidden");
  panelTitle.textContent = "Forgot password?";
  panelSubtitle.textContent =
    "Enter your email and we'll send you a reset code";
  clearFeedback(fpFeedback);
}

function showResetPassword() {
  authTabs.style.display = "none";
  signInForm.classList.add("hidden");
  signUpForm.classList.add("hidden");
  forgotForm.classList.add("hidden");
  resetForm.classList.remove("hidden");
  panelTitle.textContent = "Reset password";
  panelSubtitle.textContent =
    "Enter the code you received and choose a new password";
}

tabSignIn.addEventListener("click", showSignIn);
tabSignUp.addEventListener("click", showSignUp);
goSignUp.addEventListener("click", showSignUp);
goSignIn.addEventListener("click", showSignIn);
document
  .getElementById("forgotLink")
  .addEventListener("click", showForgotPassword);
document.getElementById("backToSignIn").addEventListener("click", showSignIn);
document
  .getElementById("backToForgot")
  .addEventListener("click", showForgotPassword);

// ── Password toggles
document.querySelectorAll(".toggle-password").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = btn.previousElementSibling;
    const icon = btn.querySelector("i");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    icon.className = show ? "ph ph-eye-slash" : "ph ph-eye";
  });
});

// ── Password strength
document.getElementById("suPassword").addEventListener("input", (e) => {
  const val = e.target.value;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const levels = ["", "s1", "s2", "s3", "s4"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const cls = val.length === 0 ? "" : levels[score] || "s1";
  const lbl = val.length === 0 ? "" : labels[score] || "Weak";

  strengthBar.className = `strength-bar${cls ? " " + cls : ""}`;
  strengthLabel.textContent = lbl;
  strengthLabel.className = `strength-label${cls ? " " + cls : ""}`;
});

async function requestResetCode(email, { fromResend = false } = {}) {
  const targetEmail = String(email || "").trim();
  if (!targetEmail) {
    showFeedback(
      fromResend ? rpFeedback : fpFeedback,
      "error",
      "Please enter your email address.",
    );
    return;
  }

  const activeButton = fromResend ? resendCodeBtn : fpSubmit;
  const activeFeedback = fromResend ? rpFeedback : fpFeedback;
  clearFeedback(activeFeedback);

  setLoading(activeButton, true);
  try {
    const res = await fetch(`${API_BASE}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail }),
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(
        activeFeedback,
        "error",
        data.message || "Something went wrong.",
      );
      return;
    }

    forgotEmail = targetEmail;

    // Always show generic confirmation. Reset codes should not be exposed in UI.
    const notice = document.getElementById("resetCodeNotice");
    notice.textContent =
      "If the account exists, use the reset code sent to the configured channel.";
    document.getElementById("rpCode").value = "";
    if (!fromResend) {
      showResetPassword();
    } else {
      showFeedback(
        rpFeedback,
        "success",
        "A new reset code has been sent if the account exists.",
      );
    }
  } catch {
    showFeedback(
      activeFeedback,
      "error",
      "Cannot reach server. Is it running?",
    );
  } finally {
    setLoading(activeButton, false);
  }
}

// ── Forgot Password submit
fpSubmit.addEventListener("click", async () => {
  const email = document.getElementById("fpEmail").value.trim();
  await requestResetCode(email);
});

resendCodeBtn.addEventListener("click", async () => {
  const fallbackEmail = document.getElementById("fpEmail").value.trim();
  const emailToUse = forgotEmail || fallbackEmail;
  await requestResetCode(emailToUse, { fromResend: true });
});

// ── Reset Password submit
rpSubmit.addEventListener("click", async () => {
  clearFeedback(rpFeedback);
  const token = document.getElementById("rpCode").value.trim();
  const newPassword = document.getElementById("rpNewPass").value;
  const confirm = document.getElementById("rpConfirm").value;

  if (!token || !newPassword || !confirm)
    return showFeedback(rpFeedback, "error", "Please fill in all fields.");
  if (newPassword.length < 6)
    return showFeedback(
      rpFeedback,
      "error",
      "Password must be at least 6 characters.",
    );
  if (newPassword !== confirm)
    return showFeedback(rpFeedback, "error", "Passwords do not match.");

  setLoading(rpSubmit, true);
  try {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail, token, newPassword }),
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(rpFeedback, "error", data.message || "Reset failed.");
      return;
    }

    showFeedback(
      rpFeedback,
      "success",
      "Password reset! Redirecting to sign in...",
    );
    setTimeout(() => {
      document.getElementById("rpCode").value = "";
      document.getElementById("rpNewPass").value = "";
      document.getElementById("rpConfirm").value = "";
      showSignIn();
    }, 1500);
  } catch {
    showFeedback(rpFeedback, "error", "Cannot reach server. Is it running?");
  } finally {
    setLoading(rpSubmit, false);
  }
});

// ── Sign In submit
signInForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFeedback(siFeedback);

  const email = document.getElementById("siEmail").value.trim();
  const password = document.getElementById("siPassword").value;

  if (!email || !password) {
    return showFeedback(siFeedback, "error", "Please fill in all fields.");
  }

  setLoading(siSubmit, true);
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(siFeedback, "error", data.message || "Invalid credentials.");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    showFeedback(siFeedback, "success", "Signed in! Redirecting...");
    setTimeout(() => {
      window.location.href = "../dashboard.html";
    }, 900);
  } catch {
    showFeedback(siFeedback, "error", "Cannot reach server. Is it running?");
  } finally {
    setLoading(siSubmit, false);
  }
});

// ── Sign Up submit
signUpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFeedback(suFeedback);

  const name = document.getElementById("suName").value.trim();
  const email = document.getElementById("suEmail").value.trim();
  const password = document.getElementById("suPassword").value;
  const confirm = document.getElementById("suConfirm").value;

  if (!name || !email || !password || !confirm) {
    return showFeedback(suFeedback, "error", "Please fill in all fields.");
  }
  if (password.length < 6) {
    return showFeedback(
      suFeedback,
      "error",
      "Password must be at least 6 characters.",
    );
  }
  if (password !== confirm) {
    return showFeedback(suFeedback, "error", "Passwords do not match.");
  }

  setLoading(suSubmit, true);
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(suFeedback, "error", data.message || "Registration failed.");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    showFeedback(suFeedback, "success", "Account created! Redirecting...");
    setTimeout(() => {
      window.location.href = "../dashboard.html";
    }, 900);
  } catch {
    showFeedback(suFeedback, "error", "Cannot reach server. Is it running?");
  } finally {
    setLoading(suSubmit, false);
  }
});

// ── Helpers
function showFeedback(el, type, msg) {
  el.className = `feedback ${type}`;
  el.innerHTML = `<i class="ph ph-${type === "error" ? "warning-circle" : "check-circle"}"></i> ${msg}`;
}

function clearFeedback(el) {
  el.className = "feedback hidden";
  el.textContent = "";
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML =
      '<i class="ph ph-spinner btn-icon" style="animation:spin 0.8s linear infinite"></i> Please wait...';
  } else {
    btn.innerHTML = btn.dataset.orig || btn.innerHTML;
  }
}

const spinStyle = document.createElement("style");
spinStyle.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
document.head.appendChild(spinStyle);
