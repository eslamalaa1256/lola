// Firebase is initialized in the HTML files

// تحديث عداد السلة
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) {
    const totalQuantity = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
    cartCountEl.innerText = totalQuantity > 0 ? totalQuantity : 0;
  }
}

// تحديث عداد المفضلة
function updateWishlistCount() {
  const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
  const wishlistCountEl = document.getElementById("wishlist-count");
  if (wishlistCountEl) wishlistCountEl.innerText = wishlist.length;
}

// تهيئة الهيدر عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  updateWishlistCount();
});
