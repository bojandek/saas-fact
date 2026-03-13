output "db_instance_id" {
  description = "Database instance ID"
  value       = aws_db_instance.postgres.id
}

output "db_instance_endpoint" {
  description = "Database endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "db_instance_resource_id" {
  description = "Database resource ID"
  value       = aws_db_instance.postgres.resource_id
}

output "db_instance_address" {
  description = "Database host address"
  value       = aws_db_instance.postgres.address
}

output "db_instance_port" {
  description = "Database port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.postgres.db_name
}

output "db_username" {
  description = "Database master username"
  value       = aws_db_instance.postgres.username
  sensitive   = true
}

output "db_password" {
  description = "Database master password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "wal_archive_bucket" {
  description = "S3 bucket for WAL archiving"
  value       = aws_s3_bucket.wal_archive.id
}

output "parameter_group_name" {
  description = "Parameter group name"
  value       = aws_db_parameter_group.postgres.name
}
