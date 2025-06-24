let currentPage = 1;
const pageSize = 10;
let editingTraineeId = null;
let traineeListCache = [];
let currentSearch = '';
let debounceTimeout = null;

function showNotification(type, message) {
    alert(message);
}

async function fetchTrainees(page = 1, search = '') {
    try {
        let url = `/users/trainees?page=${page}&pageSize=${pageSize}`;
        if (search && search.trim() !== '') {
            url += `&search=${encodeURIComponent(search.trim())}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (data.statusCode === 200) {
            traineeListCache = data.data.items || [];
            renderTrainees(traineeListCache, data.data.count || 0, page);
        } else {
            showNotification('error', data.message || 'Không thể tải danh sách trainee');
        }
    } catch (err) {
        showNotification('error', 'Lỗi khi tải danh sách trainee');
    }
}

function renderTrainees(trainees, total, page) {
    const tbody = document.getElementById('traineesList');
    tbody.innerHTML = '';
    if (!trainees || trainees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Không có trainee nào</td></tr>`;
        document.getElementById('traineePagination').innerHTML = '';
        return;
    }
    trainees.forEach((trainee, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${(page - 1) * pageSize + idx + 1}</td>
      <td>${trainee.name || ''}</td>
      <td>${trainee.email || ''}</td>
      <td><span class="badge ${trainee.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}">${trainee.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}</span></td>
      <td>
        <button class="action-btn btn-edit" title="Sửa" data-id="${trainee.id}"><i class="fas fa-edit"></i></button>
        <button class="action-btn btn-delete" title="Xóa" data-id="${trainee.id}"><i class="fas fa-trash"></i></button>
      </td>
    `;
        tbody.appendChild(tr);
    });
    renderPagination(total, page);
    addTraineeActionEvents();
}

function renderPagination(total, page) {
    const totalPages = Math.ceil(total / pageSize);
    const container = document.getElementById('traineePagination');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    let html = '<ul class="pagination">';
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item${i === page ? ' active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += '</ul>';
    container.innerHTML = html;
    container.querySelectorAll('.page-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const p = parseInt(link.dataset.page);
            if (!isNaN(p)) {
                currentPage = p;
                fetchTrainees(currentPage, currentSearch);
            }
        });
    });
}

function addTraineeActionEvents() {
    document.querySelectorAll('.btn-edit').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            openEditTrainee(id);
        });
    });
    document.querySelectorAll('.btn-delete').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            openDeleteTrainee(id);
        });
    });
}

function openEditTrainee(id) {
    const trainee = traineeListCache.find((t) => t.id === id);
    if (trainee) {
        document.getElementById('traineeName').value = trainee.name || '';
        document.getElementById('traineeEmail').value = trainee.email || '';
        document.getElementById('traineeStatus').value = trainee.status || 'ACTIVE';
        editingTraineeId = id;
        const modal = new bootstrap.Modal(document.getElementById('addTraineeModal'));
        modal.show();
    } else {
        showNotification('error', 'Không tìm thấy thông tin trainee');
    }
}

function openDeleteTrainee(id) {
    editingTraineeId = id;
    const modal = new bootstrap.Modal(document.getElementById('deleteTraineeModal'));
    modal.show();
}

document.getElementById('traineeForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('traineeName').value.trim();
    const email = document.getElementById('traineeEmail').value.trim();
    const status = document.getElementById('traineeStatus').value;
    if (!name || !email) {
        showNotification('error', 'Vui lòng nhập đầy đủ thông tin');
        return;
    }
    try {
        let res, data;
        if (editingTraineeId) {
            res = await fetch(`/users/trainees/${editingTraineeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, status }),
            });
            data = await res.json();
        } else {
            res = await fetch('/users/trainees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, status }),
            });
            data = await res.json();
        }
        if (data.statusCode === 200 || data.statusCode === 201) {
            showNotification('success', editingTraineeId ? 'Cập nhật thành công' : 'Tạo mới thành công');
            bootstrap.Modal.getInstance(document.getElementById('addTraineeModal')).hide();
            editingTraineeId = null;
            fetchTrainees(currentPage, currentSearch);
        } else {
            showNotification('error', data.message || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showNotification('error', 'Có lỗi xảy ra');
    }
});

document.getElementById('confirmDeleteTrainee').addEventListener('click', async function () {
    if (!editingTraineeId) return;
    try {
        const res = await fetch(`/users/trainees/${editingTraineeId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.statusCode === 200) {
            showNotification('success', 'Xóa thành công');
            bootstrap.Modal.getInstance(document.getElementById('deleteTraineeModal')).hide();
            editingTraineeId = null;
            fetchTrainees(currentPage, currentSearch);
        } else {
            showNotification('error', data.message || 'Không thể xóa trainee');
        }
    } catch (err) {
        showNotification('error', 'Có lỗi xảy ra');
    }
});

document.getElementById('addTraineeModal').addEventListener('hidden.bs.modal', function () {
    editingTraineeId = null;
    document.getElementById('traineeForm').reset();
});

document.addEventListener('DOMContentLoaded', function () {
    fetchTrainees(currentPage, currentSearch);
    const searchInput = document.getElementById('traineeSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const value = this.value;
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                currentSearch = value;
                currentPage = 1;
                fetchTrainees(currentPage, currentSearch);
            }, 400);
        });
    }
});
