const TaskController = (() => {
  let elements = {};
  let editingTaskId = null;
  let deletedTaskState = null;
  let deleteNotificationTimeoutId = null;

  function init() {
    elements = {
      addButton: document.getElementById('add-task-button'),
      modal: document.getElementById('task-modal'),
      modalBackdrop: document.getElementById('task-modal-backdrop'),
      closeButton: document.getElementById('close-task-modal-button'),
      cancelButton: document.getElementById('cancel-task-button'),
      form: document.getElementById('task-form'),
      textInput: document.getElementById('task-text'),
      dateInput: document.getElementById('task-date'),
      timeInput: document.getElementById('task-time'),
      importantInput: document.getElementById('task-important'),
      recurrenceSelect: document.getElementById('task-recurrence'),
      modalTitle: document.getElementById('task-modal-title'),
      saveButton: document.getElementById('save-task-button'),
      tasksContainer: document.getElementById('tasks-container')
    };

    elements.addButton.addEventListener('click', openModal);
    elements.closeButton.addEventListener('click', closeModal);
    elements.cancelButton.addEventListener('click', closeModal);
    elements.modalBackdrop.addEventListener('click', closeModal);
    elements.form.addEventListener('submit', handleSubmit);
    elements.tasksContainer.addEventListener('click', handleTaskActionClick);
  }

  function openModal() {
    clearFormState();
    editingTaskId = null;
    elements.modalTitle.textContent = 'Новая задача';
    elements.saveButton.textContent = 'Сохранить';
    elements.modal.classList.remove('is-hidden');
    elements.textInput.focus();
  }

  function closeModal() {
    clearFormState();
    editingTaskId = null;
    elements.modalTitle.textContent = 'Новая задача';
    elements.saveButton.textContent = 'Сохранить';
    elements.modal.classList.add('is-hidden');
  }

  function clearFormState() {
    elements.form.reset();
    elements.recurrenceSelect.value = 'none';
    clearValidationMessages();
  }

  function clearValidationMessages() {
    elements.textInput.setCustomValidity('');
    elements.dateInput.setCustomValidity('');
    elements.timeInput.setCustomValidity('');
  }

  function collectFormData() {
    return {
      text: elements.textInput.value,
      startDate: elements.dateInput.value,
      time: elements.timeInput.value,
      isImportant: elements.importantInput.checked,
      repeat: elements.recurrenceSelect.value
    };
  }

  function createTask(values) {
    const now = new Date().toISOString();

    return {
      id: TaskStorage.generateId(),
      text: values.text,
      startDate: values.startDate,
      time: values.time,
      isImportant: values.isImportant,
      repeat: values.repeat,
      isCompleted: false,
      completedDates: [],
      excludedDates: [],
      createdAt: now,
      updatedAt: now
    };
  }

  function updateTask(task, values) {
    const isRecurring = values.repeat !== 'none';

    return {
      ...task,
      text: values.text,
      startDate: values.startDate,
      time: values.time,
      isImportant: values.isImportant,
      repeat: values.repeat,
      completedDates: isRecurring ? normalizeDateList(task.completedDates) : [],
      excludedDates: isRecurring ? normalizeDateList(task.excludedDates) : [],
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeDateList(value) {
    return Array.isArray(value) ? value : [];
  }

  function showValidationErrors(errors) {
    clearValidationMessages();

    if (errors.text) {
      elements.textInput.setCustomValidity(errors.text);
      elements.textInput.reportValidity();
      return;
    }

    if (errors.startDate) {
      elements.dateInput.setCustomValidity(errors.startDate);
      elements.dateInput.reportValidity();
      return;
    }

    if (errors.time) {
      elements.timeInput.setCustomValidity(errors.time);
      elements.timeInput.reportValidity();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const formData = collectFormData();
    const validationResult = TaskValidation.validateTaskForm(formData);

    if (!validationResult.isValid) {
      showValidationErrors(validationResult.errors);
      return;
    }

    const taskValues = {
      ...validationResult.values,
      isImportant: formData.isImportant,
      repeat: formData.repeat
    };
    const tasks = TaskStorage.loadTasks();

    if (editingTaskId) {
      const taskIndex = tasks.findIndex((task) => task.id === editingTaskId);

      if (taskIndex !== -1) {
        tasks[taskIndex] = updateTask(tasks[taskIndex], taskValues);
      }
    } else {
      tasks.push(createTask(taskValues));
    }

    TaskStorage.saveTasks(tasks);
    rerenderCurrentView(tasks);
    closeModal();
  }

  function handleTaskActionClick(event) {
    const actionButton = event.target.closest('[data-action]');

    if (!actionButton) {
      return;
    }

    const taskElement = actionButton.closest('[data-task-id]');

    if (!taskElement) {
      return;
    }

    const taskId = taskElement.dataset.taskId;
    const taskDate = taskElement.dataset.taskDate;
    const action = actionButton.dataset.action;

    if (action === 'toggle-complete') {
      toggleTaskCompletion(taskId, taskDate);
    }

    if (action === 'edit') {
      openEditModal(taskId);
    }

    if (action === 'delete') {
      deleteTask(taskId, taskDate);
    }
  }

  function toggleTaskCompletion(taskId, taskDate) {
    const tasks = TaskStorage.loadTasks();
    const task = tasks.find((currentTask) => currentTask.id === taskId);

    if (!task) {
      return;
    }

    const now = new Date().toISOString();
    if (isRecurringTask(task)) {
      task.completedDates = normalizeDateList(task.completedDates);

      if (task.completedDates.includes(taskDate)) {
        task.completedDates = task.completedDates.filter((date) => date !== taskDate);
      } else {
        task.completedDates.push(taskDate);
      }
    } else {
      task.isCompleted = !task.isCompleted;
      task.completedAt = task.isCompleted ? now : null;
    }

    task.updatedAt = now;

    TaskStorage.saveTasks(tasks);
    rerenderCurrentView(tasks);
  }

  function openEditModal(taskId) {
    const task = TaskStorage.loadTasks().find((currentTask) => currentTask.id === taskId);

    if (!task) {
      return;
    }

    clearFormState();
    editingTaskId = task.id;
    elements.modalTitle.textContent = 'Редактировать задачу';
    elements.saveButton.textContent = 'Сохранить';
    elements.textInput.value = task.text;
    elements.dateInput.value = task.startDate;
    elements.timeInput.value = task.time || '';
    elements.importantInput.checked = Boolean(task.isImportant);
    elements.recurrenceSelect.value = task.repeat || 'none';
    elements.modal.classList.remove('is-hidden');
    elements.textInput.focus();
  }

  function deleteTask(taskId, taskDate) {
    const tasks = TaskStorage.loadTasks();
    const taskIndex = tasks.findIndex((task) => task.id === taskId);

    if (taskIndex === -1) {
      return;
    }

    const task = tasks[taskIndex];

    if (isRecurringTask(task)) {
      deleteRecurringTask(tasks, task, taskIndex, taskDate);
      return;
    }

    const shouldDelete = window.confirm(`удалить задачу ${task.text}?`);

    if (!shouldDelete) {
      return;
    }

    deletedTaskState = {
      task: { ...task },
      index: taskIndex
    };

    tasks.splice(taskIndex, 1);
    TaskStorage.saveTasks(tasks);
    rerenderCurrentView(tasks);
    showDeleteNotification(task.text);
  }

  function deleteRecurringTask(tasks, task, taskIndex, taskDate) {
    const deleteSeries = window.confirm(
      `Удалить всю серию задачи ${task.text}?\nOK — удалить всю серию.\nОтмена — удалить только на дату ${taskDate}.`
    );

    if (deleteSeries) {
      deletedTaskState = {
        type: 'series',
        task: { ...task },
        index: taskIndex
      };

      tasks.splice(taskIndex, 1);
      TaskStorage.saveTasks(tasks);
      rerenderCurrentView(tasks);
      showDeleteNotification(task.text);
      return;
    }

    task.excludedDates = normalizeDateList(task.excludedDates);

    if (!task.excludedDates.includes(taskDate)) {
      task.excludedDates.push(taskDate);
    }

    task.updatedAt = new Date().toISOString();
    deletedTaskState = {
      type: 'single-date',
      taskId: task.id,
      date: taskDate
    };

    TaskStorage.saveTasks(tasks);
    rerenderCurrentView(tasks);
    showDeleteNotification(`${task.text} на ${taskDate}`);
  }

  function isRecurringTask(task) {
    return task.repeat && task.repeat !== 'none';
  }

  function showDeleteNotification(taskText) {
    clearDeleteNotification();

    const notification = document.createElement('div');
    notification.className = 'delete-notification';
    notification.id = 'delete-notification';
    notification.setAttribute('role', 'status');

    const message = document.createElement('span');
    message.textContent = `Задача удалена: ${taskText}`;
    notification.append(message);

    const undoButton = document.createElement('button');
    undoButton.className = 'delete-notification__undo';
    undoButton.type = 'button';
    undoButton.textContent = 'отменить';
    undoButton.addEventListener('click', restoreDeletedTask);
    notification.append(undoButton);

    document.body.append(notification);

    deleteNotificationTimeoutId = window.setTimeout(() => {
      deletedTaskState = null;
      clearDeleteNotification();
    }, 5000);
  }

  function clearDeleteNotification() {
    const currentNotification = document.getElementById('delete-notification');

    if (currentNotification) {
      currentNotification.remove();
    }

    if (deleteNotificationTimeoutId !== null) {
      window.clearTimeout(deleteNotificationTimeoutId);
      deleteNotificationTimeoutId = null;
    }
  }

  function restoreDeletedTask() {
    if (!deletedTaskState) {
      return;
    }

    const tasks = TaskStorage.loadTasks();

    if (deletedTaskState.type === 'single-date') {
      const task = tasks.find((currentTask) => currentTask.id === deletedTaskState.taskId);

      if (task) {
        task.excludedDates = normalizeDateList(task.excludedDates)
          .filter((date) => date !== deletedTaskState.date);
        task.updatedAt = new Date().toISOString();
      }
    } else {
      const restoreIndex = Math.min(deletedTaskState.index, tasks.length);
      tasks.splice(restoreIndex, 0, deletedTaskState.task);
    }

    TaskStorage.saveTasks(tasks);
    rerenderCurrentView(tasks);
    deletedTaskState = null;
    clearDeleteNotification();
  }

  function rerenderCurrentView(tasks) {
    if (typeof AppController !== 'undefined') {
      AppController.renderCurrent(tasks);
      return;
    }

    TaskRenderer.renderToday(tasks);
  }

  return {
    init,
    openModal,
    closeModal
  };
})();
