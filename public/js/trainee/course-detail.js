let currentCourse = null;
let currentSubject = null;
let currentTask = null;
let currentUserTask = null;

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

async function fetchCourseDetails() {
    showLoading();
    try {
        const courseId = window.location.pathname.split('/').pop();
        console.log('Fetching course details for ID:', courseId);

        const response = await fetch(`/courses/trainee/detail?courseId=${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw { status: response.status, message: 'Không thể tải thông tin khóa học' };
        }

        const data = await response.json();
        console.log('Course details:', data);

        if (data.statusCode === 200) {
            return data.data;
        }
        throw { message: 'Dữ liệu không hợp lệ' };
    } catch (error) {
        console.error('Error fetching course details:', error);
        handleError(error);
        return null;
    } finally {
        hideLoading();
    }
}

function showError(message) {
    showToast({
        type: 'error',
        title: 'Đã có lỗi xảy ra',
        message: message,
        duration: 5000,
    });
}

function renderCourseDetails(course) {
    currentCourse = course;

    const courseImage = document.getElementById('courseImage');
    if (course.image) {
        courseImage.innerHTML = `<img src="${course.image}" alt="${course.name}" class="course-image">`;
    } else {
        courseImage.innerHTML = `
          <i class="fas fa-book-open fa-3x"></i>
          <div>${course.name}</div>
        `;
    }

    document.getElementById('courseTitle').textContent = course.name;
    document.getElementById('courseDescription').textContent = course.description || 'Chưa có mô tả';
    document.getElementById('courseDate').textContent =
        `Từ ${formatDate(course.startDate)} đến ${formatDate(course.endDate)}`;
    document.getElementById('courseStatus').textContent = getStatusText(course.status);

    renderSubjects(course.courseSubjects || []);

    if (course.courseSubjects && course.courseSubjects.length > 0) {
        const firstSubject = course.courseSubjects[0];
        selectSubject(firstSubject);
        if (firstSubject.subject.tasksCreated && firstSubject.subject.tasksCreated.length > 0) {
            selectTask(firstSubject.subject.tasksCreated[0].id);
        }
    }
}

function renderSubjects(subjects) {
    const subjectList = document.getElementById('subjectList');
    subjectList.innerHTML = subjects
        .map((courseSubject) => {
            const subject = courseSubject.subject;
            const userSubject = courseSubject.userSubjects[0];
            const tasks = userSubject?.userTasks || [];
            const isCompleted = userSubject?.status === 'FINISH';

            if (!subject) {
                return `
            <li class="subject-item">
              <div class="subject-header" onclick="toggleSubject('${courseSubject.id}')">
                <div class="subject-header-left">
                  <div class="subject-checkbox ${isCompleted ? 'completed' : ''}"
                       onclick="toggleSubjectCompletion(event, '${userSubject?.id}')"
                       data-subject-id="${courseSubject.id}">
                  </div>
                  <h3 class="subject-title">Môn học đang được cập nhật</h3>
                </div>
                <span class="subject-status ${getStatusBadgeClass(userSubject?.status)}">
                  ${getSubjectStatusText(userSubject?.status)}
                </span>
                <i class="fas fa-chevron-down subject-arrow"></i>
              </div>
              <div class="subject-content" id="subject-${courseSubject.id}">
                <ul class="task-list">
                  ${tasks
                      .map(
                          (userTask) => `
                    <li class="task-item ${userTask.task?.id === currentTask?.id ? 'active' : ''}" 
                        onclick="selectTask('${userTask.task?.id || ''}')">
                      <div class="task-checkbox ${userTask.status === 'FINISH' ? 'completed' : ''}"
                           onclick="toggleTaskCompletion(event, '${userTask.id}')">
                      </div>
                      <div class="task-content">
                        <h4 class="task-title">${userTask.task?.title || 'Bài học đang được cập nhật'}</h4>
                        <p class="task-description">${userTask.task?.contentFileLink || 'Chưa có mô tả'}</p>
                      </div>
                    </li>
                  `,
                      )
                      .join('')}
                </ul>
              </div>
            </li>
          `;
            }

            return `
          <li class="subject-item">
            <div class="subject-header" onclick="toggleSubject('${courseSubject.id}')">
              <div class="subject-header-left">
                <div class="subject-checkbox ${isCompleted ? 'completed' : ''}"
                     onclick="toggleSubjectCompletion(event, '${userSubject?.id}')"
                     data-subject-id="${courseSubject.id}">
                </div>
                <h3 class="subject-title">${subject.name}</h3>
              </div>
              <span class="subject-status ${getStatusBadgeClass(userSubject?.status)}">
                ${getSubjectStatusText(userSubject?.status)}
              </span>
              <i class="fas fa-chevron-down subject-arrow"></i>
            </div>
            <div class="subject-content" id="subject-${courseSubject.id}">
              <ul class="task-list">
                ${tasks
                    .map(
                        (userTask) => `
                  <li class="task-item ${userTask.task?.id === currentTask?.id ? 'active' : ''}" 
                      onclick="selectTask('${userTask.task?.id || ''}')">
                    <div class="task-checkbox ${userTask.status === 'FINISH' ? 'completed' : ''}"
                         onclick="toggleTaskCompletion(event, '${userTask.id}')">
                    </div>
                    <div class="task-content">
                      <h4 class="task-title">${userTask.task?.title || 'Bài học đang được cập nhật'}</h4>
                      <p class="task-description">${userTask.task?.contentFileLink || 'Chưa có mô tả'}</p>
                    </div>
                  </li>
                `,
                    )
                    .join('')}
              </ul>
            </div>
          </li>
        `;
        })
        .join('');
}

function toggleSubject(subjectId) {
    const subjectContent = document.getElementById(`subject-${subjectId}`);
    const isActive = subjectContent.classList.contains('active');

    document.querySelectorAll('.subject-content').forEach((content) => {
        content.classList.remove('active');
    });

    if (!isActive) {
        subjectContent.classList.add('active');
        const firstTask = subjectContent.querySelector('.task-item');
        if (firstTask) {
            const taskId = firstTask.getAttribute('onclick').match(/'([^']+)'/)[1];
            selectTask(taskId);
        }
    }
}

function selectSubject(subjectId) {
    const courseSubject = currentCourse.courseSubjects.find((s) => s.id === subjectId);
    if (!courseSubject) return;

    currentSubject = courseSubject;

    document.querySelectorAll('.subject-content').forEach((content) => {
        content.classList.remove('active');
    });
    document.getElementById(`subject-${subjectId}`).classList.add('active');

    if (courseSubject.subject.tasksCreated && courseSubject.subject.tasksCreated.length > 0) {
        selectTask(courseSubject.subject.tasksCreated[0].id);
    }
}

function selectTask(taskId) {
    const task = currentCourse.courseSubjects
        .flatMap((s) => s.userSubjects[0]?.userTasks || [])
        .find((t) => t.task.id === taskId);

    if (!task) return;

    currentTask = task.task;
    currentUserTask = task;

    document.querySelectorAll('.task-item').forEach((item) => {
        item.classList.remove('active');
    });
    const activeTaskElement = document.querySelector(`.task-item[onclick*="${taskId}"]`);
    if (activeTaskElement) {
        activeTaskElement.classList.add('active');
        activeTaskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    document.getElementById('taskTitle').textContent = task.task.contentFileLink ? task.task.title : 'Video bài học';

    const videoContainer = document.getElementById('videoContainer');
    if (task.task.contentFileLink) {
        const videoId = extractYoutubeId(task.task.contentFileLink);
        if (videoId) {
            videoContainer.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${videoId}" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
            </iframe>
          `;
        } else {
            videoContainer.innerHTML = `
            <div class="video-loading">
              <i class="fas fa-video-slash"></i>
              <span>Không thể hiển thị video</span>
            </div>
          `;
        }
    } else {
        videoContainer.innerHTML = `
          <div class="video-loading">
            <i class="fas fa-video-slash"></i>
            <span>Không có video cho bài học này</span>
          </div>
        `;
    }

    updateNavigationButtons();
}

function extractYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

async function toggleTaskCompletion(event, userTaskId) {
    if (event) {
        event.stopPropagation();
    }

    const userTask = currentCourse.courseSubjects
        .flatMap((s) => s.userSubjects[0]?.userTasks || [])
        .find((t) => t.id === userTaskId);

    if (!userTask) return;

    if (userTask.status === 'FINISH') {
        showToast({
            type: 'info',
            title: 'Thông báo',
            message: 'Bài học này đã hoàn thành và không thể thay đổi trạng thái',
            duration: 3000,
        });
        return;
    }

    try {
        const response = await fetch(`/user_task/finishTask/${userTaskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw { status: response.status, message: 'Không thể cập nhật trạng thái bài học' };
        }

        const data = await response.json();
        if (data.statusCode === 200) {
            userTask.status = 'FINISH';

            if (data.data.isSubjectFinish) {
                const courseSubject = currentCourse.courseSubjects.find((s) =>
                    s.userSubjects[0]?.userTasks.some((t) => t.id === userTaskId),
                );
                if (courseSubject && courseSubject.userSubjects[0]) {
                    courseSubject.userSubjects[0].status = 'FINISH';
                    const subjectHeader = document.querySelector(`.subject-header[onclick*="${courseSubject.id}"]`);
                    if (subjectHeader) {
                        const statusBadge = subjectHeader.querySelector('.subject-status');
                        if (statusBadge) {
                            statusBadge.className = `subject-status ${getStatusBadgeClass('FINISH')}`;
                            statusBadge.textContent = getSubjectStatusText('FINISH');
                        }
                        const subjectCheckbox = subjectHeader.querySelector('.subject-checkbox');
                        if (subjectCheckbox) {
                            subjectCheckbox.classList.add('completed');
                        }
                    }
                }
            }
        }

        const taskElement = document.querySelector(`.task-item[onclick*="${userTask.task?.id}"]`);
        if (taskElement) {
            const checkbox = taskElement.querySelector('.task-checkbox');
            if (checkbox) {
                checkbox.classList.add('completed');
            }
        }

        updateNavigationButtons();

        showToast({
            type: 'success',
            title: 'Cập nhật thành công',
            message: 'Đã đánh dấu hoàn thành bài học',
            duration: 3000,
        });
    } catch (error) {
        console.error('Error toggling task completion:', error);
        handleError(error);
    }
}

function updateNavigationButtons() {
    const allTasks = currentCourse.courseSubjects.flatMap((s) => s.userSubjects[0]?.userTasks || []);
    const currentIndex = allTasks.findIndex((t) => t.task.id === currentTask?.id);

    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const completeButton = document.getElementById('completeButton');

    prevButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= allTasks.length - 1;
    completeButton.disabled = !currentTask || currentUserTask?.status === 'FINISH';

    prevButton.onclick = () => {
        if (currentIndex > 0) {
            selectTask(allTasks[currentIndex - 1].task.id);
        }
    };

    nextButton.onclick = () => {
        if (currentIndex < allTasks.length - 1) {
            selectTask(allTasks[currentIndex + 1].task.id);
        }
    };

    completeButton.onclick = () => {
        if (currentTask && currentUserTask) {
            toggleTaskCompletion(null, currentUserTask.id);
        }
    };
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'FINISH':
            return 'bg-success';
        case 'NOT_FINISH':
            return 'bg-warning';
        case 'START':
            return 'bg-primary';
        case 'DISABLED':
            return 'bg-secondary';
        default:
            return 'bg-secondary';
    }
}

function getSubjectStatusText(status) {
    switch (status) {
        case 'FINISH':
            return 'Hoàn thành';
        case 'NOT_FINISH':
            return 'Chưa hoàn thành';
        case 'START':
            return 'Đang học';
        case 'DISABLED':
            return 'Đã vô hiệu hóa';
        default:
            return 'Không xác định';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'START':
            return 'Đang học';
        case 'COMPLETED':
            return 'Hoàn thành';
        case 'NOT_STARTED':
            return 'Chưa bắt đầu';
        case 'DISABLED':
            return 'Đã vô hiệu hóa';
        default:
            return 'Không xác định';
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

document.querySelectorAll('.course-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.course-tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}Tab`).classList.add('active');
    });
});

