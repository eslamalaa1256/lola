// تحديث عدد العناصر في الهيدر
function updateHeaderCounts() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

    const cartCount = document.getElementById('cart-count');
    const wishlistCount = document.getElementById('wishlist-count');

    if (cartCount) {
        cartCount.innerText = cart.length;
        cartCount.style.display = cart.length > 0 ? 'inline-block' : 'none';
    }
    if (wishlistCount) {
        wishlistCount.innerText = wishlist.length;
        wishlistCount.style.display = wishlist.length > 0 ? 'inline-block' : 'none';
    }
}

// تمرير سلس لجدول المحتويات
document.addEventListener('DOMContentLoaded', function() {
    const tocLinks = document.querySelectorAll('.toc a');
    tocLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // استدعاء الدالة عند تحميل الصفحة
    updateHeaderCounts();
});
