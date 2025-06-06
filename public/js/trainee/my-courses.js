let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let searchQuery = '';
let searchTimeout;

function showLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function fetchCourses() {
    showLoading();
    try {
        const queryParams = new URLSearchParams({
            page: currentPage,
            pageSize: pageSize,
            ...(searchQuery && { name: searchQuery }),
        });

        const url = `/courses/trainee/list?${queryParams}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok && response.status === 401) {
            window.location.href = '/views/auth';
        }

        const responseData = await response.json();

        if (responseData.statusCode === 200 && Array.isArray(responseData.data)) {
            return responseData.data;
        }
        return [];
    } catch (error) {
        showError('Không thể tải danh sách khóa học. Vui lòng thử lại sau.');
        return [];
    } finally {
        hideLoading();
    }
}

// Show error message
function showError(message) {
    const coursesGrid = document.getElementById('coursesGrid');
    coursesGrid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle empty-state-icon"></i>
          <h3 class="empty-state-text">Đã có lỗi xảy ra</h3>
          <p class="empty-state-description">${message}</p>
          <button class="btn btn-primary" onclick="loadCourses()">
            <i class="fas fa-sync-alt mr-2"></i>Thử lại
          </button>
        </div>
      `;
}

// Render courses
function renderCourses(courses) {
    const coursesGrid = document.getElementById('coursesGrid');

    if (!courses || courses.length === 0) {
        const emptyStateHTML = searchQuery
            ? `
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-search"></i>
            </div>
            <h3 class="empty-state-text">Không tìm thấy khóa học nào</h3>
            <p class="empty-state-description">Không có khóa học nào phù hợp với từ khóa "${searchQuery}". Hãy thử tìm kiếm với từ khóa khác!</p>
            <button class="empty-state-button" onclick="clearSearch()">
              <i class="fas fa-redo"></i>Xóa tìm kiếm
            </button>
          </div>
        `
            : `
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-graduation-cap"></i>
            </div>
            <h3 class="empty-state-text">Bạn chưa đăng ký khóa học nào</h3>
            <p class="empty-state-description">Hãy khám phá các khóa học mới và bắt đầu học ngay hôm nay!</p>
            <a href="/views/courses" class="empty-state-button">
              <i class="fas fa-search"></i>Khám phá khóa học
            </a>
          </div>
        `;
        coursesGrid.innerHTML = emptyStateHTML;
        return;
    }

    const coursesHTML = courses
        .map((course) => {
            const userCourse = course.userCourses && course.userCourses[0];

            const progress = userCourse ? userCourse.courseProgress : 0;
            const status = userCourse ? userCourse.status : 'NOT_STARTED';
            const courseStatus = course.status;

            return `
          <div class="course-card" onclick="showCourseDetails('${course.id}')">
            <div class="course-progress">${progress}% hoàn thành</div>
            <div class="course-image-container">
              ${
    course.image
        ? `<img src="${course.image}" alt="${course.name}" class="course-image">`
        : `<div class="course-image-placeholder">
                  <i class="fas fa-book-open fa-2x mb-2"></i>
                  <div>${course.name}</div>
                </div>`
              }
            </div>
            <div class="course-content">
              <h3 class="course-title">${course.name}</h3>
              <p class="course-description">${course.description || 'Chưa có mô tả'}</p>
              <div class="course-meta">
                <div class="course-info">
                  <i class="fas fa-calendar-alt"></i>
                  <span>Từ ${formatDate(course.startDate)} đến ${formatDate(course.endDate)}</span>
                </div>
                <div class="course-status">
                  ${
    courseStatus === 'DISABLED'
        ? '<span class="badge bg-danger">Đã khóa</span>'
        : '<span class="badge bg-success">Đang mở</span>'
}
                </div>
              </div>
              ${
    userCourse
        ? `
                <div class="course-enroll-info">
                  <i class="fas fa-user-graduate"></i>
                  Đăng ký ngày: ${formatDate(userCourse.enrollDate)}
                </div>
              `
        : ''
}
              <div class="progress">
                <div class="progress-bar" role="progressbar" 
                     style="width: ${progress}%" 
                     aria-valuenow="${progress}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                </div>
              </div>
            </div>
          </div>
        `;
        })
        .join('');

    coursesGrid.innerHTML = coursesHTML;

    // Add animation to cards
    const cards = document.querySelectorAll('.course-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'IN_PROGRESS':
            return 'bg-primary';
        case 'COMPLETED':
            return 'bg-success';
        case 'NOT_STARTED':
            return 'bg-warning';
        default:
            return 'bg-secondary';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Chưa có ngày';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';

    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.textContent = `Trang ${currentPage} / ${totalPages}`;

    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> Trước';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            loadCourses();
        }
    };

    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.innerHTML = 'Sau <i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadCourses();
        }
    };

    paginationContainer.innerHTML = '';
    paginationContainer.appendChild(prevButton);
    paginationContainer.appendChild(paginationInfo);
    paginationContainer.appendChild(nextButton);
}

// Search handling
function handleSearch(event) {
    event.preventDefault();
    const searchInput = document.getElementById('searchInput');
    searchQuery = searchInput.value.trim();
    currentPage = 1;
    loadCourses();
}

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch(e);
    }
});

// Load courses
async function loadCourses() {
    const courses = await fetchCourses();
    renderCourses(courses);
    renderPagination();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

function initializeApp() {
    loadCourses();
}

function showCourseDetails(courseId) {
    window.location.href = `courses/${courseId}`;
}

function closeModal() {
    document.getElementById('courseModal').classList.remove('show');
    document.body.classList.remove('modal-open');
}

document.getElementById('courseModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('courseModal')) {
        closeModal();
    }
});

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    searchQuery = '';
    currentPage = 1;
    loadCourses();
}
