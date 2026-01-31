// ============================
// Firebase Config
// ============================
const firebaseConfig = {
  apiKey: "AIzaSyCEY3tkYgxiRRpcOLdx8gRP0uwkaD1sIJQ",
  authDomain: "lola-6ab46.firebaseapp.com",
  projectId: "lola-6ab46",
  storageBucket: "lola-6ab46.appspot.com",
  messagingSenderId: "166549966504",
  appId: "1:166549966504:web:4f52282d3fa4a9f0eabc9d"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================
// متغيرات عامة
// ============================
let product = null;
let selectedSize = null;
let selectedColor = null;
let qty = 1;
let currentImageIndex = 0;
let is360View = false;
let view360Interval = null;

// New features variables
let selectedBundle = null;
let giftWrapping = false;
let selectedRating = 0;

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

// ============================
// عناصر الـ DOM
// ============================
const mainImg = document.getElementById("mainImg");
const thumbnailContainer = document.querySelector("#thumbnailContainer .swiper-wrapper");
const sizesContainer = document.getElementById("sizesContainer");
const colorsContainer = document.getElementById("colorsContainer");
const qtyInput = document.getElementById("qty");
const stickyQtyInput = document.getElementById("stickyQty");
const cartCountEl = document.getElementById("cart-count");
const wishlistCountEl = document.getElementById("wishlist-count");
const toast = document.getElementById("toast");
const reviewsList = document.getElementById("reviewsList");
const totalReviewsCount = document.getElementById("totalReviewsCount");
const totalReviewsCountTabs = document.getElementById("totalReviewsCountTabs");
const imageIndicator = document.getElementById("imageIndicator");
const view360Btn = document.getElementById("view360Btn");

// ============================
// تحميل تفاصيل المنتج
// ============================
function updateProductDisplay() {
  if (!product) return;

  // Fetch DOM elements
  const productNameEl = document.getElementById("productName");
  const productDescEl = document.getElementById("productDesc");
  const productPriceEl = document.getElementById("productPrice");
  const productFullDescEl = document.getElementById("productFullDescription");
  const stickyProductNameEl = document.getElementById("stickyProductName");
  const stickyProductPriceEl = document.getElementById("stickyProductPrice");

  // Check required elements before setting textContent
  const missing = [];
  if (!productNameEl) missing.push("productName");
  if (!productDescEl) missing.push("productDesc");
  if (!productPriceEl) missing.push("productPrice");
  if (!productFullDescEl) missing.push("productFullDescription");
  if (!stickyProductNameEl) missing.push("stickyProductName");
  if (!stickyProductPriceEl) missing.push("stickyProductPrice");

  if (missing.length > 0) {
    console.error("Missing product detail elements:", missing);
    return;
  }
  console.log("All required product detail elements found in DOM.");

  // بيانات أساسية
  productNameEl.textContent = product.name || "اسم المنتج";
  productDescEl.textContent = product.desc || "وصف مختصر للمنتج";
  productPriceEl.innerHTML = `<span style="color: red; font-weight: bold;">${product.price || 0} EGP</span>`;
  productFullDescEl.textContent = product.desc || "لا يوجد وصف إضافي";

  // المواصفات
  const specsList = document.getElementById("productSpecificationsList");
  if (product.specifications && Array.isArray(product.specifications)) {
    specsList.innerHTML = "";
    product.specifications.forEach(spec => {
      const li = document.createElement("li");
      if (typeof spec === 'string') {
        li.textContent = spec;
      } else if (spec.key && spec.value) {
        li.innerHTML = `<strong>${spec.key}:</strong> ${spec.value}`;
      }
      specsList.appendChild(li);
    });
  } else {
    specsList.innerHTML = "<li>لا توجد مواصفات إضافية.</li>";
  }

  // المقاسات
  const sizes = Array.isArray(product.sizes) && product.sizes.length > 0
    ? product.sizes
    : ["S", "M", "L", "XL"];
  sizesContainer.innerHTML = "";
  sizes.forEach(size => {
    const btn = document.createElement("button");
    btn.textContent = size;
    btn.type = "button";
    btn.onclick = () => selectSize(size, btn);
    sizesContainer.appendChild(btn);
  });

  // الألوان
  const colors = Array.isArray(product.colors) && product.colors.length > 0
    ? product.colors
    : [];
  colorsContainer.innerHTML = "";
  colors.forEach(color => {
    const colorName = color.name || color;
    const colorCode = color.code || color;
    const btn = document.createElement("button");
    btn.className = "color-swatch";
    btn.setAttribute("data-color", colorCode);
    btn.title = colorName;
    btn.type = "button";
    btn.style.backgroundColor = colorCode;
    if (colorCode.toLowerCase() === "#ffffff" || colorCode.toLowerCase() === "white") {
      btn.style.border = "1px solid #ccc";
    }
    btn.onclick = () => selectColor(colorName, btn);
    colorsContainer.appendChild(btn);
  });

  // الصور
  if (Array.isArray(product.images) && product.images.length > 0) {
    mainImg.src = product.images[0];
    mainImg.loading = "lazy";
    thumbnailContainer.innerHTML = "";
    product.images.forEach((img, idx) => {
      const div = document.createElement("div");
      div.className = "swiper-slide";
      const thumb = document.createElement("img");
      thumb.src = img;
      thumb.alt = `صورة ${idx + 1}`;
      thumb.loading = "lazy";
      thumb.onclick = () => {
        changeImage(idx);
      };
      if (idx === 0) thumb.classList.add("active");
      div.appendChild(thumb);
      thumbnailContainer.appendChild(div);
    });
    updateImageIndicator();
  } else if (product.image) {
    mainImg.src = product.image;
    mainImg.loading = "lazy";
  }

  // شريط التقدم للتخفيض
  const discountProgress = document.getElementById("discountProgress");
  const progressFill = document.getElementById("progressFill");
  const discountText = document.getElementById("discountText");
  if (product.discountPercentage && discountProgress) {
    discountProgress.style.display = 'block';
    progressFill.style.width = product.discountPercentage + '%';
    discountText.textContent = `خصم ${product.discountPercentage}% - اشترِ الآن!`;
  }

  // التقييمات
  loadReviews(product.reviews || []);
  // المنتجات المقترحة
  loadRelatedProducts(product.category);
  updateCartCount();
  updateWishlistCount();

  // إحصائيات المنتج
  const productStatsEl = document.getElementById("productStats");
  if (productStatsEl && product.sold) {
    productStatsEl.textContent = `تم بيع: ${product.sold} قطعة`;
  }

  // Stock Status - Fixed logic and use 'available' field if present
  const stockStatusEl = document.getElementById("stockStatus");
  if (stockStatusEl) {
    const availability = product.available || ((product.qty || product.quantity || 0) > 0 ? "متاح" : "غير متاح");
    stockStatusEl.textContent = availability;
    stockStatusEl.setAttribute("data-stock", availability === "متاح" ? "inStock" : "outOfStock");
    
    // Disable add to cart if not available
    const addToCartBtns = document.querySelectorAll("#mainAddToCartBtn, #stickyAddToCartBtn");
    addToCartBtns.forEach(btn => {
      if (availability === "غير متاح") {
        btn.disabled = true;
        btn.textContent = "غير متاح";
      } else {
        btn.disabled = false;
        btn.textContent = btn.id === "mainAddToCartBtn" ? "إضافة إلى السلة" : "إضافة إلى السلة";
      }
    });
  }

  // SEO
  document.title = product.name || "LOLA | تفاصيل المنتج";
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = product.shortDesc || product.description || "تفاصيل المنتج في LOLA";
}

function loadProductDetails() {
  if (!productId) {
    document.querySelector(".container").innerHTML = "<p>⚠️ لم يتم العثور على المنتج</p>";
    return;
  }

  const unsubscribe = db.collection("products").doc(productId).onSnapshot((doc) => {
    if (!doc.exists) {
      document.querySelector(".container").innerHTML = "<p>❌ المنتج غير موجود</p>";
      return;
    }

    product = doc.data();
    updateProductDisplay();
  }, (error) => {
    console.error("Error loading product details:", error);
    document.querySelector(".container").innerHTML = "<p>حدث خطأ أثناء تحميل المنتج</p>";
  });

  // Return unsubscribe function for cleanup if needed
  window.productUnsubscribe = unsubscribe;
}

// ============================
// التقييمات
// ============================
function loadReviews(reviews) {
  reviewsList.innerHTML = "";
  totalReviewsCount.innerText = reviews.length;
  totalReviewsCountTabs.innerText = reviews.length;

  if (reviews.length === 0) {
    reviewsList.innerHTML = `<p class="no-reviews-message">لا توجد تقييمات بعد.</p>`;
    return;
  }

  reviews.forEach(r => {
    const div = document.createElement("div");
    div.className = "review";

    let stars = "";
    for (let i = 1; i <= 5; i++) stars += i <= r.rating ? "★" : "☆";

    let imagesHtml = "";
    if (r.images && r.images.length > 0) {
      imagesHtml = '<div class="review-images">';
      r.images.forEach(img => {
        imagesHtml += `<img src="${img}" alt="صورة التقييم" loading="lazy" />`;
      });
      imagesHtml += "</div>";
    }

    div.innerHTML = `
      <strong>${r.user || "Anonymous"}</strong>
      - <span class="stars">${stars}</span>
      <p>${r.comment}</p>
      ${imagesHtml}
    `;
    reviewsList.appendChild(div);
  });
}



// ============================
// المنتجات المقترحة
// ============================
async function loadRelatedProducts(category) {
  try {
    const querySnapshot = await db.collection("products").orderBy("createdAt", "desc").limit(6).get();
    const relatedGrid = document.querySelector(".related-grid");
    relatedGrid.innerHTML = "";

    querySnapshot.forEach(doc => {
      if (doc.id === productId) return; // تخطي المنتج الحالي

      const prod = doc.data();
      const card = document.createElement("div");
      card.className = "related-product-card";

      const imageSrc = prod.images && prod.images.length > 0 ? prod.images[0] : prod.image || "";

      card.innerHTML = `
        <img src="${imageSrc}" alt="${prod.name}" onerror="this.src='assets/images/imgFallBack.581a9fe3.png'">
        <h3>${prod.name}</h3>
        <p>${prod.price || 0} egp</p>
      `;

      card.onclick = () => window.location.href = `product-details.html?id=${doc.id}`;
      relatedGrid.appendChild(card);
    });

    // إذا لم يكن هناك منتجات، عرض رسالة
    if (relatedGrid.children.length === 0) {
      relatedGrid.innerHTML = "<p>لا توجد منتجات مقترحة.</p>";
    }
  } catch (error) {
    console.error("Error loading related products:", error);
  }
}

// إرسال تقييم
document.getElementById("reviewForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();
  const rating = parseInt(document.getElementById("rating").value);
  const comment = document.getElementById("comment").value.trim();
  const imagesInput = document.getElementById("images");
  let uploadedImages = [];

  if (!rating || !comment) {
    showToast("الرجاء إدخال التقييم والتعليق");
    return;
  }

  for (let i = 0; i < imagesInput.files.length; i++) {
    uploadedImages.push(URL.createObjectURL(imagesInput.files[i]));
  }

  const newReview = { user: "Anonymous", rating, comment, images: uploadedImages };
  if (!product.reviews) product.reviews = [];
  product.reviews.push(newReview);

  try {
    await db.collection("products").doc(productId).update({ reviews: product.reviews });
    loadReviews(product.reviews);
    showToast("تم إرسال التقييم");
    this.reset();
  } catch (error) {
    console.error("Error submitting review:", error);
    showToast("حدث خطأ أثناء إرسال التقييم");
  }
});

