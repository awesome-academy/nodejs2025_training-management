let currentCourse = null;
let selectedSubjects = new Set();
let currentSubjectPage = 1;
const subjectPageSize = 2;
let currentMemberPage = 1;
const memberPageSize = 10;
let currentMemberSearch = '';
let currentMemberStatus = '';

let currentSupervisorPage = 1;
const pageSize = 10;
let supervisorSearchTerm = '';

const pathParts = window.location.pathname.split('/');
const courseId = pathParts[pathParts.length - 1];

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function showNotification(type, title, message) {
    const toast = document.getElementById('notificationToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    toast.className = 'toast';
    toast.classList.add(type);

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    const bsToast = new bootstrap.Toast(toast, {
        animation: true,
        autohide: true,
        delay: 3000,
    });

    toast.style.transform = 'translateX(100%)';
    bsToast.show();
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);

    toast.addEventListener('hide.bs.toast', () => {
        toast.style.transform = 'translateX(100%)';
    });
}

function updateSelectedCount() {
    const count = selectedSubjects.size;
    document.getElementById('selectedCount').textContent = `${count} môn học`;
}

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

async function searchSubjects(page = 1, searchTerm = '') {
    try {
        showLoading();
        const url = searchTerm
            ? `/subjects/list?page=${page}&pageSize=${subjectPageSize}&name=${encodeURIComponent(searchTerm)}`
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
        } else {
            throw new Error(data.message || 'Không thể tải danh sách môn học');
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

async function fetchCourseDetail() {
    showLoading();
    try {
        if (!courseId) {
            throw new Error('Không tìm thấy ID khóa học');
        }

        const response = await fetch(`/courses/supervisor/detail?courseId=${courseId}`);
        const result = await response.json();

        if (result.statusCode === 200 && result.data) {
            currentCourse = result.data;

            document.getElementById('courseName').textContent = currentCourse.name;
            document.getElementById('courseStatus').textContent =
                currentCourse.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động';
            document.getElementById('courseStatus').className =
                `badge ${currentCourse.status === 'ACTIVE' ? 'bg-success' : 'bg-warning'} me-3`;
            document.getElementById('courseDescription').textContent = currentCourse.description;
            document.getElementById('courseStartDate').textContent = formatDate(currentCourse.startDate);
            document.getElementById('courseEndDate').textContent = formatDate(currentCourse.endDate);
            document.getElementById('courseImage').src = currentCourse.image;

            renderSubjects(currentCourse.courseSubjects);
        } else {
            throw new Error(result.message || 'Không thể tải thông tin khóa học');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Lỗi', error.message || 'Có lỗi xảy ra khi tải thông tin khóa học');
        setTimeout(() => {
            window.location.href = '/views/supervisor/courses';
        }, 2000);
    } finally {
        hideLoading();
    }
}

function renderSubjects(subjects) {
    const subjectsList = document.getElementById('subjectsList');
    subjectsList.innerHTML = '';

    subjects.forEach((courseSubject) => {
        if (courseSubject.subject) {
            const subjectCard = document.createElement('div');
            subjectCard.className = 'col-md-6 col-lg-4 mb-4';
            subjectCard.innerHTML = `
            <div class="subject-card">
              <div class="subject-header">
                <h4 class="subject-title">${courseSubject.subject.name}</h4>
                <div class="d-flex align-items-center">
                  <div class="form-check form-switch">
                    <input class="form-check-input status-toggle" type="checkbox" 
                           role="switch" 
                           id="status-${courseSubject.id}"
                           data-id="${courseSubject.id}"
                           ${courseSubject.status === 'FINISH' ? 'checked disabled' : ''}>
                    <label class="form-check-label" for="status-${courseSubject.id}">
                      ${courseSubject.status === 'FINISH' ? 'Hoàn thành' : 'Đang thực hiện'}
                    </label>
                  </div>
                </div>
              </div>
              <p class="subject-description">${courseSubject.subject.description || 'Không có mô tả'}</p>
              
              <div class="tasks-section">
                <div class="tasks-header">
                  <i class="fas fa-chevron-down"></i>
                  <h5 class="mb-0">Nhiệm vụ (${courseSubject.subject.tasksCreated.length})</h5>
                </div>
                
                ${
                    courseSubject.subject.tasksCreated.length > 0
        ? `
                  <div class="tasks-list">
                    ${courseSubject.subject.tasksCreated
        .map(
            (task) => `
                      <div class="task-item">
                        <h6 class="task-title">${task.title}</h6>
                        <a href="${task.contentFileLink}" target="_blank" class="task-link">
                          <i class="fas fa-play-circle"></i>
                          Xem video bài giảng
                        </a>
                      </div>
                    `,
        )
        .join('')}
                  </div>
                `
        : `
                  <div class="no-tasks">
                    <i class="fas fa-clipboard-list"></i>
                    <p>Chưa có nhiệm vụ nào</p>
                  </div>
                `
}
              </div>
            </div>
          `;
            subjectsList.appendChild(subjectCard);

            const card = subjectCard.querySelector('.subject-card');
            const tasksSection = card.querySelector('.tasks-section');

            card.addEventListener('click', (e) => {
                if (e.target.closest('.status-toggle')) {
                    return;
                }
                card.classList.toggle('expanded');

                tasksSection.classList.toggle('show');
            });
        }
    });

    document.querySelectorAll('.status-toggle').forEach((checkbox) => {
        checkbox.addEventListener('change', async function () {
            const label = this.nextElementSibling;
            if (this.checked) {
                label.textContent = 'Hoàn thành';
                label.style.color = '#198754';
                label.style.fontWeight = '600';

                if (confirm('Bạn có chắc chắn muốn đánh dấu môn học này đã hoàn thành?')) {
                    try {
                        showLoading();
                        const response = await fetch(`/course_subject/${this.dataset.id}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                status: 'FINISH',
                            }),
                        });

                        const data = await response.json();

                        if (data.statusCode === 200 || data.statusCode === 201) {
                            showNotification('success', 'Thành công', 'Cập nhật trạng thái môn học thành công');
                            this.disabled = true;
                        } else {
                            this.checked = false;
                            label.textContent = 'Đang thực hiện';
                            label.style.color = '';
                            label.style.fontWeight = '';
                            throw new Error(data.message || 'Không thể cập nhật trạng thái môn học');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        showNotification(
                            'error',
                            'Lỗi',
                            error.message || 'Có lỗi xảy ra khi cập nhật trạng thái môn học',
                        );
                    } finally {
                        hideLoading();
                    }
                } else {
                    this.checked = false;
                    label.textContent = 'Đang thực hiện';
                    label.style.color = '';
                    label.style.fontWeight = '';
                }
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

document.getElementById('addSubjectModal').addEventListener('show.bs.modal', () => {
    currentSubjectPage = 1;
    selectedSubjects.clear();
    document.getElementById('selectedSubjects').innerHTML = '';
    updateSelectedCount();
    searchSubjects(currentSubjectPage, '');
});

document.getElementById('addSubjectsBtn').addEventListener('click', async () => {
    if (selectedSubjects.size === 0) {
        showNotification('error', 'Lỗi', 'Vui lòng chọn ít nhất một môn học');
        return;
    }

    try {
        showLoading();
        const response = await fetch(`/courses/subject/${courseId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subjectIds: Array.from(selectedSubjects),
            }),
        });

        const data = await response.json();

        if (data.statusCode === 200 || data.statusCode === 201) {
            showNotification('success', 'Thành công', 'Thêm môn học thành công');
            bootstrap.Modal.getInstance(document.getElementById('addSubjectModal')).hide();
            window.location.reload();
        } else {
            throw new Error(data.message || 'Không thể thêm môn học');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Lỗi', error.message || 'Có lỗi xảy ra khi thêm môn học');
    } finally {
        hideLoading();
    }
});

async function fetchMembers(page = 1, search = '') {
    try {
        showLoading();

        let url = `/courses/supervisor/members?page=${page}&pageSize=${memberPageSize}&courseId=${courseId}`;

        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        if (currentMemberStatus) {
            url += `&status=${encodeURIComponent(currentMemberStatus)}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (result.statusCode === 200) {
            const members = result.data.items;
            const totalItems = result.data.count;
            const totalPages = Math.ceil(totalItems / memberPageSize);

            renderMembers(members);
            renderMemberPagination(page, totalPages, search);
        } else {
            throw new Error(result.message || 'Không thể tải danh sách thành viên');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Lỗi', error.message || 'Có lỗi xảy ra khi tải danh sách thành viên');
    } finally {
        hideLoading();
    }
}

function renderMembers(members) {
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '';

    if (members.length === 0) {
        membersList.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-4">
              <i class="fas fa-users fa-2x text-muted mb-3"></i>
              <p class="mb-0">Không có thành viên nào</p>
            </td>
          </tr>
        `;
        return;
    }

    members.forEach((member, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${(currentMemberPage - 1) * memberPageSize + index + 1}</td>
          <td>
            <div class="d-flex align-items-center">
              <div>
                <h6 class="mb-0">${member.user.name}</h6>
                <small class="text-muted">${member.user.email}</small>
              </div>
            </div>
          </td>
          <td>
            <div class="progress">
              <div class="progress-bar bg-success" role="progressbar" 
                   style="width: ${member.courseProgress}%" 
                   aria-valuenow="${member.courseProgress}" 
                   aria-valuemin="0" 
                   aria-valuemax="100">
                ${member.courseProgress}%
              </div>
            </div>
          </td>
          <td>${formatDate(member.enrollDate)}</td>
          <td>
            <select class="form-select form-select-sm status-select" 
                    data-id="${member.id}" 
                    style="width: 150px;">
              <option value="IN_PROGRESS" ${member.status === 'IN_PROGRESS' ? 'selected' : ''}>Đang học</option>
              <option value="PASS" ${member.status === 'PASS' ? 'selected' : ''}>Đạt</option>
              <option value="FAIL" ${member.status === 'FAIL' ? 'selected' : ''}>Không đạt</option>
              <option value="RESIGN" ${member.status === 'RESIGN' ? 'selected' : ''}>Đã rời khóa học</option>
              <option value="INACTIVE" ${member.status === 'INACTIVE' ? 'selected' : ''}>Không hoạt động</option>
            </select>
          </td>
        `;
        membersList.appendChild(row);

        const statusSelect = row.querySelector('.status-select');
        statusSelect.addEventListener('change', async function () {
            if (confirm('Bạn có chắc chắn muốn thay đổi trạng thái của thành viên này?')) {
                try {
                    showLoading();
                    const response = await fetch(`/courses/supervisor/trainee/${this.dataset.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            status: this.value,
                        }),
                    });

                    const data = await response.json();

                    if (data.statusCode === 200 || data.statusCode === 201) {
                        showNotification('success', 'Thành công', 'Cập nhật trạng thái thành viên thành công');
                    } else {
                        throw new Error(data.message || 'Không thể cập nhật trạng thái thành viên');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showNotification(
                        'error',
                        'Lỗi',
                        error.message || 'Có lỗi xảy ra khi cập nhật trạng thái thành viên',
                    );
                    this.value = member.status;
                } finally {
                    hideLoading();
                }
            } else {
                this.value = member.status;
            }
        });
    });
}

function renderMemberPagination(currentPage, totalPages, search) {
    const paginationContainer = document.getElementById('memberPagination');

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<ul class="pagination">';

    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${currentPage - 1}">
            <i class="fas fa-chevron-left"></i>
          </a>
        </li>
      `;

    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
          <li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a>
          </li>
        `;
    }

    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${currentPage + 1}">
            <i class="fas fa-chevron-right"></i>
          </a>
        </li>
      `;

    paginationHTML += '</ul>';
    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.querySelectorAll('.page-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (!isNaN(page) && page > 0 && page <= totalPages) {
                currentMemberPage = page;
                fetchMembers(page, search);
            }
        });
    });
}

document.getElementById('searchMember').addEventListener('click', () => {
    currentMemberSearch = document.getElementById('memberSearch').value.trim();
    currentMemberPage = 1;
    fetchMembers(currentMemberPage, currentMemberSearch);
});

document.getElementById('memberSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        currentMemberSearch = e.target.value.trim();
        currentMemberPage = 1;
        fetchMembers(currentMemberPage, currentMemberSearch);
    }
});

document.getElementById('applyFilter').addEventListener('click', () => {
    currentMemberSearch = document.getElementById('memberSearch').value.trim();
    currentMemberStatus = document.getElementById('memberStatusFilter').value;
    currentMemberPage = 1;
    fetchMembers(currentMemberPage, currentMemberSearch);
});

document.getElementById('exportMembers').addEventListener('click', async () => {
    try {
        showLoading();

        let url = `http://localhost:3000/courses/supervisor/trainee/export?page=${currentMemberPage}&pageSize=${memberPageSize}&courseId=${courseId}`;

        if (currentMemberSearch) {
            url += `&search=${encodeURIComponent(currentMemberSearch)}`;
        }

        if (currentMemberStatus) {
            url += `&status=${encodeURIComponent(currentMemberStatus)}`;
        }
        const link = document.createElement('a');
        link.href = url;
        link.download = `danh-sach-thanh-vien-khoa-hoc-${courseId}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('success', 'Thành công', 'Đã xuất file Excel thành công');
    } catch (error) {
        console.error('Error exporting members:', error);
        showNotification('error', 'Lỗi', 'Không thể xuất file Excel');
    } finally {
        hideLoading();
    }
});

document.getElementById('members-tab').addEventListener('shown.bs.tab', () => {
    fetchMembers(currentMemberPage, currentMemberSearch);
});

document.getElementById('addMemberForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const emails = document
        .getElementById('memberEmails')
        .value.split('\n')
        .map((email) => email.trim())
        .filter((email) => email !== '');

    if (emails.length === 0) {
        showNotification('error', 'Lỗi', 'Vui lòng nhập ít nhất một email');
        return;
    }

    try {
        showLoading();

        const response = await fetch('/courses/supervisor/trainee', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                emails: emails,
                courseId: courseId,
            }),
        });

        const data = await response.json();

        if (data.statusCode === 200 || data.statusCode === 201) {
            showNotification('success', 'Thành công', 'Thêm thành viên thành công');
            bootstrap.Modal.getInstance(document.getElementById('addMemberModal')).hide();
            document.getElementById('addMemberForm').reset();
            fetchMembers(currentMemberPage, currentMemberSearch);
        } else {
            throw new Error(data.message || 'Không thể thêm thành viên');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Lỗi', error.message || 'Có lỗi xảy ra khi thêm thành viên');
    } finally {
        hideLoading();
    }
});

document.getElementById('addMemberModal').addEventListener('hidden.bs.modal', function () {
    document.getElementById('addMemberForm').reset();
});

async function loadSupervisors(page = 1, search = '') {
    try {
        showLoading();

        const response = await fetch(
            `/supervisor_course/?page=${page}&pageSize=${pageSize}&search=${search}&courseId=${courseId}`,
        );
        const result = await response.json();

        if (result.statusCode === 200) {
            const supervisorsList = document.getElementById('supervisorsList');
            supervisorsList.innerHTML = '';

            if (result.data.items.length === 0) {
                supervisorsList.innerHTML = `
              <tr>
                <td colspan="5" class="text-center py-4">
                  <i class="fas fa-user-shield fa-2x text-muted mb-3"></i>
                  <p class="mb-0">Không có người giám sát nào</p>
                </td>
              </tr>
            `;
                return;
            }

            result.data.items.forEach((item, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
              <td>${(page - 1) * pageSize + index + 1}</td>
              <td>${item.user.name}</td>
              <td>${item.user.email}</td>
              <td>
                <span class="badge ${item.user.status === 'ACTIVE' ? 'bg-success' : 'bg-danger'}">
                  ${item.user.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
                </span>
              </td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="removeSupervisor('${item.id}')">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            `;
                supervisorsList.appendChild(row);
            });

            updateSupervisorPagination(result.data.count, page);
        } else {
            throw new Error(result.message || 'Không thể tải danh sách người giám sát');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Lỗi', error.message || 'Có lỗi xảy ra khi tải danh sách người giám sát');
    } finally {
        hideLoading();
    }
}

