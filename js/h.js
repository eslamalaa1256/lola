// Firebase is already initialized in js/header.js
const db = firebase.firestore();
// auth is already declared in js/header.js

// ============================
// المتغيرات العامة
// ============================
let product = null;
let selectedSize = null;
let selectedColor = null;
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
let qty = 1;
let currentUser = null;

// ============================
// العناصر في الـ DOM
// ============================
const mainImg = document.getElementById("mainImg");
const thumbnailContainer = document.getElementById("thumbnailContainer");
const productNameEl = document.getElementById("productName");
const productDescEl = document.getElementById("productDesc");
const productPriceEl = document.getElementById("productPrice");
const sizesContainer = document.getElementById("sizesContainer");
const colorsContainer = document.getElementById("colorsContainer");
const qtyInput = document.getElementById("qty");
const stickyQtyInput = document.getElementById("stickyQty");
const cartCountEl = document.getElementById("cart-count");
const wishlistCountEl = document.getElementById("wishlist-count");
const reviewsList = document.getElementById("reviewsList");
const totalReviewsCount = document.getElementById("totalReviewsCount");
const toast = document.getElementById("toast");
const productFullDescEl = document.getElementById("productFullDescription");

const staticSizes = ["41","42","43","44","45"];
const staticColors = ["أحمر","أزرق","أخضر","أسود","أبيض"];

// ============================
// Auth state
// ============================
auth.onAuthStateChanged(async user => {
  currentUser = user;
  if(user) await mergeWishlist();
  updateUserUI();
  updateWishlistCount();
});

// ============================
// تحديث واجهة المستخدم
// ============================
function updateUserUI(){
  const loginBtn = document.getElementById("loginBtn");
  const userIcon = document.getElementById("userIcon");
  if(currentUser){
    loginBtn.style.display="none";
    userIcon.style.display="flex";
  } else {
    loginBtn.style.display="inline-block";
    userIcon.style.display="none";
  }
}

// ============================
// تحميل تفاصيل المنتج
// ============================
async function loadProductDetails(){
  if(!productId){
    document.querySelector(".container").innerHTML = "<p>⚠️ لم يتم العثور على المنتج</p>";
    return;
  }

  const docSnap = await db.collection("products").doc(productId).get();
  if(!docSnap.exists){
    document.querySelector(".container").innerHTML = "<p>❌ المنتج غير موجود</p>";
    return;
  }

  product = docSnap.data();

  // البيانات الأساسية
  productNameEl.textContent = product.name || "اسم المنتج";
  productDescEl.textContent = product.shortDesc || product.description || "وصف المنتج";
  productPriceEl.textContent = `${product.price} ج.م`;
  document.getElementById("stickyProductName").textContent = product.name || "اسم المنتج";
  document.getElementById("stickyProductPrice").textContent = `${product.price} ج.م`;

  if(productFullDescEl) productFullDescEl.textContent = product.fullDesc || "لا يوجد وصف إضافي";

  // المقاسات
  sizesContainer.innerHTML="";
  staticSizes.forEach(size=>{
    const btn=document.createElement("button");
    btn.textContent=size;
    btn.onclick=()=>selectSize(size,btn);
    sizesContainer.appendChild(btn);
  });

  // الألوان
  colorsContainer.innerHTML="";
  staticColors.forEach(color=>{
    const btn=document.createElement("button");
    btn.textContent=color;
    btn.onclick=()=>selectColor(color,btn);
    colorsContainer.appendChild(btn);
  });

  // الصور
  if(product.image) mainImg.src=product.image;
  else if(product.images?.length>0){
    mainImg.src=product.images[0];
    thumbnailContainer.innerHTML="";
    product.images.forEach(img=>{
      const thumb=document.createElement("img");
      thumb.src=img;
      thumb.className="thumbnail";
      thumb.onclick=()=>mainImg.src=img;
      thumbnailContainer.appendChild(thumb);
    });
  }

  // التقييمات
  loadReviews(product.reviews||[]);
  updateCartCount();
  updateWishlistCount();
}

// ============================
// التقييمات
// ============================
function loadReviews(reviews){
  reviewsList.innerHTML="";
  totalReviewsCount.innerText=reviews.length;
  reviews.forEach(r=>{
    const div=document.createElement("div");
    div.className="review";
    let stars="";
    for(let i=1;i<=5;i++) stars+=i<=r.rating?"★":"☆";
    let imagesHtml="";
    if(r.images?.length>0){
      imagesHtml='<div class="review-images">';
      r.images.forEach(img=>imagesHtml+=`<img src="${img}" alt="صورة التقييم" />`);
      imagesHtml+="</div>";
    }
    div.innerHTML=`<strong>${r.user||"Anonymous"}</strong> - <span class="stars">${stars}</span><p>${r.comment}</p>${imagesHtml}`;
    reviewsList.appendChild(div);
  });
}

// إرسال تقييم
document.getElementById("reviewForm")?.addEventListener("submit", async function(e){
  e.preventDefault();
  const rating=parseInt(document.getElementById("rating").value);
  const comment=document.getElementById("comment").value;
  const imagesInput=document.getElementById("images");
  let uploadedImages=[];
  if(imagesInput.files.length>0){
    for(let i=0;i<imagesInput.files.length;i++){
      uploadedImages.push(URL.createObjectURL(imagesInput.files[i]));
    }
  }
  if(!rating || !comment) return;
  const newReview={user:"Anonymous",rating,comment,images:uploadedImages};
  if(!product.reviews) product.reviews=[];
  product.reviews.push(newReview);
  await db.collection("products").doc(productId).update({reviews: product.reviews});
  loadReviews(product.reviews);
  showToast("تم إرسال التقييم");
  document.getElementById("reviewForm").reset();
});

