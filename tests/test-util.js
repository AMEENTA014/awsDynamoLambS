// test-utils.js
const AWS = require('aws-sdk');

const awsConfig = {
  endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  s3ForcePathStyle: true
};

const s3 = new AWS.S3(awsConfig);
const dynamodb = new AWS.DynamoDB.DocumentClient(awsConfig);

// Rest of your test utilities...

// Configure for LocalStack or real AWS


async function uploadTestImage(bucket, key) {
  // Create a simple test image buffer
  const testImageBuffer = Buffer.from('test-image-data');
  
  await s3.upload({
    Bucket: bucket,
    Key: key,
    Body: testImageBuffer,
    ContentType: 'image/jpeg'
  }).promise();
}

async function checkS3Object(bucket, keyPrefix) {
  try {
    const result = await s3.listObjectsV2({
      Bucket: bucket,
      Prefix: keyPrefix
    }).promise();
    return result.Contents.length > 0;
  } catch (error) {
    return false;
  }
}

async function scanDynamoDB(tableName) {
  try {
    const result = await dynamodb.scan({ TableName: tableName }).promise();
    return result.Items;
  } catch (error) {
    console.error('DynamoDB scan error:', error);
    return [];
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  uploadTestImage,
  checkS3Object,
  scanDynamoDB,
  sleep
};
