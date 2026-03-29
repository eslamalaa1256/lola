// ============================
// Firebase Auth Manager - Fixed & Improved
// ============================

// Firebase already initialized in HTML
const auth = firebase.auth();
const db = firebase.firestore();

// Global user state
let currentUser = null;

// ============================
// Update UI based on auth state
// ============================
function updateAuthUI() {
  const loginBtn = document.getElementById("loginBtn");
  const userIcon = document.getElementById("userIcon");
  const adminLink = document.getElementById("adminLink");

  if (!loginBtn || !userIcon) return;

  if (currentUser) {
    // User logged in
    loginBtn.style.display = "none";
    userIcon.style.display = "inline-block";

    // Admin link
    const userRole = localStorage.getItem("userRole") || "user";
    if (adminLink) adminLink.style.display = userRole === "admin" ? "inline-block" : "none";
  } else {
    // User logged out
    loginBtn.style.display = "inline-block";
    userIcon.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
  }
}

// ============================
// Handle successful login
// ============================
function onAuthSuccess(method, user) {
  currentUser = user; // <-- crucial
  const email = user.email || "";
  const phone = user.phoneNumber || "";
  const name = user.displayName || user.phoneNumber || email || "مستخدم";

  const userData = {
    name,
    email,
    phone,
    method,
    uid: user.uid || null,
    lastLogin: new Date().toISOString()
  };

  // Save locally
  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("loggedInUser", JSON.stringify(userData));
  localStorage.setItem("loginMethod", method);
  localStorage.setItem("userEmail", email);
  localStorage.setItem("userPhone", phone);
  localStorage.setItem("userName", name);

  // Save to Firestore
  if (user.uid) {
    db.collection('users').doc(user.uid).set(userData, { merge: true }).catch(console.error);
  }

  updateAuthUI();

  // Redirect after login
  const redirect = localStorage.getItem("redirectAfterLogin") || "index.html";
  localStorage.removeItem("redirectAfterLogin");
  if (window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html")) {
    window.location.href = redirect;
  }
}

// ============================
// Logout
// ============================
function logout() {
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userPhone");
  localStorage.removeItem("loginMethod");

  auth.signOut().then(() => {
    currentUser = null;
    updateAuthUI();
    location.reload();
  }).catch((err) => {
    console.error("Logout error:", err);
    currentUser = null;
    updateAuthUI();
    location.reload();
  });
}

// ============================
// Firebase Auth State Listener
// ============================
auth.onAuthStateChanged((user) => {
  currentUser = user;
  if (user) {
    onAuthSuccess(localStorage.getItem("loginMethod") || "unknown", user);
  } else {
    updateAuthUI();
  }
});

// ============================
// Initialize on page load
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  // Enable Firestore persistence
  try {
    await db.enablePersistence();
    console.log("Firestore persistence enabled");
  } catch (err) {
    console.warn("Firestore persistence failed:", err.message);
  }

  // Restore logged in user from localStorage
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser && !currentUser) {
    try {
      const userData = JSON.parse(loggedInUser);
      currentUser = userData;
    } catch {
      localStorage.removeItem("loggedInUser");
    }
  }

  updateAuthUI();
});

// ============================
// Export functions globally
// ============================
window.logout = logout;
window.updateAuthUI = updateAuthUI;
window.onAuthSuccess = onAuthSuccess;