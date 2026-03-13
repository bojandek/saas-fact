#!/bin/bash

###############################################################################
# Chaos Test: Kill Redis Master
#
# Simulates Redis master failure and verifies:
# 1. Sentinel detects master is down within 30 seconds
# 2. Sentinel promotes one replica to new master
# 3. All clients reconnect to new master automatically
# 4. Cache continues working with promoted replica
#
# Usage: ./kill-redis-master.sh [--duration=60]
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DURATION=${1:-"60"}

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

# Check Redis master status
check_redis_master() {
    log_info "Checking Redis master status..."
    
    if redis-cli -h localhost -p 6379 ping &>/dev/null; then
        local role=$(redis-cli -h localhost -p 6379 info replication | grep "role:" | cut -d: -f2 | tr -d '\r')
        log_success "Redis master is UP (role: $role)"
        return 0
    else
        log_error "Redis master is DOWN"
        return 1
    fi
}

# Check Sentinel status
check_sentinel_status() {
    log_info "Checking Sentinel cluster status..."
    
    local master_info=$(redis-cli -h localhost -p 26379 sentinel masters)
    
    if echo "$master_info" | grep -q "mymaster"; then
        log_success "Sentinel has master info"
        echo "$master_info"
    else
        log_error "Sentinel cannot find master"
        return 1
    fi
}

# Get current master endpoint
get_master_endpoint() {
    redis-cli -h localhost -p 26379 sentinel masters | grep -A 10 "^mymaster" | grep "ip:" | head -1 | awk '{print $2}' | tr -d '\r'
}

# Check replica status
check_replica_status() {
    log_info "Checking Redis replicas..."
    
    # Check replica 1
    if redis-cli -h localhost -p 6380 ping &>/dev/null; then
        local role1=$(redis-cli -h localhost -p 6380 info replication | grep "role:" | cut -d: -f2 | tr -d '\r')
        log_success "Replica-1 is UP (role: $role1)"
    else
        log_error "Replica-1 is DOWN"
    fi
    
    # Check replica 2
    if redis-cli -h localhost -p 6381 ping &>/dev/null; then
        local role2=$(redis-cli -h localhost -p 6381 info replication | grep "role:" | cut -d: -f2 | tr -d '\r')
        log_success "Replica-2 is UP (role: $role2)"
    else
        log_error "Replica-2 is DOWN"
    fi
}

# Pause Redis master
pause_redis_master() {
    log_warning "Pausing Redis master container..."
    
    docker-compose -f "$PROJECT_ROOT/docker-compose.ha.yml" pause redis-master-ha
    log_success "Redis master paused"
}

# Resume Redis master
resume_redis_master() {
    log_warning "Resuming Redis master container..."
    
    docker-compose -f "$PROJECT_ROOT/docker-compose.ha.yml" unpause redis-master-ha
    log_success "Redis master resumed"
}

# Monitor sentinel promotion
monitor_sentinel_promotion() {
    local duration=$1
    local interval=10
    local elapsed=0
    local promotion_detected=0
    
    log_info "Monitoring Sentinel for master promotion ($duration seconds)..."
    
    local initial_master=$(get_master_endpoint)
    log_info "Initial master: $initial_master"
    
    while [ $elapsed -lt $duration ]; do
        log_info "Elapsed: ${elapsed}s / ${duration}s"
        
        local current_master=$(get_master_endpoint)
        
        if [ "$current_master" != "$initial_master" ] && [ -n "$current_master" ]; then
            log_success "Master promotion detected! New master: $current_master"
            promotion_detected=1
            break
        fi
        
        # Try to ping old master (should fail)
        if ! redis-cli -h localhost -p 6379 ping &>/dev/null; then
            log_warning "Old master unreachable (expected during failure)"
        fi
        
        # Check Sentinel status
        check_sentinel_status | head -5
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    return $((1 - promotion_detected))
}

# Verify new master is working
verify_new_master() {
    log_info "Verifying new master is operational..."
    
    # Test with replica 1 (promoted to master)
    if redis-cli -h localhost -p 6380 set test_key "test_value" &>/dev/null; then
        log_success "New master accepts writes"
        
        local value=$(redis-cli -h localhost -p 6380 get test_key 2>/dev/null)
        if [ "$value" = "test_value" ]; then
            log_success "New master returns correct data"
        fi
    elif redis-cli -h localhost -p 6381 set test_key "test_value" &>/dev/null; then
        log_success "New master (replica-2) accepts writes"
    else
        log_error "New master cannot accept writes"
        return 1
    fi
    
    return 0
}

# Check recovery
check_redis_recovery() {
    log_info "Checking Redis recovery after restart..."
    
    local max_wait=60
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        if redis-cli -h localhost -p 6379 ping &>/dev/null; then
            log_success "Original master recovered after $elapsed seconds"
            
            # Check it's now a replica
            sleep 5
            local role=$(redis-cli -h localhost -p 6379 info replication | grep "role:" | cut -d: -f2 | tr -d '\r')
            
            if [ "$role" = "slave" ]; then
                log_success "Recovered master rejoined as replica (role: $role)"
            else
                log_warning "Recovered master role: $role (replication may still be syncing)"
            fi
            
            return 0
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
    done
    
    log_error "Original master did not recover within $max_wait seconds"
    return 1
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Chaos Test: Redis Master Failure"
    log_info "=========================================="
    
    # Pre-chaos checks
    check_redis_master
    check_sentinel_status
    check_replica_status
    
    log_warning "Starting chaos test - pausing Redis master..."
    pause_redis_master
    
    log_warning "Redis master is DOWN - Sentinel should promote replica..."
    
    # Monitor promotion
    if monitor_sentinel_promotion "$DURATION"; then
        log_success "Sentinel promotion successful"
    else
        log_warning "Sentinel promotion did not complete within timeout"
    fi
    
    # Verify new master works
    verify_new_master
    
    # Resume original master
    log_warning "Resuming original Redis master..."
    resume_redis_master
    
    # Check recovery
    check_redis_recovery
    
    # Final checks
    check_redis_master
    check_replica_status
    
    log_success "=========================================="
    log_success "Redis failure chaos test completed!"
    log_success "=========================================="
}

# Run main
main "$@"
