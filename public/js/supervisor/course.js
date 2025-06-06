let selectedSubjects = new Set();
let currentSubjectPage = 1;
let currentCoursePage = 1;
const subjectPageSize = 2;
const coursePageSize = 5;

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('d-none');
}

async function fetchCourses(page = 1, name = '', creatorName = '') {
    showLoading();
    try {
        const response = await fetch(
            `/courses/supervisor/list?page=${page}&pageSize=${coursePageSize}&name=${name}&creatorName=${creatorName}`,
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Lỗi', 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
        hideLoading();
    }
}

function renderCoursesPagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('coursesPagination');

    let paginationHTML = '<ul class="pagination">';

    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
          <li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a>
          </li>
        `;
    }

    paginationHTML += '</ul>';
    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.querySelectorAll('.page-link').forEach((link) => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (!isNaN(page) && page > 0 && page <= totalPages) {
                currentCoursePage = page;
                const name = document.querySelector('input[name="name"]').value;
                const creatorName = document.querySelector('input[name="creatorName"]').value;
                const data = await fetchCourses(page, name, creatorName);
                if (data && data.data) {
                    renderCourses(data.data.items);
                    renderCoursesPagination(page, Math.ceil(data.data.count / coursePageSize));
                }
            }
        });
    });
}

function renderCourses(courses) {
    const tbody = document.getElementById('coursesTableBody');
    tbody.innerHTML = '';

    if (!courses || courses.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center">
              <div class="alert alert-info d-flex align-items-center justify-content-center">
                <i class="fas fa-info-circle me-2"></i>
                Không tìm thấy khóa học nào
              </div>
            </td>
          </tr>
        `;
        return;
    }

    courses.forEach((course) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${course.name}</td>
          <td>${course.description}</td>
          <td>${new Date(course.startDate).toLocaleDateString('vi-VN')}</td>
          <td>${new Date(course.endDate).toLocaleDateString('vi-VN')}</td>
          <td>
            <span class="badge ${course.status === 'ACTIVE' ? 'bg-success' : 'bg-warning'}">
              ${course.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}
            </span>
          </td>
          <td>
            <div class="d-flex justify-content-center">
              <a href="/views/supervisor/courses/${course.id}" class="action-btn btn-detail" title="Chi tiết">
                <i class="fas fa-eye"></i>
              </a>
              <button class="action-btn btn-edit" onclick="openEditModal('${course.id}')" title="Chỉnh sửa">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn btn-delete" onclick="deleteCourse('${course.id}')" title="Xóa">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('searchForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = this.name.value;
    const creatorName = this.creatorName.value;
    currentCoursePage = 1;
    const data = await fetchCourses(currentCoursePage, name, creatorName);
    if (data && data.data) {
        renderCourses(data.data.items);
        renderCoursesPagination(currentCoursePage, Math.ceil(data.data.count / coursePageSize));
    }
});

