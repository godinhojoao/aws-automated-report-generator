const assert = require("assert");
const { describe, test } = require("node:test");
const { sanitizeForS3Key, validateReportRequest } = require("../src/validators");

describe("sanitizeForS3Key", () => {
  test("handles non-string inputs", () => {
    assert.strictEqual(sanitizeForS3Key(null), "");
    assert.strictEqual(sanitizeForS3Key(123), "");
  });

  test("replaces spaces with underscores", () => {
    assert.strictEqual(sanitizeForS3Key("hello world"), "hello_world");
  });

  test("removes invalid characters", () => {
    assert.strictEqual(sanitizeForS3Key("test@file#name"), "test_file_name");
    assert.strictEqual(sanitizeForS3Key("file!name"), "file_name");
  });

  test("collapses multiple underscores", () => {
    assert.strictEqual(sanitizeForS3Key("test___name"), "test_name");
  });

  test("trims leading and trailing underscores", () => {
    assert.strictEqual(sanitizeForS3Key("_test_"), "test");
  });

  test("replaces dots with underscores", () => {
    assert.strictEqual(sanitizeForS3Key("Node.js"), "Node_js");
    assert.strictEqual(sanitizeForS3Key("test-name_123.file"), "test-name_123_file");
  });

  test("preserves valid characters", () => {
    assert.strictEqual(sanitizeForS3Key("test-name_123"), "test-name_123");
  });
});

describe("validateReportRequest", () => {
  test("rejects missing required fields", () => {
    const missingDataResult = validateReportRequest({ reportTitle: "Test" });
    assert(missingDataResult !== null && missingDataResult.error.includes("Missing required fields"));

    const missingTitleResult = validateReportRequest({ data: [] });
    assert(missingTitleResult !== null && missingTitleResult.error.includes("Missing required fields"));
  });

  test("rejects empty data array", () => {
    const emptyDataResult = validateReportRequest({ data: [], reportTitle: "Test" });
    assert(emptyDataResult !== null && emptyDataResult.error.includes("cannot be empty"));
  });

  test("rejects data exceeding maximum length", () => {
    const largeData = Array.from({ length: 10001 }, (_, i) => ({
      id: String(i),
      name: "Test",
      value: 100,
      category: "Test",
      date: "2024-01-01"
    }));
    const largeDataResult = validateReportRequest({ data: largeData, reportTitle: "Test" });
    assert(largeDataResult !== null && largeDataResult.error.includes("cannot exceed"));
  });

  test("validates data entry fields", () => {
    const invalidEntryResult = validateReportRequest({
      data: [{ name: "Test", value: 100, category: "Test" }], // missing id and date
      reportTitle: "Test"
    });
    assert(invalidEntryResult !== null && invalidEntryResult.error.includes("Missing required fields"));
  });

  test("validates data entry types", () => {
    const invalidValueResult = validateReportRequest({
      data: [{ id: "001", name: "Test", value: "invalid", category: "Test", date: "2024-01-01" }],
      reportTitle: "Test"
    });
    assert(invalidValueResult !== null && invalidValueResult.error.includes("must be a number"));
  });

  test("validates date format", () => {
    const invalidDateResult = validateReportRequest({
      data: [{ id: "001", name: "Test", value: 100, category: "Test", date: "2024/01/01" }],
      reportTitle: "Test"
    });
    assert(invalidDateResult !== null && invalidDateResult.error.includes("must be in YYYY-MM-DD format"));
  });

  test("validates string field lengths", () => {
    const longNameResult = validateReportRequest({
      data: [{ id: "001", name: "a".repeat(101), value: 100, category: "Test", date: "2024-01-01" }],
      reportTitle: "Test"
    });
    assert(longNameResult !== null && longNameResult.error.includes("exceeds maximum length"));
  });

  test("accepts valid data", () => {
    const validResult = validateReportRequest({
      data: [
        { id: "001", name: "Alice Johnson", value: 1250.50, category: "Sales", date: "2024-01-15" },
        { id: "002", name: "Bob Smith", value: 890.25, category: "Marketing", date: "2024-01-16" }
      ],
      reportTitle: "Monthly Report"
    });
    assert.strictEqual(validResult, null);
  });
});
