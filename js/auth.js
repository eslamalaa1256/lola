// Firebase Auth Manager - Unified Authentication Handling
// This file centralizes all authentication logic to avoid duplication

// Firebase is initialized in HTML files
const auth = firebase.auth();
const db = firebase.firestore();

// Global user state
let currentUser = null;

// ============================
// Update UI based on auth state
// ============================
function updateAuthUI() {
  console.log("updateAuthUI called, currentUser:", currentUser);
  const loginBtn = document.getElementById("loginBtn");
  const userIcon = document.getElementById("userIcon");
  const adminLink = document.getElementById("adminLink");

  if (currentUser) {
    // User is logged in - show profile icon, hide login button
    console.log("Showing profile icon, hiding login button");
    if (loginBtn) loginBtn.style.display = "none";
    if (userIcon) userIcon.style.display = "inline-block";

    // Check if admin
    const userRole = localStorage.getItem("userRole") || "user";
    if (adminLink && userRole === "admin") {
      adminLink.style.display = "inline-block";
    } else if (adminLink) {
      adminLink.style.display = "none";
    }
  } else {
    // User is not logged in - show login button, hide profile icon
    console.log("Showing login button, hiding profile icon");
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (userIcon) userIcon.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
  }
}

// ============================
// Handle successful authentication
// ============================
function onAuthSuccess(method, user) {
  let email = "";
  let name = "";
  let phone = "";

  if (typeof user === "string") {
    // Phone authentication case
    phone = user;
    name = user;
  } else {
    email = user.email || "";
    phone = user.phoneNumber || "";
    name = user.displayName || user.phoneNumber || email || "مستخدم";
  }

  // Store user data in localStorage
  const userData = {
    name,
    email,
    phone,
    method,
    uid: user.uid || null,
    lastLogin: new Date().toISOString()
  };

  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("loggedInUser", JSON.stringify(userData));
  localStorage.setItem("loginMethod", method);
  localStorage.setItem("userEmail", email);
  localStorage.setItem("userPhone", phone);
  localStorage.setItem("userName", name);

  // Optionally save to Firestore
  if (user.uid) {
    db.collection('users').doc(user.uid).set(userData, { merge: true }).catch(() => {});
  }

  // Update UI
  updateAuthUI();

  // Redirect if needed
  const redirect = localStorage.getItem("redirectAfterLogin") || "index.html";
  localStorage.removeItem("redirectAfterLogin");
  if (window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html")) {
    window.location.href = redirect;
  }
}

// ============================
// Logout function
// ============================
function logout() {
  // Clear localStorage
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userPhone");
  localStorage.removeItem("loginMethod");

  // Sign out from Firebase
  auth.signOut().then(() => {
    currentUser = null;
    updateAuthUI();
    location.reload();
  }).catch((error) => {
    console.error("Error signing out:", error);
    currentUser = null;
    updateAuthUI();
    location.reload();
  });
}

// ============================
// Firebase Auth State Listener
// ============================
auth.onAuthStateChanged((user) => {
  console.log("Auth state changed:", user ? "logged in" : "logged out", user);
  currentUser = user;

  if (user) {
    // User signed in
    console.log("User logged in:", user.email || user.phoneNumber);
    onAuthSuccess(localStorage.getItem("loginMethod") || "unknown", user);
  } else {
    // User signed out
    console.log("User logged out");
    currentUser = null;
    updateAuthUI();
  }
});

// ============================
// Initialize on page load
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  // محاولة تفعيل استمرارية Firestore
  try {
    await db.enablePersistence();
    console.log("تم تفعيل استمرارية Firestore في auth.js");
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.warn("فشل استمرارية Firestore في auth.js: علامات تبويب متعددة مفتوحة");
    } else if (err.code === 'unimplemented') {
      console.warn("استمرارية Firestore غير مدعومة في auth.js");
    } else {
      console.error("خطأ في تفعيل استمرارية Firestore في auth.js:", err);
    }
  }

  // Check if already logged in via localStorage (for persistence)
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser && !currentUser) {
    try {
      const userData = JSON.parse(loggedInUser);
      // This will trigger the auth state change if Firebase confirms
    } catch (e) {
      localStorage.removeItem("loggedInUser");
    }
  }

  updateAuthUI();
});

// ============================
// Export functions for global use
// ============================
window.logout = logout;
window.updateAuthUI = updateAuthUI;
window.onAuthSuccess = onAuthSuccess;
