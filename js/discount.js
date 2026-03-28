// ============================
// Discount Module
// ============================

// Firebase is already initialized in js/header.js
const db = firebase.firestore();
// auth is already declared in js/header.js

let currentUser = null;
let discountValue = 0;
let appliedDiscountCode = ''; // الكود المطبق
let usedCodes = []; // كودات الخصم المستخدمة (للمؤقتة)

// ============================
// Auth state listener
// ============================
auth.onAuthStateChanged(user => {
  currentUser = user;
});

// ============================
// Discount codes
// ============================
const permanentCodes = {
  'SAVE10': 0.10, // 10% discount - دائم
  'LOLA30': 0.30, // 30% - دائم
  'VIP35': 0.35   // 35% - دائم
};

const oneTimeCodes = {
  'WELCOME20': 0.20,     // 20% - لمرة واحدة
  'FIRSTBUY15': 0.15,    // 15% - لمرة واحدة
  'BLACKFRIDAY50': 0.50, // 50% - لمرة واحدة
  'SUMMER25': 0.25,      // 25% - لمرة واحدة
  'NEWYEAR40': 0.40,     // 40% - لمرة واحدة
  'FLASH5': 0.05         // 5% - لمرة واحدة
};

// ============================
// Apply discount code
// ============================
async function applyDiscount() {
  const code = document.getElementById('discountCode').value.trim().toUpperCase();
  const messageEl = document.getElementById('discountMessage');

  if (permanentCodes[code]) {
    const cart = await getCartItems();
    const subtotal = calculateSubtotal(cart);
    discountValue = subtotal * permanentCodes[code];
    appliedDiscountCode = code;
    saveDiscount();
    messageEl.textContent = `تم تطبيق خصم ${permanentCodes[code] * 100}% بنجاح! (كود دائم)`;
    messageEl.className = 'discount-message success';
    if (window.loadCart) loadCart(); // Recalculate totals
  } else if (oneTimeCodes[code]) {
    if (usedCodes.includes(code)) {
      messageEl.textContent = 'هذا الكود مستخدم بالفعل ولا يمكن استخدامه مرة أخرى';
      messageEl.className = 'discount-message error';
      return;
    }
    const cart = await getCartItems();
    const subtotal = calculateSubtotal(cart);
    discountValue = subtotal * oneTimeCodes[code];
    appliedDiscountCode = code;
    usedCodes.push(code);
    saveDiscount();
    messageEl.textContent = `تم تطبيق خصم ${oneTimeCodes[code] * 100}% بنجاح! (كود لمرة واحدة)`;
    messageEl.className = 'discount-message success';
    if (window.loadCart) loadCart(); // Recalculate totals
  } else {
    discountValue = 0;
    appliedDiscountCode = '';
    saveDiscount();
    messageEl.textContent = 'كود الخصم غير صحيح';
    messageEl.className = 'discount-message error';
    if (window.loadCart) loadCart();
  }
}

// ============================
// Apply smart coupons
// ============================
async function applySmartDiscount() {
  const cart = await getCartItems();
  const smartDiscount = applySmartCoupons(cart);
  if (smartDiscount.discount > 0 && smartDiscount.discount > discountValue) {
    discountValue = smartDiscount.discount;
    appliedDiscountCode = smartDiscount.code;
    saveDiscount();
    if (window.showToast) showToast(`تم تطبيق خصم ذكي تلقائياً: ${smartDiscount.code}`, 'success');
    if (window.loadCart) loadCart();
  }
}

// ============================
// Persist discount
// ============================
function saveDiscount() {
  if (currentUser) {
    // For Firebase, save in user doc
    db.collection("users").doc(currentUser.uid).set({ discountValue, appliedDiscountCode, usedCodes }, { merge: true });
  } else {
    localStorage.setItem('discountValue', discountValue);
    localStorage.setItem('appliedDiscountCode', appliedDiscountCode);
    localStorage.setItem('usedCodes', JSON.stringify(usedCodes));
  }
}

async function loadDiscount() {
  if (currentUser) {
    const doc = await db.collection("users").doc(currentUser.uid).get();
    if (doc.exists) {
      discountValue = doc.data().discountValue || 0;
      appliedDiscountCode = doc.data().appliedDiscountCode || '';
      usedCodes = doc.data().usedCodes || [];
    }
  } else {
    discountValue = parseFloat(localStorage.getItem('discountValue')) || 0;
    appliedDiscountCode = localStorage.getItem('appliedDiscountCode') || '';
    usedCodes = JSON.parse(localStorage.getItem('usedCodes') || '[]');
  }
  // Set the input field
  const discountInput = document.getElementById('discountCode');
  if (discountInput) discountInput.value = appliedDiscountCode;

  // Apply smart discount if no manual discount
  if (!appliedDiscountCode) {
    applySmartDiscount();
  }
}

// Export functions
window.applyDiscount = applyDiscount;
window.saveDiscount = saveDiscount;
window.loadDiscount = loadDiscount;
window.discountValue = discountValue;
