// ==============================================
// admin.js - لوحة إدارة LOLA (مشروح بالعربي)
// - وظائف: منتجات، طلبات، رفع صور، تحديث حالة الطلب، تحليلات (Chart.js)، إشعارات، وضع ليلي.
// - يتوافق مع admin.html اللي عندك.
// ==============================================

// ---------------------------
// 1) إعداد Firebase (ضع config لو مختلف)
// ---------------------------
const db = firebase.firestore();
const storage = firebase.storage();

// ---------------------------
// 2) توابع مساعدة (Helpers)
// ---------------------------

// اختصارات لتجربة كتابة أقصر
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

// Loader صغير لتوضيح العمليات الطويلة
function showLoader(on = true) {
  const el = $("#loader");
  if (!el) return;
  el.style.display = on ? "flex" : "none";
}

// نظام Toast بسيط لعرض رسائل للمستخدم
function toast(message, type = "success", duration = 3000) {
  const container = $("#toastContainer");
  if (!container) return;
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => {
    div.remove();
  }, duration);
}

// تجنب حقن HTML ضار (XSS) عند إدراج نص في DOM
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// تنسيق التاريخ للعرض
function formatTimestampToLocal(ts) {
  if (!ts) return "-";
  try {
    // Firestore Timestamp object has `.seconds`
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return new Date(ts).toLocaleString();
  } catch (e) {
    return String(ts);
  }
}

// رسالة عندما لا توجد منتجات
function showNoProductsMessage() {
  const tbody = $("#productsBody");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;color:#666;">لا توجد منتجات متاحة حاليًا</td></tr>';
}

// ---------------------------
// 3) Dark mode (محفوظ في localStorage)
// ---------------------------
function hideAvailableField() {
  const field = $("#productAvailable");
  if (field) {
    field.style.display = "none";
    field.disabled = true;
  }
  const label = document.querySelector(`label[for="${field ? field.id : 'productAvailable'}"]`);
  if (label) label.style.display = "none";
}

window.addEventListener("load", () => {
  if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark");
  initSalesChart(); // تهيئة الرسم البياني بعد التحميل
  initAdvancedSalesChart(); // تهيئة الرسم البياني المتقدم
  initSidebar(); // تهيئة الشريط الجانبي
  // إخفاء حقل المتاح افتراضيًا
  hideAvailableField();
});

// تبديل الوضع الليلي وحفظ الحالة
window.toggleDarkMode = function () {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark") ? "true" : "false");
};

// ---------------------------
// 4) حقول الألوان الديناميكية (Add color row)
// ---------------------------
window.addColorField = function () {
  const container = $("#colorFields");
  if (!container) return;
  const div = document.createElement("div");
  div.className = "color-row";
  // يحتوي على حقل اسم اللون + color picker + زر اضافة + زر حذف
  div.innerHTML = `
    <input type="text" class="colorName" placeholder="اسم اللون (اختياري)"/>
    <input type="color" class="colorCode" value="#000000" />
    <button type="button" class="btn btn-small" onclick="addColorField()" title="إضافة لون">+</button>
    <button type="button" class="btn btn-small btn-danger" onclick="this.parentElement.remove()" title="حذف">❌</button>
  `;
  container.appendChild(div);
};

// ---------------------------
// 5) رفع الصور إلى Firebase Storage
// ---------------------------
// تستقبل ملف من input type=file وتُعيد URL عند اكتمال الرفع
async function uploadImageFile(file) {
  if (!file) return null;
  try {
    // مسار تخزين منظم داخل Storage
    const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const ref = storage.ref().child(`products/${filename}`);
    const snapshot = await ref.put(file);
    const url = await snapshot.ref.getDownloadURL();
    return url;
  } catch (err) {
    console.error("خطأ في رفع الصورة:", err);
    toast("❌ فشل رفع الصورة", "error");
    return null;
  }
}

