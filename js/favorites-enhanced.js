// Firebase is already initialized in js/header.js
const db = firebase.firestore();
// auth is already declared in js/header.js

let currentUser = null;

// Elements
const wishlistItemsEl = document.getElementById("wishlistItems");
const footerActionsEl = document.getElementById("footerActions");
const emptyStateEl = document.getElementById("emptyState");
const loaderEl = document.getElementById("loader");
const wishlistSummaryEl = document.getElementById("wishlistSummary");
const confirmModalEl = document.getElementById("confirmModal");
const confirmYesEl = document.getElementById("confirmYes");
const confirmNoEl = document.getElementById("confirmNo");
const paginationEl = document.getElementById("pagination");
const pageInfoEl = document.getElementById("pageInfo");
const prevPageEl = document.getElementById("prevPage");
const nextPageEl = document.getElementById("nextPage");

// Pagination variables
let currentPage = 1;
const itemsPerPage = 10;
let allFilteredItems = [];

// ============================
// Toast Notification System
// ============================
function showToast(message, type = "default") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.backgroundColor =
    type === "success" ? "#28a745" :
    type === "error" ? "#dc3545" : "#333";

  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ============================
// Auth state
// ============================
auth.onAuthStateChanged(async user => {
  currentUser = user;
  if (user) await mergeWishlist();
  loadWishlist();
  updateUserUI();
});

function updateUserUI() {
  const loginBtn = document.getElementById("loginBtn");
  const userIcon = document.getElementById("userIcon");
  if (currentUser) {
    if (loginBtn) loginBtn.style.display = "none";
    if (userIcon) userIcon.style.display = "flex";
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (userIcon) userIcon.style.display = "none";
  }
}

function getWishlistRef() {
  return currentUser
    ? db.collection("users").doc(currentUser.uid).collection("wishlist")
    : null;
}

async function getWishlistItems() {
  if (currentUser) {
    const snapshot = await getWishlistRef().get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    return JSON.parse(localStorage.getItem("wishlist") || "[]");
  }
}

async function addToWishlist(item) {
  if (!item.id) return;
  if (currentUser) {
    await getWishlistRef().doc(item.id).set(item);
  } else {
    let wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    if (!wishlist.find(i => i.id === item.id)) {
      wishlist.push(item);
      localStorage.setItem("wishlist", JSON.stringify(wishlist));
    }
  }
  loadWishlist();
}

async function removeFromWishlist(itemId) {
  if (currentUser) {
    await getWishlistRef().doc(itemId).delete();
  } else {
    let wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    wishlist = wishlist.filter(i => i.id !== itemId);
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }
  loadWishlist();
  showToast("❌ تم حذف المنتج من المفضلة", "error");
}

async function mergeWishlist() {
  const localWishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
  if (!currentUser || localWishlist.length === 0) return;
  const wishlistRef = getWishlistRef();
  for (const item of localWishlist) {
    await wishlistRef.doc(item.id).set(item);
  }
  localStorage.removeItem("wishlist");
}

// ============================
// تحميل وعرض المفضلة
// ============================
async function loadWishlist() {
  loaderEl.style.display = "block";
  wishlistItemsEl.innerHTML = "";
  footerActionsEl.style.display = "none";
  emptyStateEl.style.display = "none";
  wishlistSummaryEl.innerHTML = "";
  paginationEl.style.display = "none";

  try {
    const items = await getWishlistItems();
    allFilteredItems = items;
    renderPage();
  } catch (err) {
    console.error("Error loading wishlist:", err);
    wishlistItemsEl.innerHTML = "<p>⚠️ حدث خطأ أثناء التحميل</p>";
  } finally {
    loaderEl.style.display = "none";
  }
}

