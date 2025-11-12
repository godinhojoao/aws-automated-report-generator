process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error.message);
  console.error('[FATAL] Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise);
  console.error('[FATAL] Reason:', reason);
});

const crypto = require("crypto");
const { processData } = require("./dataProcessor");
const { generateSpreadsheet } = require("./spreadsheetGenerator");
const { generateHTMLReport } = require("./htmlReportGenerator");
const StorageService = require("./storageService");
const { validateReportRequest } = require("./validators");

const storageService = new StorageService();

function createErrorResponse(message, statusCode = 400) {
  return { statusCode, body: JSON.stringify({ error: message }) };
}

exports.handler = async (event) => {
  console.log('[Handler] Processing data report request...');

  if (!process.env.S3_BUCKET_NAME) {
    console.error("S3_BUCKET_NAME is not set");
    throw new Error("S3_BUCKET_NAME is not set");
  }

  if (!event.Records || event.Records.length === 0) {
    console.error("No records in event");
    throw new Error("Invalid event: no records found");
  }

  const record = event.Records[0];
  if (!record.body) {
    console.error("Record missing body");
    throw new Error("Invalid record: missing body");
  }

  try {
    const messageBody = JSON.parse(record.body);

    const validationError = validateReportRequest(messageBody);
    if (validationError) {
      console.error('[Handler] Validation error:', validationError.error);
      return createErrorResponse(validationError.error);
    }

    const { data, reportTitle } = messageBody;
    const reportId = crypto.randomUUID();

    console.log(`[Handler] Processing report "${reportTitle}" with ${data.length} entries`);
    console.log('[Handler] Processing data...');
    const stats = processData(data);

    console.log('[Handler] Generating spreadsheet...');
    const spreadsheet = generateSpreadsheet({ data, stats, reportTitle });

    console.log('[Handler] Generating HTML report...');
    const htmlReport = await generateHTMLReport({ stats, reportTitle });

    console.log('[Handler] Saving files to S3...');

    const spreadsheetKey = `reports/${reportId}/data.xlsx`;
    const htmlReportKey = `reports/${reportId}/report.html`;

    const [spreadsheetResult, htmlResult] = await Promise.all([
      storageService.save({ key: spreadsheetKey, buffer: spreadsheet, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      storageService.save({ key: htmlReportKey, buffer: htmlReport, contentType: "text/html" })
    ]);

    const s3Urls = {
      spreadsheet: spreadsheetResult.s3Location || spreadsheetResult.localPath,
      htmlReport: htmlResult.s3Location || htmlResult.localPath
    };

    console.log('[Handler] Report processing completed successfully');
    console.log(`[Handler] Report ID: ${reportId}, Files saved: ${JSON.stringify(s3Urls)}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        reportId,
        s3Urls
      }),
    };

  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("[Handler] Invalid JSON in message body:", error.message);
      throw new Error("Invalid JSON in message body");
    }
    console.error("[Handler] Error processing report:", error.message);
    console.error("[Handler] Error stack:", error.stack);
    throw error;
  }
};

