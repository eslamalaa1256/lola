// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCEY3tkYgxiRRpcOLdx8gRP0uwkaD1sIJQ",
  authDomain: "lola-6ab46.firebaseapp.com",
  projectId: "lola-6ab46",
  storageBucket: "lola-6ab46.appspot.com",
  messagingSenderId: "166549966504",
  appId: "1:166549966504:web:4f52282d3fa4a9f0eabc9d"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const $ = id => document.getElementById(id);

// Elements
const emailRow = $("emailRow");
const phoneRow = $("phoneRow");
const errorArea = $("errorArea");
const captchaContainer = $("captchaContainer");
const progressFill = $("progressFill");

// New elements (مضافة مبكرًا لضمان الاتساق)
const signupFields = $("signupFields");
const signupPhoneRow = $("signupPhoneRow");
const loginFields = $("loginFields");
const continueBtn = $("continueBtn");

// Validation function for email
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Password strength checker
function checkPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
}

function updatePasswordStrength() {
  const password = $("password").value || "";
  const strength = checkPasswordStrength(password);
  const fill = $("strengthFill");
  const colors = ['#ff4d4d', '#ffa500', '#ffff00', '#9acd32', '#00b300'];
  fill.style.width = (strength / 5) * 100 + '%';
  fill.style.backgroundColor = colors[Math.max(0, strength - 1)] || '#f3f3f3';
}

// Rate limiting (basic, client-side)
let loginAttempts = 0;
const maxAttempts = 5;
let lastAttempt = 0;

function checkRateLimit() {
  const now = Date.now();
  if (now - lastAttempt < 60_000) { // 1 minute
    if (loginAttempts >= maxAttempts) {
      showToast("لقد تجاوزت عدد المحاولات. حاول بعد قليل.", "error");
      displayError("محاولات كثيرة. حاول لاحقًا.");
      return false;
    }
  } else {
    loginAttempts = 0;
  }
  lastAttempt = now;
  return true;
}

// Loading state (global spinner inside button)
function setLoading(button, loading) {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.dataset.originalText || button.innerHTML;
    button.innerHTML = `<span class="loading-spinner" aria-hidden="true"></span> جارٍ التحميل...`;
    button.disabled = true;
  } else {
    button.innerHTML = button.dataset.originalText || button.innerHTML;
    button.disabled = false;
  }
}

// Progress bar
function updateProgress(step, totalSteps) {
  const fill = $("progressFill");
  if (fill) {
    fill.style.width = (step / totalSteps) * 100 + '%';
  }
}

// ============================
// Toggle between Email / Phone input
// ============================
document.querySelectorAll('input[name="loginMethod"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const emailRow = document.getElementById("emailRow");
    const phoneRow = document.getElementById("phoneRow");

    if (radio.value === "email") {
      emailRow.style.display = "block";
      emailRow.classList.remove('hidden');
      phoneRow.style.display = "none";
      phoneRow.classList.add('hidden');
    } else if (radio.value === "phone") {
      phoneRow.style.display = "block";
      phoneRow.classList.remove('hidden');
      emailRow.style.display = "none";
      emailRow.classList.add('hidden');
    }
  });
});


// Toggle signup method
document.querySelectorAll('input[name="signupMethod"]').forEach(r => {
  r.addEventListener("change", e => {
    if (e.target.value === "email") {
      $("signupEmailBox").style.display = "block";
      signupPhoneRow.style.display = "none";
      continueBtn.style.display = "block";
      updateProgress(1, 2);
    } else {
      $("signupEmailBox").style.display = "none";
      signupPhoneRow.style.display = "block";
      continueBtn.style.display = "none";
      updateProgress(1, 2);
    }
    clearError();
  });
});

// Toggle password
$("togglePw").addEventListener("click", () => {
  const pw = $("password");
  if (pw.type === "password") {
    pw.type = "text";
    setTimeout(() => {
      pw.type = "password";
    }, 2000); // Hide after 2 seconds
  }
});



// Password input for strength
$("password").addEventListener("input", updatePasswordStrength);

