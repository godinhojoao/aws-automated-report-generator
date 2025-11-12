const assert = require("assert");
const { describe, test } = require("node:test");
const { processData } = require("../src/dataProcessor");

describe("processData", () => {
  test("processes basic data correctly", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Marketing", date: "2024-01-02" },
      { id: "003", name: "Carol", value: 150, category: "Sales", date: "2024-01-03" }
    ];

    const stats = processData(data);

    assert.strictEqual(stats.totalEntries, 3);
    assert.strictEqual(stats.totalValue, 450);
    assert.strictEqual(stats.averageValue, 150);
    assert.strictEqual(stats.minValue, 100);
    assert.strictEqual(stats.maxValue, 200);
    assert.strictEqual(stats.uniqueCategories.length, 2);
    assert(stats.uniqueCategories.includes("Sales"));
    assert(stats.uniqueCategories.includes("Marketing"));
  });

  test("calculates category statistics correctly", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-02" },
      { id: "003", name: "Carol", value: 150, category: "Marketing", date: "2024-01-03" }
    ];

    const stats = processData(data);

    assert.strictEqual(stats.categoryStats.Sales.count, 2);
    assert.strictEqual(stats.categoryStats.Sales.totalValue, 300);
    assert.strictEqual(stats.categoryStats.Sales.averageValue, 150);
    assert.strictEqual(stats.categoryStats.Sales.minValue, 100);
    assert.strictEqual(stats.categoryStats.Sales.maxValue, 200);

    assert.strictEqual(stats.categoryStats.Marketing.count, 1);
    assert.strictEqual(stats.categoryStats.Marketing.totalValue, 150);
    assert.strictEqual(stats.categoryStats.Marketing.averageValue, 150);
  });

  test("calculates monthly statistics correctly", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-15" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-20" },
      { id: "003", name: "Carol", value: 150, category: "Marketing", date: "2024-02-10" }
    ];

    const stats = processData(data);

    assert.strictEqual(stats.monthlyStats["2024-01"].count, 2);
    assert.strictEqual(stats.monthlyStats["2024-01"].totalValue, 300);
    assert.strictEqual(stats.monthlyStats["2024-01"].averageValue, 150);

    assert.strictEqual(stats.monthlyStats["2024-02"].count, 1);
    assert.strictEqual(stats.monthlyStats["2024-02"].totalValue, 150);
    assert.strictEqual(stats.monthlyStats["2024-02"].averageValue, 150);
  });

  test("finds top 10 entries by value", () => {
    const data = Array.from({ length: 15 }, (_, i) => ({
      id: String(i + 1).padStart(3, '0'),
      name: `Person${i + 1}`,
      value: (i + 1) * 100, // Values from 100 to 1500
      category: "Sales",
      date: "2024-01-01"
    }));

    const stats = processData(data);

    assert.strictEqual(stats.topEntries.length, 10);
    assert.strictEqual(stats.topEntries[0].value, 1500); // Highest value
    assert.strictEqual(stats.topEntries[9].value, 600); // 10th highest
    assert.strictEqual(stats.topEntries[0].id, "015");
  });

  test("calculates date range correctly", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-03-15" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-10" },
      { id: "003", name: "Carol", value: 150, category: "Marketing", date: "2024-02-20" }
    ];

    const stats = processData(data);

    assert.strictEqual(stats.dateRange.start, "2024-01-10");
    assert.strictEqual(stats.dateRange.end, "2024-03-15");
  });

  test("verifies category totals match overall total", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Marketing", date: "2024-01-02" },
      { id: "003", name: "Carol", value: 150, category: "Sales", date: "2024-01-03" }
    ];

    const stats = processData(data);

    const categoryTotalSum = Object.values(stats.categoryStats).reduce((sum, cat) => sum + cat.totalValue, 0);
    assert.strictEqual(categoryTotalSum, stats.totalValue);
  });

  test("verifies monthly totals match overall total", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-15" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-20" },
      { id: "003", name: "Carol", value: 150, category: "Marketing", date: "2024-02-10" }
    ];

    const stats = processData(data);

    const monthlyTotalSum = Object.values(stats.monthlyStats).reduce((sum, month) => sum + month.totalValue, 0);
    assert.strictEqual(monthlyTotalSum, stats.totalValue);
  });

  test("verifies entry counts match", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Marketing", date: "2024-01-02" },
      { id: "003", name: "Carol", value: 150, category: "Sales", date: "2024-01-03" }
    ];

    const stats = processData(data);

    const categoryCountSum = Object.values(stats.categoryStats).reduce((sum, cat) => sum + cat.count, 0);
    assert.strictEqual(categoryCountSum, stats.totalEntries);
  });

  test("handles decimal values correctly", () => {
    const data = [
      { id: "001", name: "Alice", value: 100.50, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200.75, category: "Marketing", date: "2024-01-02" }
    ];

    const stats = processData(data);

    assert.strictEqual(stats.totalValue, 301.25);
    assert.strictEqual(stats.averageValue, 150.625);
  });

  test("sorts category entries by value descending", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 300, category: "Sales", date: "2024-01-02" },
      { id: "003", name: "Carol", value: 200, category: "Sales", date: "2024-01-03" }
    ];

    const stats = processData(data);

    const salesEntries = stats.categoryStats.Sales.entries;
    assert.strictEqual(salesEntries[0].value, 300);
    assert.strictEqual(salesEntries[1].value, 200);
    assert.strictEqual(salesEntries[2].value, 100);
  });

  test("sorts monthly stats by date", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-03-15" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-10" },
      { id: "003", name: "Carol", value: 150, category: "Marketing", date: "2024-02-20" }
    ];

    const stats = processData(data);

    const monthlyKeys = Object.keys(stats.monthlyStats);
    assert.strictEqual(monthlyKeys[0], "2024-01");
    assert.strictEqual(monthlyKeys[1], "2024-02");
    assert.strictEqual(monthlyKeys[2], "2024-03");
  });

  test("tracks unique categories and IDs", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-02" },
      { id: "001", name: "Alice Duplicate", value: 150, category: "Marketing", date: "2024-01-03" }
    ];

    const stats = processData(data);

    assert.strictEqual(stats.uniqueCategories.length, 2);
    assert(stats.uniqueCategories.includes("Sales"));
    assert(stats.uniqueCategories.includes("Marketing"));
    
    // Set keeps unique values, so "001" appears twice but only once in the set
    assert.strictEqual(stats.uniqueIds.length, 2);
    assert(stats.uniqueIds.includes("001"));
    assert(stats.uniqueIds.includes("002"));
  });

  test("throws error for empty data array", () => {
    assert.throws(
      () => processData([]),
      /Data must be a non-empty array/
    );
  });

  test("throws error for non-array input", () => {
    assert.throws(
      () => processData(null),
      /Data must be a non-empty array/
    );
    assert.throws(
      () => processData({}),
      /Data must be a non-empty array/
    );
  });

  test("throws error for invalid value type", () => {
    const data = [
      { id: "001", name: "Alice", value: "invalid", category: "Sales", date: "2024-01-01" }
    ];

    assert.throws(
      () => processData(data),
      /value must be a valid number/
    );
  });

  test("throws error for NaN value", () => {
    const data = [
      { id: "001", name: "Alice", value: NaN, category: "Sales", date: "2024-01-01" }
    ];

    assert.throws(
      () => processData(data),
      /value must be a valid number/
    );
  });

  test("throws error for missing category", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "", date: "2024-01-01" }
    ];

    assert.throws(
      () => processData(data),
      /category must be a non-empty string/
    );
  });

  test("throws error for missing date", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "" }
    ];

    assert.throws(
      () => processData(data),
      /date must be a non-empty string/
    );
  });

  test("handles single entry correctly", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" }
    ];

    const stats = processData(data);

    assert.strictEqual(stats.totalEntries, 1);
    assert.strictEqual(stats.totalValue, 100);
    assert.strictEqual(stats.averageValue, 100);
    assert.strictEqual(stats.minValue, 100);
    assert.strictEqual(stats.maxValue, 100);
    assert.strictEqual(stats.topEntries.length, 1);
  });

  test("handles large dataset correctly", () => {
    const data = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i + 1).padStart(4, '0'),
      name: `Person${i + 1}`,
      value: (i + 1) * 10,
      category: ["Sales", "Marketing", "Support"][i % 3],
      date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`
    }));

    const stats = processData(data);

    assert.strictEqual(stats.totalEntries, 1000);
    assert.strictEqual(stats.uniqueCategories.length, 3);
    
    // Verify totals match
    const categoryTotalSum = Object.values(stats.categoryStats).reduce((sum, cat) => sum + cat.totalValue, 0);
    assert(Math.abs(categoryTotalSum - stats.totalValue) < 0.01);
  });

  test("calculates median correctly for odd number of entries", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-02" },
      { id: "003", name: "Carol", value: 150, category: "Sales", date: "2024-01-03" }
    ];

    const stats = processData(data);

    assert.strictEqual(stats.medianValue, 150); // Middle value of [100, 150, 200]
  });

  test("calculates median correctly for even number of entries", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-02" },
      { id: "003", name: "Carol", value: 150, category: "Sales", date: "2024-01-03" },
      { id: "004", name: "David", value: 250, category: "Sales", date: "2024-01-04" }
    ];

    const stats = processData(data);

    assert.strictEqual(stats.medianValue, 175); // Average of 150 and 200
  });

  test("calculates standard deviation and variance correctly", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-02" },
      { id: "003", name: "Carol", value: 300, category: "Sales", date: "2024-01-03" }
    ];

    const stats = processData(data);

    // Mean = 200
    // Variance = ((100-200)^2 + (200-200)^2 + (300-200)^2) / 3 = (10000 + 0 + 10000) / 3 = 6666.67
    // Std Dev = sqrt(6666.67) ≈ 81.65
    const expectedVariance = 6666.666666666667;
    const expectedStdDev = Math.sqrt(expectedVariance);

    assert(Math.abs(stats.variance - expectedVariance) < 0.01);
    assert(Math.abs(stats.standardDeviation - expectedStdDev) < 0.01);
  });

  test("calculates quartiles correctly", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1).padStart(3, '0'),
      name: `Person${i + 1}`,
      value: (i + 1) * 10, // Values: 10, 20, 30, ..., 200
      category: "Sales",
      date: "2024-01-01"
    }));

    const stats = processData(data);

    // Q1 should be around index 5 (25th percentile) = 50
    // Q3 should be around index 15 (75th percentile) = 150
    // IQR = 150 - 50 = 100
    assert(stats.quartile1 > 0);
    assert(stats.quartile3 > stats.quartile1);
    assert.strictEqual(stats.interquartileRange, stats.quartile3 - stats.quartile1);
  });

  test("calculates category median correctly", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-02" },
      { id: "003", name: "Carol", value: 150, category: "Sales", date: "2024-01-03" },
      { id: "004", name: "David", value: 300, category: "Marketing", date: "2024-01-04" }
    ];

    const stats = processData(data);

    // Sales category: [100, 150, 200] -> median = 150
    assert.strictEqual(stats.categoryStats.Sales.medianValue, 150);
    
    // Marketing category: [300] -> median = 300
    assert.strictEqual(stats.categoryStats.Marketing.medianValue, 300);
  });

  test("calculates category standard deviation correctly", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-02" },
      { id: "003", name: "Carol", value: 300, category: "Sales", date: "2024-01-03" }
    ];

    const stats = processData(data);

    const salesStats = stats.categoryStats.Sales;
    // Mean = 200, Variance = 6666.67, Std Dev ≈ 81.65
    const expectedVariance = 6666.666666666667;
    const expectedStdDev = Math.sqrt(expectedVariance);

    assert(Math.abs(salesStats.variance - expectedVariance) < 0.01);
    assert(Math.abs(salesStats.standardDeviation - expectedStdDev) < 0.01);
  });

  test("includes all new statistics in stats object", () => {
    const data = [
      { id: "001", name: "Alice", value: 100, category: "Sales", date: "2024-01-01" },
      { id: "002", name: "Bob", value: 200, category: "Sales", date: "2024-01-02" }
    ];

    const stats = processData(data);

    // Check overall stats
    assert(typeof stats.medianValue === 'number');
    assert(typeof stats.standardDeviation === 'number');
    assert(typeof stats.variance === 'number');
    assert(typeof stats.quartile1 === 'number');
    assert(typeof stats.quartile3 === 'number');
    assert(typeof stats.interquartileRange === 'number');

    // Check category stats
    const salesStats = stats.categoryStats.Sales;
    assert(typeof salesStats.medianValue === 'number');
    assert(typeof salesStats.standardDeviation === 'number');
    assert(typeof salesStats.variance === 'number');
  });
});

