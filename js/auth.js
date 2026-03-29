const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// ====================
// تحديث الواجهة حسب حالة تسجيل الدخول
// ====================
function updateAuthUI() {
  const loginBtn = document.getElementById("loginBtn");
  const userIcon = document.getElementById("userIcon");
  const adminLink = document.getElementById("adminLink");
  const logoutBtn = document.getElementById("logoutBtn");

  if (currentUser) {
    // المستخدم مسجل دخول
    if (loginBtn) loginBtn.style.display = "none";
    if (userIcon) userIcon.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "inline-block";

    const userRole = localStorage.getItem("userRole") || "user";
    if (adminLink && userRole === "admin") {
      adminLink.style.display = "inline-block";
    } else if (adminLink) {
      adminLink.style.display = "none";
    }
  } else {
    // المستخدم غير مسجل
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (userIcon) userIcon.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

// ====================
// تسجيل الخروج
// ====================
function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    localStorage.clear();
    updateAuthUI();
  }).catch(console.error);
}

document.getElementById("logoutBtn")?.addEventListener("click", logout);

// ====================
// مراقبة حالة Firebase Auth
// ====================
auth.onAuthStateChanged((user) => {
  currentUser = user;
  if (user) {
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("userRole", "user"); // عدّل لو عندك admin
  } else {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("userRole");
  }
  updateAuthUI();
});

// ====================
// تشغيل عند تحميل الصفحة
// ====================
document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
});