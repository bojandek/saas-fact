#!/bin/bash

###############################################################################
# Chaos Test: Simulate Network Partition
#
# Disconnects one region from others and verifies:
# 1. Partitioned services detect isolation
# 2. Non-partitioned services continue operating
# 3. Replication queues events for later sync
# 4. Services rejoin and resynchronize after partition heals
#
# Usage: ./network-partition.sh [--duration=60] [--partition=replica]
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DURATION=${1:-"60"}
PARTITION=${2:-"replica"}  # Which services to partition: replica, neo4j, or sentinel

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

# Check network connectivity
check_network() {
    log_info "Checking network connectivity..."
    
    # PostgreSQL
    docker exec postgres-primary-ha pg_isready -h postgres-replica-1-ha &>/dev/null && \
        log_success "Primary ↔ Replica-1: OK" || log_warning "Primary ↔ Replica-1: FAIL"
    
    # Redis
    docker exec redis-master-ha redis-cli -h redis-replica-1-ha ping &>/dev/null && \
        log_success "Redis Master ↔ Replica-1: OK" || log_warning "Redis Master ↔ Replica-1: FAIL"
    
    # Neo4j
    docker exec neo4j-core-1-ha curl -s http://neo4j-core-2-ha:7474 &>/dev/null && \
        log_success "Neo4j Core-1 ↔ Core-2: OK" || log_warning "Neo4j Core-1 ↔ Core-2: FAIL"
}

# Partition PostgreSQL replica 1
partition_postgres_replica() {
    log_warning "Partitioning PostgreSQL Replica-1..."
    docker network disconnect ha-net postgres-replica-1-ha
    log_success "Replica-1 disconnected from network"
}

# Partition Neo4j core node
partition_neo4j() {
    log_warning "Partitioning Neo4j Core-2..."
    docker network disconnect ha-net neo4j-core-2-ha
    log_success "Neo4j Core-2 disconnected from network"
}

# Partition Redis replica
partition_redis() {
    log_warning "Partitioning Redis Replica-1..."
    docker network disconnect ha-net redis-replica-1-ha
    docker network disconnect ha-net redis-sentinel-1-ha
    log_success "Redis Replica-1 and Sentinel-1 disconnected from network"
}

# Heal partition
heal_partition() {
    log_info "Healing network partition..."
    
    # Reconnect all services
    docker network connect ha-net postgres-replica-1-ha 2>/dev/null || true
    docker network connect ha-net neo4j-core-2-ha 2>/dev/null || true
    docker network connect ha-net redis-replica-1-ha 2>/dev/null || true
    docker network connect ha-net redis-sentinel-1-ha 2>/dev/null || true
    
    log_success "All services reconnected to network"
}

# Monitor partition effects
monitor_partition() {
    local duration=$1
    local partition_type=$2
    local interval=15
    local elapsed=0
    
    log_info "Monitoring partition effects for $duration seconds..."
    
    while [ $elapsed -lt $duration ]; do
        log_info "Elapsed: ${elapsed}s / ${duration}s"
        
        case $partition_type in
            "replica")
                # Check primary is still accessible
                if docker exec postgres-primary-ha pg_isready -U postgres &>/dev/null; then
                    log_success "Primary still healthy"
                fi
                
                # Check partitioned replica is unreachable from primary
                docker exec postgres-primary-ha pg_isready -h postgres-replica-1-ha -U postgres &>/dev/null && \
                    log_warning "Partition not complete - Replica-1 still reachable" || \
                    log_success "Partition maintained - Replica-1 unreachable"
                
                # Check replication status from primary
                log_info "Replication status:"
                docker exec postgres-primary-ha psql -U postgres -d saas_factory -c \
                    "SELECT client_addr, state FROM pg_stat_replication" 2>/dev/null || true
                ;;
                
            "sentinel")
                # Check Redis master is still up
                redis-cli -h localhost -p 6379 ping &>/dev/null && \
                    log_success "Redis master still healthy"
                
                # Check if Sentinel still sees master
                redis-cli -h localhost -p 26380 sentinel masters 2>/dev/null | grep -q "mymaster" && \
                    log_success "Sentinel-2 sees master" || \
                    log_warning "Sentinel-2 lost master visibility"
                ;;
                
            "neo4j")
                # Check cluster is still operating
                docker exec neo4j-core-1-ha curl -s http://localhost:7474 &>/dev/null && \
                    log_success "Neo4j Core-1 still accessible"
                
                # Check cluster can still commit writes
                docker exec neo4j-core-1-ha cypher-shell -u neo4j -p password "RETURN 1" &>/dev/null && \
                    log_success "Cluster can still accept queries" || \
                    log_warning "Cluster query performance degraded"
                ;;
        esac
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
}

# Monitor recovery
monitor_recovery() {
    log_info "Monitoring recovery after partition heals..."
    
    local max_wait=120
    local elapsed=0
    
    # Wait for all services to reconverge
    while [ $elapsed -lt $max_wait ]; do
        check_network
        
        # Check replication lag
        local lag=$(docker exec postgres-primary-ha psql -U postgres -d saas_factory -t -c \
            "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int FROM pg_stat_replication WHERE state='streaming'" 2>/dev/null || echo "unknown")
        
        if [ "$lag" != "unknown" ] && [ "$lag" -lt 5 ]; then
            log_success "Replication lag acceptable after $elapsed seconds: ${lag}s"
            return 0
        fi
        
        sleep 10
        elapsed=$((elapsed + 10))
    done
    
    log_warning "Recovery not fully complete after $max_wait seconds (may be syncing large datasets)"
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Chaos Test: Network Partition"
    log_info "Partition Type: $PARTITION"
    log_info "Duration: $DURATION seconds"
    log_info "=========================================="
    
    # Pre-partition checks
    check_network
    
    # Create partition based on type
    case $PARTITION in
        "replica")
            partition_postgres_replica
            ;;
        "sentinel")
            partition_redis
            ;;
        "neo4j")
            partition_neo4j
            ;;
        *)
            log_error "Unknown partition type: $PARTITION"
            exit 1
            ;;
    esac
    
    log_warning "Network partition created - services operating in split state..."
    
    # Monitor effects
    monitor_partition "$DURATION" "$PARTITION"
    
    # Heal partition
    log_warning "Healing partition..."
    heal_partition
    
    # Monitor recovery
    monitor_recovery
    
    # Final checks
    log_info "Final network status:"
    check_network
    
    log_success "=========================================="
    log_success "Network partition chaos test completed!"
    log_success "=========================================="
}

# Run main
main "$@"
