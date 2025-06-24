AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
});

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.querySelector('.loading-overlay');
    overlay.classList.add('active');
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 1000);
});

const cards = document.querySelectorAll('.card');
cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
        gsap.to(card, {
            y: -10,
            duration: 0.3,
            ease: 'power2.out',
        });
    });
    card.addEventListener('mouseleave', () => {
        gsap.to(card, {
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
        });
    });
});

const dropdowns = document.querySelectorAll('.dropdown');
dropdowns.forEach((dropdown) => {
    dropdown.addEventListener('show.bs.dropdown', () => {
        const menu = dropdown.querySelector('.dropdown-menu');
        gsap.from(menu, {
            y: -20,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out',
        });
    });
});

const buttons = document.querySelectorAll('.btn');
buttons.forEach((button) => {
    button.addEventListener('mouseenter', () => {
        gsap.to(button, {
            scale: 1.05,
            duration: 0.2,
            ease: 'power2.out',
        });
    });
    button.addEventListener('mouseleave', () => {
        gsap.to(button, {
            scale: 1,
            duration: 0.2,
            ease: 'power2.out',
        });
    });
});

function showChangePasswordToast(type, message) {
    if (Array.isArray(message)) {
        message = message.join('\n');
    }
    const toast = document.getElementById('changePasswordToast');
    const toastBody = document.getElementById('changePasswordToastBody');
    toast.className = 'toast';
    toast.classList.add(type);
    toastBody.textContent = message;
    const bsToast = new bootstrap.Toast(toast, { animation: true, autohide: true, delay: 3500 });
    bsToast.show();
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('changePasswordForm');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const oldPassword = document.getElementById('oldPassword').value.trim();
            const newPassword = document.getElementById('newPassword').value.trim();
            const confirmPassword = document.getElementById('confirmPassword').value.trim();
            if (!oldPassword || !newPassword || !confirmPassword) {
                showChangePasswordToast('error', 'Vui lòng nhập đầy đủ thông tin.');
                return;
            }
            if (newPassword.length < 6) {
                showChangePasswordToast('error', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
                return;
            }
            if (newPassword !== confirmPassword) {
                showChangePasswordToast('error', 'Xác nhận mật khẩu mới không khớp.');
                return;
            }
            try {
                const btn = this.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang đổi...';
                const res = await fetch('/auth/updatePasswd', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ oldPassword, newPassword }),
                });
                const data = await res.json();
                if (data.statusCode === 200) {
                    showChangePasswordToast('success', 'Đổi mật khẩu thành công!');
                    this.reset();
                    bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
                } else {
                    let msg = data.messages || data.message || 'Có lỗi xảy ra.';
                    showChangePasswordToast('error', msg);
                }
            } catch (err) {
                showChangePasswordToast('error', 'Có lỗi xảy ra. Vui lòng thử lại.');
            } finally {
                const btn = this.querySelector('button[type="submit"]');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Đổi mật khẩu';
            }
        });
    }
});

// ====== PROFILE EDIT MODAL LOGIC ======
document.addEventListener('DOMContentLoaded', function () {
    const editProfileModal = document.getElementById('editProfileModal');
    const editProfileForm = document.getElementById('editProfileForm');
    const nameInput = document.getElementById('profileName');
    const emailInput = document.getElementById('profileEmail');
    const errorDiv = document.getElementById('editProfileError');

    if (editProfileModal) {
        editProfileModal.addEventListener('show.bs.modal', async function () {
            errorDiv.textContent = '';
            nameInput.value = '';
            emailInput.value = '';
            try {
                const res = await fetch('/users/me');
                const data = await res.json();
                if (data && data.data) {
                    nameInput.value = data.data.name || '';
                    emailInput.value = data.data.email || '';
                }
            } catch (err) {
                errorDiv.textContent = 'Không thể tải thông tin hồ sơ.';
            }
        });
    }

    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            errorDiv.textContent = '';
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            if (!name || !email) {
                errorDiv.textContent = 'Vui lòng nhập đầy đủ họ tên và email.';
                return;
            }
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                errorDiv.textContent = 'Email không hợp lệ.';
                return;
            }
            const btn = editProfileForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';
            try {
                const res = await fetch('/users', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email }),
                });
                const data = await res.json();
                if (data.statusCode === 200) {
                    showChangePasswordToast('success', 'Cập nhật hồ sơ thành công!');
                    bootstrap.Modal.getInstance(editProfileModal).hide();
                    setTimeout(() => {
                        document.body.classList.remove('modal-open');
                        document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
                    }, 400);
                } else {
                    let msg = data.messages || data.message || 'Có lỗi xảy ra.';
                    errorDiv.textContent = Array.isArray(msg) ? msg.join('\n') : msg;
                }
            } catch (err) {
                errorDiv.textContent = 'Có lỗi xảy ra. Vui lòng thử lại.';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save me-2"></i>Lưu thay đổi';
            }
        });
    }
});
