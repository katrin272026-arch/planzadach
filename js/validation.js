const TaskValidation = (() => {
  const MAX_TEXT_LENGTH = 300;
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

  function validateTaskForm(formData) {
    const text = String(formData.text || '').trim();
    const startDate = String(formData.startDate || '').trim();
    const time = String(formData.time || '').trim();
    const errors = {};

    if (!text) {
      errors.text = 'Введите текст задачи.';
    } else if (text.length > MAX_TEXT_LENGTH) {
      errors.text = `Текст задачи не должен превышать ${MAX_TEXT_LENGTH} символов.`;
    }

    if (!startDate) {
      errors.startDate = 'Выберите дату.';
    } else if (!DATE_PATTERN.test(startDate)) {
      errors.startDate = 'Дата должна быть в формате YYYY-MM-DD.';
    }

    if (time && !TIME_PATTERN.test(time)) {
      errors.time = 'Время должно быть в формате HH:MM.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      values: {
        text,
        startDate,
        time
      }
    };
  }

  return {
    validateTaskForm
  };
})();
