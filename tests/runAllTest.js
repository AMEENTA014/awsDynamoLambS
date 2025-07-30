// run-all-tests.js
// At the top of your test files
const assert = require('assert');

// Or install and use a proper testing framework
// npm install --save-dev mocha chai
// const { expect } = require('chai');

const {
  testConcurrentProcessing,
  testInvalidFileType,
  testLargeImageProcessing,
  testMemoryLimits,
  testValidImageProcessing
}=require("./test-processor.js");

const {
testDynamoDBConnection,
testEndToEndWorkflow,
testNonExistentUser,
testS3AccessDenied,
testValidUserQuery,
}=require("./test-query.js")
async function runAllTests() {
  console.log('🧪 Starting Lambda deployment tests...\n');
  
  const tests = [
    testValidImageProcessing,
    testInvalidFileType,
    testLargeImageProcessing,
    testValidUserQuery,
    testNonExistentUser,
    testEndToEndWorkflow,
    testS3AccessDenied,
    testDynamoDBConnection,
    testConcurrentProcessing,
    testMemoryLimits
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Deployment is ready for production.');
  } else {
    console.log('⚠️ Some tests failed. Please review before production deployment.');
    process.exit(1);
  }
}

runAllTests().catch(console.error);
