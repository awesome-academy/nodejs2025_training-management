const path = window.location.pathname;
const parts = path.split('/');
const subjectId = parts[parts.length - 1];
let subjectData = null;

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

function showLoading() {
    document.querySelector('.loading-overlay').classList.add('active');
}

function hideLoading() {
    document.querySelector('.loading-overlay').classList.remove('active');
}

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

async function loadSubjectData() {
    showLoading();
    try {
        const response = await fetch(`/subjects?subjectId=${subjectId}`);
        const result = await response.json();

        if (result.statusCode === 200) {
            subjectData = result.data;

            document.getElementById('subjectName').textContent = subjectData.name;
            document.getElementById('subjectDescription').textContent = subjectData.description;

            renderTasks();
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Có lỗi xảy ra khi tải dữ liệu', 'error');
    } finally {
        hideLoading();
    }
}

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    container.innerHTML = '';

    if (subjectData.tasksCreated && subjectData.tasksCreated.length > 0) {
        subjectData.tasksCreated.forEach((task, index) => {
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-4';
            col.setAttribute('data-aos', 'fade-up');
            col.setAttribute('data-aos-delay', `${index * 100}`);

            col.innerHTML = `
            <div class="card task-card h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <div class="icon">
                    <i class="fas fa-play"></i>
                  </div>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteTask('${task.id}', event)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
                <h5 class="title">${task.title}</h5>
                <p class="date mb-0">
                  <i class="far fa-clock me-2"></i>
                  ${formatDate(task.createdAt)}
                </p>
              </div>
            </div>
          `;

            container.appendChild(col);
        });
    } else {
        container.innerHTML = `
          <div class="col-12 text-center py-5">
            <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
            <p class="text-muted">Chưa có bài học nào</p>
          </div>
        `;
    }
}

async function deleteTask(taskId, event) {
    event.stopPropagation();

    if (confirm('Bạn có chắc chắn muốn xóa bài học này?')) {
        try {
            const response = await fetch(`/tasks/id/${taskId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                showNotification('Xóa bài học thành công!', 'success');
                loadSubjectData();
            } else {
                const errorData = await response.json();
                showNotification(errorData.message || 'Có lỗi xảy ra khi xóa bài học', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Có lỗi xảy ra khi xóa bài học', 'error');
        }
    }
}

function showAddTaskModal() {
    const modal = new bootstrap.Modal(document.getElementById('addTaskModal'));
    modal.show();
}

document.getElementById('addTaskForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value;
    const contentFileLink = document.getElementById('contentFileLink').value;

    try {
        const response = await fetch(`/subjects/task/${subjectId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tasks: [
                    {
                        title,
                        contentFileLink,
                    },
                ],
            }),
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
            modal.hide();

            showNotification('Thêm bài học thành công!', 'success');
            loadSubjectData();
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Có lỗi xảy ra khi thêm bài học', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Có lỗi xảy ra khi thêm bài học', 'error');
    }
});

function openTask(taskId) {
    window.open(`/views/supervisor/tasks/${taskId}`, '_blank');
}

loadSubjectData();
