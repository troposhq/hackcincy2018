provider "aws" {
  region  = "us-east-1"
  profile = "${var.aws_profile}"
}

variable "aws_profile" {
  type = "string"
}

resource "aws_s3_bucket" "athena_results" {
  bucket = "hackcincy2018-athena-results"
}

resource "aws_s3_bucket" "ga_archive" {
  bucket = "hackcincy2018-ga-archive"
}

resource "aws_athena_database" "hackcincy" {
  name   = "hackcincy2018"
  bucket = "${aws_s3_bucket.athena_results.bucket}"
}

resource "aws_dynamodb_table" "metrics" {
  name           = "hackcincy2018_metrics"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "metric"

  attribute {
    name = "metric"
    type = "S"
  }
}
