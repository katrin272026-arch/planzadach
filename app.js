const AppController = (() => {
  const state = {
    mode: 'day',
    currentDate: ''
  };
  let elements = {};

  function init() {
    state.currentDate = TaskRenderer.formatDate(new Date());
    elements = {
      title: document.getElementById('current-date-title'),
      previousButton: document.getElementById('previous-date-button'),
      nextButton: document.getElementById('next-date-button'),
      todayButton: document.getElementById('today-button'),
      viewButtons: {
        day: document.getElementById('view-day'),
        week: document.getElementById('view-week'),
        month: document.getElementById('view-month')
      }
    };

    elements.previousButton.addEventListener('click', goToPreviousPeriod);
    elements.nextButton.addEventListener('click', goToNextPeriod);
    elements.todayButton.addEventListener('click', goToToday);

    Object.entries(elements.viewButtons).forEach(([mode, button]) => {
      button.addEventListener('click', () => setMode(mode));
    });

    renderCurrent();
  }

  function setMode(mode) {
    state.mode = mode;
    updateViewButtons();
    renderCurrent();
  }

  function goToPreviousPeriod() {
    movePeriod(-1);
  }

  function goToNextPeriod() {
    movePeriod(1);
  }

  function goToToday() {
    state.currentDate = TaskRenderer.formatDate(new Date());
    renderCurrent();
  }

  function movePeriod(direction) {
    const date = TaskRenderer.parseDate(state.currentDate);

    if (state.mode === 'day') {
      date.setDate(date.getDate() + direction);
    }

    if (state.mode === 'week') {
      date.setDate(date.getDate() + direction * 7);
    }

    if (state.mode === 'month') {
      const targetMonth = new Date(date.getFullYear(), date.getMonth() + direction, 1);
      state.currentDate = TaskRenderer.formatDate(targetMonth);
      renderCurrent();
      return;
    }

    state.currentDate = TaskRenderer.formatDate(date);
    renderCurrent();
  }

  function renderCurrent(preloadedTasks) {
    const tasks = preloadedTasks || TaskStorage.loadTasks();

    updateViewButtons();

    if (state.mode === 'day') {
      elements.title.textContent = getDayNavigationTitle(state.currentDate);
      TaskRenderer.renderDay(tasks, state.currentDate);
      return;
    }

    if (state.mode === 'week') {
      const weekDates = getWeekDates(state.currentDate);
      elements.title.textContent = getWeekNavigationTitle(weekDates);
      TaskRenderer.renderPeriod(tasks, weekDates);
      return;
    }

    const monthDates = getMonthDates(state.currentDate);
    elements.title.textContent = getMonthNavigationTitle(state.currentDate);
    TaskRenderer.renderPeriod(tasks, monthDates);
  }

  function updateViewButtons() {
    Object.entries(elements.viewButtons).forEach(([mode, button]) => {
      const isActive = mode === state.mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function getWeekDates(dateString) {
    const date = TaskRenderer.parseDate(dateString);
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);

    return Array.from({ length: 7 }, (_, index) => {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + index);
      return TaskRenderer.formatDate(currentDate);
    });
  }

  function getMonthDates(dateString) {
    const date = TaskRenderer.parseDate(dateString);
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, index) => (
      TaskRenderer.formatDate(new Date(year, month, index + 1))
    ));
  }

  function getDayNavigationTitle(dateString) {
    const today = TaskRenderer.formatDate(new Date());

    if (dateString === today) {
      return 'Сегодня';
    }

    return formatShortDate(dateString);
  }

  function getWeekNavigationTitle(dates) {
    return `${formatShortDate(dates[0])} - ${formatShortDate(dates[6])}`;
  }

  function getMonthNavigationTitle(dateString) {
    return new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      year: 'numeric'
    }).format(TaskRenderer.parseDate(dateString));
  }

  function formatShortDate(dateString) {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(TaskRenderer.parseDate(dateString));
  }

  return {
    init,
    renderCurrent
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  TaskStorage.loadData();
  TaskRenderer.init();
  TaskController.init();
  DataToolsController.init();
  AppController.init();
});