// Render current page
function renderPage() {
  wishlistItemsEl.innerHTML = "";
  footerActionsEl.style.display = "none";
  emptyStateEl.style.display = "none";
  wishlistSummaryEl.innerHTML = "";
  paginationEl.style.display = "none";

  if (!allFilteredItems || allFilteredItems.length === 0) {
    emptyStateEl.style.display = "block";
    updateWishlistCount(0);
    return;
  }

  const totalPages = Math.ceil(allFilteredItems.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = allFilteredItems.slice(start, end);

  pageItems.forEach(item => {
    const div = document.createElement("div");
    div.className = "wishlist-item";
    div.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/150'}"
           alt="${item.name || 'منتج'}"
           class="wishlist-img"
           data-id="${item.id}">
      <div class="item-info">
        <h3>${item.name || 'اسم المنتج'}</h3>
        <p>${item.price ? item.price + ' ج.م' : ''}</p>
      </div>
      <div class="item-actions">
        <button class="btn btn-view" onclick="viewProduct('${item.id}')">👁 عرض</button>
        <button class="btn btn-delete" onclick="showConfirmModal('${item.id}')">🗑 حذف</button>
      </div>
    `;
    wishlistItemsEl.appendChild(div);
  });

  document.querySelectorAll(".wishlist-img").forEach(img => {
    img.addEventListener("click", () => {
      const productId = img.dataset.id;
      window.location.href = `product-details.html?id=${productId}`;
    });
  });

  wishlistSummaryEl.innerHTML = `<p>إجمالي العناصر: ${allFilteredItems.length}</p>`;
  footerActionsEl.style.display = "block";
  updateWishlistCount(allFilteredItems.length);

  if (totalPages > 1) {
    paginationEl.style.display = "block";
    pageInfoEl.textContent = `صفحة ${currentPage} من ${totalPages}`;
    prevPageEl.disabled = currentPage === 1;
    nextPageEl.disabled = currentPage === totalPages;
  }
}

function changePage(direction) {
  const totalPages = Math.ceil(allFilteredItems.length / itemsPerPage);
  currentPage += direction;
  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;
  renderPage();
}

function updateWishlistCount(count) {
  const el = document.getElementById("wishlist-count");
  if (el) el.innerText = count;
}

function viewProduct(productId) {
  window.location.href = `product-details.html?id=${productId}`;
}

// Confirmation modal logic
let itemToDelete = null;

function showConfirmModal(itemId) {
  itemToDelete = itemId;
  confirmModalEl.style.display = "block";
}

confirmYesEl.addEventListener("click", () => {
  if (itemToDelete) {
    removeFromWishlist(itemToDelete);
    itemToDelete = null;
  }
  confirmModalEl.style.display = "none";
});

confirmNoEl.addEventListener("click", () => {
  itemToDelete = null;
  confirmModalEl.style.display = "none";
});

// Share wishlist
async function shareWishlist() {
  const wishlist = await getWishlistItems();
  if (wishlist.length === 0) {
    showToast("لا توجد عناصر في المفضلة للمشاركة", "error");
    return;
  }
  const shareData = {
    title: "مفضلتي من LOLA",
    text: `تحقق من مفضلتي: ${wishlist.map(item => item.name).join(", ")}`,
    url: window.location.href
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      showToast("تم مشاركة المفضلة بنجاح", "success");
    } catch (err) {
      console.error("Error sharing:", err);
    }
  } else {
    navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
    showToast("تم نسخ رابط المفضلة إلى الحافظة", "success");
  }
}

// ============================
// تحديث عدد السلة في الهيدر 🛒
// ============================
async function updateCartCount() {
  const cartCountEl = document.getElementById("cart-count");
  if (!cartCountEl) return;

  let count = 0;

  if (currentUser) {
    const snapshot = await db.collection("users")
      .doc(currentUser.uid)
      .collection("cart")
      .get();
    count = snapshot.size;
  } else {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    count = cart.length;
  }

  cartCountEl.textContent = count;
}

// ============================
// Initial Load
// ============================
document.addEventListener("DOMContentLoaded", () => {
  loadWishlist();
  updateCartCount();
});

window.addEventListener("storage", (e) => {
  if (e.key === "cart") updateCartCount();
});

auth.onAuthStateChanged(() => {
  updateCartCount();
});
