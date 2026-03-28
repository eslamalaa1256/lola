// Firebase is already initialized in js/header.js
const db = firebase.firestore();
// auth is already declared in js/header.js

let currentUser = null;
let cartItems = []; // متغير محلي للسلة

const cartItemsEl = document.getElementById("cartItems");
const cartSummaryEl = document.getElementById("cartSummary");
const wishlistCountEl = document.getElementById("wishlist-count");

let discountValue = 0; // كود الخصم سيتم إضافته لاحقًا
let appliedDiscountCode = ''; // الكود المطبق
let usedCodes = []; // كودات الخصم المستخدمة (للمؤقتة)

// ============================
// Toast notification system
// ============================
function showToast(message, type = 'info') {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  // Add to page
  document.body.appendChild(toast);

  // Show toast
  setTimeout(() => toast.classList.add('show'), 100);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================
// Auth state listener
// ============================
auth.onAuthStateChanged(async user => {
  currentUser = user;
  if (user) {
    await mergeCart();
  }
  loadCart();
  loadWishlistCount();
  await loadDiscount();
});

// ============================
// Cart references
// ============================
function getCartRef() {
  if (currentUser) return db.collection("users").doc(currentUser.uid).collection("cart");
  return null;
}

async function getCartItems() {
  if (currentUser) {
    const snapshot = await getCartRef().get();
    return snapshot.docs.map(doc => ({ id: doc.id, cartItemId: doc.id, ...doc.data() }));
  } else {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.map(item => ({ ...item, id: String(item.id), cartItemId: String(item.cartItemId || item.id) }));
    return cart;
  }
}

async function saveCartItem(itemId, item) {
  item.id = itemId; // Ensure id is set for consistency
  item.cartItemId = itemId; // Ensure cartItemId is set
  if (currentUser) {
    await getCartRef().doc(itemId).set(item);
  } else {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const index = cart.findIndex(i => i.cartItemId === itemId);
    if (index > -1) cart[index] = item;
    else cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}

async function removeCartItem(itemId) {
  if (currentUser) {
    await getCartRef().doc(itemId).delete();
  } else {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.filter(i => i.cartItemId != itemId);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}

async function mergeCart() {
  const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (localCart.length && currentUser) {
    const cartRef = getCartRef();
    for (const item of localCart) {
      const itemId = item.cartItemId || (Date.now() + Math.random());
      await cartRef.doc(itemId).set(item);
    }
    localStorage.removeItem('cart');
  }
}
function showLoadingSkeletons() {
  cartItemsEl.innerHTML = "";
}


async function loadCart() {
  showLoadingSkeletons();
  try {
    cartItems = await getCartItems();
    displayCart(cartItems);
  } catch (error) {
    console.error("❌ خطأ في تحميل السلة:", error);
    cartItemsEl.innerHTML = "<p>⚠️ خطأ في التحميل</p>";
  }
}

function displayCart(cart) {
  if (!cart.length) {
    cartItemsEl.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <h3>السلة فارغة</h3>
        <p>ابدأ التسوق وأضف منتجاتك المفضلة</p>
        <a href="index.html" class="shop-now-btn">تسوق الآن</a>
      </div>
    `;
    cartSummaryEl.innerHTML = "";
    updateCartCount();
    return;
  }

  // Add Clear Cart button
  const clearCartBtn = document.createElement("button");
  clearCartBtn.className = "clear-cart-btn";
  clearCartBtn.innerHTML = "🗑 مسح السلة";
  clearCartBtn.onclick = clearCart;
  cartItemsEl.appendChild(clearCartBtn);

  cart.forEach(item => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.dataset.itemId = item.cartItemId;
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="item-details">
        <h3>${item.name}</h3>
        <p>اللون: ${item.color || "-"}</p>
        <p>المقاس: ${item.size || "-"}</p>
        ${item.bundle ? `<p>الحزمة: ${item.bundle}</p>` : ''}
        ${item.giftWrapping ? `<p>تغليف كهدية: نعم (+20 ج.م)</p>` : ''}
        ${item.rating ? `<p>التقييم: ${item.rating} نجوم</p>` : ''}
        <p>السعر: ${item.price} ج.م</p>
        <p>المجموع الجزئي: <span class="item-total">${(item.price + (item.giftWrapping ? 20 : 0)) * item.quantity}</span> ج.م</p>
        <div class="quantity-controls">
          <button class="quantity-btn ${item.quantity <= 1 ? 'disabled' : ''}" onclick="handleMinus('${item.cartItemId}', this)">-</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-btn" onclick="handlePlus('${item.cartItemId}', this)">+</button>
        </div>
      </div>
      <div class="item-actions">
        <button class="wishlist-btn" onclick="moveToWishlist('${item.cartItemId}', this)">❤️ نقل للمفضلة</button>
        <button class="save-later-btn" onclick="saveForLater('${item.cartItemId}', this)">💾 حفظ لاحقًا</button>
        <button class="remove-btn" onclick="removeFromCart('${item.cartItemId}', this)">🗑 حذف</button>
      </div>
    `;
    cartItemsEl.appendChild(div);
  });

  updateCartSummary(cart);
  updateCartCount();
}

// ============================
// Cart summary
// ============================
function updateCartSummary(cart) {
  let subtotal = cart.reduce((sum, item) => {
    let itemPrice = item.price;
    if (item.giftWrapping) itemPrice += 20; // Add gift wrapping cost
    return sum + itemPrice * item.quantity;
  }, 0);
  const shipping = subtotal >= 2000 ? 0 : 50;
  const totalAfterDiscount = subtotal - discountValue;
  const finalTotal = totalAfterDiscount + shipping;

  cartSummaryEl.innerHTML = `
    <p>المجموع قبل الخصم: ${subtotal} ج.م</p>
    <p>الخصم: ${discountValue} ج.م</p>
    <p>المجموع بعد الخصم: ${totalAfterDiscount} ج.م</p>
    <p>تكلفة الشحن: ${shipping} ج.م</p>
    <p>الوقت المقدر للتوصيل: 3-5 أيام عمل</p>
    <p><strong>المجموع النهائي: ${finalTotal} ج.م</strong></p>
  `;
}

// ============================
// Debounce utility
// ============================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================
// Handle minus button click
// ============================
function handleMinus(itemId, btn) {
  const itemDiv = btn.closest('.cart-item');
  const qtyDisplay = itemDiv.querySelector('.quantity-display');
  const currentQty = parseInt(qtyDisplay.innerText);
  if (currentQty > 1) {
    updateQty(itemId, currentQty - 1);
  } else {
    removeFromCart(itemId, btn);
  }
}

// ============================
// Handle plus button click
// ============================
function handlePlus(itemId, btn) {
  const itemDiv = btn.closest('.cart-item');
  const qtyDisplay = itemDiv.querySelector('.quantity-display');
  const currentQty = parseInt(qtyDisplay.innerText);
  updateQty(itemId, currentQty + 1);
}

// ============================
// Cart quantity update (instant)
// ============================
async function updateQty(itemId, newQty) {
  try {
    cartItems = await getCartItems();
    const item = cartItems.find(i => i.cartItemId == itemId);
    if (item) {
      item.quantity = newQty;
      await saveCartItem(itemId, item);
      displayCart(cartItems);
      showToast('تم تحديث الكمية بنجاح', 'success');
    }
  } catch (error) {
    console.error('Error updating quantity:', error);
    showToast('خطأ في تحديث الكمية', 'error');
  }
}

// ============================
// Remove from cart
// ============================
async function removeFromCart(itemId, btn) {
  const itemDiv = btn.closest(".cart-item");
  itemDiv.style.transition = "opacity 0.3s";
  itemDiv.style.opacity = "0";
  setTimeout(async () => {
    await removeCartItem(itemId);
    cartItems = await getCartItems();
    displayCart(cartItems);
    showToast('تم حذف المنتج من السلة', 'success');
  }, 300);
}

// ============================
// Add to cart
// ============================
async function addToCart(product) {
  try {
    const itemId = product.id || (Date.now() + Math.random());
    cartItems = await getCartItems();
    const existingItem = cartItems.find(item => item.id == product.id);

    if (existingItem) {
      // Update quantity if product already exists
      existingItem.quantity += product.quantity || 1;
      await saveCartItem(existingItem.cartItemId, existingItem);
    } else {
      // Add new product
      const newItem = {
        ...product,
        cartItemId: itemId,
        quantity: product.quantity || 1
      };
      await saveCartItem(itemId, newItem);
    }

    // Update cart display immediately
    cartItems = await getCartItems();
    displayCart(cartItems);
    updateCartCount();
    showToast('تم إضافة المنتج للسلة بنجاح', 'success');
  } catch (error) {
    console.error('Error adding to cart:', error);
    showToast('خطأ في إضافة المنتج للسلة', 'error');
  }
}

// ============================
// Checkout (Redirect to checkout page)
// ============================
async function checkout() {
  const cart = await getCartItems();
  if (!cart.length) {
    alert('السلة فارغة');
    return;
  }

  // الانتقال لصفحة إنهاء الطلب
  window.location.href = "checkout.html";
}


// ============================
// Update cart count
// ============================
async function updateCartCount() {
  const cart = await getCartItems();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById("cart-count").innerText = count;
}

// ============================
// Wishlist
// ============================
function getWishlistRef() {
  if (currentUser) return db.collection("users").doc(currentUser.uid).collection("wishlist");
  return null;
}

async function getWishlistItems() {
  if (currentUser) {
    const snapshot = await getWishlistRef().get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    return JSON.parse(localStorage.getItem('wishlist') || '[]');
  }
}

async function loadWishlistCount() {
  const wishlist = await getWishlistItems();
  const count = wishlist.length;
  wishlistCountEl.innerText = count > 0 ? count : "";
}

async function saveWishlistItem(itemId, item) {
  if (currentUser) {
    await getWishlistRef().doc(itemId).set(item);
  } else {
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    const index = wishlist.findIndex(i => i.id === itemId);
    if (index === -1) wishlist.push(item);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }
}

async function moveToWishlist(itemId, btn) {
  try {
    cartItems = await getCartItems();
    const item = cartItems.find(i => i.id === itemId);
    if (item) {
      await saveWishlistItem(itemId, item);
      await removeCartItem(itemId);
      cartItems = await getCartItems();
      displayCart(cartItems);
      showToast('تم نقل المنتج للمفضلة', 'success');
      loadWishlistCount();
    }
  } catch (error) {
    console.error('Error moving to wishlist:', error);
    showToast('خطأ في النقل للمفضلة', 'error');
  }
}

// ============================
// Save for later
// ============================
async function saveForLater(itemId, btn) {
  try {
    const cart = await getCartItems();
    const item = cart.find(i => i.id === itemId);
    if (item) {
      // Save to saveForLater
      if (currentUser) {
        // For Firebase, use a separate collection
        await db.collection("users").doc(currentUser.uid).collection("saveForLater").doc(itemId).set(item);
      } else {
        let saveForLater = JSON.parse(localStorage.getItem('saveForLater') || '[]');
        const index = saveForLater.findIndex(i => i.id === itemId);
        if (index === -1) saveForLater.push(item);
        localStorage.setItem('saveForLater', JSON.stringify(saveForLater));
      }
      await removeCartItem(itemId);
      showToast('تم حفظ المنتج لاحقًا', 'success');
      loadCart();
    }
  } catch (error) {
    console.error('Error saving for later:', error);
    showToast('خطأ في الحفظ لاحقًا', 'error');
  }
}

// ============================
// Clear cart
// ============================
async function clearCart() {
  if (!confirm('هل أنت متأكد من مسح جميع المنتجات من السلة؟')) return;

  try {
    if (currentUser) {
      const cartRef = getCartRef();
      const snapshot = await cartRef.get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } else {
      localStorage.removeItem('cart');
    }
    discountValue = 0; // Reset discount
    appliedDiscountCode = '';
    saveDiscount();
    showToast('تم مسح السلة بنجاح', 'success');
    loadCart();
    updateCartCount();
  } catch (error) {
    console.error('Error clearing cart:', error);
    showToast('خطأ في مسح السلة', 'error');
  }
}

// ============================
// Apply discount code
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

async function applyDiscount() {
  const code = document.getElementById('discountCode').value.trim().toUpperCase();
  const messageEl = document.getElementById('discountMessage');

  if (permanentCodes[code]) {
    const cart = await getCartItems();
    const subtotal = cart.reduce((sum, item) => {
      let itemPrice = item.price;
      if (item.giftWrapping) itemPrice += 20; // Add gift wrapping cost
      return sum + itemPrice * item.quantity;
    }, 0);
    discountValue = subtotal * permanentCodes[code];
    appliedDiscountCode = code;
    saveDiscount();
    messageEl.textContent = `تم تطبيق خصم ${permanentCodes[code] * 100}% بنجاح! (كود دائم)`;
    messageEl.className = 'discount-message success';
    loadCart(); // Recalculate totals
  } else if (oneTimeCodes[code]) {
    if (usedCodes.includes(code)) {
      messageEl.textContent = 'هذا الكود مستخدم بالفعل ولا يمكن استخدامه مرة أخرى';
      messageEl.className = 'discount-message error';
      return;
    }
    const cart = await getCartItems();
    const subtotal = cart.reduce((sum, item) => {
      let itemPrice = item.price;
      if (item.giftWrapping) itemPrice += 20; // Add gift wrapping cost
      return sum + itemPrice * item.quantity;
    }, 0);
    discountValue = subtotal * oneTimeCodes[code];
    appliedDiscountCode = code;
    usedCodes.push(code);
    saveDiscount();
    messageEl.textContent = `تم تطبيق خصم ${oneTimeCodes[code] * 100}% بنجاح! (كود لمرة واحدة)`;
    messageEl.className = 'discount-message success';
    loadCart(); // Recalculate totals
  } else {
    discountValue = 0;
    appliedDiscountCode = '';
    saveDiscount();
    messageEl.textContent = 'كود الخصم غير صحيح';
    messageEl.className = 'discount-message error';
    loadCart();
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
}


