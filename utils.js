const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Configuration - works for both LocalStack and real AWS
const isLocalStack = process.env.AWS_ENDPOINT || process.env.LOCALSTACK_HOSTNAME;
const config = {
  region: process.env.AWS_REGION || 'us-east-1'
};

if (isLocalStack) {
  config.endpoint = process.env.AWS_ENDPOINT || 'http://localhost:4566';
}

const s3Client = new S3Client(config);
const ddbClient = new DynamoDBClient(config);
const docClient = DynamoDBDocumentClient.from(ddbClient);

function generateId() {
  return uuidv4();
}

async function processImage(fileContent, maxSize = { width: 800, height: 800 }) {
  try {
    const buffer = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent);
    const resized = await sharp(buffer)
      .resize(maxSize)
      .jpeg({ quality: 90 })
      .toBuffer();
    
    console.log(`Image processed: ${buffer.length} bytes -> ${resized.length} bytes`);
    return resized;
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

async function uploadToS3(bucket, key, body, contentType = 'image/jpeg') {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    });
    
    await s3Client.send(command);
    console.log(`Successfully uploaded to s3://${bucket}/${key}`);
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
}

async function getFromS3(bucket, key) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const response = await s3Client.send(command);
    const arrayBuffer = await response.Body.transformToByteArray();
    console.log(`Successfully downloaded from s3://${bucket}/${key}`);
    return arrayBuffer;
  } catch (error) {
    console.error('S3 download error:', error);
    throw new Error(`S3 download failed: ${error.message}`);
  }
}

async function putItem(tableName, item) {
  try {
    const command = new PutCommand({
      TableName: tableName,
      Item: item
    });
    
    await docClient.send(command);
    console.log(`Item put to table ${tableName}:`, item);
  } catch (error) {
    console.error('DynamoDB put error:', error);
    throw new Error(`DynamoDB put failed: ${error.message}`);
  }
}

async function updateItem(tableName, key, updateExpression, expressionValues) {
  try {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'UPDATED_NEW'
    });
    
    const response = await docClient.send(command);
    console.log(`Item updated in table ${tableName}:`, response.Attributes);
    return response.Attributes;
  } catch (error) {
    console.error('DynamoDB update error:', error);
    throw new Error(`DynamoDB update failed: ${error.message}`);
  }
}

async function queryItems(tableName, keyConditionExpression, expressionValues, indexName = null) {
  try {
    const params = {
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionValues
    };
    
    if (indexName) {
      params.IndexName = indexName;
    }
    
    const command = new QueryCommand(params);
    const response = await docClient.send(command);
    console.log(`Query executed on table ${tableName}, returned ${response.Items.length} items`);
    return response.Items;
  } catch (error) {
    console.error('DynamoDB query error:', error);
    throw new Error(`DynamoDB query failed: ${error.message}`);
  }
}

async function scanItems(tableName, limit = 100) {
  try {
    const command = new ScanCommand({
      TableName: tableName,
      Limit: limit
    });
    
    const response = await docClient.send(command);
    console.log(`Scan executed on table ${tableName}, returned ${response.Items.length} items`);
    return response.Items;
  } catch (error) {
    console.error('DynamoDB scan error:', error);
    throw new Error(`DynamoDB scan failed: ${error.message}`);
  }
}

function handleError(error, context) {
  const errorMessage = error.message || String(error);
  console.error(`Error in ${context}:`, errorMessage);
  
  return {
    statusCode: 500,
    body: JSON.stringify({
      error: errorMessage,
      context: context,
      timestamp: new Date().toISOString()
    })
  };
}

module.exports = {
  generateId,
  processImage,
  uploadToS3,
  getFromS3,
  putItem,
  updateItem,
  queryItems,
  scanItems,
  handleError
};
