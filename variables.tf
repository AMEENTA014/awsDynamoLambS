variable "s3_bucket_name" {
  description = "Name of the S3 bucket for user uploads"
  type        = string
  default     = "user-content-bucket"
}

variable "processed_bucket_name" {
  description = "Name of the S3 bucket for processed content"
  type        = string
  default     = "processed-content-bucket"
}

variable "dynamodb_content_table" {
  description = "Name of the DynamoDB table for content metadata"
  type        = string
  default     = "ContentMetadata"
}

variable "dynamodb_user_table" {
  description = "Name of the DynamoDB table for user analytics"
  type        = string
  default     = "UserAnalytics"
}

variable "lambda_processor_name" {
  description = "Name of the processor Lambda function"
  type        = string
  default     = "content-processor-lambda"
}

variable "lambda_query_name" {
  description = "Name of the analytics query Lambda function"
  type        = string
  default     = "analytics-query-lambda"
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}
