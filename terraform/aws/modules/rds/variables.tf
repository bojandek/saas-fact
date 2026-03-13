variable "identifier" {
  description = "DB instance identifier"
  type        = string
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
}

variable "instance_class" {
  description = "Instance class"
  type        = string
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
}

variable "multi_az" {
  description = "Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "publicly_accessible" {
  description = "Publicly accessible"
  type        = bool
  default     = false
}

variable "vpc_security_group_ids" {
  description = "Security group IDs"
  type        = list(string)
}

variable "db_subnet_group_name" {
  description = "DB subnet group name"
  type        = string
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "backup_window" {
  description = "Backup window"
  type        = string
}

variable "maintenance_window" {
  description = "Maintenance window"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}
