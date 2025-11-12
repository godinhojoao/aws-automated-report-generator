const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

class StorageService {
  constructor() {
    this.s3Client = new S3Client({});
    this.useLocalStorage = process.env.TEST_MODE === "true";
  }

  async save({ key, buffer, contentType }) {
    if (this.useLocalStorage) {
      const fs = require("fs");
      const path = require("path");
      const outputPath = path.join(process.cwd(), 'test-output', key);
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputPath, buffer);
      return { localPath: outputPath };
    }

    const bucket = process.env.S3_BUCKET_NAME;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    return { s3Location: `s3://${bucket}/${key}` };
  }
}

module.exports = StorageService;

