// ============================
// UI Module
// ============================

const cartItemsEl = document.getElementById("cartItems");
const cartSummaryEl = document.getElementById("cartSummary");
const wishlistCountEl = document.getElementById("wishlist-count");

let cartItems = []; // متغير محلي للسلة

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
// Loading skeletons
// ============================
function showLoadingSkeletons() {
  cartItemsEl.innerHTML = `
    <div class="skeleton-cart-item">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-text">
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
      </div>
    </div>
    <div class="skeleton-cart-item">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-text">
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
      </div>
    </div>
  `;
}

// ============================
// Load cart
// ============================
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

// ============================
// Display cart
// ============================
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

  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();

  // Add Clear Cart button
  const clearCartBtn = document.createElement("button");
  clearCartBtn.className = "clear-cart-btn";
  clearCartBtn.innerHTML = "🗑 مسح السلة";
  clearCartBtn.onclick = clearCart;
  fragment.appendChild(clearCartBtn);

  cart.forEach(item => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.dataset.itemId = item.cartItemId;
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" loading="lazy">
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
    fragment.appendChild(div);
  });

  cartItemsEl.appendChild(fragment);

  updateCartSummary(cart);
  updateCartCount();
}

// ============================
// Cart summary
// ============================
function updateCartSummary(cart) {
  const subtotal = calculateSubtotal(cart);
  const shipping = calculateShipping(subtotal);
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
// Handle quantity changes
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

function handlePlus(itemId, btn) {
  const itemDiv = btn.closest('.cart-item');
  const qtyDisplay = itemDiv.querySelector('.quantity-display');
  const currentQty = parseInt(qtyDisplay.innerText);
  updateQty(itemId, currentQty + 1);
}

// ============================
// Cart quantity update (debounced)
// ============================
const debouncedUpdateQty = debounce(async (itemId, newQty) => {
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
}, 500);

async function updateQty(itemId, newQty) {
  debouncedUpdateQty(itemId, newQty);
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
// Checkout
// ============================
async function checkout() {
  const cart = await getCartItems();
  if (!cart.length) {
    alert('السلة فارغة');
    return;
  }

  // Pass cart data to checkout
  localStorage.setItem('checkoutCart', JSON.stringify(cart));
  localStorage.setItem('checkoutDiscount', discountValue);
  localStorage.setItem('checkoutShipping', calculateShipping(calculateSubtotal(cart)));

  // الانتقال لصفحة إنهاء الطلب
  window.location.href = "checkout.html";
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
  if (wishlistCountEl) wishlistCountEl.innerText = count > 0 ? count : "";
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
    const item = cartItems.find(i => i.cartItemId === itemId);
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
    cartItems = await getCartItems();
    const item = cartItems.find(i => i.cartItemId === itemId);
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

// Export functions
window.showToast = showToast;
window.loadCart = loadCart;
window.displayCart = displayCart;
window.updateCartSummary = updateCartSummary;
window.handleMinus = handleMinus;
window.handlePlus = handlePlus;
window.updateQty = updateQty;
window.removeFromCart = removeFromCart;
window.checkout = checkout;
window.loadWishlistCount = loadWishlistCount;
window.moveToWishlist = moveToWishlist;
window.saveForLater = saveForLater;
