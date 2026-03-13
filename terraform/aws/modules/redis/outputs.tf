output "primary_endpoint_address" {
  description = "Redis primary endpoint address"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "Redis reader endpoint address"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "configuration_endpoint_address" {
  description = "Redis configuration endpoint"
  value       = aws_elasticache_replication_group.redis.configuration_endpoint_address
}

output "auth_token" {
  description = "Redis auth token"
  value       = random_password.redis_auth_token.result
  sensitive   = true
}

output "replication_group_id" {
  description = "Replication group ID"
  value       = aws_elasticache_replication_group.redis.id
}
