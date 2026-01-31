// ============================
// Firebase Config
// ============================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ============================
// تسجيل دخول الأدمن
// ============================
function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("error");

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      // ✅ لو الدخول صح → يروح لوحة التحكم
      window.location.href = "dashboard.html";
    })
    .catch(err => {
      errorEl.textContent = "❌ " + err.message;
    });
}

// ============================
// التحقق من جلسة الأدمن
// ============================
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("✅ الأدمن مسجل الدخول:", user.email);
  } else {
    console.log("🚪 لم يتم تسجيل الدخول");
  }
});
