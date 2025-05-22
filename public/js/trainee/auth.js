const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');

let isLogin = true;

if (mode && mode === 'register') isLogin = false;
let notificationCount = 0;

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

function handlePageTransition(event) {
    event.preventDefault();
    const href = event.currentTarget.href;
    const transition = document.getElementById('pageTransition');

    transition.classList.add('active');

    setTimeout(() => {
        window.location.href = href;
    }, 500);
}

document.getElementById('authForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        environment: 'TRAINEE',
        role: 'TRAINEE',
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
                window.location.href = '/views/home';
            } else {
                window.location.href = '/views/auth?mode=login';
            }
        }, 1000);
    } catch (error) {
        createNotification(error.message, 'error');
    }
});