async function fetchAndRenderMembers() {
    try {
        const courseId = window.location.pathname.split('/').pop();
        const response = await fetch(`/courses/trainee/members?courseId=${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw { status: response.status, message: 'Không thể tải danh sách thành viên' };
        }

        const data = await response.json();
        if (data.statusCode === 200) {
            renderMembers(data.data);
        }
    } catch (error) {
        console.error('Error fetching members:', error);
        handleError(error);
    }
}

function renderMembers(members) {
    const membersGrid = document.querySelector('.members-grid');
    if (!members || members.length === 0) {
        membersGrid.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-users"></i>
            <p>Chưa có thành viên nào trong khóa học</p>
          </div>
        `;
        return;
    }

    membersGrid.innerHTML = members
        .map(
            (name) => `
        <div class="member-card">
          <div class="member-avatar">
            ${getInitials(name)}
          </div>
          <div class="member-info">
            <h3 class="member-name">${name}</h3>
            <p class="member-role">Học viên</p>
          </div>
          <div class="member-status"></div>
        </div>
      `,
        )
        .join('');
}

function getInitials(name) {
    if (!name) return '??';
    return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

async function toggleSubjectCompletion(event, userSubjectId) {
    event.stopPropagation();

    if (!userSubjectId) return;

    const checkbox = event.currentTarget;
    const subjectId = checkbox.dataset.subjectId;
    const courseSubject = currentCourse.courseSubjects.find((s) => s.id === subjectId);

    if (!courseSubject || !courseSubject.userSubjects[0]) return;

    if (courseSubject.userSubjects[0].status === 'FINISH') {
        showToast({
            type: 'info',
            title: 'Thông báo',
            message: 'Môn học này đã hoàn thành và không thể thay đổi trạng thái',
            duration: 3000,
        });
        return;
    }

    checkbox.classList.add('loading');

    try {
        const response = await fetch(`/user_subject/finishSubject/${userSubjectId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw { status: response.status, message: 'Không thể cập nhật trạng thái môn học' };
        }

        const data = await response.json();
        if (data.statusCode === 200) {
            courseSubject.userSubjects[0].status = 'FINISH';
            courseSubject.userSubjects[0].userTasks.forEach((task) => {
                task.status = 'FINISH';
            });
            const subjectHeader = document.querySelector(`.subject-header[onclick*="${subjectId}"]`);
            if (subjectHeader) {
                const statusBadge = subjectHeader.querySelector('.subject-status');
                if (statusBadge) {
                    statusBadge.className = `subject-status ${getStatusBadgeClass('FINISH')}`;
                    statusBadge.textContent = getSubjectStatusText('FINISH');
                }
                const subjectCheckbox = subjectHeader.querySelector('.subject-checkbox');
                if (subjectCheckbox) {
                    subjectCheckbox.classList.remove('loading');
                    subjectCheckbox.classList.add('completed');
                }
            }
            const taskList = document.querySelector(`#subject-${subjectId} .task-list`);
            if (taskList) {
                taskList.querySelectorAll('.task-checkbox').forEach((taskCheckbox) => {
                    taskCheckbox.classList.add('completed');
                });
            }
            if (currentTask && courseSubject.userSubjects[0].userTasks.some((t) => t.task?.id === currentTask.id)) {
                updateNavigationButtons();
            }

            showToast({
                type: 'success',
                title: 'Cập nhật thành công',
                message: 'Đã đánh dấu hoàn thành môn học',
                duration: 3000,
            });
        }
    } catch (error) {
        console.error('Error toggling subject completion:', error);
        handleError(error);
        checkbox.classList.remove('loading');
    }
}

async function initialize() {
    const course = await fetchCourseDetails();
    if (course) {
        renderCourseDetails(course);
        fetchAndRenderMembers();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