// ---------------------------
// 6) إضافة منتج جديد (Add Product)
// ---------------------------
// يدعم رفع صورة من الجهاز أو إدخال رابط مباشر
window.addProduct = async function () {
  try {
    // Show available field for manual selection
    $("#productAvailable").style.display = "block";
    $("#productAvailable").disabled = false;
    const label = document.querySelector(`label[for="${$("#productAvailable").id}"]`);
    if (label) label.style.display = "block";

    const name = $("#productName").value.trim();
    const price = Number($("#productPrice").value);
    const desc = $("#productDesc").value.trim();
    const qty = Number($("#productQuantity").value);
    const category = $("#productCategory").value || "عام";
    const available = $("#productAvailable").value || "غير متاح";
    const sizes = ($("#productSizes").value || "").split(",").map(s => s.trim()).filter(Boolean);

    // تحقق من الحقول الأساسية
    if (!name || !price || !desc || !qty) {
      toast("⚠️ املأ الحقول المطلوبة: الاسم، السعر، الوصف، الكمية", "error");
      return;
    }

    showLoader(true);

    // إدارة الصورة: ملف أم رابط؟
    let imageUrl = "";
    const fileInput = $("#productImageFile");
    if (fileInput && fileInput.files && fileInput.files[0]) {
      // لو رفع ملف => ارفعه واحصل على الرابط
      const uploaded = await uploadImageFile(fileInput.files[0]);
      if (uploaded) imageUrl = uploaded;
    }
    // لو مفيش ملف لكن فيه رابط في الحقل
    if (!imageUrl) {
      const link = $("#productImage").value.trim();
      if (link) imageUrl = link;
    }
    // لو مفيش صورة، استخدم صورة افتراضية موجودة في المشروع
    if (!imageUrl) imageUrl = "assets/images/default.png";

    // الألوان: جمع القيم من الحقول
    const colors = [];
    $$(".color-row").forEach(row => {
      const n = row.querySelector(".colorName") ? row.querySelector(".colorName").value.trim() : "";
      const c = row.querySelector(".colorCode") ? row.querySelector(".colorCode").value : "#000000";
      if (n) colors.push({ name: n, code: c });
    });

    // شكل الوثيقة التي ستُخزن في Firestore
    const doc = {
      name,
      price,
      desc,
      qty,
      category,
      available,
      images: [imageUrl], // نحتفظ بمصفوفة صور (حالياً عنصر واحد غالباً)
      sizes,
      colors,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // إضافة المنتج إلى مجموعة products
    await db.collection("products").add(doc);

    // إعادة تهيئة النموذج
    $("#productName").value = "";
    $("#productPrice").value = "";
    $("#productDesc").value = "";
    $("#productQuantity").value = "";
    $("#productImage").value = "";
    if (fileInput) fileInput.value = "";
    $("#productSizes").value = "";
    // إعادة تعيين حقول الألوان إلى حقل واحد افتراضي
    $("#colorFields").innerHTML = `
      <div class="color-row">
        <input type="text" class="colorName" placeholder="اسم اللون (اختياري)"/>
        <input type="color" class="colorCode" value="#000000" />
        <button type="button" class="btn btn-small" onclick="addColorField()" title="إضافة لون">+</button>
      </div>
    `;

    $("#productAvailable").value = "";
    hideAvailableField();

    showLoader(false);
    toast("✅ تم إضافة المنتج بنجاح");
  } catch (err) {
    console.error("خطأ أثناء إضافة المنتج:", err);
    showLoader(false);
    toast("❌ حدث خطأ أثناء إضافة المنتج", "error");
  }
};

// ---------------------------
// 7) عرض المنتجات في الجدول (Realtime)
// ---------------------------
// عند حدوث أي تغيير في مجموعة products، سوف يحدث العرض تلقائيًا
db.collection("products").onSnapshot(snapshot => {
  console.log("Firestore admin products snapshot received:", snapshot.size);
  const tbody = $("#productsBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  let count = 0;

  snapshot.forEach(doc => {
    const p = doc.data() || {};
    console.log("Admin product loaded:", p.name, "ID:", doc.id);
    count++;

    // عرض الصورة الأولى أو صورة افتراضية
    const img = (p.images && p.images[0]) ? p.images[0] : "assets/images/default.png";
    const sizesText = (p.sizes && p.sizes.length) ? p.sizes.join(", ") : "-";

    // الألوان تعرض كدوائر صغيرة فقط (بدون نص) مع tooltip لاسم اللون
    const colorsHtml = (p.colors && p.colors.length) ? p.colors.map(c =>
      `<span class="color-tag" style="background:${escapeHtml(c.code)};display:inline-block;width:18px;height:18px;border-radius:50%;margin:0 4px;border:1px solid rgba(0,0,0,0.06)" title="${escapeHtml(c.name)}"></span>`
    ).join(" ") : "-";

    // إنشاء صف <tr> وادراجه في tbody
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="width:70px;"><img src="${escapeHtml(img)}" width="60" height="60" style="object-fit:cover;border-radius:8px" onerror="this.src='assets/images/default.png'"></td>
      <td style="text-align:left;padding-left:12px;">${escapeHtml(p.name || "-")}</td>
      <td>${p.price != null ? (p.price + " ج") : "-"}</td>
      <td style="max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(p.desc || "-")}">${escapeHtml(p.desc || "-")}</td>
      <td>${p.qty != null ? p.qty : "-"}</td>
      <td>${escapeHtml(sizesText)}</td>
      <td>${colorsHtml}</td>
      <td>${escapeHtml(p.category || "-")}</td>
      <td>${p.qty > 0 ? "متاح" : "غير متاح"}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-edit" title="تعديل" onclick="editProduct('${doc.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-small" title="حذف" onclick="deleteProduct('${doc.id}')"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // إذا لم توجد منتجات، عرض رسالة
  if (count === 0) {
    showNoProductsMessage();
  }

  // تحديث عدد المنتجات في الكارت
  const totalProductsEl = $("#totalProducts");
  if (totalProductsEl) totalProductsEl.innerText = count;
});

// ---------------------------
function getStarRating(rating) {
  const num = parseFloat(rating) || 0;
  const fullStars = Math.floor(num);
  const halfStar = num % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  const stars = '★'.repeat(fullStars) + '☆'.repeat(halfStar + emptyStars);
  return `${stars} (${num.toFixed(1)})`;
}

db.collection("products").onSnapshot(snapshot => {
  totalViews = 0;
  let allRatings = [];
  snapshot.forEach(doc => {
    const p = doc.data() || {};
    if (p.views) totalViews += Number(p.views) || 0;
    if (Array.isArray(p.ratings)) {
      allRatings = allRatings.concat(p.ratings.map(r => Number(r) || 0));
    }
  });
  avgRating = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1) : 0;

  // تحديث البطاقات في التحليلات
  const totalViewsEl = $("#totalViews");
  const avgRatingEl = $("#avgRating");
  if (totalViewsEl) totalViewsEl.innerText = totalViews + " مره";
  if (avgRatingEl) avgRatingEl.innerHTML = getStarRating(avgRating);
});

// ---------------------------
// 8) تعديل منتج - ملء الحقول في النموذج (Edit product)
// ---------------------------
window.editProduct = async function (id) {
  try {
    const doc = await db.collection("products").doc(id).get();
    if (!doc.exists) {
      toast("❌ المنتج غير موجود", "error");
      return;
    }
    const p = doc.data();

    // ملء الحقول بالبيانات الحالية
    $("#productName").value = p.name || "";
    $("#productPrice").value = p.price || "";
    $("#productDesc").value = p.desc || "";
    $("#productQuantity").value = p.qty || "";
    $("#productCategory").value = p.category || "";
    // جعل حقل المتاح تلقائي بناء على الكمية وإخفاؤه مع التسمية
    const qty = Number($("#productQuantity").value);
    $("#productAvailable").value = qty > 0 ? "متاح" : "غير متاح";
    $("#productAvailable").disabled = true;
    $("#productAvailable").style.display = "none";
    const label = document.querySelector(`label[for="${$("#productAvailable").id}"]`);
    if (label) label.style.display = "none";

    // تحديث تلقائي لحقل المتاح عند تغيير الكمية
    $("#productQuantity").addEventListener("input", () => {
      const newQty = Number($("#productQuantity").value);
      $("#productAvailable").value = newQty > 0 ? "متاح" : "غير متاح";
    });
    $("#productSizes").value = (p.sizes || []).join(", ");
    $("#productImage").value = (p.images && p.images[0]) ? p.images[0] : "";

    // تهيئة حقول الألوان بناءً على بيانات المنتج
    const colorContainer = $("#colorFields");
    colorContainer.innerHTML = "";
    if (p.colors && p.colors.length) {
      p.colors.forEach(c => {
        const div = document.createElement("div");
        div.className = "color-row";
        div.innerHTML = `
          <input type="text" class="colorName" placeholder="اسم اللون (اختياري)" value="${escapeHtml(c.name)}"/>
          <input type="color" class="colorCode" value="${escapeHtml(c.code || "#000000")}" />
          <button type="button" class="btn btn-small" onclick="addColorField()" title="إضافة لون">+</button>
          <button type="button" class="btn btn-small btn-danger" onclick="this.parentElement.remove()" title="حذف">❌</button>
        `;
        colorContainer.appendChild(div);
      });
      // إضافة حقل فارغ إضافي للتسهيل
      addColorField();
    } else {
      addColorField(); // حقل افتراضي إذا لا توجد ألوان
    }

    // تغيير سلوك زر الإضافة ليصبح زر حفظ التعديل
    const addBtn = $("#addProductBtn");
    if (addBtn) {
      addBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
      addBtn.onclick = () => updateProduct(id);
    }

    toast("📝 تم ملء الحقول، عدّل ثم اضغط حفظ التعديلات", "info");
  } catch (err) {
    console.error("خطأ أثناء جلب المنتج:", err);
    toast("❌ حدث خطأ أثناء جلب بيانات المنتج", "error");
  }
};

// ---------------------------
// 9) حفظ تعديلات المنتج (Update Product)
// ---------------------------
window.updateProduct = async function (id) {
  try {
    const name = $("#productName").value.trim();
    const price = Number($("#productPrice").value);
    const desc = $("#productDesc").value.trim();
    const qty = Number($("#productQuantity").value);
    const category = $("#productCategory").value || "عام";
    const available = qty > 0 ? "متاح" : "غير متاح";
    const sizes = ($("#productSizes").value || "").split(",").map(s => s.trim()).filter(Boolean);

    if (!name || !price || !desc || !qty) {
      toast("⚠️ املأ الحقول المطلوبة", "error");
      return;
    }

    showLoader(true);

    // إدارة الصور: إذا رفع ملف جديد نحفظه، وإلا نستخدم رابط الحقل إذا موجود
    const images = [];
    const fileInput = $("#productImageFile");
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const url = await uploadImageFile(fileInput.files[0]);
      if (url) images.push(url);
    }
    const link = $("#productImage").value.trim();
    if (link && images.length === 0) images.push(link);
    if (images.length === 0) images.push("assets/images/default.png");

    // الألوان
    const colors = [];
    $$(".color-row").forEach(row => {
      const n = row.querySelector(".colorName") ? row.querySelector(".colorName").value.trim() : "";
      const c = row.querySelector(".colorCode") ? row.querySelector(".colorCode").value : "#000000";
      if (n) colors.push({ name: n, code: c });
    });

    // إجراء التحديث في Firestore
    await db.collection("products").doc(id).update({
      name, price, desc, qty, category, available, sizes, colors, images,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // إعادة زر الإضافة إلى الحالة الافتراضية
    const addBtn = $("#addProductBtn");
    if (addBtn) {
      addBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة المنتج';
      addBtn.onclick = addProduct;
    }

    // تفريغ الحقول
    $("#productName").value = "";
    $("#productPrice").value = "";
    $("#productDesc").value = "";
    $("#productQuantity").value = "";
    $("#productImage").value = "";
    if (fileInput) fileInput.value = "";
    $("#productSizes").value = "";
    $("#colorFields").innerHTML = `<div class="color-row"><input type="text" class="colorName" placeholder="اسم اللون (اختياري)"/><input type="color" class="colorCode" value="#000000" /><button type="button" class="btn btn-small" onclick="addColorField()" title="إضافة لون">+</button></div>`;

    hideAvailableField();

    showLoader(false);
    toast("✅ تم حفظ التعديلات بنجاح");
  } catch (err) {
    console.error("خطأ أثناء تحديث المنتج:", err);
    showLoader(false);
    toast("❌ حدث خطأ أثناء حفظ التعديلات", "error");
  }
};

// ---------------------------
// 10) حذف منتج
// ---------------------------
window.deleteProduct = async function (id) {
  if (!confirm("هل تريد حذف هذا المنتج نهائيًا؟")) return;
  try {
    await db.collection("products").doc(id).delete();
    toast("🗑️ تم حذف المنتج");
  } catch (err) {
    console.error("خطأ أثناء حذف المنتج:", err);
    toast("❌ حدث خطأ أثناء حذف المنتج", "error");
  }
};

// ---------------------------
// 11) بحث سريع في جدول المنتجات
// ---------------------------
window.searchProducts = function () {
  const q = ($("#searchProducts") ? $("#searchProducts").value.toLowerCase() : "");
  $$("#productsBody tr").forEach(tr => {
    tr.style.display = tr.innerText.toLowerCase().includes(q) ? "" : "none";
  });
};

// ---------------------------
// 12) الطلبات: Realtime + تحكم في الحالة
// ---------------------------

// نغني المستخدم بصوت تنبيه بسيط عند وصول طلب جديد (WebAudio)
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 180);
  } catch (e) {
    console.warn("Audio not supported:", e);
  }
}

// مجموعة لمتابعة الأوامر التي عرضناها سابقًا حتى لا نكرر تنبيه أولي
let seenOrderIds = new Set();

// متغيرات للتحليلات المتقدمة
let totalViews = 0;
let avgRating = 0;
let deliveredOrders = 0;

db.collection("orders").orderBy("createdAt", "desc").onSnapshot(snapshot => {
  const tbody = $("#ordersBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // كشف تغييرات docs لمعرفة العناصر المضافة حديثًا
  const changes = snapshot.docChanges();
  changes.forEach(change => {
    if (change.type === "added") {
      const id = change.doc.id;
      if (!seenOrderIds.has(id)) {
        playBeep();
        toast("🔔 طلب جديد وصل", "info", 2500);
      }
    }
  });

  let newOrders = 0;
  let totalSales = 0;
  let deliveredOrdersCount = 0;

  snapshot.forEach(doc => {
    const o = doc.data() || {};
    // علامة أن هذا الطلب تم عرضه (حتى لا نُشغّل التنبيه ثانية)
    seenOrderIds.add(doc.id);

    if (o.status === "جديد") newOrders++;
    if (o.status === "تم التسليم") deliveredOrdersCount++;

    // محاولة الحصول على إجمالي الطلب:
    // نستخدم حقل o.total لو موجود، وإلا نجرب حسابه من items (لو مُرسل)
    let total = Number(o.total || 0);
    if (!total && Array.isArray(o.items)) {
      // إذا العناصر موجودة بنموذج { price, quantity } نجمع
      total = o.items.reduce((acc, it) => {
        const p = Number(it.price || it.unitPrice || 0);
        const q = Number(it.quantity || it.qty || 1);
        return acc + (isNaN(p) ? 0 : p) * (isNaN(q) ? 1 : q);
      }, 0);
    }
    // Exclude canceled orders from total sales
    if (o.status !== "ملغي") {
      totalSales += isNaN(total) ? 0 : total;
    }

    // نجهز خانة المنتجات كنص مبسّط (و tooltip يحتوي التفاصيل)
    let itemsText = "-";
    let sizeDisplay = "-";
    let colorDisplay = "-";
    if (Array.isArray(o.items) && o.items.length > 0) {
      itemsText = o.items.map(it => `${it.name || it.product || "-"} x${it.quantity || it.qty || 1}`).join(" | ");
      // نعرض المقاس/اللون للعنصر الأول إن وُجد ذلك الحقل
      const first = o.items[0];
      sizeDisplay = first.size || first.sizeSelected || first.msize || "-";
      colorDisplay = first.color || first.colorSelected || "-";
    } else if (o.product) {
      // قد تكون بنية قديمة: product، qty، size، color
      itemsText = `${o.product} x${o.qty || 1}`;
      sizeDisplay = o.size || "-";
      colorDisplay = o.color || "-";
    }

    const dateText = formatTimestampToLocal(o.createdAt);

    // اختيار الحالة (select) يسمح للأدمن بتغيير الحالة مباشرة
    const status = o.status || "جديد";
    const selectHtml = `
      <select onchange="updateOrderStatus('${doc.id}', this.value)">
        <option value="جديد" ${status === "جديد" ? "selected" : ""}>جديد</option>
        <option value="قيد التنفيذ" ${status === "قيد التنفيذ" ? "selected" : ""}>قيد التنفيذ</option>
        <option value="تم التسليم" ${status === "تم التسليم" ? "selected" : ""}>تم التسليم</option>
        <option value="ملغي" ${status === "ملغي" ? "selected" : ""}>ملغي</option>
      </select>
    `;

    // Determine status badge class
    const statusClass = status === "جديد" ? "new" :
                       status === "قيد التنفيذ" ? "processing" :
                       status === "تم التسليم" ? "delivered" :
                       status === "ملغي" ? "cancelled" : "";

    const statusBadge = `<span class="status-badge ${statusClass}">${escapeHtml(status)}</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(o.fullname || o.customer || "-")}</td>
      <td>${escapeHtml(o.phone || "-")}</td>
      <td>${escapeHtml(o.email || "-")}</td>
      <td>${escapeHtml(o.paymentMethod || o.payment || "-")}</td>
      <td style="max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(itemsText)}">${escapeHtml(itemsText)}</td>
      <td>${escapeHtml(sizeDisplay || "-")}</td>
      <td>${escapeHtml(colorDisplay || "-")}</td>
      <td>${isNaN(total) ? "-" : (total + " ج")}</td>
      <td>${escapeHtml(dateText)}</td>
      <td>${statusBadge}</td>
      <td>${selectHtml}</td>
    `;
    tbody.appendChild(tr);
  });

  // تحديث البطاقات الإحصائية
  const newOrdersEl = $("#newOrders");
  const totalSalesEl = $("#totalSales");
  const deliveredOrdersEl = $("#deliveredOrders");
  if (newOrdersEl) newOrdersEl.innerText = newOrders;
  if (totalSalesEl) totalSalesEl.innerText = (Math.round(totalSales * 100) / 100) + " ج";
  if (deliveredOrdersEl) deliveredOrdersEl.innerText = deliveredOrdersCount;

  // نحدّث الرسم البياني بالبيانات الجديدة
  updateSalesChartFromOrders(snapshot.docs.map(d => ({ id: d.id, data: d.data() })));
});

// ---------------------------
// 13) تحديث حالة الطلب (من قائمة الاختيار في كل صف)
// ---------------------------
window.updateOrderStatus = async function (orderId, newStatus) {
  try {
    await db.collection("orders").doc(orderId).update({
      status: newStatus,
      statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    toast("✅ تم تحديث حالة الطلب إلى: " + newStatus);
  } catch (err) {
    console.error("خطأ أثناء تحديث حالة الطلب:", err);
    toast("❌ حدث خطأ أثناء تحديث حالة الطلب", "error");
  }
};

// ---------------------------
// 14) بحث وفلترة الطلبات
// ---------------------------
window.searchOrders = function () {
  const q = ($("#searchOrders") ? $("#searchOrders").value.toLowerCase() : "");
  $$("#ordersBody tr").forEach(tr => {
    tr.style.display = tr.innerText.toLowerCase().includes(q) ? "" : "none";
  });
};

window.filterOrders = function () {
  const f = ($("#orderFilter") ? $("#orderFilter").value : "الكل");
  $$("#ordersBody tr").forEach(tr => {
    const status = tr.cells[9] ? tr.cells[9].innerText : ""; // عمود الحالة هو العمود التاسع (index 9)
    tr.style.display = (f === "الكل" || status === f) ? "" : "none";
  });
};

// ---------------------------
// 15) تصدير الطلبات CSV
// ---------------------------
window.exportOrders = function () {
  const rows = [["اسم العميل", "الهاتف", "البريد", "طريقة الدفع", "المنتجات", "المقاس", "اللون", "الإجمالي", "التاريخ", "الحالة"]];
  $$("#ordersBody tr").forEach(tr => {
    const cols = Array.from(tr.cells).map(td => td.innerText.replace(/"/g, '""'));
    rows.push(cols);
  });
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
};

// ---------------------------
// 16) Analytics - Chart.js (مبيعات آخر 12 شهراً)
// ---------------------------

let salesChart = null;
let advancedSalesChart = null;

// تهيئة الرسم البياني
function initSalesChart() {
  const ctx = document.getElementById("salesChart");
  if (!ctx) return;
  const labels = getLast12MonthsLabels();
  const data = {
    labels,
    datasets: [{
      label: "مبيعات (ج)",
      data: labels.map(() => 0),
      backgroundColor: "rgba(33,150,243,0.12)",
      borderColor: "rgba(33,150,243,1)",
      borderWidth: 2,
      fill: true
    }]
  };
  salesChart = new Chart(ctx, {
    type: "line",
    data,
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // ملء ابتدائي من البيانات الحالية في Firestore
  db.collection("orders").get().then(snapshot => {
    const orders = snapshot.docs.map(d => d.data());
    const monthly = computeMonthlyTotals(orders);
    updateChartData(monthly);
  }).catch(err => console.warn("init sales chart err", err));
}

// ترتيب التسميات لآخر 12 شهرًا
function getLast12MonthsLabels() {
  const labels = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString('default', { month: 'short', year: 'numeric' }));
  }
  return labels;
}

// حساب إجمالي المبيعات لكل شهر بناءً على حقل createdAt و total أو حسب عناصر الطلب
function computeMonthlyTotals(orders) {
  const now = new Date();
  const buckets = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets[`${d.getFullYear()}-${d.getMonth()}`] = 0;
  }
  orders.forEach(o => {
    if (!o.createdAt) return;
    const dt = o.createdAt.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt);
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    let total = Number(o.total || 0);
    if (!total && Array.isArray(o.items)) {
      total = o.items.reduce((acc, it) => {
        const p = Number(it.price || it.unitPrice || 0);
        const q = Number(it.quantity || it.qty || 1);
        return acc + (isNaN(p) ? 0 : p) * (isNaN(q) ? 1 : q);
      }, 0);
    }
    // Exclude canceled orders from monthly totals
    if (o.status !== "ملغي") {
      if (key in buckets) buckets[key] += isNaN(total) ? 0 : total;
    }
  });
  // إنشاء المصفوفة بالترتيب الزمني
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    result.push(Math.round((buckets[key] || 0) * 100) / 100);
  }
  return result;
}

// تحديت بيانات الرسم
function updateChartData(monthlyTotals) {
  if (!salesChart) return;
  salesChart.data.datasets[0].data = monthlyTotals;
  salesChart.update();
}

// تحديث من snapshot الطلبات
function updateSalesChartFromOrders(orderDocs) {
  const orders = orderDocs.map(d => d.data);
  const monthly = computeMonthlyTotals(orders);
  updateChartData(monthly);
}

// ---------------------------
// 16.1) Advanced Analytics - Pie Chart for Order Statuses
// ---------------------------

// حساب توزيع حالات الطلبات
function computeStatusCounts(orders) {
  const counts = { 'جديد': 0, 'قيد التنفيذ': 0, 'تم التسليم': 0, 'ملغي': 0 };
  orders.forEach(o => {
    const status = o.status || 'جديد';
    if (counts[status] !== undefined) counts[status]++;
  });
  return counts;
}

// تحديث بيانات الرسم البياني المتقدم
function updateAdvancedChartData(statusCounts) {
  if (!advancedSalesChart) return;
  const labels = ['جديد', 'قيد التنفيذ', 'تم التسليم', 'ملغي'];
  const data = labels.map(label => statusCounts[label] || 0);
  advancedSalesChart.data.labels = labels;
  advancedSalesChart.data.datasets[0].data = data;
  advancedSalesChart.update();
}

// تهيئة الرسم البياني المتقدم (توزيع حالات الطلبات)
function initAdvancedSalesChart() {
  const ctx = document.getElementById("advancedSalesChart");
  if (!ctx) return;

  const labels = ['جديد', 'قيد التنفيذ', 'تم التسليم', 'ملغي'];
  const colors = ['#FF6384', '#36A2EB', '#4CAF50', '#F44336'];
  const data = {
    labels,
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: colors,
      borderColor: colors.map(c => c.replace('1)', '0.8)')),
      borderWidth: 2,
      hoverBorderWidth: 3
    }]
  };
  advancedSalesChart = new Chart(ctx, {
    type: 'doughnut',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  });

  // ملء ابتدائي من البيانات الحالية في Firestore
  db.collection("orders").get().then(snapshot => {
    const orders = snapshot.docs.map(d => d.data());
    const statusCounts = computeStatusCounts(orders);
    updateAdvancedChartData(statusCounts);
  }).catch(err => console.warn("init advanced sales chart err", err));
}

// ---------------------------
// 17) Sidebar Navigation
// ---------------------------
function initSidebar() {
  const sidebar = $("#sidebar");
  const sidebarToggle = $("#sidebarToggle");
  const navLinks = $$(".nav-link");

  // Toggle sidebar on mobile
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }

  // Handle navigation
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const sectionId = link.getAttribute("data-section");

      // Remove active class from all links
      navLinks.forEach(l => l.classList.remove("active"));
      // Add active class to clicked link
      link.classList.add("active");

      // Hide all sections
      $$(".section").forEach(section => section.classList.remove("active"));
      // Show selected section
      const targetSection = $("#" + sectionId);
      if (targetSection) targetSection.classList.add("active");

      // Close sidebar on mobile after navigation
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("show");
      }
    });
  });
}

// ---------------------------
// 18) Logout
// ---------------------------
window.logout = function () {
  if (confirm("هل تريد تسجيل الخروج؟")) {
    // لو تستخدم Firebase Auth يمكنك إلغاء التعليق:
    // auth.signOut().then(()=> window.location.href="login.html");
    window.location.href = "index.html";
  }
};


/* انتهى ملف admin.js (مشروح) */
