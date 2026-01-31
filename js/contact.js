// ===== EmailJS Setup =====
(function () {
    emailjs.init("7mUPTVlVL9Y2Un57z"); // Public Key
})();

// ===== Form Handling =====
const form = document.getElementById('contactForm');
const msg = document.getElementById('formMsg');
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Validation
    if (!validateForm()) {
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الإرسال...';

    emailjs.sendForm('service_LOLA', 'template_xhpxspf', this)
        .then(() => {
            msg.style.display = 'block';
            msg.className = 'success';
            msg.textContent = 'تم استلام رسالتك بنجاح!';
            form.reset();
        }, (error) => {
            msg.style.display = 'block';
            msg.className = 'error';
            msg.textContent = 'حدث خطأ، حاول مرة أخرى.';
            console.error(error);
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'إرسال';
        });
});

// ===== Form Validation =====
function validateForm() {
    const fullname = form.fullname.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    // Clear previous messages
    msg.style.display = 'none';

    if (!fullname) {
        showError('يرجى إدخال الاسم الكامل');
        return false;
    }

    if (!email) {
        showError('يرجى إدخال البريد الإلكتروني');
        return false;
    }

    if (!isValidEmail(email)) {
        showError('يرجى إدخال بريد إلكتروني صحيح');
        return false;
    }

    if (!message) {
        showError('يرجى إدخال الرسالة');
        return false;
    }

    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(message) {
    msg.style.display = 'block';
    msg.className = 'error';
    msg.textContent = message;
}

// ===== Header Functions =====
function updateHeaderCounts() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

    const cartCount = document.getElementById('cart-count');
    const wishlistCount = document.getElementById('wishlist-count');

    if (cartCount) {
        cartCount.innerText = cart.length;
        cartCount.style.display = cart.length > 0 ? 'flex' : 'none';
    }
    if (wishlistCount) {
        wishlistCount.innerText = wishlist.length;
        wishlistCount.style.display = wishlist.length > 0 ? 'flex' : 'none';
    }
}

function doLogin() {
    window.location.href = 'login.html';
}

function logout() {
    localStorage.removeItem('loggedInUser');
    updateHeaderCounts();
    alert("تم تسجيل الخروج");
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', function() {
    updateHeaderCounts();
});
