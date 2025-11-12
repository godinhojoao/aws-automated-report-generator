# AWS Automated Report Generator: Lambda, SQS, S3 & CloudFront

## [How to Run](./how-to-run.md)

## What This Project Does

- Our AWS Lambda function is triggered by an AWS SQS queue.
- This SQS queue contains JSON data, which we use to generate a **static report website** and store it on AWS S3.
- To view the code, [click here](https://github.com/godinhojoao/aws-automated-report-generator).
- Everything done using the AWS UI can also be done with the AWS CLI — choose whichever you prefer.
- **Note:** This project focuses on infrastructure setup rather than code implementation.

## Output of Lambda

- Generated Website Report (Gif quality may be reduced)
  ![Generated Website Report](https://s12.gifyu.com/images/b9za6.gif)

- Generated Excel file (Gif quality may be reduced)
  ![Generated xlsx](https://s12.gifyu.com/images/b9za4.gif)

## AWS Services Workflow - Big picture

![Big picture](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/tjiqk7wh5ojj6wh0xjao.png)

1. **An SQS queue** receives messages containing JSON payloads.
   - **SQS Queue messages** can be sent by an API, AWS API Gateway, aws cli, aws sdk, or other methods.
   - **The queue** triggers an AWS Lambda function.
2. **The Lambda function** generates a **static website report and an xlsx** after processing the received JSON data.
3. **The generated static website** is stored in an AWS S3 bucket
4. **The website files** in S3 are served via CloudFront, providing low latency and edge caching.

- Optional: integrate with **AWS SES** to automatically send reports via email to users.

## What is AWS Lambda, SQS and S3

- **AWS Lambda**: is an event-driven, serverless Function as a Service (FaaS) by AWS. You pay only for execution time and resources used. Limits include `max runtime 15 minutes` and `configurable memory up to 10 GB`.

  - There are different ways to package and manage dependencies for Lambda functions:
  - **Lambda Layers** (for Node.js): Main benefits are code reuse across multiple functions and smaller deployment packages. They don't reduce cold start times or avoid runtime installation delays - this is a common misconception.
  - **Docker images**: Allow for more control over the runtime environment and larger dependency sets.
    ![lambda-layers-vs-ecr-pre-built-image](https://s12.gifyu.com/images/b9zZk.png)
  - These limits can change; please check the official AWS website for the latest details.

- **AWS SQS**: is a message queue service that enables decoupled communication between components.

- **AWS S3**: is an object storage service for storing and retrieving data.

- **AWS CloudFront**: is a content delivery network (CDN) that delivers content with low latency.

## Hands-on: How it was developed

## 1. Installing AWS CLI and Connecting to AWS

- Install: `brew install awscli`
- Check if it was installed: `aws --version`
- Connect to aws: `aws configure`
- Check connection: `aws s3 ls`
- To learn more about **AWS CLI**:
  - https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html
- For the sections below, I will assume that you are already logged in to the AWS Console and have the AWS CLI configured.

## 2. Creating Lambda - AWS UI

- `Open AWS Lambda page -> Click Create function -> Node.js v22.x -> Name function -> Create new role for service -> Create function`
- `Lambda function Configurations -> Environment variables -> set:`
  - S3_BUCKET_NAME

## 3. Creating S3 Bucket - AWS UI

- `Open AWS S3 page -> Click Create bucket -> Enter bucket name -> Use same region as your Lambda Function -> Configure options (versioning, encryption, etc.) -> Click Create bucket`
  - keep the bucket private, since we will use CloudFront it is not needed to be public

## 4. Configure Cloudfront to serve your AWS S3 Bucket content

### 4.1 Create CloudFront Distribution

- `Open AWS CloudFront page -> Click Create Distribution -> Distribution type: Single website -> Choose S3 bucket as origin -> Cache settings, change origin request policy to CORS-S3Origin -> Click Create Distribution`

  - This policy forwards CORS-related headers (Origin, Access-Control-Request-\*) to S3, allowing browsers to load your files correctly.

### 4.2 Configure S3 CORS

- `Open AWS S3 page -> Select your bucket -> Go to Permissions tab -> Edit CORS configuration -> Add allowed origins, methods (GET, HEAD), and headers to match your CloudFront settings -> save`

### 4.3 (optional) Configure Custom Cache Policy

- Configure a custom distribution cache behavior with biggest TTL options (10y)
  - `Click into your cloudfront distribution -> behaviors -> cache policy -> create policy -> configure -> add on distribution -> save`

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net"],
    "ExposeHeaders": []
  }
]
```

## 5. Attaching AWS Lambda specific AWS S3 Bucket Role Based Access - AWS UI

- `Open AWS IAM page -> Open your Lambda IAM role -> Edit permissions -> Add the following statement -> Save`

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject"],
  "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME_HERE/*"
}
```

## 6. Creating an SQS queue - AWS UI

- `Open AWS SQS page -> Click Create Queue -> Enter queue name -> Set "Send messages" permission to your AWS account ID -> Set "Receive messages" permission to the ARN of your Lambda IAM role`

## 7. Adding a Lambda Trigger to the SQS queue

### 7.1 Configure IAM Permissions

- `Open AWS IAM page -> Lambda IAM role -> Add following statement -> Save`

```json
{
  "Effect": "Allow",
  "Action": [
    "sqs:ReceiveMessage",
    "sqs:GetQueueAttributes",
    "sqs:DeleteMessage"
  ],
  "Resource": ["arn:aws:sqs:region:accountid:queuename"]
}
```

### 7.2 Configure SQS Trigger

- `Open your SQS queue -> Lambda triggers -> Configure trigger -> Choose your lambda function -> Save`

## 8. Creating Lambda Layers for code reuse and smaller deployments - AWS UI

- Lambda Layers allow you to package dependencies separately, enabling code reuse across multiple Lambda functions and keeping deployment packages smaller. I will use Lambda Layers, since I don't need a large image as the ECR approach allows.

### 8.1 Create Dependencies Layer

  - `Open your AWS Lambda -> Layers -> Custom layer -> Create new layer -> Name (e.g., "dependencies-layer") -> Upload .zip file -> Runtime Nodejs22 -> Arch x86_64 -> Click on Create`
  - Create the layer: `npm run create:layer:x64` (installs Linux x64 prod dependencies and creates `layer.zip`)
    - **Important**: The layer must have a `nodejs/node_modules/` structure at the root of the zip for Lambda to find Node.js dependencies

### 8.2 Attach Layer to Lambda Function

  - `Lambda Function -> Layers -> Add a layer -> Select the dependencies layer`

## 9. Uploading code to Lambda using AWS CLI

- Minify your Lambda code, and zip it: `npm run build:zip`
- **Important:** The `function.zip` file structure must have `index.js` at the root level:
  ```
  function.zip
  ├── index.js
  ```
- Run:

```bash
aws lambda update-function-code \
  --function-name lambda-function-name \
  --zip-file fileb://function.zip
```

## Done! Now let's test our Static Report Generator

### Triggering Lambda with SQS

Send a message to your SQS queue:

**Using a file:**

```bash
aws sqs send-message \
  --queue-url https://sqs.<region>.amazonaws.com/<account-id>/<queue-name> \
  --message-body file://your-file.json
```

**Message format:**

```json
{
  "data": [
    {
      "id": "001",
      "name": "Alice Johnson",
      "value": 1250.5,
      "category": "Sales",
      "date": "2024-01-15"
    }
  ],
  "reportTitle": "Monthly Performance Report"
}
```

- Note that we could also trigger it via API Gateway or by programmatically sending messages to the SQS queue from one of our APIs.

### Lambda Function Verification

- Check recent Lambda execution (last invocation): `aws logs tail /aws/lambda/lambda-name --since 5m`
- Check S3 bucket contents: `aws s3 ls s3://YOUR_BUCKET_NAME_HERE/ --recursive`
- Check CloudFront distribution: `aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID`
- Or check everything on **AWS console**.

## Important

- This is a common feature that can be used across companies, but some adjustments may be needed, for example:
- 1. **Configure retries** in your SQS queue in case of failures.
- 2. **Add a DLQ** (Dead Letter Queue) for the Lambda to handle failed messages that exceed the maximum retries.
- 3. **Monitor and log** using CloudWatch to track errors, execution times, and performance metrics.
- 4. **Consider scalability**, ensuring the SQS queue and Lambda can handle bursts of messages efficiently.
  - Avoid bottlenecks, e.g., when your SQS fills up faster than Lambda can process -> queue bottleneck.
  - If Lambda concurrency is too low -> processing bottleneck.
- 5. **Set up CI/CD pipelines** with automated tests, easy rollback, and other best practices.

## References:

- https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html
- https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide
- https://docs.aws.amazon.com/lambda/latest/dg/welcome.html
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html
- https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html
- https://app.diagrams.net/

## Thanks for Reading!

- Feel free to reach out if you have any questions, feedback, or suggestions. Your engagement is appreciated!

## Contacts

- You can find this and more content on:
  - [My website](https://godinhojoao.com/)
  - [GitHub](https://github.com/godinhojoao)
  - [LinkedIn](https://www.linkedin.com/in/joaogodinhoo/)
  - [Dev Community](https://dev.to/godinhojoao)