function updateSupervisorPagination(totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const pagination = document.getElementById('supervisorPagination');
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    let paginationHTML = '<ul class="pagination">';

    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${currentPage - 1}">
            <i class="fas fa-chevron-left"></i>
          </a>
        </li>
      `;

    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
          <li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a>
          </li>
        `;
    }

    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${currentPage + 1}">
            <i class="fas fa-chevron-right"></i>
          </a>
        </li>
      `;

    paginationHTML += '</ul>';
    pagination.innerHTML = paginationHTML;

    pagination.querySelectorAll('.page-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (!isNaN(page) && page > 0 && page <= totalPages) {
                currentSupervisorPage = page;
                loadSupervisors(page, supervisorSearchTerm);
            }
        });
    });
}

document.getElementById('searchSupervisor').addEventListener('click', () => {
    supervisorSearchTerm = document.getElementById('supervisorSearch').value.trim();
    currentSupervisorPage = 1;
    loadSupervisors(currentSupervisorPage, supervisorSearchTerm);
});

document.getElementById('supervisorSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        supervisorSearchTerm = e.target.value.trim();
        currentSupervisorPage = 1;
        loadSupervisors(currentSupervisorPage, supervisorSearchTerm);
    }
});

document.getElementById('addSupervisorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        showLoading();
        const email = document.getElementById('supervisorEmail').value.trim();

        const response = await fetch(`/courses/supervisor/${courseId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const result = await response.json();

        if (result.statusCode === 200 || result.statusCode === 201) {
            showNotification('success', 'Thành công', 'Thêm người giám sát thành công');
            document.getElementById('addSupervisorForm').reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('addSupervisorModal'));
            modal.hide();
            loadSupervisors(currentSupervisorPage, supervisorSearchTerm);
        } else {
            throw new Error(result.message || 'Không thể thêm người giám sát');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Lỗi', error.message || 'Có lỗi xảy ra khi thêm người giám sát');
    } finally {
        hideLoading();
    }
});

async function removeSupervisor(supervisorId) {
    if (!confirm('Bạn có chắc chắn muốn xóa người giám sát này?')) return;

    try {
        showLoading();
        const response = await fetch(`/supervisor_course/${supervisorId}`, {
            method: 'DELETE',
        });

        const result = await response.json();

        if (result.statusCode === 200 || result.statusCode === 201) {
            showNotification('success', 'Thành công', 'Xóa người giám sát thành công');
            loadSupervisors(currentSupervisorPage, supervisorSearchTerm);
        } else {
            throw new Error(result.message || 'Không thể xóa người giám sát');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Lỗi', error.message || 'Có lỗi xảy ra khi xóa người giám sát');
    } finally {
        hideLoading();
    }
}

document.getElementById('supervisors-tab').addEventListener('shown.bs.tab', () => {
    loadSupervisors(currentSupervisorPage, supervisorSearchTerm);
});

window.addEventListener('load', () => {
    fetchCourseDetail();

    if (window.location.hash === '#supervisors') {
        const supervisorTab = document.getElementById('supervisors-tab');
        const tab = new bootstrap.Tab(supervisorTab);
        tab.show();
    }
});
