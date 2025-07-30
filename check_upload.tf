resource "null_resource" "test_image_upload" {
  # Only runs upload when main infra changes or on explicit taint
  triggers = {
    user_content_bucket = aws_s3_bucket.user_content_bucket.bucket
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Uploading test image to S3 (LocalStack)..."
      aws --endpoint-url=http://localhost:4566 s3 cp ./test-data/test.jpg s3://${aws_s3_bucket.user_content_bucket.bucket}/test-upload.jpg
      echo "Upload done. Waiting for Lambda processing..."
      sleep 5
      echo "Fetching processed output..."
      aws --endpoint-url=http://localhost:4566 s3 ls s3://${aws_s3_bucket.processed_content_bucket.bucket}/processed/
      echo "Test finished. Check outputs/logs for details."
    EOT
  }
}
