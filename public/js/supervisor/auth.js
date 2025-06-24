let notificationCount = 0;

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');

let isLogin = true;

if (mode && mode === 'register') isLogin = false;

function createNotification(message, type) {
    const container = document.getElementById('notificationsContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.order = notificationCount++;

    container.appendChild(notification);

    notification.offsetHeight;

    notification.classList.add('show');

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            container.removeChild(notification);
            notificationCount--;
        }, 300);
    }, 3000);
}

document.getElementById('authForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        environment: 'SUPERVISOR',
        role: 'SUPERVISOR',
    };

    if (!isLogin) {
        formData.name = document.getElementById('name').value;
    }

    const url = isLogin ? '/auth/login' : '/auth/signUp';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
            credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Có lỗi xảy ra');
        }

        createNotification(isLogin ? 'Đăng nhập thành công!' : 'Đăng ký thành công!', 'success');

        setTimeout(() => {
            if (isLogin) {
                window.location.href = '/views/supervisor';
            } else {
                localStorage.setItem('userEmail', formData.email);
                window.location.href = '/views/supervisor/verify';
            }
        }, 1000);
    } catch (error) {
        createNotification(error.message, 'error');
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value.trim();
            const errorBox = document.getElementById('forgotPasswordError');
            errorBox.textContent = '';
            if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                errorBox.textContent = 'Vui lòng nhập email hợp lệ.';
                return;
            }
            try {
                const btn = this.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang gửi...';
                const res = await fetch('/auth/forgotPassword', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const data = await res.json();
                if ((data.statusCode === 200 || data.statusCode === 201) && data.data === true) {
                    errorBox.classList.remove('text-danger');
                    errorBox.classList.add('text-success');
                    errorBox.textContent = 'Yêu cầu thành công! Vui lòng kiểm tra email.';
                    setTimeout(() => {
                        bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal')).hide();
                        forgotForm.reset();
                        errorBox.textContent = '';
                        errorBox.classList.remove('text-success');
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
                btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Gửi yêu cầu';
            }
        });
        document.getElementById('forgotPasswordModal').addEventListener('hidden.bs.modal', function () {
            forgotForm.reset();
            const errorBox = document.getElementById('forgotPasswordError');
            errorBox.textContent = '';
            errorBox.classList.remove('text-success');
            errorBox.classList.remove('text-danger');
        });
    }
});