async function deleteCourse(courseId) {
    if (confirm('Bạn có chắc chắn muốn xóa khóa học này?')) {
        showLoading();
        try {
            const response = await fetch(`/courses/${courseId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await fetchCourses(currentCoursePage);
                if (data && data.data) {
                    renderCourses(data.data.items);
                    renderCoursesPagination(currentCoursePage, Math.ceil(data.data.count / coursePageSize));
                }
                showNotification('success', 'Thành công', 'Xóa khóa học thành công');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Có lỗi xảy ra khi xóa khóa học');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('error', 'Lỗi', error.message || 'Có lỗi xảy ra khi xóa khóa học');
        } finally {
            hideLoading();
        }
    }
}

async function openEditModal(courseId) {
    showLoading();
    try {
        const response = await fetch(`/courses/supervisor/detail?courseId=${courseId}`);
        const result = await response.json();

        if (result.statusCode === 200 && result.data) {
            const course = result.data;

            document.getElementById('editName').value = course.name;
            document.getElementById('editDescription').value = course.description;
            document.getElementById('editStartDate').value = course.startDate;
            document.getElementById('editEndDate').value = course.endDate;
            document.getElementById('editStatus').value = course.status;

            document.getElementById('editCourseForm').dataset.courseId = courseId;

            const modal = new bootstrap.Modal(document.getElementById('editCourseModal'));
            modal.show();
        } else {
            throw new Error(result.message || 'Không thể tải thông tin khóa học');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Có lỗi xảy ra khi tải thông tin khóa học');
    } finally {
        hideLoading();
    }
}

document.getElementById('editCourseForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    showLoading();

    const courseId = this.dataset.courseId;
    const formData = {
        name: document.getElementById('editName').value,
        description: document.getElementById('editDescription').value,
        startDate: document.getElementById('editStartDate').value,
        endDate: document.getElementById('editEndDate').value,
        status: document.getElementById('editStatus').value,
    };

    try {
        const response = await fetch(`/courses/info/${courseId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editCourseModal')).hide();

            const data = await fetchCourses(currentCoursePage);
            if (data && data.data) {
                renderCourses(data.data.items);
                renderCoursesPagination(currentCoursePage, Math.ceil(data.data.count / coursePageSize));
            }

            showNotification('success', 'Thành công', 'Cập nhật khóa học thành công');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Có lỗi xảy ra khi cập nhật khóa học');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Lỗi', error.message || 'Có lỗi xảy ra khi cập nhật khóa học');
    } finally {
        hideLoading();
    }
});

window.addEventListener('load', async () => {
    const data = await fetchCourses(currentCoursePage);
    if (data && data.data) {
        renderCourses(data.data.items);
        renderCoursesPagination(currentCoursePage, Math.ceil(data.data.count / coursePageSize));
    }
});

async function searchSubjects(page = 1, searchTerm = '') {
    try {
        showLoading();
        const url = searchTerm
            ? `/subjects/list?page=${page}&pageSize=${subjectPageSize}&name=${searchTerm}`
            : `/subjects/list?page=${page}&pageSize=${subjectPageSize}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.statusCode === 200) {
            const resultsContainer = document.getElementById('subjectSearchResults');
            const subjects = data.data.items;
            const totalItems = data.data.count;
            const totalPages = Math.ceil(totalItems / subjectPageSize);

            if (subjects.length === 0) {
                resultsContainer.innerHTML = `
              <div class="alert alert-info d-flex align-items-center">
                <i class="fas fa-info-circle me-2"></i>
                Không tìm thấy môn học nào
              </div>`;
                document.getElementById('subjectPagination').innerHTML = '';
                return;
            }

            resultsContainer.innerHTML = subjects
                .map(
                    (subject) => `
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-1">${subject.name}</h6>
                <small class="text-muted">${subject.description || 'Không có mô tả'}</small>
              </div>
              <button class="btn btn-sm btn-outline-primary add-subject" 
                      data-id="${subject.id}" 
                      data-name="${subject.name}"
                      ${selectedSubjects.has(subject.id) ? 'disabled' : ''}>
                <i class="fas ${selectedSubjects.has(subject.id) ? 'fa-check' : 'fa-plus'} me-1"></i>
                ${selectedSubjects.has(subject.id) ? 'Đã chọn' : 'Thêm'}
              </button>
            </div>
          `,
                )
                .join('');

            renderSubjectsPagination(page, totalPages, searchTerm);

            document.querySelectorAll('.add-subject').forEach((button) => {
                button.addEventListener('click', () => {
                    const subjectId = button.dataset.id;
                    const subjectName = button.dataset.name;
                    addSubject(subjectId, subjectName);
                    button.disabled = true;
                    button.innerHTML = '<i class="fas fa-check me-1"></i>Đã chọn';
                });
            });
        }
    } catch (error) {
        console.error('Error searching subjects:', error);
        showNotification('error', 'Lỗi', 'Không thể tìm kiếm môn học');
    } finally {
        hideLoading();
    }
}

function renderSubjectsPagination(currentPage, totalPages, searchTerm) {
    const paginationContainer = document.getElementById('subjectPagination');

    let paginationHTML = '<ul class="pagination">';

    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
          <li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a>
          </li>
        `;
    }

    paginationHTML += '</ul>';
    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.querySelectorAll('.page-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (!isNaN(page) && page > 0 && page <= totalPages) {
                currentSubjectPage = page;
                searchSubjects(page, searchTerm);
            }
        });
    });
}

document.getElementById('searchSubject').addEventListener('click', () => {
    const searchTerm = document.getElementById('subjectSearch').value.trim();
    currentSubjectPage = 1;
    searchSubjects(currentSubjectPage, searchTerm);
});

