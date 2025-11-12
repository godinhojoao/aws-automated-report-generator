function sanitizeForS3Key(input) {
  if (typeof input !== "string") return "";
  return input.replace(/\./g, "_").replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_{2,}/g, "_").replace(/^_+|_+$/g, "");
}

function validateStringField(value, fieldName, maxLength = 200, allowEmpty = false) {
  if (typeof value !== "string") return { error: `${fieldName} must be a string` };
  if (!allowEmpty && value.trim().length === 0) return { error: `${fieldName} cannot be empty` };
  if (value.length > maxLength) return { error: `${fieldName} exceeds maximum length of ${maxLength} characters` };
  return null;
}

function validateNumberField(value, fieldName, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== "number" || isNaN(value)) return { error: `${fieldName} must be a number` };
  if (value < min) return { error: `${fieldName} must be at least ${min}` };
  if (value > max) return { error: `${fieldName} must be at most ${max}` };
  return null;
}

function validateDataEntry(entry, index) {
  const required = ["id", "name", "value", "category", "date"];
  const missing = required.filter((field) => !entry[field]);
  if (missing.length > 0) return { error: `Entry ${index}: Missing required fields: ${missing.join(", ")}` };

  const idError = validateStringField(entry.id, `entry ${index} id`, 50);
  if (idError) return idError;

  const nameError = validateStringField(entry.name, `entry ${index} name`, 100);
  if (nameError) return nameError;

  const valueError = validateNumberField(entry.value, `entry ${index} value`);
  if (valueError) return valueError;

  const categoryError = validateStringField(entry.category, `entry ${index} category`, 50);
  if (categoryError) return categoryError;

  const dateError = validateStringField(entry.date, `entry ${index} date`, 50);
  if (dateError) return dateError;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    return { error: `Entry ${index}: date must be in YYYY-MM-DD format` };
  }

  return null;
}

function validateReportRequest(data) {
  const required = ["data", "reportTitle"];
  const missing = required.filter((field) => !data[field]);
    if (missing.length > 0) return { error: `Missing required fields: ${missing.join(", ")}` };

  const titleError = validateStringField(data.reportTitle, "reportTitle", 200);
  if (titleError) return titleError;

  if (!Array.isArray(data.data)) return { error: "data must be an array" };
  if (data.data.length === 0) return { error: "data array cannot be empty" };
  if (data.data.length > 10000) return { error: "data array cannot exceed 10,000 entries" };

  for (let i = 0; i < data.data.length; i++) {
    const entryError = validateDataEntry(data.data[i], i);
    if (entryError) return entryError;
  }

  return null;
}

module.exports = { sanitizeForS3Key, validateReportRequest };

