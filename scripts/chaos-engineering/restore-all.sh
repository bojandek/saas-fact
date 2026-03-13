#!/bin/bash

###############################################################################
# Restore All Services
#
# Heals all network partitions and resumes all paused containers
# Use after running chaos tests to restore system to normal state
#
# Usage: ./restore-all.sh
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Restore network connections
restore_network() {
    log_info "Restoring network connections..."
    
    local containers=(
        "postgres-replica-1-ha"
        "postgres-replica-2-ha"
        "redis-replica-1-ha"
        "redis-replica-2-ha"
        "redis-sentinel-1-ha"
        "redis-sentinel-2-ha"
        "redis-sentinel-3-ha"
        "neo4j-core-1-ha"
        "neo4j-core-2-ha"
        "neo4j-core-3-ha"
    )
    
    for container in "${containers[@]}"; do
        docker network connect ha-net "$container" 2>/dev/null || \
            log_warning "$container already connected or does not exist"
    done
    
    log_success "Network connections restored"
}

# Resume all paused containers
resume_containers() {
    log_info "Resuming paused containers..."
    
    local containers=(
        "postgres-primary-ha"
        "redis-master-ha"
        "neo4j-core-1-ha"
        "neo4j-core-2-ha"
        "neo4j-core-3-ha"
    )
    
    for container in "${containers[@]}"; do
        if docker ps --filter "status=paused" --format "{{.Names}}" | grep -q "^${container}\$"; then
            log_warning "Resuming $container..."
            docker unpause "$container"
            log_success "$container resumed"
        fi
    done
}

# Wait for services to be healthy
wait_healthy() {
    log_info "Waiting for services to become healthy..."
    
    local max_wait=120
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        # Check PostgreSQL
        local pg_ready=0
        docker exec postgres-primary-ha pg_isready -U postgres &>/dev/null && pg_ready=1
        
        # Check Redis
        local redis_ready=0
        redis-cli -h localhost -p 6379 ping &>/dev/null && redis_ready=1
        
        # Check Neo4j
        local neo4j_ready=0
        docker exec neo4j-core-1-ha curl -s http://localhost:7474 &>/dev/null && neo4j_ready=1
        
        if [ $pg_ready -eq 1 ] && [ $redis_ready -eq 1 ] && [ $neo4j_ready -eq 1 ]; then
            log_success "All services are healthy"
            return 0
        fi
        
        log_info "Waiting for services... (PostgreSQL: $pg_ready, Redis: $redis_ready, Neo4j: $neo4j_ready)"
        
        sleep 10
        elapsed=$((elapsed + 10))
    done
    
    log_warning "Services may not be fully healthy after $max_wait seconds, but proceeding..."
}

# Verify replication
verify_replication() {
    log_info "Verifying replication is restored..."
    
    # Check PostgreSQL replication
    log_info "PostgreSQL replication status:"
    docker exec postgres-primary-ha psql -U postgres -d saas_factory -c \
        "SELECT count(*) as replicas FROM pg_stat_replication;" 2>/dev/null || \
        log_warning "Could not check PostgreSQL replication"
    
    # Check Redis replication
    log_info "Redis replication status:"
    redis-cli -h localhost -p 6379 info replication 2>/dev/null | grep "connected_slaves" || \
        log_warning "Could not check Redis replication"
    
    # Check Neo4j cluster
    log_info "Neo4j cluster status:"
    docker exec neo4j-core-1-ha curl -s -u neo4j:password \
        http://localhost:7474/db/neo4j/exec \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"query":"CALL dbms.cluster.overview()"}' 2>/dev/null | grep -o "id:" | wc -l && \
        echo "nodes found" || \
        log_warning "Could not check Neo4j cluster"
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Restoring All Services"
    log_info "=========================================="
    
    restore_network
    resume_containers
    wait_healthy
    verify_replication
    
    log_success "=========================================="
    log_success "All services restored!"
    log_success "=========================================="
}

# Run main
main "$@"
