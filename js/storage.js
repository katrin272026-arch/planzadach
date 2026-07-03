const TaskStorage = (() => {
  const STORAGE_KEY = 'task-planner-data';
  const DATA_VERSION = 1;

  function createEmptyData() {
    return {
      version: DATA_VERSION,
      tasks: []
    };
  }

  function normalizeData(data) {
    if (!data || typeof data !== 'object') {
      return createEmptyData();
    }

    return {
      version: DATA_VERSION,
      tasks: Array.isArray(data.tasks) ? data.tasks : []
    };
  }

  function saveTasks(tasks) {
    const data = {
      version: DATA_VERSION,
      tasks: Array.isArray(tasks) ? tasks : []
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  function loadData() {
    const storedData = localStorage.getItem(STORAGE_KEY);

    if (storedData === null) {
      return saveTasks([]);
    }

    try {
      const parsedData = JSON.parse(storedData);
      const normalizedData = normalizeData(parsedData);

      if (
        parsedData?.version !== DATA_VERSION ||
        !Array.isArray(parsedData?.tasks)
      ) {
        saveTasks(normalizedData.tasks);
      }

      return normalizedData;
    } catch (error) {
      console.error('Не удалось прочитать данные из Local Storage:', error);

      const shouldReset = window.confirm(
        'Данные приложения повреждены и не могут быть загружены. Сбросить хранилище?'
      );

      if (shouldReset) {
        localStorage.removeItem(STORAGE_KEY);
        return saveTasks([]);
      }

      window.alert('Хранилище не сброшено. Приложение запущено с пустым списком задач.');
      return createEmptyData();
    }
  }

  function loadTasks() {
    return loadData().tasks;
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    return [
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 10),
      Math.random().toString(36).slice(2, 10)
    ].join('-');
  }

  return {
    STORAGE_KEY,
    DATA_VERSION,
    generateId,
    loadData,
    loadTasks,
    saveTasks
  };
})();