// Password strength for signup
function updatePasswordStrengthSignup() {
  const password = $("passwordSignup").value || "";
  const strength = checkPasswordStrength(password);
  const fill = $("strengthFillSignup");
  const colors = ['#ff4d4d', '#ffa500', '#ffff00', '#9acd32', '#00b300'];
  fill.style.width = (strength / 5) * 100 + '%';
  fill.style.backgroundColor = colors[Math.max(0, strength - 1)] || '#f3f3f3';
}

const passwordSignup = $("passwordSignup");
if (passwordSignup) {
  passwordSignup.addEventListener("input", updatePasswordStrengthSignup);
}

// Forgot password modal
const modal = $("forgotModal");
const forgotLink = $("forgotPw");
forgotLink.addEventListener("click", () => {
  modal.style.display = "block";
});
$("closeModal").addEventListener("click", () => { modal.style.display = "none"; });
window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

$("resetPwBtn").addEventListener("click", async () => {
  const email = $("resetEmail").value.trim();
  if (!email) return displayError("أدخل البريد لإرسال رابط إعادة التعيين");
  try {
    await auth.sendPasswordResetEmail(email);
    showToast("تم إرسال رابط إعادة التعيين إلى بريدك.", "success");
    modal.style.display = "none";
  } catch (e) {
    displayError(friendlyAuthError(e));
  }
});

// reCAPTCHA setup (renders inside captchaContainer)
let recaptchaVerifier = null;
function ensureRecaptcha() {
  if (recaptchaVerifier) return recaptchaVerifier;
  // Use element id 'captchaContainer'
  recaptchaVerifier = new firebase.auth.RecaptchaVerifier('captchaContainer', {
    size: 'invisible', // Hidden from user view
    callback: (token) => {
      // recaptcha solved
    }
  });
  recaptchaVerifier.render().catch(()=>{ /* ignore render errors in dev */ });
  return recaptchaVerifier;
}

// OTP send
let pendingConfirmation = null;
$("sendOtp").addEventListener("click", async () => {
  let phone = $("phoneInput").value.trim();
  if (!phone) return displayError("أدخل رقم الهاتف");
  // Prepend country code if not present
  const selectedCountry = $("country").value;
  const code = countryCodes[selectedCountry] || "+20";
  if (!phone.startsWith("+")) {
    phone = code + phone.replace(/^0+/, ""); // Remove leading zeros
  }
  if (!checkRateLimit()) return;
  setLoading($("sendOtp"), true);
  try {
    const confirmationResult = await auth.signInWithPhoneNumber(phone, ensureRecaptcha());
    pendingConfirmation = confirmationResult;
    $("otpArea").style.display = "block";
    $("confirmOtpBtn").textContent = "تسجيل الدخول";
    showToast("تم إرسال كود التحقق إلى رقمك.", "success");
    updateProgress(2, 2);
  } catch (e) {
    displayError(friendlyAuthError(e));
  }
  setLoading($("sendOtp"), false);
});

$("confirmOtpBtn").addEventListener("click", async () => {
  const code = $("smsCode").value.trim();
  if (!pendingConfirmation) return displayError("اضغط إرسال الكود أولًا");
  setLoading($("confirmOtpBtn"), true);
  try {
    const result = await pendingConfirmation.confirm(code);
    onAuthSuccess("phone", result.user || $("phoneInput").value);
  } catch (e) {
    displayError("الكود غير صحيح أو منتهي الصلاحية");
    $("confirmOtpBtn").textContent = "تأكيد الكود";
  }
  setLoading($("confirmOtpBtn"), false);
});

// Signup OTP send
let signupPendingConfirmation = null;
$("signupSendOtp").addEventListener("click", async () => {
  let phone = $("signupPhoneInput").value.trim();
  if (!phone) return displayError("أدخل رقم الهاتف");
  const selectedCountry = $("country").value;
  const code = countryCodes[selectedCountry] || "+20";
  if (!phone.startsWith("+")) {
    phone = code + phone.replace(/^0+/, "");
  }
  if (!checkRateLimit()) return;
  setLoading($("signupSendOtp"), true);
  try {
    const confirmationResult = await auth.signInWithPhoneNumber(phone, ensureRecaptcha());
    signupPendingConfirmation = confirmationResult;
    $("signupOtpArea").style.display = "block";
    $("signupConfirmOtpBtn").textContent = "إنشاء الحساب";
    showToast("تم إرسال كود التحقق إلى رقمك.", "success");
    updateProgress(2, 2);
  } catch (e) {
    displayError(friendlyAuthError(e));
  }
  setLoading($("signupSendOtp"), false);
});

