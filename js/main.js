// Firebase is already initialized in index.html
// db and auth are declared in js/auth.js

// =======================
// عند تحميل الصفحة
// =======================
document.addEventListener("DOMContentLoaded", async () => {
  updateCartCount();
  updateWishlistCount();
  updateLoginState();
  updateAuthUI();
  await loadProducts();
  setupEventListeners();
  setupBackToTop();

  // Firebase Auth listener for unified login state
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      updateAuthUI();
    } else {
      // User is signed out
      updateAuthUI();
    }
  });
});

// =======================
// تحديث عدد السلة والمفضلة
// =======================
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) {
    const totalQuantity = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
    cartCountEl.innerText = totalQuantity > 0 ? totalQuantity : 0;
  }
}

function updateWishlistCount() {
  const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
  const wishlistCountEl = document.getElementById("wishlist-count");
  if (wishlistCountEl) wishlistCountEl.innerText = wishlist.length;
}

// =======================
// تحديث حالة تسجيل الدخول
// =======================
function updateLoginState() {
  const loginBtn = document.getElementById("loginBtn");
  const userIcon = document.getElementById("userIcon");
  const adminLink = document.getElementById("adminLink");

  const loggedIn = localStorage.getItem("loggedIn") === "true";
  const userRole = localStorage.getItem("userRole") || "user";

  if (loggedIn) {
    if (loginBtn) loginBtn.style.display = "none";
    if (userIcon) userIcon.style.display = "inline-block";
    if (adminLink && userRole === "admin") adminLink.style.display = "inline-block";
    else if (adminLink) adminLink.style.display = "none";
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (userIcon) userIcon.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
  }
}

// تحديث واجهة المستخدم بناءً على حالة تسجيل الدخول - تم نقله إلى js/header.js

// =======================
// تسجيل الخروج
// =======================
function logout() {
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userPhone");
  localStorage.removeItem("loginMethod");
  // Sign out from Firebase
  auth.signOut().then(() => {
    location.reload();
  }).catch((error) => {
    console.error("Error signing out:", error);
    location.reload();
  });
}

// =======================
// تحميل المنتجات من Firestore
// =======================
async function loadProducts() {
  const productGrid = document.getElementById("product-grid");
  try {
    // محاولة تفعيل استمرارية Firestore
    try {
      await db.enablePersistence();
      console.log("تم تفعيل استمرارية Firestore");
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.warn("فشل استمرارية Firestore: علامات تبويب متعددة مفتوحة");
      } else if (err.code === 'unimplemented') {
        console.warn("استمرارية Firestore غير مدعومة");
      } else {
        console.error("خطأ في تفعيل استمرارية Firestore:", err);
      }
    }

    db.collection("products").orderBy("createdAt", "desc").onSnapshot(snapshot => {
      console.log("تم استلام لقطة منتجات Firestore:", snapshot.size);
      productGrid.innerHTML = "";

      if (snapshot.empty) {
        productGrid.innerHTML = '<p class="no-products">لا توجد منتجات متاحة حالياً.</p>';
        return;
      }

      snapshot.forEach(doc => {
        const product = doc.data();
        console.log("تم تحميل المنتج:", product.name, "المعرف:", doc.id);
        const productCard = document.createElement("div");
        productCard.classList.add("product-card");
        productCard.setAttribute("data-category", product.category || "all");
        productCard.setAttribute("data-price", product.price || 0);

        productCard.innerHTML = `
          <img src="${(product.images && product.images[0]) || product.image || 'assets/images/imgFallBack.581a9fe3.png'}" alt="${product.name}" loading="lazy">
          <h3>${product.name}</h3>
          <p class="price">${product.price} ج.م</p>
          <div class="actions">
            <button class="add-to-cart-btn" title="أضف للسلة"><i class="fas fa-cart-plus"></i></button>
            <button class="add-to-wishlist-btn" title="أضف للمفضلة"><i class="fas fa-heart"></i></button>
          </div>
        `;

        // fallback للصورة
        const imgEl = productCard.querySelector("img");
        imgEl.onerror = function() {
          this.onerror = null;
          this.src = "assets/images/imgFallBack.581a9fe3.png"; // الصورة البديلة
        };

        productGrid.appendChild(productCard);




        // الضغط على الكرت => صفحة التفاصيل
        productCard.addEventListener("click", () => {
          window.location.href = `product-details.html?id=${doc.id}`;
        });
      });
    }, error => {
      console.error("خطأ في لقطة المنتجات:", error);
      if (error.code === 'unavailable' || error.message.includes('FILE_ERROR_NO_SPACE')) {
        productGrid.innerHTML = '<p class="error-msg">حدث خطأ في التخزين المحلي. يرجى مسح بيانات المتصفح أو إعادة تحميل الصفحة.</p>';
      } else {
        productGrid.innerHTML = '<p class="error-msg">حدث خطأ أثناء تحميل المنتجات. يرجى المحاولة لاحقاً.</p>';
      }
    });
  } catch (error) {
    console.error("خطأ في تحميل المنتجات:", error);
    productGrid.innerHTML = '<p class="error-msg">حدث خطأ أثناء تحميل المنتجات.</p>';
  }
}


// =======================
// توست للرسائل
// =======================
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.innerHTML = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// =======================
// إعداد الفلاتر والبحث
// =======================
function setupEventListeners() {
  // الفئات
  document.querySelectorAll(".filter-btn[data-category]").forEach(button => {
    button.addEventListener("click", function() {
      document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
      this.classList.add("active");
      filterProductsByCategory(this.getAttribute("data-category"));
    });
  });

  // الترتيب
  document.querySelectorAll(".filter-btn[data-sort]").forEach(button => {
    button.addEventListener("click", function() {
      sortProductsByPrice(this.getAttribute("data-sort"));
    });
  });

  // البحث
  const searchInput = document.getElementById("search-filter");
  if (searchInput) searchInput.addEventListener("input", e => searchProducts(e.target.value.toLowerCase()));

  // زر الفلاتر للموبايل
  const filterToggle = document.getElementById("filterToggle");
  const headerFilters = document.getElementById("headerFilters");
  if (filterToggle && headerFilters) filterToggle.addEventListener("click", () => headerFilters.classList.toggle("active"));
}

// =======================
// فلترة حسب الفئة
// =======================
function filterProductsByCategory(category) {
  document.querySelectorAll(".product-card").forEach(card => {
    card.style.display = (category === "all" || card.getAttribute("data-category") === category) ? "block" : "none";
  });
}

// =======================
// ترتيب بالسعر
// =======================
function sortProductsByPrice(sortType) {
  const productGrid = document.getElementById("product-grid");
  const productCards = Array.from(document.querySelectorAll(".product-card"));

  productCards.sort((a, b) => {
    const priceA = parseFloat(a.getAttribute("data-price")) || 0;
    const priceB = parseFloat(b.getAttribute("data-price")) || 0;
    return sortType === "price-asc" ? priceA - priceB : priceB - priceA;
  });

  productGrid.innerHTML = "";
  productCards.forEach(card => productGrid.appendChild(card));
}

// =======================
// بحث
// =======================
function searchProducts(searchTerm) {
  document.querySelectorAll(".product-card").forEach(card => {
    const productName = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = productName.includes(searchTerm) ? "block" : "none";
  });
}

// =======================
// زر العودة للأعلى
// =======================
function setupBackToTop() {
  const backToTopBtn = document.getElementById("backToTop");
  if (!backToTopBtn) return;

  window.addEventListener("scroll", () => {
    backToTopBtn.classList.toggle("visible", window.pageYOffset > 300);
  });

  backToTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}