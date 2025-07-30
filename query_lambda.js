const { queryItems, scanItems, handleError } = require('./utils');

const CONTENT_TABLE = process.env.CONTENT_TABLE || 'ContentMetadata';
const USER_TABLE = process.env.USER_TABLE || 'UserAnalytics';

exports.handler = async (event, context) => {
  console.log('Query Lambda started', JSON.stringify(event, null, 2));
  
  try {
    const userId = event.user_id || event.queryStringParameters?.user_id || 'example-user';
    
    console.log(`Querying analytics for user: ${userId}`);
    
    // Query user analytics
    const userData = await queryItems(
      USER_TABLE,
      'user_id = :uid',
      { ':uid': userId }
    );
    
    // Query content metadata for this user using GSI
    const userContents = await queryItems(
      CONTENT_TABLE,
      'user_id = :uid',
      { ':uid': userId },
      'UserIndex'
    );
    
    // Get recent content from all users (for global stats)
    const allContents = await scanItems(CONTENT_TABLE, 50);
    
    const analytics = {
      user_id: userId,
      user_stats: {
        upload_count: userData[0]?.upload_count || 0,
        last_upload: userData[0]?.last_upload || null,
        total_original_size: userContents.reduce((sum, c) => sum + (c.original_size || 0), 0),
        total_processed_size: userContents.reduce((sum, c) => sum + (c.processed_size || 0), 0),
        compression_ratio: userContents.length > 0 ? 
          (userContents.reduce((sum, c) => sum + (c.original_size || 0), 0) / 
           userContents.reduce((sum, c) => sum + (c.processed_size || 0), 0)).toFixed(2) : 0
      },
      user_content: {
        total_items: userContents.length,
        recent_content_ids: userContents
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
          .map(c => ({
            content_id: c.content_id,
            original_key: c.original_key,
            processed_key: c.processed_key,
            created_at: c.created_at
          }))
      },
      global_stats: {
        total_content_items: allContents.length,
        total_users: [...new Set(allContents.map(c => c.user_id))].length,
        recent_uploads: allContents
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10)
          .map(c => ({
            content_id: c.content_id,
            user_id: c.user_id,
            created_at: c.created_at
          }))
      },
      query_timestamp: new Date().toISOString()
    };
    
    console.log(`Analytics generated for user ${userId}:`, analytics.user_stats);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(analytics, null, 2)
    };
    
  } catch (error) {
    console.error('Error in query lambda:', error);
    return handleError(error, 'query_lambda');
  }
};