$("signupConfirmOtpBtn").addEventListener("click", async () => {
  const code = $("signupSmsCode").value.trim();
  const name = $("nameInput").value.trim();
  if (!name) return displayError("أدخل الاسم الكامل");
  if (!signupPendingConfirmation) return displayError("اضغط إرسال الكود أولًا");
  setLoading($("signupConfirmOtpBtn"), true);
  try {
    const result = await signupPendingConfirmation.confirm(code);
    await result.user.updateProfile({ displayName: name });
    onAuthSuccess("phone", result.user);
  } catch (e) {
    displayError("الكود غير صحيح أو منتهي الصلاحية");
    $("signupConfirmOtpBtn").textContent = "تأكيد الكود";
  }
  setLoading($("signupConfirmOtpBtn"), false);
});

// Social logins

// Google
$("googleBtn").addEventListener("click", async () => {
  setLoading($("googleBtn"), true);
  try {
    const res = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    onAuthSuccess("google", res.user);
  } catch (e) {
    displayError(friendlyAuthError(e));
  }
  setLoading($("googleBtn"), false);
});

// Facebook
$("facebookBtn").addEventListener("click", async () => {
  setLoading($("facebookBtn"), true);
  try {
    const res = await auth.signInWithPopup(new firebase.auth.FacebookAuthProvider());
    onAuthSuccess("facebook", res.user);
  } catch (e) {
    displayError(friendlyAuthError(e));
  }
  setLoading($("facebookBtn"), false);
});



// Continue button (login or signup)
$("continueBtn").addEventListener("click", async () => {
  if (!checkRateLimit()) return;
  const isSignup = signupTab?.classList?.contains("active") ?? false;

  if (isSignup) {
    // Signup logic
    const name = $("nameInput").value.trim();
    const email = $("emailSignup").value.trim();
    const pw = $("passwordSignup").value.trim();
    const confirmPw = $("confirmPassword").value.trim();
    const acceptTerms = $("acceptTerms").checked;

    if (!name) return displayError("أدخل الاسم الكامل");
    if (!email) return displayError("أدخل البريد");
    if (!validateEmail(email)) return displayError("البريد الإلكتروني غير صالح");
    if (!pw) return displayError("أدخل كلمة المرور");
    if (pw.length < 8) return displayError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (pw !== confirmPw) return displayError("كلمات المرور غير متطابقة");
    if (!acceptTerms) return displayError("يجب الموافقة على شروط الاستخدام وسياسة الخصوصية");

    setLoading($("continueBtn"), true);
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const created = await auth.createUserWithEmailAndPassword(email, pw);
      await created.user.updateProfile({ displayName: name });
      // upload profile pic if selected
      const file = profilePicInput?.files?.[0];
      if (file) {
        const storage = firebase.storage();
        const ref = storage.ref(`avatars/${created.user.uid}`);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await created.user.updateProfile({ photoURL: url });
        await db.collection('users').doc(created.user.uid).set({ avatarUrl: url }, { merge: true });
      }
      // send email verification
      try { await created.user.sendEmailVerification(); } catch(_) {}
      showToast("تم إنشاء الحساب. يرجى تأكيد بريدك الإلكت��وني.", "success");
      onAuthSuccess("email", created.user);
    } catch (e) {
      displayError(friendlyAuthError(e));
    }
    setLoading($("continueBtn"), false);
  } else {
    // Login logic
    const email = $("emailInput").value.trim();
    const pw = $("password").value.trim();
    const remember = $("rememberMe").checked;
    if (!email) return displayError("أدخل البريد");
    if (!validateEmail(email)) return displayError("البريد الإلكتروني غير صالح");
    if (!pw) return displayError("أدخل كلمة المرور");
    setLoading($("continueBtn"), true);
    loginAttempts++;
    try {
      if (remember) {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      } else {
        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
      }
      const cred = await auth.signInWithEmailAndPassword(email, pw);
      onAuthSuccess("email", cred.user);
    } catch (e) {
      if (e.code === "auth/wrong-password") {
        displayError("كلمة المرور غير صحيحة");
      } else {
        displayError(friendlyAuthError(e));
      }
    }
    setLoading($("continueBtn"), false);
  }
});

