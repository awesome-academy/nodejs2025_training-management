function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || '';
}

document.addEventListener('DOMContentLoaded', function () {
    const email = getQueryParam('email');
    const code = getQueryParam('code');
    document.getElementById('resetEmail').value = email;
    document.getElementById('resetCode').value = code;

    const form = document.getElementById('resetPasswordForm');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const password = document.getElementById('resetPassword').value.trim();
            const passwordConfirm = document.getElementById('resetPasswordConfirm').value.trim();
            const errorBox = document.getElementById('resetPasswordError');
            errorBox.textContent = '';
            if (!password || !passwordConfirm) {
                errorBox.textContent = 'Vui lòng nhập đầy đủ thông tin.';
                return;
            }
            if (password.length < 6) {
                errorBox.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
                return;
            }
            if (password !== passwordConfirm) {
                errorBox.textContent = 'Xác nhận mật khẩu mới không khớp.';
                return;
            }
            if (!email || !code) {
                errorBox.textContent = 'Thiếu thông tin email hoặc mã xác thực.';
                return;
            }
            try {
                const btn = this.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang đổi...';
                const res = await fetch('/auth/updatePasswdByCode', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code, password, environment: 'SUPERVISOR' }),
                });
                const data = await res.json();
                if (data.statusCode === 200 || data.statusCode === 201) {
                    errorBox.classList.remove('text-danger');
                    errorBox.classList.add('text-success');
                    errorBox.textContent = 'Đổi mật khẩu thành công! Đang chuyển về trang đăng nhập...';
                    setTimeout(() => {
                        window.location.href = '/views/supervisor/auth?mode=login';
                    }, 2000);
                } else {
                    let msg = data.messages || data.message || 'Có lỗi xảy ra.';
                    errorBox.classList.remove('text-success');
                    errorBox.classList.add('text-danger');
                    errorBox.textContent = Array.isArray(msg) ? msg.join('\n') : msg;
                }
            } catch (err) {
                errorBox.classList.remove('text-success');
                errorBox.classList.add('text-danger');
                errorBox.textContent = 'Có lỗi xảy ra. Vui lòng thử lại.';
            } finally {
                const btn = this.querySelector('button[type="submit"]');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Đổi mật khẩu';
            }
        });
    }
});
