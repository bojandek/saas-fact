resource "aws_db_instance" "postgres" {
  identifier            = var.identifier
  engine               = "postgres"
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true

  # HA Configuration
  multi_az             = var.multi_az
  publicly_accessible  = var.publicly_accessible

  # Credentials
  db_name  = "saas_factory"
  username = "postgres"
  password = random_password.db_password.result

  # Security
  vpc_security_group_ids = var.vpc_security_group_ids
  db_subnet_group_name   = var.db_subnet_group_name
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.identifier}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Backups
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  copy_tags_to_snapshot  = true

  # Maintenance
  maintenance_window           = var.maintenance_window
  auto_minor_version_upgrade   = true
  deletion_protection          = true

  # Replication & High Availability
  enabled_cloudwatch_logs_exports = [
    "postgresql",
    "upgrade"
  ]

  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Enhanced Monitoring
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  enable_iam_database_authentication = true

  # Parameter Group for streaming replication
  parameter_group_name = aws_db_parameter_group.postgres.name

  tags = {
    Name = var.identifier
  }

  depends_on = [aws_iam_role.rds_monitoring]
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "aws_db_parameter_group" "postgres" {
  name   = "${var.identifier}-params"
  family = "postgres16"

  parameter {
    name  = "max_connections"
    value = "1000"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "wal_level"
    value = "replica"
  }

  parameter {
    name  = "max_wal_senders"
    value = "10"
  }

  parameter {
    name  = "max_replication_slots"
    value = "10"
  }

  parameter {
    name  = "archive_mode"
    value = "on"
  }

  parameter {
    name  = "archive_command"
    value = "aws s3 cp %p s3://${aws_s3_bucket.wal_archive.id}/wal_archive/%f"
  }

  tags = {
    Name = "${var.identifier}-params"
  }
}

# S3 bucket for WAL archiving
resource "aws_s3_bucket" "wal_archive" {
  bucket = "${var.identifier}-wal-archive-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.identifier}-wal-archive"
  }
}

resource "aws_s3_bucket_versioning" "wal_archive" {
  bucket = aws_s3_bucket.wal_archive.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "wal_archive" {
  bucket = aws_s3_bucket.wal_archive.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "wal_archive" {
  bucket = aws_s3_bucket.wal_archive.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM role for RDS monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.identifier}-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# IAM role for WAL archiving
resource "aws_iam_role" "rds_s3_access" {
  name = "${var.identifier}-s3-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "rds_s3_access" {
  name = "${var.identifier}-s3-access-policy"
  role = aws_iam_role.rds_s3_access.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.wal_archive.arn,
          "${aws_s3_bucket.wal_archive.arn}/*"
        ]
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