// Auth toggle (login / signup) - switch forms
const loginTab = $("loginTab");
const signupTab = $("signupTab");
const authTitle = $("authTitle");
const profilePicSection = $("profilePicSection");
const signupFieldsRef = signupFields;
const loginFieldsRef = loginFields;
const authContinueBtn = continueBtn;

loginTab.addEventListener("click", () => {
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
  authTitle.textContent = "تسجيل الدخول";
  profilePicSection.style.display = "none";
  signupFieldsRef.style.display = "none";
  loginFieldsRef.style.display = "block";
  authContinueBtn.textContent = "متابعة";
  updateProgress(1, 2);
  clearError();
});

signupTab.addEventListener("click", () => {
  signupTab.classList.add("active");
  loginTab.classList.remove("active");
  authTitle.textContent = "إنشاء حساب";
  profilePicSection.style.display = "flex";
  signupFieldsRef.style.display = "block";
  loginFieldsRef.style.display = "none";
  authContinueBtn.textContent = "إنشاء الحساب";
  updateProgress(1, 2);
  clearError();
  // reset to email signup by default
  const emailSignupRadio = document.querySelector('input[name="signupMethod"][value="email"]');
  if (emailSignupRadio) emailSignupRadio.checked = true;
  $("signupEmailBox").style.display = "block";
  signupPhoneRow.style.display = "none";
  authContinueBtn.style.display = "block";
});

// Profile picture preview
const profilePicInput = $("profilePicInput");
const profileImg = $("profileImg");
if (profilePicInput) {
  profilePicInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { profileImg.src = reader.result; };
      reader.readAsDataURL(file);
    }
  });
}

// CAPTCHA placeholder function (we render real recaptcha inside ensureRecaptcha)
function showCaptcha() {
  ensureRecaptcha();
}

// 2FA placeholder (server-side recommended)
function enable2FA() {
  // Recommend using Firebase Multi-Factor Auth on server or client per docs
  showToast("ميزة التحقق بخطوتين تحتاج إعدادًا إضافيًا (سيرفر/Firebase MF).", "info");
}

// Auth success
function onAuthSuccess(method, user) {
  let email = "";
  let name = "";
  if (typeof user === "string") {
    // phone number case (we passed phone string)
    email = "";
    name = user;
  } else {
    email = user.email || "";
    name = user.displayName || user.phoneNumber || email;
  }

  const userData = {
    name,
    email,
    method,
    lastLogin: new Date().toISOString()
  };

  localStorage.setItem("loginMethod", method);
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("loggedInUser", JSON.stringify(userData));
  // Optionally write to Firestore users collection
  try {
    if (email) {
      db.collection('users').doc(email).set({ ...userData }, { merge: true }).catch(()=>{});
    }
  } catch (_) {}

  const redirect = localStorage.getItem("redirectAfterLogin") || "index.html";
  localStorage.removeItem("redirectAfterLogin");
  window.location.href = redirect;
}

// Friendly error messages mapping (Arabic)
function friendlyAuthError(err) {
  if (!err) return "حدث خطأ غير متوقع";
  const code = err.code || "";
  const message = err.message || "";
  const mapping = {
    "auth/network-request-failed": "فشل الاتصال بالشبكة. تحقق من اتصالك.",
    "auth/invalid-email": "البريد الإلكتروني غير صالح.",
    "auth/user-not-found": "الحساب غير موجود.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
    "auth/too-many-requests": "محاولات كثيرة. حاول لاحقًا.",
    "auth/credential-already-in-use": "هذا الحساب مربوطة بحساب آخر.",
    "auth/popup-closed-by-user": "تم إغلاق نافذة المصادقة قبل الإكمال.",
    "auth/cancelled-popup-request": "تم إلغاء الطلب.",
    "auth/operation-not-allowed": "العملية غير مسموحة. تحقق من إعدادات مزود المصادقة.",
  };
  return mapping[code] || message || "حدث خطأ. حاول مرة أخرى.";
}