// ============================
// وظائف مساعدة
// ============================
function selectSize(size, btn) {
  selectedSize = size;
  document.querySelectorAll("#sizesContainer button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function selectColor(code, btn) {
  selectedColor = code;
  document.querySelectorAll("#colorsContainer button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function changeQty(amount) {
  qty += amount;
  if (qty < 1) qty = 1;
  qtyInput.value = qty;
  stickyQtyInput.value = qty;
}

function addToCart() {
  if (!productId) return showToast("❌ خطأ في تحديد المنتج");
  if (!selectedSize) return showToast("الرجاء اختيار المقاس");
  if (!selectedColor) return showToast("الرجاء اختيار اللون");

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing = cart.find(item => item.id === productId && item.size === selectedSize && item.color === selectedColor && item.bundle === selectedBundle && item.giftWrapping === giftWrapping);

  if (existing) {
    existing.quantity += qty;
  } else {
    const cartItemId = Date.now() + Math.random();
    cart.push({
      id: productId,
      cartItemId: cartItemId,
      name: product.name,
      price: product.price,
      image: mainImg.src,
      size: selectedSize,
      color: selectedColor,
      quantity: qty,
      bundle: selectedBundle,
      giftWrapping: giftWrapping,
      rating: selectedRating
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  showToast(`${product.name} تم إضافته للسلة`);
  updateCartCount();
}

function toggleWishlist() {
  if (!productId) return showToast("❌ خطأ في تحديد المنتج");

  let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
  const existing = wishlist.find(item => item.id === productId);

  if (existing) {
    wishlist = wishlist.filter(item => item.id !== productId);
    showToast(`${product.name} تم إزالته من المفضلة`);
    document.getElementById("wishlistBtn").classList.remove("active");
  } else {
    wishlist.push({ id: productId, name: product.name, price: product.price, image: mainImg.src });
    showToast(`${product.name} تم إضافته للمفضلة`);
    document.getElementById("wishlistBtn").classList.add("active");
  }
  localStorage.setItem("wishlist", JSON.stringify(wishlist));
  updateWishlistCount();
}

function toggle360View() {
  if (is360View) {
    clearInterval(view360Interval);
    is360View = false;
    view360Btn.textContent = "عرض 360°";
  } else {
    is360View = true;
    view360Btn.textContent = "إيقاف 360°";
    view360Interval = setInterval(() => {
      currentImageIndex = (currentImageIndex + 1) % product.images.length;
      changeImage(currentImageIndex);
    }, 200);
  }
}

function changeImage(index) {
  currentImageIndex = index;
  mainImg.src = product.images[index];
  document.querySelectorAll("#thumbnailContainer img").forEach((thumb, idx) => {
    thumb.classList.toggle("active", idx === index);
  });
  updateImageIndicator();
}

function updateImageIndicator() {
  if (imageIndicator) {
    imageIndicator.textContent = `${currentImageIndex + 1} / ${product.images.length}`;
  }
}


function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.className = "toast show";
  setTimeout(() => toast.className = "toast", 3000);
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  cartCountEl.innerText = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
}

function updateWishlistCount() {
  const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
  wishlistCountEl.innerText = wishlist.length;
  const btn = document.getElementById("wishlistBtn");
  if (productId && btn) {
    const inWishlist = wishlist.some(item => item.id === productId);
    if (inWishlist) btn.classList.add("active");
    else btn.classList.remove("active");
  }
}

function toggleSizeGuide() {
  const modal = document.getElementById("sizeModal");
  if (!modal) return;
  const sizeTable = `
  <table style="width:100%; border-collapse:collapse; text-align:center; margin-top:10px;">
    ${product?.category === "أحذية"
      ? `<tr><th>EU</th><th>CM</th></tr>
         <tr><td>40</td><td>25.5</td></tr>
         <tr><td>41</td><td>26</td></tr>
         <tr><td>42</td><td>26.5</td></tr>
         <tr><td>43</td><td>27</td></tr>
         <tr><td>44</td><td>27.5</td></tr>`
      : `<tr><th>المقاس</th><th>الصدر (CM)</th><th>الطول (CM)</th></tr>
         <tr><td>S</td><td>90-95</td><td>65-68</td></tr>
         <tr><td>M</td><td>96-100</td><td>69-72</td></tr>
         <tr><td>L</td><td>101-105</td><td>73-76</td></tr>
         <tr><td>XL</td><td>106-110</td><td>77-80</td></tr>`}
  </table>`;
  document.getElementById("sizeTable").innerHTML = sizeTable;
  modal.style.display = "flex";
}

function closeSizeModal() {
  document.getElementById("sizeModal").style.display = "none";
}

function share(platform) {
  if (!product) return;
  const url = window.location.href;
  const text = `تحقق من هذا المنتج: ${product.name} - ${url}`;
  switch (platform) {
    case "facebook":
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
      break;
    case "instagram":
      navigator.clipboard.writeText(text).then(() => showToast("تم نسخ الرابط للإنستغرام"));
      break;
    case "whatsapp":
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      break;
  }
}

function updateLoginState() {
  const loginBtn = document.getElementById("loginBtn");
  const userIcon = document.getElementById("userIcon");
  if (localStorage.getItem("loggedIn") === "true") {
    loginBtn.style.display = "none";
    userIcon.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    userIcon.style.display = "none";
  }
}

// ============================
// وظائف الوضع المظلم واللغة
// ============================
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark);
  const icon = document.querySelector('#darkModeToggle i');
  if (icon) {
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  }
}

function toggleLanguage() {
  const currentLang = document.documentElement.lang;
  const newLang = currentLang === 'ar' ? 'en' : 'ar';
  document.documentElement.lang = newLang;
  document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  localStorage.setItem('language', newLang);
  const btn = document.getElementById('langToggle');
  if (btn) {
    btn.textContent = newLang === 'ar' ? 'EN' : 'عربي';
  }
  // إعادة تحميل الصفحة لتطبيق التغييرات
  location.reload();
}

function loadSettings() {
  // تحميل الوضع المظلم
  const darkMode = localStorage.getItem('darkMode') === 'true';
  if (darkMode) {
    document.body.classList.add('dark-mode');
    const icon = document.querySelector('#darkModeToggle i');
    if (icon) {
      icon.className = 'fas fa-sun';
    }
  }

  // تحميل اللغة
  const language = localStorage.getItem('language') || 'ar';
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  const btn = document.getElementById('langToggle');
  if (btn) {
    btn.textContent = language === 'ar' ? 'EN' : 'عربي';
  }
}

// ============================
// Init
// ============================
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");
  loadSettings();
  loadProductDetails();
  updateCartCount();
  updateWishlistCount();
  updateLoginState();

  document.getElementById("mainAddToCartBtn")?.addEventListener("click", addToCart);
  document.getElementById("stickyAddToCartBtn")?.addEventListener("click", addToCart);
  document.getElementById("wishlistBtn")?.addEventListener("click", toggleWishlist);
  document.getElementById("stickyWishlistBtn")?.addEventListener("click", toggleWishlist);
  document.getElementById("buyNowBtn")?.addEventListener("click", buyNow);
  document.getElementById("saveForLaterBtn")?.addEventListener("click", toggleSaveForLater);
  document.getElementById("compareBtn")?.addEventListener("click", addToCompare);
  document.getElementById("view360Btn")?.addEventListener("click", toggle360View);

  // إضافة event listeners للوضع المظلم واللغة
  document.getElementById("darkModeToggle")?.addEventListener("click", toggleDarkMode);
  document.getElementById("langToggle")?.addEventListener("click", toggleLanguage);

  // مشاركة المنتج
  document.querySelectorAll('.share i').forEach(icon => {
    icon.style.cursor = 'pointer';
    if (icon.classList.contains('fa-facebook')) {
      icon.addEventListener('click', () => share('facebook'));
    }
    if (icon.classList.contains('fa-instagram')) {
      icon.addEventListener('click', () => share('instagram'));
    }
    if (icon.classList.contains('fa-whatsapp')) {
      icon.addEventListener('click', () => share('whatsapp'));
    }
  });

  // Mobile swipe for images
  let startX = 0;
  mainImg.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });
  mainImg.addEventListener('touchend', (e) => {
    if (!startX) return;
    const endX = e.changedTouches[0].clientX;
    const diffX = startX - endX;
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swipe left, next image
        const nextIndex = (currentImageIndex + 1) % product.images.length;
        changeImage(nextIndex);
      } else {
        // Swipe right, previous image
        const prevIndex = (currentImageIndex - 1 + product.images.length) % product.images.length;
        changeImage(prevIndex);
      }
    }
    startX = 0;
  });

  // New features event listeners
  document.getElementById("printBtn")?.addEventListener("click", printDetails);
  document.getElementById("qrBtn")?.addEventListener("click", showQRCode);
  document.getElementById("voiceSearchBtn")?.addEventListener("click", startVoiceSearch);

  // Q&A form
  document.getElementById("qaForm")?.addEventListener("submit", submitQA);

  // Load additional data
  loadSocialProof();
  loadLoyaltyPoints();
});

