let currentPage = 1;
const pageSize = 5;
let searchTimeout;
let currentEditId = null;

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

async function loadSubjects(page = 1, search = '') {
    try {
        const response = await fetch(
            `/subjects/list?page=${page}&pageSize=${pageSize}${search ? `&name=${search}` : ''}`,
        );
        const result = await response.json();

        if (result.statusCode === 200) {
            const { items, count } = result.data;
            const totalPages = Math.ceil(count / pageSize);

            const tbody = document.getElementById('subjectsTableBody');
            tbody.innerHTML = '';

            items.forEach((subject, index) => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-aos', 'fade-up');
                tr.setAttribute('data-aos-delay', `${index * 100}`);
                tr.innerHTML = `
              <td>
                <div class="d-flex align-items-center">
                  <i class="fas fa-book me-3 text-primary"></i>
                  <span>${subject.name}</span>
                </div>
              </td>
              <td>${subject.description}</td>
              <td>${formatDate(subject.createdAt)}</td>
              <td>
                <div class="btn-group">
                  <button class="btn btn-sm btn-outline-primary" onclick="viewSubject('${subject.id}')">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-success" onclick="editSubject('${subject.id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteSubject('${subject.id}')">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            `;
                tbody.appendChild(tr);
            });

            renderPagination(totalPages, page);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderPagination(totalPages, currentPage) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" onclick="loadSubjects(${currentPage - 1})">
          <i class="fas fa-chevron-left"></i>
        </a>
      `;
    pagination.appendChild(prevLi);

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `
          <a class="page-link" href="#" onclick="loadSubjects(${i})">${i}</a>
        `;
        pagination.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" onclick="loadSubjects(${currentPage + 1})">
          <i class="fas fa-chevron-right"></i>
        </a>
      `;
    pagination.appendChild(nextLi);
}

document.getElementById('searchInput').addEventListener('input', function (e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadSubjects(1, e.target.value);
    }, 500);
});

loadSubjects();

function addTask() {
    const container = document.getElementById('tasksContainer');
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item mb-3';
    taskItem.innerHTML = `
        <div class="row">
          <div class="col-md-6">
            <input class="form-control" type="text" name="taskTitle[]" placeholder="Tiêu đề task" required>
          </div>
          <div class="col-md-6">
            <input class="form-control" type="text" name="taskContentFileLink[]" placeholder="Link nội dung" required>
          </div>
        </div>
      `;
    container.appendChild(taskItem);
}

function viewSubject(id) {
    window.location.href = `/views/supervisor/subjects/${id}`;
}

async function editSubject(id) {
    currentEditId = id;
    try {
        const response = await fetch(`/subjects?subjectId=${id}`);
        const result = await response.json();

        if (result.statusCode === 200) {
            const subject = result.data;
            document.getElementById('editName').value = subject.name;
            document.getElementById('editDescription').value = subject.description;

            const modal = new bootstrap.Modal(document.getElementById('editSubjectModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Có lỗi xảy ra khi tải thông tin môn học', 'error');
    }
}

document.getElementById('editSubjectForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('editName').value,
        description: document.getElementById('editDescription').value,
    };

    try {
        const response = await fetch(`/subjects/info/${currentEditId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('editSubjectModal'));
            modal.hide();

            loadSubjects(currentPage);

            showNotification('Cập nhật môn học thành công!', 'success');
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Có lỗi xảy ra khi cập nhật môn học', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Có lỗi xảy ra khi cập nhật môn học', 'error');
    }
});

document.getElementById('newSubjectForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const taskTitles = document.getElementsByName('taskTitle[]');
    const taskLinks = document.getElementsByName('taskContentFileLink[]');
    const tasks = [];

    for (let i = 0; i < taskTitles.length; i++) {
        tasks.push({
            title: taskTitles[i].value,
            contentFileLink: taskLinks[i].value,
        });
    }

    const formData = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        tasks: tasks,
    };

    try {
        const response = await fetch('/subjects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('newSubjectModal'));
            modal.hide();

            loadSubjects();

            showNotification('Tạo môn học thành công!', 'success');
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Có lỗi xảy ra khi tạo môn học', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Có lỗi xảy ra khi tạo môn học', 'error');
    }
});

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function deleteSubject(id) {
    if (confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
        try {
            const response = await fetch(`/subjects/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                loadSubjects(currentPage);
                showNotification('Xóa môn học thành công!', 'success');
            } else {
                const errorData = await response.json();
                showNotification(errorData.message || 'Có lỗi xảy ra khi xóa môn học', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Có lỗi xảy ra khi xóa môn học', 'error');
        }
    }
}
