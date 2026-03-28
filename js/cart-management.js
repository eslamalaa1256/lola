// ============================
// Cart Management Module
// ============================

// Firebase is already initialized in js/header.js
const db = firebase.firestore();
// auth is already declared in js/header.js

let currentUser = null;

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

// ============================
// Add to cart
// ============================
async function addToCart(product) {
  try {
    const itemId = product.id || (Date.now() + Math.random());
    const cartItems = await getCartItems();
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
    const updatedCart = await getCartItems();
    if (window.displayCart) displayCart(updatedCart);
    if (window.updateCartCount) updateCartCount();
    if (window.showToast) showToast('تم إضافة المنتج للسلة بنجاح', 'success');
  } catch (error) {
    console.error('Error adding to cart:', error);
    if (window.showToast) showToast('خطأ في إضافة المنتج للسلة', 'error');
  }
}

// ============================
// Update cart count
// ============================
async function updateCartCount() {
  const cart = await getCartItems();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) cartCountEl.innerText = count;
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
    if (window.showToast) showToast('تم مسح السلة بنجاح', 'success');
    if (window.loadCart) loadCart();
    if (window.updateCartCount) updateCartCount();
  } catch (error) {
    console.error('Error clearing cart:', error);
    if (window.showToast) showToast('خطأ في مسح السلة', 'error');
  }
}

// ============================
// Auth state listener
// ============================
auth.onAuthStateChanged(async user => {
  currentUser = user;
  if (user) {
    await mergeCart();
  }
  if (window.loadCart) loadCart();
  if (window.loadWishlistCount) loadWishlistCount();
  if (window.loadDiscount) await loadDiscount();
});

// Export functions for use in other modules
window.getCartItems = getCartItems;
window.saveCartItem = saveCartItem;
window.removeCartItem = removeCartItem;
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.clearCart = clearCart;
