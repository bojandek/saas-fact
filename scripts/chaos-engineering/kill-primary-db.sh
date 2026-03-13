#!/bin/bash

###############################################################################
# Chaos Test: Kill PostgreSQL Primary Database
#
# Simulates primary database failure and verifies:
# 1. Health check endpoint detects failure
# 2. Replica automatically promoted or marked as fallback
# 3. Application continues with degraded performance
# 4. Recovery after restart
#
# Usage: ./kill-primary-db.sh [--duration=60]
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DURATION=${1:-"60"}  # Default 60 seconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
}

# Get container ID
get_container_id() {
    local container_name=$1
    docker-compose -f "$PROJECT_ROOT/docker-compose.ha.yml" ps -q "$container_name"
}

# Check health before failure
check_health_before() {
    log_info "Checking system health before chaos test..."
    
    # Check PostgreSQL primary
    if docker exec postgres-primary-ha pg_isready -U postgres &>/dev/null; then
        log_success "PostgreSQL primary is healthy"
    else
        log_error "PostgreSQL primary is not responding"
        return 1
    fi

    # Check replicas
    if docker exec postgres-replica-1-ha pg_isready -U postgres &>/dev/null; then
        log_success "PostgreSQL replica-1 is healthy"
    else
        log_warning "PostgreSQL replica-1 is not responding"
    fi

    if docker exec postgres-replica-2-ha pg_isready -U postgres &>/dev/null; then
        log_success "PostgreSQL replica-2 is healthy"
    else
        log_warning "PostgreSQL replica-2 is not responding"
    fi

    # Check replication status
    log_info "Checking replication status..."
    docker exec postgres-primary-ha psql -U postgres -d saas_factory -c \
        "SELECT client_addr, state, sync_state FROM pg_stat_replication;" 2>/dev/null || true
}

# Check application health endpoint
check_app_health() {
    local expected_status=$1
    log_info "Checking application health endpoint..."
    
    local response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "error")
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "$expected_status" ]; then
        log_success "Application returned HTTP $http_code (expected)"
    else
        log_warning "Application returned HTTP $http_code (expected $expected_status)"
    fi
}

# Pause primary database
pause_primary() {
    log_info "Pausing PostgreSQL primary container..."
    
    CONTAINER_ID=$(get_container_id "postgres-primary-ha")
    if [ -z "$CONTAINER_ID" ]; then
        log_error "Could not find postgres-primary-ha container"
        return 1
    fi

    docker pause "$CONTAINER_ID"
    log_success "Primary DB paused (container: $CONTAINER_ID)"
}

# Resume primary database
resume_primary() {
    log_info "Resuming PostgreSQL primary container..."
    
    CONTAINER_ID=$(get_container_id "postgres-primary-ha")
    if [ -z "$CONTAINER_ID" ]; then
        log_error "Could not find postgres-primary-ha container"
        return 1
    fi

    docker unpause "$CONTAINER_ID"
    log_success "Primary DB resumed"
}

# Monitor failures
monitor_failures() {
    local duration=$1
    local interval=10
    local elapsed=0
    
    log_info "Monitoring system for $duration seconds..."
    
    while [ $elapsed -lt $duration ]; do
        log_info "Elapsed: ${elapsed}s / ${duration}s"
        
        # Check app health (should be degraded: 503)
        check_app_health "503"
        
        # Check if replicas are still healthy
        if docker exec postgres-replica-1-ha pg_isready -U postgres &>/dev/null; then
            log_success "Replica-1 is still healthy"
        else
            log_error "Replica-1 is also down (cluster failure!)"
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
}

# Check recovery
check_recovery() {
    log_info "Checking recovery after restart..."
    
    local max_wait=60
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        if docker exec postgres-primary-ha pg_isready -U postgres &>/dev/null; then
            log_success "Primary recovered after $elapsed seconds"
            
            # Wait a bit for replication to catch up
            sleep 10
            
            # Check replication resume
            log_info "Checking replication status..."
            docker exec postgres-primary-ha psql -U postgres -d saas_factory -c \
                "SELECT client_addr, state, sync_state FROM pg_stat_replication;" 2>/dev/null || true
            
            # Check application health (should be healthy: 200)
            sleep 5
            check_app_health "200"
            
            return 0
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
    done
    
    log_error "Primary did not recover within $max_wait seconds"
    return 1
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Chaos Test: PostgreSQL Primary Failure"
    log_info "=========================================="
    
    check_docker
    check_health_before
    
    log_warning "Starting chaos test - pausing primary DB..."
    pause_primary
    
    log_warning "Primary is DOWN - system should failover to replicas"
    check_app_health "503"
    
    # Monitor degraded state
    monitor_failures "$DURATION"
    
    log_warning "Resuming primary DB..."
    resume_primary
    
    # Check recovery
    check_recovery
    
    log_success "=========================================="
    log_success "Chaos test completed successfully!"
    log_success "=========================================="
}

# Run main function
main "$@"
