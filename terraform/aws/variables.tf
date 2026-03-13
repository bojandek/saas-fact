variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnets_cidr" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets_cidr" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# RDS PostgreSQL Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6i.2xlarge"
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 100
}

# Redis Configuration
variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.r7g.xlarge"
}

# Neo4j Configuration
variable "neo4j_instance_type" {
  description = "Neo4j instance type"
  type        = string
  default     = "t3.2xlarge"
}

# Database Credentials
variable "db_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# Multi-Region Configuration
variable "enable_multi_region" {
  description = "Enable multi-region setup"
  type        = bool
  default     = false
}

variable "secondary_regions" {
  description = "Secondary AWS regions for failover"
  type        = list(string)
  default     = ["eu-west-1", "ap-southeast-1"]
}

# Monitoring & Alerting
variable "alert_email" {
  description = "Email for alerts"
  type        = string
}

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = true
}

# Tags
variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default = {
    ManagedBy = "Terraform"
    Project   = "SaaS Factory"
    Team      = "Platform"
  }
}
