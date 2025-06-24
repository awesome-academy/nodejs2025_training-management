function showToast({ type = 'info', title, message, duration = 3000 }) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle',
    }[type];

    toast.innerHTML = `
          <i class="fas fa-${icon} toast-icon"></i>
          <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
          </div>
          <i class="fas fa-times toast-close"></i>
        `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    });
}

function handleError(error) {
    console.error('Error:', error);

    if (error.status === 401) {
        showToast({
            type: 'error',
            title: 'Phiên đăng nhập hết hạn',
            message: 'Vui lòng đăng nhập lại để tiếp tục',
            duration: 3000,
        });

        setTimeout(() => {
            window.location.href = '/views/auth';
        }, 3000);
        return;
    }

    showToast({
        type: 'error',
        title: 'Đã có lỗi xảy ra',
        message: error.message || 'Vui lòng thử lại sau',
        duration: 5000,
    });
}

async function checkLoginStatus() {
    try {
        const response = await fetch('/auth/status', {
            method: 'GET',
            credentials: 'include',
        });

        const data = await response.json();

        if (data.statusCode === 200 && data.data === true) {
            document.body.classList.add('logged-in');
            const loginText = document.querySelector('.login-text');
            if (loginText) {
                loginText.style.display = 'none';
            }
        } else {
            document.body.classList.remove('logged-in');
            const loginText = document.querySelector('.login-text');
            if (loginText) {
                loginText.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        document.body.classList.remove('logged-in');
        const loginText = document.querySelector('.login-text');
        if (loginText) {
            loginText.style.display = 'none';
        }
    }
}

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

document.addEventListener('DOMContentLoaded', () => {
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

    const editProfileBtn = document.querySelector('a[data-bs-target="#editProfileModal"]');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function (e) {
            e.preventDefault();
            openEditProfileModal();
        });
    }

    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const name = document.getElementById('profileName').value.trim();
            const email = document.getElementById('profileEmail').value.trim();
            const errorBox = document.getElementById('editProfileError');
            errorBox.textContent = '';
            if (!name || !email) {
                errorBox.textContent = 'Vui lòng nhập đầy đủ thông tin.';
                return;
            }
            try {
                const btn = this.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Lưu...';
                const res = await fetch('/users', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email }),
                });
                const data = await res.json();
                if (data.statusCode === 200) {
                    showChangePasswordToast('success', 'Cập nhật hồ sơ thành công!');
                    const modalEl = document.getElementById('editProfileModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) {
                        modal.hide();
                    }
                    // Đảm bảo backdrop luôn được xóa khi modal đóng
                    modalEl.addEventListener('hidden.bs.modal', function cleanupBackdrop() {
                        document.body.classList.remove('modal-open');
                        document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
                        modalEl.removeEventListener('hidden.bs.modal', cleanupBackdrop);
                    });
                } else {
                    let msg = data.messages || data.message || 'Có lỗi xảy ra.';
                    errorBox.textContent = Array.isArray(msg) ? msg.join('\n') : msg;
                }
            } catch (err) {
                errorBox.textContent = 'Có lỗi xảy ra. Vui lòng thử lại.';
            } finally {
                const btn = this.querySelector('button[type="submit"]');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save me-2"></i>Lưu thay đổi';
            }
        });
    }

    const editProfileModal = document.getElementById('editProfileModal');
    if (editProfileModal) {
        editProfileModal.addEventListener('hidden.bs.modal', function cleanupBackdrop() {
            document.getElementById('editProfileForm').reset();
            document.getElementById('editProfileError').textContent = '';
            document.body.classList.remove('modal-open');
            document.querySelectorAll('.modal-backdrop').forEach(function(bd) { bd.remove(); });
        });
    }
});

async function openEditProfileModal() {
    const nameInput = document.getElementById('profileName');
    const emailInput = document.getElementById('profileEmail');
    const errorBox = document.getElementById('editProfileError');
    nameInput.value = '';
    emailInput.value = '';
    errorBox.textContent = '';
    try {
        const res = await fetch('/users/me');
        const data = await res.json();
        if (data.statusCode === 200 && data.data) {
            nameInput.value = data.data.name || '';
            emailInput.value = data.data.email || '';
        } else {
            errorBox.textContent = 'Không thể lấy thông tin người dùng.';
        }
    } catch (err) {
        errorBox.textContent = 'Không thể lấy thông tin người dùng.';
    }
    const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    modal.show();
}
