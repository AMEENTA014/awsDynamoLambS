terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region                      = var.aws_region
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
  s3_use_path_style          = true

  endpoints {
    s3       = "http://localhost:4566"
    dynamodb = "http://localhost:4566"
    lambda   = "http://localhost:4566"
    iam      = "http://localhost:4566"
  }
}

# S3 Buckets
resource "aws_s3_bucket" "user_content_bucket" {
  bucket = var.s3_bucket_name
}

resource "aws_s3_bucket" "processed_content_bucket" {
  bucket = var.processed_bucket_name
}

# DynamoDB Tables
resource "aws_dynamodb_table" "content_metadata" {
  name           = var.dynamodb_content_table
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "content_id"

  attribute {
    name = "content_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name               = "UserIndex"
    hash_key           = "user_id"
    projection_type    = "ALL"
  }

  tags = {
    Name = "ContentMetadata"
    Project = "ServerlessAnalytics"
  }
}

resource "aws_dynamodb_table" "user_analytics" {
  name           = var.dynamodb_user_table
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  tags = {
    Name = "UserAnalytics"
    Project = "ServerlessAnalytics"
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_execution_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = {
    Name = "LambdaExecutionRole"
    Project = "ServerlessAnalytics"
  }
}

# IAM Policy Attachments
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_s3_access" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_access" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# Lambda Deployment Packages


# Lambda Functions
resource "aws_lambda_function" "processor_lambda" {
  filename         = "${path.module}/processor_lambda.zip"
  function_name    = var.lambda_processor_name
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "processor_lambda.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 512
  source_code_hash = filebase64sha256("${path.module}/processor_lambda.zip")

  environment {
    variables = {
      PROCESSED_BUCKET = var.processed_bucket_name
      CONTENT_TABLE    = var.dynamodb_content_table
      USER_TABLE       = var.dynamodb_user_table
    }
  }

  tags = {
    Name = "ProcessorLambda"
    Project = "ServerlessAnalytics"
  }
}

resource "aws_lambda_function" "query_lambda" {
  filename         = "${path.module}/query_lambda.zip"
  function_name    = var.lambda_query_name
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "query_lambda.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 256
  source_code_hash = filebase64sha256("${path.module}/query_lambda.zip")

  environment {
    variables = {
      CONTENT_TABLE = var.dynamodb_content_table
      USER_TABLE    = var.dynamodb_user_table
    }
  }

  tags = {
    Name = "QueryLambda"
    Project = "ServerlessAnalytics"
  }
}

# S3 Event Notification
resource "aws_s3_bucket_notification" "s3_trigger" {
  bucket = aws_s3_bucket.user_content_bucket.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.processor_lambda.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".jpg"
  }

  depends_on = [aws_lambda_permission.s3_invoke_permission]
}

# Lambda Permission for S3
resource "aws_lambda_permission" "s3_invoke_permission" {
  statement_id  = "AllowExecutionFromS3"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.processor_lambda.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.user_content_bucket.arn
}

# Outputs
output "user_content_bucket_name" {
  description = "Name of the user content S3 bucket"
  value       = aws_s3_bucket.user_content_bucket.id
}

output "processed_content_bucket_name" {
  description = "Name of the processed content S3 bucket"
  value       = aws_s3_bucket.processed_content_bucket.id
}

output "processor_lambda_function_name" {
  description = "Name of the processor Lambda function"
  value       = aws_lambda_function.processor_lambda.function_name
}

output "query_lambda_function_name" {
  description = "Name of the query Lambda function"
  value       = aws_lambda_function.query_lambda.function_name
}
