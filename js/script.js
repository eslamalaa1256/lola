// Firebase is already initialized in js/header.js
const db = firebase.firestore();
// auth is already declared in js/header.js

let currentUser = null;

auth.onAuthStateChanged(user => {
  currentUser = user;
  updateCounts();
});

// ================= Helpers =================
function getData(key, defaultValue=[]) { 
  try{ 
    const data=localStorage.getItem(key); 
    return data?JSON.parse(data):defaultValue;
  } catch(e){ return defaultValue; } 
}
function setData(key, value){ 
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} 
}
function showToast(msg,duration=3000){ 
  const t=document.getElementById('toast'); 
  t.textContent=msg; t.classList.add('show'); 
  setTimeout(()=>t.classList.remove('show'),duration); 
}
function createRating(r){ 
  let full=Math.floor(r),half=r%1>=0.5,html=''; 
  for(let i=0;i<full;i++) html+='<i class="fas fa-star"></i>'; 
  if(half) html+='<i class="fas fa-star-half-alt"></i>'; 
  for(let i=0;i<5-full-(half?1:0);i++) html+='<i class="far fa-star"></i>'; 
  return html; 
}

// ================= Products =================
let allProducts=[];
function loadProducts(){
  db.collection("products").onSnapshot(snapshot=>{
    allProducts=[];
    snapshot.forEach(doc=>allProducts.push({id:doc.id,...doc.data()}));
    displayProducts(allProducts);
  });
}

function displayProducts(products){
  const grid=document.getElementById('product-grid'); grid.innerHTML='';
  if(products.length===0){ grid.innerHTML='<div>لا توجد منتجات مطابقة</div>'; return; }
  products.forEach(p=>{
    const card=document.createElement('div'); 
    card.classList.add('product-card'); 
    card.dataset.id=p.id; 
    card.dataset.price=p.price; 
    card.dataset.category=p.category||'all';
    card.innerHTML=`
      <img src="${p.image||'https://via.placeholder.com/300x220'}" alt="${p.name}">
      <button class="add-to-fav"><i class="fas fa-heart"></i></button>
      <h3>${p.name}</h3>
      <p>${p.price} ج</p>
      <div class="rating">${createRating(p.rating||0)} <span>(${p.reviews||0} تقييم)</span></div>
      <div class="actions"><button class="add-to-cart"><i class="fas fa-shopping-cart"></i></button></div>`;
    card.querySelector('.add-to-cart').addEventListener('click',e=>{ e.stopPropagation(); addToCart(p); });
    card.querySelector('.add-to-fav').addEventListener('click',e=>{ e.stopPropagation(); toggleFav(p,card); });
    grid.appendChild(card);
  });
  updateFavoritesUI(); updateCounts();
}

function addToCart(p){
  const item = { id: p.id, name: p.name, price: p.price, image: p.image, quantity: 1, size: p.size || '', color: p.color || '' };
  if (currentUser) {
    // save to Firestore
    db.collection("users").doc(currentUser.uid).collection("cart").doc(p.id).set(item, { merge: true }).then(() => {
      showToast("✅ تمت إضافة المنتج إلى السلة");
      updateCounts();
    });
  } else {
    // localStorage
    let cart = getData('cart', []);
    const i = cart.findIndex(x => x.id === p.id);
    if (i > -1) {
      cart[i].quantity = (cart[i].quantity || 1) + 1;
      showToast("🛒 تم زيادة كمية المنتج في السلة");
    } else {
      cart.push(item);
      showToast("✅ تمت إضافة المنتج إلى السلة");
    }
    setData('cart', cart);
    updateCounts();
  }
}

function toggleFav(p,card){ 
  let fav=getData('favorites',[]); 
  const i=fav.findIndex(x=>x.id===p.id); 
  if(i===-1){ fav.push(p); card.querySelector('.add-to-fav').classList.add('active'); showToast("❤️ تمت إضافة المنتج للمفضلة"); } 
  else{ fav.splice(i,1); card.querySelector('.add-to-fav').classList.remove('active'); showToast("تمت إزالة المنتج من المفضلة"); } 
  setData('favorites',fav); updateCounts(); 
}

function updateFavoritesUI(){ 
  const fav=getData('favorites',[]); 
  document.querySelectorAll('.product-card').forEach(c=>{ 
    const id=c.dataset.id; 
    if(fav.some(x=>x.id===id)) c.querySelector('.add-to-fav').classList.add('active'); 
    else c.querySelector('.add-to-fav').classList.remove('active'); 
  }); 
}

function updateCounts(){ 
  const cart=getData('cart',[]),fav=getData('favorites',[]); 
  document.getElementById('cart-count').innerText=cart.reduce((t,i)=>t+(i.quantity||1),0); 
  document.getElementById('wishlist-count').innerText=fav.length; 
}

// ================= Filters =================
function filterAndSearch(){ 
  const term=document.getElementById('search-filter').value.toLowerCase(); 
  const activeBtn=document.querySelector('.filter-btn.active'); 
  const cat=activeBtn?activeBtn.dataset.category||'all':'all'; 
  const filtered=allProducts.filter(p=>(cat==='all'||p.category===cat)&&p.name.toLowerCase().includes(term)); 
  displayProducts(filtered); 
}

function setupFilters(){ 
  document.querySelectorAll('.filter-btn').forEach(btn=>{ 
    btn.addEventListener('click',()=>{ 
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active')); 
      btn.classList.add('active'); 
      filterAndSearch(); 
      if(btn.dataset.sort) sortProducts(btn.dataset.sort); 
    }); 
  }); 
  document.getElementById('search-filter').addEventListener('input',()=>filterAndSearch()); 
}

function sortProducts(type){ 
  const grid=document.getElementById('product-grid'); 
  const cards=Array.from(document.querySelectorAll('.product-card')); 
  cards.sort((a,b)=>type==='price-asc'?parseFloat(a.dataset.price)-parseFloat(b.dataset.price):parseFloat(b.dataset.price)-parseFloat(a.dataset.price)); 
  cards.forEach(c=>grid.appendChild(c)); 
}

// ================= UI =================
function setupBackToTop(){ 
  const btn=document.getElementById('backToTop'); 
  window.addEventListener('scroll',()=>btn.classList.toggle('visible',window.pageYOffset>300)); 
  btn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'})); 
}

function setupFilterToggle(){ 
  const btn=document.getElementById('filterToggle'); 
  const f=document.getElementById('headerFilters'); 
  btn.addEventListener('click',()=>f.classList.toggle('active')); 
}

// ================= Init =================
document.addEventListener('DOMContentLoaded',()=>{
  loadProducts(); setupFilters(); setupBackToTop(); setupFilterToggle(); updateCounts();
});
