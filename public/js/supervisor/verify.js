const userEmail = localStorage.getItem('userEmail');
if (userEmail) {
    document.getElementById('userEmail').textContent = userEmail;
} else {
    window.location.href = '/supervisor/auth';
}

function showNotification(type, title, message) {
    const container = document.getElementById('notificationsContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const titleElement = document.createElement('div');
    titleElement.className = 'notification-title';
    titleElement.textContent = title;

    const messageElement = document.createElement('div');
    messageElement.className = 'notification-message';
    messageElement.textContent = message;

    notification.appendChild(titleElement);
    notification.appendChild(messageElement);

    container.appendChild(notification);

    notification.offsetHeight;

    notification.classList.add('show');

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, 3000);
}

function showLoading() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      `;

    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;

    document.head.appendChild(style);
    loadingOverlay.appendChild(spinner);
    document.body.appendChild(loadingOverlay);
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

const inputs = document.querySelectorAll('.verification-input');

inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');

        if (e.target.value.length === 1 && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            inputs[index - 1].focus();
        }
    });

    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');

        if (pastedData.length === 6) {
            inputs.forEach((input, i) => {
                input.value = pastedData[i];
            });
            inputs[5].focus();
        }
    });
});

document.getElementById('verifyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = Array.from(inputs)
        .map((input) => input.value)
        .join('');

    try {
        showLoading();
        const response = await fetch('/auth/verifyCode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userEmail,
                code: parseInt(code),
            }),
        });

        const data = await response.json();

        if (data.statusCode === 200 || data.statusCode === 201) {
            showNotification('success', 'Thành công', 'Xác thực thành công');
            localStorage.removeItem('userEmail');
            setTimeout(() => {
                window.location.href = '/views/supervisor/auth?mode=login';
            }, 1500);
        } else {
            showNotification('error', 'Lỗi', data.message || 'Mã xác thực không đúng');
            inputs.forEach((input) => {
                input.value = '';
            });
            inputs[0].focus();
        }
    } catch (error) {
        showNotification('error', 'Lỗi', 'Đã xảy ra lỗi không xác định');
    } finally {
        hideLoading();
    }
});

document.getElementById('resendCode').addEventListener('click', async () => {
    try {
        showLoading();
        const response = await fetch('/supervisor/resend-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userEmail,
            }),
        });

        const data = await response.json();

        if (data.statusCode === 200) {
            showNotification('success', 'Thành công', 'Đã gửi lại mã xác thực');
        } else {
            showNotification('error', 'Lỗi', data.message || 'Không thể gửi lại mã xác thực');
        }
    } catch (error) {
        showNotification('error', 'Lỗi', 'Đã xảy ra lỗi không xác định');
    } finally {
        hideLoading();
    }
});
