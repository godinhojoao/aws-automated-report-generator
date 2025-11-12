const path = require("path");
const fs = require("fs");

process.env.TEST_MODE = "true";
process.env.S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "test-bucket";

const importPath = process.argv[2] || "./src/index.js"; // so we can test the bundled build/index.js
const { handler } = require(importPath);

const projectRoot = __dirname;

// Load fake data from JSON file
let fakeData;
try {
  const fakeDataPath = path.join(projectRoot, 'run-fake-data.json');
  if (fs.existsSync(fakeDataPath)) {
    const fakeDataContent = fs.readFileSync(fakeDataPath, 'utf8');
    fakeData = JSON.parse(fakeDataContent);
    console.log(`Loaded ${fakeData.data.length} entries from run-fake-data.json`);
  } else {
    throw new Error('run-fake-data.json not found');
  }
} catch (error) {
  console.error('Error loading fake data:', error.message);
  process.exit(1);
}

const reportEvent = {
  Records: [{
    body: JSON.stringify(fakeData)
  }],
};

async function testReportGeneration() {
  console.log("=".repeat(60));
  console.log("Testing Data Report Generation");
  console.log("=".repeat(60));
  console.log(`Processing ${fakeData.data.length} data entries...`);
  console.log("\n---\n");

  try {
    const result = await handler(reportEvent);
    console.log("Result:", JSON.stringify(result, null, 2));

    if (result.statusCode === 200) {
      const resultBody = JSON.parse(result.body);
      console.log("\n---\n");
      console.log("SUCCESS: Report generated successfully!");
      console.log(`Report ID: ${resultBody.reportId}`);
      console.log(`Data Entries: ${resultBody.dataEntries}`);
      console.log(`Total Value: $${resultBody.totalValue.toLocaleString()}`);
      console.log(`Categories: ${resultBody.categories}`);

      if (resultBody.s3Urls) {
        console.log("\nGenerated files:");
        if (resultBody.s3Urls.spreadsheet) {
          console.log(`  Excel: ${resultBody.s3Urls.spreadsheet}`);
        }
        if (resultBody.s3Urls.htmlReport) {
          console.log(`  HTML Report: ${resultBody.s3Urls.htmlReport}`);
        }
      }

      // Show file sizes if they exist locally
      const reportsDir = path.join(projectRoot, "test-output", "reports");
      if (fs.existsSync(reportsDir)) {
        const reportDirs = fs.readdirSync(reportsDir).filter(dir => fs.statSync(path.join(reportsDir, dir)).isDirectory());
        if (reportDirs.length > 0) {
          const latestReport = reportDirs.sort().pop();
          const reportPath = path.join(reportsDir, latestReport);
          console.log(`\nLocal files in: ${reportPath}`);

          const files = fs.readdirSync(reportPath);
          files.forEach(file => {
            const filePath = path.join(reportPath, file);
            const stats = fs.statSync(filePath);
            console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
          });
        }
      }
    }
  } catch (error) {
    console.error("\n---\n");
    console.error("FAIL:", error.message);
    console.error(error.stack);
  }
}

async function testValidation() {
  console.log("\n\n");
  console.log("=".repeat(60));
  console.log("Testing Validation");
  console.log("=".repeat(60));

  const invalidEvents = [
    {
      name: "Missing data",
      event: { Records: [{ body: JSON.stringify({ reportTitle: "Test" }) }] }
    },
    {
      name: "Empty data array",
      event: { Records: [{ body: JSON.stringify({ data: [], reportTitle: "Test" }) }] }
    },
    {
      name: "Invalid data entry (missing required field)",
      event: { Records: [{ body: JSON.stringify({ data: [{ name: "Test", value: 100, category: "Test" }], reportTitle: "Test" }) }] }
    },
    {
      name: "Invalid data entry (wrong value type)",
      event: { Records: [{ body: JSON.stringify({ data: [{ id: "001", name: "Test", value: "invalid", category: "Test", date: "2024-01-01" }], reportTitle: "Test" }) }] }
    }
  ];

  for (const testCase of invalidEvents) {
    console.log(`\nTesting: ${testCase.name}`);
    try {
      const result = await handler(testCase.event);
      const resultBody = JSON.parse(result.body);
      if (result.statusCode === 400) {
        console.log(`✓ PASS: Validation correctly rejected - ${resultBody.error}`);
      } else {
        console.log(`✗ FAIL: Expected validation error but got success`);
      }
    } catch (error) {
      console.log(`✓ PASS: Validation threw error - ${error.message}`);
    }
  }
}

function cleanupOldReports() {
  const reportsDir = path.join(projectRoot, "test-output", "reports");
  if (fs.existsSync(reportsDir)) {
    const reportDirs = fs.readdirSync(reportsDir).filter(dir => {
      const dirPath = path.join(reportsDir, dir);
      return fs.statSync(dirPath).isDirectory();
    });

    if (reportDirs.length > 0) {
      console.log(`Cleaning up ${reportDirs.length} old report(s)...`);
      reportDirs.forEach(reportDir => {
        const reportPath = path.join(reportsDir, reportDir);
        fs.rmSync(reportPath, { recursive: true, force: true });
      });
      console.log("Old reports cleaned up.\n");
    }
  }
}

async function runTests() {
  const isBuild = importPath.includes("build");
  console.log(`Testing ${isBuild ? "bundled build/index.js" : "src/index.js"}`);
  console.log("Reports will be saved to:");
  console.log(`   Local: ${path.resolve(projectRoot, "test-output", "reports")}`);
  console.log(`   S3: s3://${process.env.S3_BUCKET_NAME}/reports/`);
  console.log("\n");

  // Clean up old reports before generating new one
  cleanupOldReports();

  await testReportGeneration();
  await testValidation();

  console.log("\n\nAll tests completed!");
  console.log("\nGenerated reports location:");
  const reportsDir = path.join(projectRoot, "test-output", "reports");

  if (fs.existsSync(reportsDir)) {
    const reportDirs = fs.readdirSync(reportsDir).filter(dir => fs.statSync(path.join(reportsDir, dir)).isDirectory());
    if (reportDirs.length > 0) {
      console.log(`\n   Reports (${reportDirs.length}):`);
      reportDirs.forEach(reportDir => {
        const reportPath = path.join(reportsDir, reportDir);
        const files = fs.readdirSync(reportPath);
        console.log(`   - ${reportDir}/`);
        files.forEach(file => {
          const filePath = path.join(reportPath, file);
          const stats = fs.statSync(filePath);
          console.log(`     - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
      });
    }
  }
}

runTests();
