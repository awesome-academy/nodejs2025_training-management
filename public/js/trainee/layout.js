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
                loginText.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        document.body.classList.remove('logged-in');
        const loginText = document.querySelector('.login-text');
        if (loginText) {
            loginText.style.display = 'block';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
});
