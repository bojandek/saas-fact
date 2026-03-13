terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "~> 1.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket         = "saas-factory-terraform-state"
    key            = "prod/aws/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "saas-factory"
      ManagedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }
}

# VPC and Networking
module "networking" {
  source = "./modules/networking"

  vpc_cidr              = var.vpc_cidr
  environment           = var.environment
  availability_zones    = var.availability_zones
  private_subnets_cidr  = var.private_subnets_cidr
  public_subnets_cidr   = var.public_subnets_cidr
}

# RDS PostgreSQL HA
module "rds_postgres" {
  source = "./modules/rds"

  identifier              = "saas-factory-postgres"
  engine_version          = "16.1"
  instance_class          = var.rds_instance_class
  allocated_storage       = var.rds_allocated_storage
  multi_az                = true
  publicly_accessible     = false
  vpc_security_group_ids  = [module.networking.rds_security_group_id]
  db_subnet_group_name    = module.networking.db_subnet_group_name
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  environment             = var.environment

  depends_on = [module.networking]
}

# ElastiCache Redis Sentinel/Cluster
module "redis" {
  source = "./modules/redis"

  cluster_id          = "saas-factory-redis"
  engine_version      = "7.2"
  node_type           = var.redis_node_type
  num_cache_nodes     = 3
  automatic_failover  = true
  multi_az            = true
  security_group_ids  = [module.networking.redis_security_group_id]
  subnet_group_name   = module.networking.elasticache_subnet_group_name
  environment         = var.environment

  depends_on = [module.networking]
}

# Neo4j Graph Database
module "neo4j" {
  source = "./modules/neo4j"

  instance_type       = var.neo4j_instance_type
  disk_size           = 100
  number_of_instances = 3
  vpc_id              = module.networking.vpc_id
  subnet_ids          = module.networking.private_subnet_ids
  security_group_ids  = [module.networking.neo4j_security_group_id]
  environment         = var.environment

  depends_on = [module.networking]
}

# EKS Kubernetes Cluster
module "eks" {
  source = "./modules/eks"

  cluster_name            = "saas-factory-eks"
  kubernetes_version      = "1.28"
  vpc_id                  = module.networking.vpc_id
  subnet_ids              = module.networking.private_subnet_ids
  desired_size            = 3
  min_size                = 2
  max_size                = 10
  instance_types          = ["t3.xlarge"]
  environment             = var.environment

  depends_on = [module.networking]
}

# Load Balancer (ALB)
module "load_balancer" {
  source = "./modules/load-balancer"

  name               = "saas-factory-alb"
  vpc_id             = module.networking.vpc_id
  subnets            = module.networking.public_subnet_ids
  security_group     = module.networking.alb_security_group_id
  environment        = var.environment

  depends_on = [module.networking]
}

# Monitoring Stack
module "monitoring" {
  source = "./modules/monitoring"

  environment             = var.environment
  cluster_name            = module.eks.cluster_name
  cluster_arn             = module.eks.cluster_arn
  rds_db_instance_id      = module.rds_postgres.db_instance_id
  redis_cluster_id        = module.redis.cluster_id
}

# Outputs
output "rds_endpoint" {
  value       = module.rds_postgres.db_instance_endpoint
  description = "RDS PostgreSQL endpoint"
}

output "redis_endpoint" {
  value       = module.redis.primary_endpoint_address
  description = "Redis primary endpoint"
}

output "neo4j_endpoints" {
  value       = module.neo4j.instance_ips
  description = "Neo4j cluster endpoints"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS cluster endpoint"
}

output "alb_dns_name" {
  value       = module.load_balancer.dns_name
  description = "ALB DNS name"
}