// ============================
// وظائف المساعدة
// ============================
function selectSize(size,btn){
  selectedSize=size;
  document.querySelectorAll("#sizesContainer button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
}

function selectColor(color,btn){
  selectedColor=color;
  document.querySelectorAll("#colorsContainer button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
}

function changeQty(amount){
  qty+=amount;
  if(qty<1) qty=1;
  qtyInput.value=qty;
  stickyQtyInput.value=qty;
}

function showToast(msg){
  if(!toast) return;
  toast.textContent=msg;
  toast.className="toast show";
  setTimeout(()=>toast.className="toast",3000);
}

// ============================
// السلة (Cart)
// ============================
function addToCart(){
  if(!productId){ showToast("❌ خطأ في تحديد المنتج"); return; }
  if(!selectedSize){ showToast("الرجاء اختيار المقاس"); return; }
  if(!selectedColor){ showToast("الرجاء اختيار اللون"); return; }

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing=cart.find(item=>item.id===productId && item.size===selectedSize && item.color===selectedColor);
  if(existing) existing.quantity+=qty;
  else cart.push({id:productId,name:product.name,price:product.price,image:mainImg.src,size:selectedSize,color:selectedColor,quantity:qty});
  localStorage.setItem("cart",JSON.stringify(cart));
  showToast(`${product.name} تم إضافته للسلة`);
  updateCartCount();
}

function updateCartCount(){
  cartCountEl.innerText=(JSON.parse(localStorage.getItem("cart"))||[]).reduce((acc,item)=>acc+(item.quantity||1),0);
}

// ============================
// المفضلة (Wishlist)
// ============================
async function toggleWishlist(){
  if(!productId){ showToast("❌ خطأ في تحديد المنتج"); return; }
  const productItem={id:productId,name:product.name,price:product.price,image:mainImg.src};

  if(currentUser){
    const ref=db.collection("users").doc(currentUser.uid).collection("wishlist").doc(productId);
    const docSnap=await ref.get();
    if(docSnap.exists){ await ref.delete(); showToast(`${product.name} تم إزالته من المفضلة`); }
    else{ await ref.set(productItem); showToast(`${product.name} تم إضافته للمفضلة`); }
  } else {
    let wishlist=JSON.parse(localStorage.getItem("wishlist")||"[]");
    const existing=wishlist.find(i=>i.id===productId);
    if(existing){ wishlist=wishlist.filter(i=>i.id!==productId); showToast(`${product.name} تم إزالته من المفضلة`); }
    else{ wishlist.push(productItem); showToast(`${product.name} تم إضافته للمفضلة`); }
    localStorage.setItem("wishlist",JSON.stringify(wishlist));
  }
  updateWishlistCount();
}

async function updateWishlistCount(){
  let count=0;
  if(currentUser){
    const snapshot=await db.collection("users").doc(currentUser.uid).collection("wishlist").get();
    count=snapshot.size;
  } else count=(JSON.parse(localStorage.getItem("wishlist"))||[]).length;
  if(wishlistCountEl) wishlistCountEl.innerText=count;
}

async function mergeWishlist(){
  const localWishlist=JSON.parse(localStorage.getItem("wishlist")||"[]");
  if(!currentUser || localWishlist.length===0) return;
  const ref=db.collection("users").doc(currentUser.uid).collection("wishlist");
  for(const item of localWishlist) await ref.doc(item.id).set(item);
  localStorage.removeItem("wishlist");
}

// ============================
// مشاركة المنتج
// ============================
function share(platform){
  const url=window.location.href;
  const text=`تحقق من هذا المنتج: ${product.name} - ${url}`;
  switch(platform){
    case "facebook": window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,"_blank"); break;
    case "instagram": navigator.clipboard.writeText(text).then(()=>showToast("تم نسخ الرابط للإنستغرام")); break;
    case "whatsapp": window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank"); break;
  }
}

// ============================
// الحجم التفصيلي (Size Guide Modal)
// ============================
function toggleSizeGuide(){
  const modal=document.getElementById("sizeModal");
  if(!modal) return;
  const sizeTable=`<table style="width:100%; border-collapse:collapse; text-align:center; margin-top:10px;">
    ${product?.category==="أحذية" ? 
      `<tr><th>EU</th><th>CM</th></tr>
       <tr><td>40</td><td>25.5</td></tr>
       <tr><td>41</td><td>26</td></tr>
       <tr><td>42</td><td>26.5</td></tr>
       <tr><td>43</td><td>27</td></tr>
       <tr><td>44</td><td>27.5</td></tr>` :
      `<tr><th>المقاس</th><th>الصدّر (CM)</th><th>الطول (CM)</th></tr>
       <tr><td>S</td><td>90-95</td><td>65-68</td></tr>
       <tr><td>M</td><td>96-100</td><td>69-72</td></tr>
       <tr><td>L</td><td>101-105</td><td>73-76</td></tr>
       <tr><td>XL</td><td>106-110</td><td>77-80</td></tr>`}
  </table>`;
  document.getElementById("sizeTable").innerHTML=sizeTable;
  modal.style.display="flex";
}

function closeSizeModal(){ document.getElementById("sizeModal").style.display="none"; }

// ============================
// Init
// ============================
document.addEventListener("DOMContentLoaded",()=>{
  loadProductDetails();
  updateCartCount();
  updateWishlistCount();

  document.getElementById("mainAddToCartBtn")?.addEventListener("click",addToCart);
  document.getElementById("wishlistBtn")?.addEventListener("click",toggleWishlist);
});
