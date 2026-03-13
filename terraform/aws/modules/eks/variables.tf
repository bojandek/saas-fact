variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "subnet_ids" {
  description = "Subnet IDs for cluster"
  type        = list(string)
}

variable "desired_size" {
  description = "Desired number of nodes"
  type        = number
  default     = 3
}

variable "min_size" {
  description = "Minimum number of nodes"
  type        = number
  default     = 2
}

variable "max_size" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "instance_types" {
  description = "Instance types for nodes"
  type        = list(string)
  default     = ["t3.xlarge"]
}

variable "environment" {
  description = "Environment name"
  type        = string
}
