const DataToolsController = (() => {
  let elements = {};

  function init() {
    elements = {
      exportButton: document.getElementById('export-data-button'),
      importInput: document.getElementById('import-data-input'),
      clearCompletedButton: document.getElementById('clear-completed-button'),
      deleteAllButton: document.getElementById('delete-all-data-button')
    };

    elements.exportButton.addEventListener('click', exportData);
    elements.importInput.addEventListener('change', importData);
    elements.clearCompletedButton.addEventListener('click', clearCompletedPastTasks);
    elements.deleteAllButton.addEventListener('click', deleteAllData);
  }

  function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function exportData() {
    const backupDate = getTodayDateString();
    const backup = {
      version: TaskStorage.DATA_VERSION,
      exportedAt: new Date().toISOString(),
      date: backupDate,
      tasks: TaskStorage.loadTasks()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `task-planner-backup-${backupDate}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const [file] = event.target.files;

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.addEventListener('load', () => {
      try {
        const importedData = JSON.parse(String(reader.result || ''));

        if (!isValidImportedData(importedData)) {
          window.alert('Импорт заблокирован: файл не содержит корректные поля version и tasks.');
          return;
        }

        const shouldImport = window.confirm(
          `Импортировать ${importedData.tasks.length} задач и заменить текущие данные?`
        );

        if (!shouldImport) {
          return;
        }

        TaskStorage.saveTasks(importedData.tasks);
        rerenderCurrentView();
        window.alert('Данные импортированы.');
      } catch (error) {
        console.error('Не удалось импортировать данные:', error);
        window.alert('Импорт заблокирован: файл не является валидным JSON.');
      } finally {
        elements.importInput.value = '';
      }
    });

    reader.addEventListener('error', () => {
      window.alert('Не удалось прочитать выбранный файл.');
      elements.importInput.value = '';
    });

    reader.readAsText(file);
  }

  function isValidImportedData(data) {
    return (
      data &&
      typeof data === 'object' &&
      data.version === TaskStorage.DATA_VERSION &&
      Array.isArray(data.tasks)
    );
  }

  function clearCompletedPastTasks() {
    const today = getTodayDateString();
    const tasks = TaskStorage.loadTasks();
    const tasksToKeep = tasks.filter((task) => !isCompletedPastOneTimeTask(task, today));
    const deleteCount = tasks.length - tasksToKeep.length;

    if (deleteCount === 0) {
      window.alert('Нет старых завершенных разовых задач для очистки.');
      return;
    }

    const shouldClear = window.confirm(`Удалить завершенные старые задачи: ${deleteCount}?`);

    if (!shouldClear) {
      return;
    }

    TaskStorage.saveTasks(tasksToKeep);
    rerenderCurrentView(tasksToKeep);
  }

  function isCompletedPastOneTimeTask(task, today) {
    const isOneTime = !task.repeat || task.repeat === 'none';

    return (
      isOneTime &&
      task.isCompleted === true &&
      typeof task.startDate === 'string' &&
      task.startDate < today
    );
  }

  function deleteAllData() {
    const firstConfirm = window.confirm('Удалить все данные приложения?');

    if (!firstConfirm) {
      return;
    }

    const secondConfirm = window.confirm('Это действие нельзя отменить. Точно удалить все данные?');

    if (!secondConfirm) {
      return;
    }

    localStorage.removeItem(TaskStorage.STORAGE_KEY);
    const emptyData = TaskStorage.loadData();
    rerenderCurrentView(emptyData.tasks);
  }

  function rerenderCurrentView(tasks) {
    if (typeof AppController !== 'undefined') {
      AppController.renderCurrent(tasks);
    }
  }

  return {
    init
  };
})();