// ============================
// New Features Functions
// ============================

// Social Proof
function loadSocialProof() {
  const viewCountEl = document.getElementById("viewCount");
  const purchaseCountEl = document.getElementById("purchaseCount");

  // Simulate data - in real app, fetch from server
  const viewCount = Math.floor(Math.random() * 1000) + 100;
  const purchaseCount = Math.floor(Math.random() * 100) + 10;

  if (viewCountEl) viewCountEl.textContent = viewCount;
  if (purchaseCountEl) purchaseCountEl.textContent = purchaseCount;
}

// Loyalty Points
function loadLoyaltyPoints() {
  const pointsEarnedEl = document.getElementById("pointsEarned");

  // Calculate points based on product price
  const points = Math.floor((product?.price || 0) / 10);

  if (pointsEarnedEl) pointsEarnedEl.textContent = points;
}



// Submit Q&A
async function submitQA(e) {
  e.preventDefault();
  const question = document.getElementById("qaQuestion").value.trim();

  if (!question) {
    showToast("الرجاء إدخال السؤال");
    return;
  }

  // Simulate adding Q&A - in real app, save to database
  const qaList = document.getElementById("qaList");
  const qaItem = document.createElement("div");
  qaItem.className = "qa-item";
  qaItem.innerHTML = `
    <div class="question">
      <strong>سؤالك:</strong> ${question}
    </div>
    <div class="answer" style="margin-top: 10px; color: #666;">
      <strong>الإجابة:</strong> شكراً لسؤالك. سيتم الرد عليك قريباً.
    </div>
  `;

  qaList.appendChild(qaItem);
  showToast("تم إرسال السؤال");
  e.target.reset();
}