document.getElementById('subjectSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const searchTerm = e.target.value.trim();
        currentSubjectPage = 1;
        searchSubjects(currentSubjectPage, searchTerm);
    }
});

document.getElementById('newCourseModal').addEventListener('show.bs.modal', () => {
    currentSubjectPage = 1;
    searchSubjects(currentSubjectPage, '');
});

function showNotification(type, title, message) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    let icon = '';
    switch (type) {
        case 'success':
            icon = 'fa-check-circle';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            break;
    }

    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="notification-content">
          <div class="notification-title">${title}</div>
          <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, 5000);

    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    });
}

function validateDate(dateStr) {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(dateStr)) {
        return false;
    }

    const [_, day, month, year] = dateStr.match(regex);

    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
        return false;
    }

    const date = new Date(yearNum, monthNum - 1, dayNum);
    const isValid = date.getDate() === dayNum && date.getMonth() === monthNum - 1 && date.getFullYear() === yearNum;

    return isValid;
}

document.getElementById('startDate').addEventListener('input', function (e) {
    const value = e.target.value;

    if (!value) {
        this.setCustomValidity('');
        return;
    }

    if (!validateDate(value)) {
        this.setCustomValidity('Vui lòng nhập đúng định dạng ngày (dd/mm/yyyy)');
    } else {
        this.setCustomValidity('');
    }
});

document.getElementById('endDate').addEventListener('input', function (e) {
    const value = e.target.value;

    if (!value) {
        this.setCustomValidity('');
        return;
    }

    if (!validateDate(value)) {
        this.setCustomValidity('Vui lòng nhập đúng định dạng ngày (dd/mm/yyyy)');
    } else {
        this.setCustomValidity('');
    }
});

document.getElementById('newCourseForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedSubjects.size === 0) {
        showNotification('error', 'Lỗi', 'Vui lòng chọn ít nhất một môn học');
        return;
    }

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        showNotification('error', 'Lỗi', 'Vui lòng nhập đầy đủ ngày bắt đầu và kết thúc');
        return;
    }

    if (!validateDate(startDate) || !validateDate(endDate)) {
        showNotification('error', 'Lỗi', 'Vui lòng nhập đúng định dạng ngày (dd/mm/yyyy)');
        return;
    }

    const formData = {
        name: document.getElementById('courseName').value,
        description: document.getElementById('courseDescription').value,
        status: document.getElementById('courseStatus').value,
        startDate: startDate,
        endDate: endDate,
        subjectIds: Array.from(selectedSubjects),
    };

    try {
        showLoading();
        const response = await fetch('/courses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (data.statusCode === 200 || data.statusCode === 201) {
            showNotification('success', 'Thành công', 'Tạo khóa học thành công');
            bootstrap.Modal.getInstance(document.getElementById('newCourseModal')).hide();
            window.location.reload();
        } else {
            throw new Error(data.message || 'Không thể tạo khóa học');
        }
    } catch (error) {
        console.error('Error creating course:', error);
        showNotification('error', 'Lỗi', error.message || 'Không thể tạo khóa học');
    } finally {
        hideLoading();
    }
});

function addSubject(subjectId, subjectName) {
    selectedSubjects.add(subjectId);
    const selectedContainer = document.getElementById('selectedSubjects');

    const subjectElement = document.createElement('div');
    subjectElement.className = 'list-group-item d-flex justify-content-between align-items-center';
    subjectElement.innerHTML = `
        <div>
          <h6 class="mb-0">${subjectName}</h6>
        </div>
        <button class="btn btn-sm btn-outline-danger remove-subject" data-id="${subjectId}">
          <i class="fas fa-times me-1"></i>
          Xóa
        </button>
      `;

    selectedContainer.appendChild(subjectElement);
    updateSelectedCount();

    subjectElement.querySelector('.remove-subject').addEventListener('click', () => {
        selectedSubjects.delete(subjectId);
        subjectElement.remove();
        updateSelectedCount();
        const addButton = document.querySelector(`.add-subject[data-id="${subjectId}"]`);
        if (addButton) {
            addButton.disabled = false;
            addButton.innerHTML = '<i class="fas fa-plus me-1"></i>Thêm';
        }
    });
}

function updateSelectedCount() {
    const count = selectedSubjects.size;
    document.getElementById('selectedCount').textContent = `${count} môn học`;
}
