const assert = require("assert");
const { describe, test } = require("node:test");
const { mockClient } = require("aws-sdk-client-mock");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Mock = mockClient(S3Client);
const { handler } = require("../src/index.js");

process.env.S3_BUCKET_NAME = "test-bucket";

const sampleData = [
  { id: "001", name: "Alice Johnson", value: 1250.50, category: "Sales", date: "2024-01-15" },
  { id: "002", name: "Bob Smith", value: 890.25, category: "Marketing", date: "2024-01-16" },
  { id: "003", name: "Carol Williams", value: 2100.75, category: "Sales", date: "2024-01-17" }
];

const reportEvent = {
  Records: [{
    body: JSON.stringify({
      data: sampleData,
      reportTitle: "Test Report"
    })
  }],
};

const invalidEvent = {
  Records: [{
    body: JSON.stringify({
      reportTitle: "Invalid Report"
      // missing data field
    })
  }],
};

describe("handler with mocked S3", () => {
  test("report generation: uploads both files to S3 successfully", async () => {
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});

    const result = await handler(reportEvent);
    const resultBody = JSON.parse(result.body);

    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual(resultBody.success, true);
    assert(resultBody.reportId);
    assert(resultBody.s3Urls);
    assert(resultBody.s3Urls.spreadsheet);
    assert(resultBody.s3Urls.htmlReport);

    // Should have called S3 twice - once for spreadsheet, once for HTML report
    assert.strictEqual(s3Mock.calls().length, 2);

    const calls = s3Mock.calls();
    const spreadsheetCall = calls.find(call => call.args[0].input.Key.includes('data.xlsx'));
    const htmlCall = calls.find(call => call.args[0].input.Key.includes('report.html'));

    assert(spreadsheetCall, 'Should upload spreadsheet');
    assert(htmlCall, 'Should upload HTML report');

    assert.strictEqual(spreadsheetCall.args[0].input.Bucket, "test-bucket");
    assert.strictEqual(htmlCall.args[0].input.Bucket, "test-bucket");
    assert.strictEqual(spreadsheetCall.args[0].input.ContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.strictEqual(htmlCall.args[0].input.ContentType, "text/html");
  });

  test("handles validation error", async () => {
    const result = await handler(invalidEvent);
    const resultBody = JSON.parse(result.body);

    assert.strictEqual(result.statusCode, 400);
    assert(resultBody.error.includes("Missing required fields"));
  });

  test("handles S3 upload error", async () => {
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).rejects(new Error("S3 upload failed"));

    await assert.rejects(
      async () => await handler(reportEvent),
      (error) => error.message.includes("S3 upload failed")
    );
  });
});
