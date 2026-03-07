const API_BASE = "http://localhost:5000/api/auth";

// ── Element refs
const tabSignIn = document.getElementById("tabSignIn");
const tabSignUp = document.getElementById("tabSignUp");
const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");
const goSignUp = document.getElementById("goSignUp");
const goSignIn = document.getElementById("goSignIn");
const siFeedback = document.getElementById("siFeedback");
const suFeedback = document.getElementById("suFeedback");
const siSubmit = document.getElementById("siSubmit");
const suSubmit = document.getElementById("suSubmit");
const tabSlider = document.getElementById("tabSlider");
const strengthBar = document.getElementById("strengthBar");
const strengthLabel = document.getElementById("strengthLabel");

// ── Tab switching
function showSignIn() {
  tabSignIn.classList.add("active");
  tabSignUp.classList.remove("active");
  tabSlider.classList.remove("right");
  signInForm.classList.remove("hidden");
  signUpForm.classList.add("hidden");
  clearFeedback(siFeedback);
}

function showSignUp() {
  tabSignUp.classList.add("active");
  tabSignIn.classList.remove("active");
  tabSlider.classList.add("right");
  signUpForm.classList.remove("hidden");
  signInForm.classList.add("hidden");
  clearFeedback(suFeedback);
}

tabSignIn.addEventListener("click", showSignIn);
tabSignUp.addEventListener("click", showSignUp);
goSignUp.addEventListener("click", showSignUp);
goSignIn.addEventListener("click", showSignIn);

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
