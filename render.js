const TaskRenderer = (() => {
  let tasksContainer = null;

  function init() {
    tasksContainer = document.getElementById('tasks-container');
  }

  function getTodayDateString() {
    return formatDate(new Date());
  }

  function parseDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function addDays(dateString, days) {
    const date = parseDate(dateString);
    date.setDate(date.getDate() + days);
    return formatDate(date);
  }

  function isOneTimeTask(task) {
    return !task.repeat || task.repeat === 'none';
  }

  function isRecurringTask(task) {
    return task.repeat && task.repeat !== 'none';
  }

  function createTaskView(task, date) {
    return {
      ...task,
      occurrenceDate: date,
      isCompleted: TaskRecurrence.isCompletedOnDate(task, date)
    };
  }

  function createRecurringTaskViews(tasks, date) {
    return tasks
      .filter(isRecurringTask)
      .flatMap((task) => (
        TaskRecurrence.getTaskDatesInPeriod(task, {
          startDate: date,
          endDate: date
        }).map((taskDate) => createTaskView(task, taskDate))
      ));
  }

  function compareTasks(firstTask, secondTask) {
    if (firstTask.isCompleted !== secondTask.isCompleted) {
      return firstTask.isCompleted ? 1 : -1;
    }

    const firstHasTime = Boolean(firstTask.time);
    const secondHasTime = Boolean(secondTask.time);

    if (firstHasTime && secondHasTime && firstTask.time !== secondTask.time) {
      return firstTask.time.localeCompare(secondTask.time);
    }

    if (firstHasTime !== secondHasTime) {
      return firstHasTime ? -1 : 1;
    }

    if (firstHasTime && secondHasTime && firstTask.isImportant !== secondTask.isImportant) {
      return firstTask.isImportant ? -1 : 1;
    }

    if (!firstHasTime && !secondHasTime) {
      const firstCreatedAt = firstTask.createdAt || '';
      const secondCreatedAt = secondTask.createdAt || '';
      return firstCreatedAt.localeCompare(secondCreatedAt);
    }

    return 0;
  }

  function getTasksForDate(tasks, date) {
    const oneTimeTasks = tasks
      .filter((task) => isOneTimeTask(task) && task.startDate === date)
      .map((task) => createTaskView(task, date));
    const recurringTasks = createRecurringTaskViews(tasks, date);

    return oneTimeTasks
      .concat(recurringTasks)
      .sort(compareTasks);
  }

  function getOverdueTasks(tasks, today) {
    return tasks
      .filter((task) => (
        isOneTimeTask(task) &&
        !task.isCompleted &&
        task.startDate < today
      ))
      .slice()
      .sort((firstTask, secondTask) => {
        if (firstTask.startDate !== secondTask.startDate) {
          return firstTask.startDate.localeCompare(secondTask.startDate);
        }

        return compareTasks(firstTask, secondTask);
      });
  }

  function createTaskElement(task, options = {}) {
    const taskElement = document.createElement('article');
    taskElement.className = 'task-item';
    taskElement.dataset.taskId = task.id;
    taskElement.dataset.taskDate = task.occurrenceDate || task.startDate;

    if (task.isImportant) {
      taskElement.classList.add('is-important');
    }

    if (isRecurringTask(task)) {
      taskElement.classList.add('is-recurring');
    }

    if (task.isCompleted) {
      taskElement.classList.add('is-completed');
    }

    const mainElement = document.createElement('div');
    mainElement.className = 'task-item__main';

    const completeButton = document.createElement('button');
    completeButton.className = 'task-item__complete';
    completeButton.type = 'button';
    completeButton.dataset.action = 'toggle-complete';
    completeButton.setAttribute(
      'aria-label',
      task.isCompleted ? 'Снять отметку выполнения' : 'Отметить задачу выполненной'
    );
    completeButton.textContent = task.isCompleted ? '✓' : '';
    mainElement.append(completeButton);

    const textElement = document.createElement('p');
    textElement.className = 'task-item__text';
    textElement.textContent = task.text;
    mainElement.append(textElement);

    const actionsElement = document.createElement('div');
    actionsElement.className = 'task-item__actions';

    const editButton = document.createElement('button');
    editButton.className = 'task-item__action';
    editButton.type = 'button';
    editButton.dataset.action = 'edit';
    editButton.setAttribute('aria-label', `Редактировать задачу ${task.text}`);
    editButton.textContent = '✎';
    actionsElement.append(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'task-item__action task-item__action--danger';
    deleteButton.type = 'button';
    deleteButton.dataset.action = 'delete';
    deleteButton.setAttribute('aria-label', `Удалить задачу ${task.text}`);
    deleteButton.textContent = '🗑';
    actionsElement.append(deleteButton);

    mainElement.append(actionsElement);
    taskElement.append(mainElement);

    const metaElement = document.createElement('div');
    metaElement.className = 'task-item__meta';

    if (task.time) {
      const timeElement = document.createElement('span');
      timeElement.className = 'task-item__time';
      timeElement.textContent = task.time;
      metaElement.append(timeElement);
    }

    if (isRecurringTask(task)) {
      const recurrenceElement = document.createElement('span');
      recurrenceElement.className = 'task-item__recurrence';
      recurrenceElement.textContent = getRepeatLabel(task.repeat);
      metaElement.append(recurrenceElement);
    }

    if (options.isOverdue) {
      const overdueElement = document.createElement('span');
      overdueElement.className = 'task-item__overdue';
      overdueElement.textContent = `просрочено с ${task.startDate}`;
      metaElement.append(overdueElement);
    }

    if (metaElement.childElementCount > 0) {
      taskElement.append(metaElement);
    }

    return taskElement;
  }

  function createSection(titleText, tasks, options = {}) {
    const section = document.createElement('section');
    section.className = options.isOverdue ? 'task-group task-group--overdue' : 'task-group';

    const title = document.createElement('h3');
    title.className = 'task-group__title';
    title.textContent = titleText;
    section.append(title);

    const list = document.createElement('div');
    list.className = 'task-group__list';

    if (tasks.length > 0) {
      tasks.forEach((task) => {
        list.append(createTaskElement(task, options));
      });
    } else {
      const emptyDay = document.createElement('p');
      emptyDay.className = 'tasks-empty tasks-empty--day';
      emptyDay.textContent = 'задач нет';
      list.append(emptyDay);
    }

    section.append(list);
    return section;
  }

  function getRepeatLabel(repeat) {
    const labels = {
      daily: 'каждый день',
      weekdays: 'по будням',
      weekly: 'каждую неделю',
      monthly: 'каждый месяц'
    };

    return labels[repeat] || '';
  }

  function renderEmptyState(text = 'на сегодня задач нет') {
    const emptyElement = document.createElement('p');
    emptyElement.className = 'tasks-empty';
    emptyElement.textContent = text;
    tasksContainer.append(emptyElement);
  }

  function renderToday(tasks) {
    renderDay(tasks, getTodayDateString());
  }

  function renderDay(tasks, date) {
    const today = getTodayDateString();
    const overdueTasks = date === today ? getOverdueTasks(tasks, today) : [];
    const dayTasks = getTasksForDate(tasks, date);

    tasksContainer.replaceChildren();

    if (overdueTasks.length > 0) {
      tasksContainer.append(createSection('Просроченные', overdueTasks, { isOverdue: true }));
    }

    if (dayTasks.length > 0) {
      tasksContainer.append(createSection(getDayTitle(date), dayTasks));
      return;
    }

    if (overdueTasks.length === 0) {
      renderEmptyState(date === today ? 'на сегодня задач нет' : 'задач нет');
    }
  }

  function renderPeriod(tasks, dates) {
    tasksContainer.replaceChildren();

    dates.forEach((date) => {
      tasksContainer.append(createSection(getDayTitle(date), getTasksForDate(tasks, date)));
    });
  }

  function renderFromStorage(mode = 'day', dates = [getTodayDateString()]) {
    const tasks = TaskStorage.loadTasks();

    if (mode === 'day') {
      renderDay(tasks, dates[0]);
      return;
    }

    renderPeriod(tasks, dates);
  }

  function getDayTitle(dateString) {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    return formatter.format(parseDate(dateString));
  }

  return {
    addDays,
    formatDate,
    init,
    parseDate,
    renderDay,
    renderFromStorage,
    renderPeriod,
    renderToday
  };
})();
