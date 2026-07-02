const TaskRecurrence = (() => {
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  function parseDate(dateString) {
    if (!DATE_PATTERN.test(dateString)) {
      return null;
    }

    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function addDays(date, days) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  function isWeekday(date) {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }

  function isSameMonthlyDay(date, startDate) {
    return date.getDate() === startDate.getDate();
  }

  function isMatchingDate(task, date, startDate) {
    if (task.repeat === 'daily') {
      return true;
    }

    if (task.repeat === 'weekdays') {
      return isWeekday(date);
    }

    if (task.repeat === 'weekly') {
      return date.getDay() === startDate.getDay();
    }

    if (task.repeat === 'monthly') {
      return isSameMonthlyDay(date, startDate);
    }

    return false;
  }

  function getTaskDatesInPeriod(task, period) {
    const startDate = parseDate(task.startDate);
    const periodStart = parseDate(period.startDate);
    const periodEnd = parseDate(period.endDate);

    if (!startDate || !periodStart || !periodEnd || periodEnd < periodStart) {
      return [];
    }

    if (!task.repeat || task.repeat === 'none') {
      if (task.startDate >= period.startDate && task.startDate <= period.endDate) {
        return [task.startDate];
      }

      return [];
    }

    const excludedDates = Array.isArray(task.excludedDates) ? task.excludedDates : [];
    const dates = [];
    let currentDate = periodStart > startDate ? periodStart : startDate;

    while (currentDate <= periodEnd) {
      const currentDateString = formatDate(currentDate);

      if (
        isMatchingDate(task, currentDate, startDate) &&
        !excludedDates.includes(currentDateString)
      ) {
        dates.push(currentDateString);
      }

      currentDate = addDays(currentDate, 1);
    }

    return dates;
  }

  function isCompletedOnDate(task, dateString) {
    if (!task.repeat || task.repeat === 'none') {
      return Boolean(task.isCompleted);
    }

    return Array.isArray(task.completedDates) && task.completedDates.includes(dateString);
  }

  return {
    getTaskDatesInPeriod,
    isCompletedOnDate
  };
})();
