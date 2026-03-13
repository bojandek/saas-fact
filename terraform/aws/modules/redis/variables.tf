variable "cluster_id" {
  description = "Cluster identifier"
  type        = string
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
}

variable "node_type" {
  description = "Node type"
  type        = string
}

variable "num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 3
}

variable "automatic_failover" {
  description = "Automatic failover enabled"
  type        = bool
  default     = true
}

variable "multi_az" {
  description = "Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs"
  type        = list(string)
}

variable "subnet_group_name" {
  description = "Subnet group name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}