// Display error (visible) and toast
function displayError(message) {
  errorArea.textContent = message;
  errorArea.classList.remove("hidden");
  showToast(message, "error");
}

// Clear error
function clearError() {
  errorArea.textContent = "";
  errorArea.classList.add("hidden");
}

// Simple toast notifications (small, unobtrusive)
function showToast(text, type = "info") {
  const existing = document.getElementById('globalToast');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'globalToast';
  div.className = `toast toast-${type}`;
  div.textContent = text;
  document.body.appendChild(div);
  setTimeout(()=>{ div.classList.add('visible'); }, 10);
  setTimeout(()=>{ div.classList.remove('visible'); setTimeout(()=>div.remove(),300); }, 4500);
}

// doLogin redirect helper
function doLogin() {
  window.location.href = 'login.html';
}

// updateAuthUI
function updateAuthUI() {
  const userJson = localStorage.getItem('loggedInUser');
  const userIcon = document.getElementById('userIcon');
  const loginBtn = document.getElementById('loginBtn');

  if (userJson) {
    loginBtn.style.display = "none";
    userIcon.style.display = "flex";
    userIcon.innerHTML = '<i class="fas fa-user"></i>';
  } else {
    loginBtn.style.display = "inline-block";
    userIcon.style.display = "none";
    userIcon.innerHTML = '';
  }
}

// Coupons and Country Codes
const couponBox = $("couponBox");
const discounts = {
  "(ام الدنيا)مصر": "🎉 خصم 30% لأول طلب",
  "قطر": "🎉 خصم 50% لأول طلب",
  "السعودية": "🎉 خصم 40% لأول طلب",
  "الإمارات": "🎉 خصم 35% لأول طلب",
  "الكويت": "🎉 خصم 25% لأول طلب",
  "البحرين": "🎉 خصم 20% لأول طلب",
  "الأردن": "🎉 خصم 15% لأول طلب",
};
const countryCodes = {
  "(ام الدنيا)مصر": "+20",
  "قطر": "+974",
  "السعودية": "+966",
  "الإمارات": "+971",
  "الكويت": "+965",
  "البحرين": "+973",
  "الأردن": "+962",
};
if ($("country")) {
  const countrySelect = $("country");
  countrySelect.addEventListener("change", e => {
    const selected = e.target.value;
    couponBox.textContent = discounts[selected] || "🎁 استمتع بخصومات خاصة";
    const code = countryCodes[selected] || "+20";
    $("phoneInput").placeholder = `${code}1234567890`;
    const signupPhoneInput = $("signupPhoneInput");
    if (signupPhoneInput) {
      signupPhoneInput.placeholder = `${code}1234567890`;
    }
  });
}

// Offline support - register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(()=>{});
}

// Already logged in redirect
if (localStorage.getItem("isLoggedIn") === "true") {
  const redirect = localStorage.getItem("redirectAfterLogin") || "index.html";
  localStorage.removeItem("redirectAfterLogin");
  window.location.href = redirect;
}

// DOMContentLoaded init
window.addEventListener("DOMContentLoaded", () => {
  // Initialize UI state
  emailRow.style.display = "block";
  emailRow.classList.remove('hidden');
  phoneRow.style.display = "none";
  phoneRow.classList.add('hidden');

  signupPhoneRow.style.display = "none";
  signupPhoneRow.classList.add('hidden');
  $("signupEmailBox").style.display = "block";

  loginFields.style.display = "block";
  signupFields.style.display = "none";

  // أظهر/اخفِ عناصر المتابعة بشكل افتراضي مناسب
  continueBtn.style.display = "block";

  // إتاحة التقدم الأولي
  updateProgress(1, 2);
  clearError();

  // Initialize placeholders based on selected country
  const selected = $("country").value;
  couponBox.textContent = discounts[selected] || "🎁 استمتع بخصومات خاصة";
  const code = countryCodes[selected] || "+20";
  $("phoneInput").placeholder = `${code}1234567890`;
  const signupPhoneInput = $("signupPhoneInput");
  if (signupPhoneInput) {
    signupPhoneInput.placeholder = `${code}1234567890`;
  }
});


