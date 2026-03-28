// ============================
// Utils Module
// ============================

// Firebase is already initialized in js/header.js
const db = firebase.firestore();
// auth is already declared in js/header.js

let currentUser = null;

// ============================
// Auth state listener (shared)
// ============================
auth.onAuthStateChanged(user => {
  currentUser = user;
});

// ============================
// Calculate subtotal
// ============================
function calculateSubtotal(cart) {
  return cart.reduce((sum, item) => {
    let itemPrice = item.price;
    if (item.giftWrapping) itemPrice += 20; // Add gift wrapping cost
    return sum + itemPrice * item.quantity;
  }, 0);
}

// ============================
// Calculate shipping
// ============================
function calculateShipping(subtotal) {
  return subtotal >= 2000 ? 0 : 50;
}

// ============================
// Smart coupon application
// ============================
function applySmartCoupons(cart) {
  const subtotal = calculateSubtotal(cart);
  let discount = 0;
  let code = '';

  // Auto-apply based on cart value
  if (subtotal >= 2000) {
    discount = subtotal * 0.15; // 15% off for orders over 2000
    code = 'AUTO15';
  } else if (subtotal >= 1000) {
    discount = subtotal * 0.10; // 10% off for orders over 1000
    code = 'AUTO10';
  } else if (subtotal >= 500) {
    discount = subtotal * 0.05; // 5% off for orders over 500
    code = 'AUTO5';
  }

  return { discount, code };
}

// ============================
// Dynamic shipping options
// ============================
function getShippingOptions(subtotal) {
  const options = [
    { name: 'شحن قياسي (3-5 أيام)', cost: subtotal >= 2000 ? 0 : 50, time: '3-5 أيام' }
  ];

  if (subtotal >= 500) {
    options.push({ name: 'شحن سريع (1-2 أيام)', cost: 80, time: '1-2 أيام' });
  }

  if (subtotal >= 1000) {
    options.push({ name: 'شحن فوري (يوم واحد)', cost: 120, time: 'يوم واحد' });
  }

  return options;
}

// ============================
// Format currency
// ============================
function formatCurrency(amount) {
  return `${amount.toFixed(2)} ج.م`;
}

// ============================
// Validate email
// ============================
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// ============================
// Validate phone
// ============================
function validatePhone(phone) {
  const re = /^(\+20|0)?1[0-2,5]\d{8}$/;
  return re.test(phone);
}

// Export functions
window.calculateSubtotal = calculateSubtotal;
window.calculateShipping = calculateShipping;
window.applySmartCoupons = applySmartCoupons;
window.getShippingOptions = getShippingOptions;
window.formatCurrency = formatCurrency;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
