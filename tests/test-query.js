// test-query.js
const { handler } = require('../query_lambda.js');

const validQueryEvent = {
  user_id: 'test-user-123'
};

async function testValidUserQuery() {
  try {
    const result = await handler(validQueryEvent);
    console.log('✅ Valid user query:', result);
    
    const analytics = JSON.parse(result.body);
    
    // Assertions
    assert.equal(result.statusCode, 200);
    assert.ok(analytics.user_id === 'test-user-123');
    assert.ok(typeof analytics.upload_count === 'number');
    assert.ok(Array.isArray(analytics.recent_contents));
    assert.ok(typeof analytics.total_size === 'number');
    
  } catch (error) {
    console.error('❌ Query test failed:', error);
  }
}
const nonExistentUserEvent = {
  user_id: 'non-existent-user'
};

async function testNonExistentUser() {
  try {
    const result = await handler(nonExistentUserEvent);
    const analytics = JSON.parse(result.body);
    
    console.log('✅ Non-existent user handled:', analytics);
    
    // Should return default values
    assert.equal(analytics.upload_count, 0);
    assert.equal(analytics.recent_contents.length, 0);
    assert.equal(analytics.total_size, 0);
    
  } catch (error) {
    console.error('❌ Non-existent user test failed:', error);
  }
}
async function testEndToEndWorkflow() {
  console.log('🚀 Starting end-to-end test...');
  
  // Step 1: Upload test image to S3
  await uploadTestImage('user-content-bucket', 'e2e-test.jpg');
  
  // Step 2: Wait for processor Lambda to complete (event-driven)
  await sleep(5000); // Give time for processing
  
  // Step 3: Verify processed image exists
  const processedExists = await checkS3Object('processed-content-bucket', 'processed/');
  assert.ok(processedExists, 'Processed image should exist');
  
  // Step 4: Verify metadata in DynamoDB
  const contentMetadata = await scanDynamoDB('ContentMetadata');
  assert.ok(contentMetadata.length > 0, 'Content metadata should exist');
  
  // Step 5: Test analytics query
  const queryResult = await handler({ user_id: 'example-user' });
  const analytics = JSON.parse(queryResult.body);
  
  assert.ok(analytics.upload_count > 0, 'Upload count should be incremented');
  
  console.log('✅ End-to-end test completed successfully');
}
async function testS3AccessDenied() {
  // Mock event with inaccessible bucket
  const deniedEvent = {
    Records: [{
      s3: {
        bucket: { name: 'unauthorized-bucket' },
        object: { key: 'test.jpg' }
      }
    }]
  };
  
  try {
    const result = await handler(deniedEvent);
    
    // Should handle error gracefully
    assert.equal(result.statusCode, 500);
    assert.ok(result.body.includes('error'));
    
    console.log('✅ S3 access denied handled correctly');
    
  } catch (error) {
    console.log('✅ Expected S3 access error:', error.message);
  }
}
async function testDynamoDBConnection() {
  // Test with temporary DynamoDB unavailability
  try {
    const result = await queryItems('NonExistentTable', 'user_id = :uid', { ':uid': 'test' });
    console.log('❌ Should have failed for non-existent table');
  } catch (error) {
    console.log('✅ DynamoDB error handled:', error.message);
    assert.ok(error.message.includes('ResourceNotFoundException') || 
              error.message.includes('Table'));
  }
}
module.exports = {

testDynamoDBConnection,
testEndToEndWorkflow,
testNonExistentUser,
testS3AccessDenied,
testValidUserQuery,
}
