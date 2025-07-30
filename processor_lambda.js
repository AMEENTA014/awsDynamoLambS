const { 
  getFromS3, 
  processImage, 
  uploadToS3, 
  putItem, 
  updateItem, 
  generateId, 
  handleError 
} = require('./utils');

const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET || 'processed-content-bucket';
const CONTENT_TABLE = process.env.CONTENT_TABLE || 'ContentMetadata';
const USER_TABLE = process.env.USER_TABLE || 'UserAnalytics';

exports.handler = async (event, context) => {
  console.log('Processor Lambda started', JSON.stringify(event, null, 2));
  
  try {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      
      console.log(`Processing file: s3://${bucket}/${key}`);
      
      // Validate file type
      if (!key.toLowerCase().endsWith('.jpg') && !key.toLowerCase().endsWith('.jpeg')) {
        console.log(`Skipping non-JPEG file: ${key}`);
        continue;
      }
      
      // Download the file from S3
      const fileContent = await getFromS3(bucket, key);
      
      // Process the image (resize)
      const processedContent = await processImage(fileContent);
      
      // Generate metadata
      const contentId = generateId();
      const userId = 'example-user'; // In real app, extract from event/auth
      const timestamp = new Date().toISOString();
      
      const metadata = {
        content_id: contentId,
        user_id: userId,
        original_key: key,
        original_bucket: bucket,
        processed_key: `processed/${contentId}.jpg`,
        original_size: fileContent.length,
        processed_size: processedContent.length,
        status: 'processed',
        created_at: timestamp,
        updated_at: timestamp
      };
      
      // Upload processed image to S3
      await uploadToS3(PROCESSED_BUCKET, metadata.processed_key, processedContent);
      
      // Store metadata in DynamoDB
      await putItem(CONTENT_TABLE, metadata);
      
      // Update user analytics (increment upload count)
      await updateItem(
        USER_TABLE,
        { user_id: userId },
        'SET upload_count = if_not_exists(upload_count, :zero) + :inc, last_upload = :timestamp',
        { 
          ':zero': 0, 
          ':inc': 1, 
          ':timestamp': timestamp 
        }
      );
      
      console.log(`Successfully processed: ${key} -> ${metadata.processed_key}`);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Processing completed successfully',
        processedCount: event.Records.length
      })
    };
    
  } catch (error) {
    console.error('Error in processor lambda:', error);
    return handleError(error, 'processor_lambda');
  }
};