// Gift Wrapping
function toggleGiftWrapping() {
  const checkbox = document.getElementById("giftWrapCheckbox");
  giftWrapping = checkbox.checked;
  if (checkbox.checked) {
    showToast("تم إضافة تغليف كهدية (+20 ج.م)");
  } else {
    showToast("تم إلغاء تغليف كهدية");
  }
}



// Environmental Impact
function showEnvironmentalInfo() {
  showToast("هذا المنتج مصنوع من مواد صديقة للبيئة ويمكن إعادة تدويره");
}

// Countdown Timer
function startCountdown(endDate) {
  const timerElement = document.getElementById("timer");
  if (!timerElement) return;

  const countdownInterval = setInterval(() => {
    const now = new Date().getTime();
    const distance = endDate - now;

    if (distance < 0) {
      clearInterval(countdownInterval);
      timerElement.innerHTML = "<div>انتهى العرض</div>";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").textContent = days.toString().padStart(2, '0');
    document.getElementById("hours").textContent = hours.toString().padStart(2, '0');
    document.getElementById("minutes").textContent = minutes.toString().padStart(2, '0');
    document.getElementById("seconds").textContent = seconds.toString().padStart(2, '0');
  }, 1000);
}

// Image Lightbox
function openLightbox(imageSrc) {
  const lightbox = document.getElementById("imageLightbox");
  const lightboxImg = lightbox.querySelector("img");

  if (lightbox && lightboxImg) {
    lightboxImg.src = imageSrc;
    lightbox.style.display = "flex";
    setTimeout(() => lightbox.classList.add("active"), 10);
  }
}

function closeLightbox() {
  const lightbox = document.getElementById("imageLightbox");
  if (lightbox) {
    lightbox.classList.remove("active");
    setTimeout(() => lightbox.style.display = "none", 300);
  }
}

// Review Filtering
function filterReviews(rating) {
  const reviews = document.querySelectorAll(".review-item");
  reviews.forEach(review => {
    if (rating === "all" || review.querySelector(".rating-stars").textContent.length === parseInt(rating)) {
      review.style.display = "block";
    } else {
      review.style.display = "none";
    }
  });
}

// Interactive Rating
function handleInteractiveRating(starElement) {
  const rating = starElement.getAttribute("data-value");
  document.querySelectorAll("#interactiveStars .star").forEach((star, index) => {
    star.textContent = index < rating ? "★" : "☆";
  });
  showToast(`تم تقييم المنتج بـ ${rating} نجوم`);
}

// Load Q&A
function loadQA() {
  const qaList = document.getElementById("qaList");
  if (!qaList) return;

  // Simulate loading Q&A - in real app, fetch from server
  const qaData = [
    { question: "هل المنتج أصلي؟", answer: "نعم، جميع منتجاتنا أصلية 100%." },
    { question: "ما هي سياسة الإرجاع؟", answer: "يمكنك إرجاع المنتج خلال 7 يومًا." }
  ];

  qaData.forEach(qa => {
    const qaItem = document.createElement("div");
    qaItem.className = "qa-item";
    qaItem.innerHTML = `
      <div class="question"><strong>${qa.question}</strong></div>
      <div class="answer">${qa.answer}</div>
    `;
    qaList.appendChild(qaItem);
  });
}



// Toggle Sticky Bar
function toggleStickyBar() {
  const stickyBar = document.getElementById("stickyAddToCartBar");
  if (!stickyBar) return;

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const productDetails = document.querySelector(".product-details");
  if (!productDetails) return;

  const productDetailsBottom = productDetails.offsetTop + productDetails.offsetHeight;

  if (scrollTop > productDetailsBottom - 100) {
    stickyBar.style.display = "flex";
  } else {
    stickyBar.style.display = "none";
  }
}

// Initialize new features
document.addEventListener("DOMContentLoaded", () => {
  // Add event listeners for new features
  document.getElementById("giftWrapCheckbox")?.addEventListener("change", toggleGiftWrapping);

  // Bundle buttons
  document.querySelectorAll(".add-bundle-btn").forEach(btn => {
    btn.addEventListener("click", () => addBundleToCart(btn.parentElement.querySelector("h4").textContent));
  });

  // Environmental impact
  document.getElementById("environmentalImpact")?.addEventListener("click", showEnvironmentalInfo);

  // Sticky bar toggle
  window.addEventListener("scroll", toggleStickyBar);

  // Lightbox
  document.getElementById("mainImg")?.addEventListener("click", () => openLightbox(mainImg.src));
  document.getElementById("imageLightbox")?.addEventListener("click", closeLightbox);

  // Review filter
  document.getElementById("reviewFilter")?.addEventListener("change", (e) => filterReviews(e.target.value));

  // Interactive rating
  document.querySelectorAll("#interactiveStars .star").forEach(star => {
    star.addEventListener("click", () => handleInteractiveRating(star));
  });

// Load Q&A
loadQA();

// Start countdown if product has end date
if (product?.offerEndDate) {
  startCountdown(new Date(product.offerEndDate));
}
});
