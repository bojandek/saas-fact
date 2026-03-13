resource "aws_elasticache_replication_group" "redis" {
  replication_group_description = "Redis cluster for SaaS Factory"
  engine                        = "redis"
  engine_version                = var.engine_version
  node_type                     = var.node_type
  num_cache_clusters            = var.num_cache_nodes
  automatic_failover_enabled    = var.automatic_failover
  multi_az_enabled              = var.multi_az
  preferred_cache_cluster_azs   = var.availability_zones

  security_group_ids     = var.security_group_ids
  subnet_group_name      = var.subnet_group_name
  parameter_group_name   = aws_elasticache_parameter_group.redis.name

  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  auth_token_update_strategy = "ROTATE"

  # Backup Configuration
  snapshot_retention_limit = 10
  snapshot_window          = "03:00-05:00"

  # Maintenance
  notification_topic_arn = aws_sns_topic.redis_alerts.arn
  maintenance_window     = "mon:05:00-mon:06:00"

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = {
    Name = "saas-factory-redis"
  }
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}

# Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  name   = "saas-factory-redis-params"
  family = "redis7"

  # Performance tuning
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = {
    Name = "saas-factory-redis-params"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/redis/slow-log"
  retention_in_days = 7

  tags = {
    Name = "redis-slow-log"
  }
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/redis/engine-log"
  retention_in_days = 3

  tags = {
    Name = "redis-engine-log"
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "redis_alerts" {
  name = "saas-factory-redis-alerts"

  tags = {
    Name = "redis-alerts"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "saas-factory-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "Alert when Redis CPU is high"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "saas-factory-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "Alert when Redis memory usage is high"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "saas-factory-redis-evictions"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "100"
  alarm_description   = "Alert when keys are being evicted"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_replication_lag" {
  alarm_name          = "saas-factory-redis-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "5"
  alarm_description   = "Alert when replication lag is high"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }
}
