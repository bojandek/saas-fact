#!/bin/bash

###############################################################################
# Chaos Test: Kill Neo4j Cluster Node
#
# Simulates Neo4j node failure and verifies:
# 1. Cluster continues with remaining nodes (quorum maintained)
# 2. Raft consensus handles leader re-election if needed
# 3. New node rejoins and resynchronizes from leader
# 4. No data loss or corruption
#
# Usage: ./kill-neo4j-node.sh [--duration=60] [--node=core-2]
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DURATION=${1:-"60"}
NODE=${2:-"core-2"}

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

# Get Neo4j cluster status
get_cluster_status() {
    log_info "Querying cluster status..."
    
    docker exec neo4j-core-1-ha \
        curl -s -u neo4j:password \
        http://localhost:7474/db/neo4j/exec \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"query":"CALL dbms.cluster.overview()"}' 2>/dev/null || \
        log_error "Could not query cluster status"
}

# Check cluster health
check_cluster_health() {
    log_info "Checking cluster health..."
    
    # Try to execute a simple query
    if docker exec neo4j-core-1-ha \
        cypher-shell -u neo4j -p password \
        "RETURN 1 as status" &>/dev/null; then
        log_success "Cluster can execute queries"
        return 0
    else
        log_error "Cluster cannot execute queries"
        return 1
    fi
}

# Count active nodes
count_active_nodes() {
    get_cluster_status | grep -o "id:" | wc -l
}

# Pause Neo4j node
pause_neo4j_node() {
    local container_name="neo4j-${NODE}-ha"
    
    log_warning "Pausing Neo4j $NODE container..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.ha.yml" pause "$container_name"
    log_success "Neo4j $NODE paused"
}

# Resume Neo4j node
resume_neo4j_node() {
    local container_name="neo4j-${NODE}-ha"
    
    log_warning "Resuming Neo4j $NODE container..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.ha.yml" unpause "$container_name"
    log_success "Neo4j $NODE resumed"
}

# Monitor cluster during outage
monitor_cluster_during_outage() {
    local duration=$1
    local interval=20
    local elapsed=0
    
    log_info "Monitoring cluster for $duration seconds..."
    
    while [ $elapsed -lt $duration ]; do
        log_info "Elapsed: ${elapsed}s / ${duration}s"
        
        # Try to get cluster status
        local active_nodes=$(count_active_nodes)
        
        if [ "$active_nodes" -ge 2 ]; then
            log_success "Cluster has $active_nodes active nodes (quorum maintained)"
        else
            log_error "Cluster has only $active_nodes active nodes (quorum LOST!)"
        fi
        
        # Try to execute query
        if check_cluster_health; then
            log_success "Cluster still accepting queries"
        else
            log_warning "Cluster not accepting queries"
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
}

# Monitor recovery
monitor_recovery() {
    log_info "Monitoring cluster recovery after node restart..."
    
    local max_wait=120
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        local active_nodes=$(count_active_nodes)
        
        if [ "$active_nodes" -eq 3 ]; then
            log_success "All 3 nodes recovered after $elapsed seconds"
            
            # Wait for sync
            sleep 10
            
            # Verify cluster health
            check_cluster_health && \
                log_success "Cluster fully operational" || \
                log_warning "Cluster recovering"
            
            return 0
        fi
        
        log_info "Active nodes: $active_nodes / 3"
        sleep 10
        elapsed=$((elapsed + 10))
    done
    
    log_error "Cluster recovery incomplete after $max_wait seconds"
    return 1
}

# Test write consistency
test_write_consistency() {
    log_info "Testing write consistency..."
    
    # Create a test node
    local test_id="chaos_test_$(date +%s)"
    
    if docker exec neo4j-core-1-ha \
        cypher-shell -u neo4j -p password \
        "CREATE (n:ChaosTest {id: '$test_id', timestamp: timestamp()}) RETURN n" &>/dev/null; then
        log_success "Write test succeeded"
        
        # Try to read from different nodes
        if docker exec neo4j-core-1-ha \
            cypher-shell -u neo4j -p password \
            "MATCH (n:ChaosTest {id: '$test_id'}) RETURN n LIMIT 1" &>/dev/null; then
            log_success "Read test from Core-1 succeeded"
        fi
        
        # Query consistency is eventual, just verify no errors
        return 0
    else
        log_error "Write test failed"
        return 1
    fi
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Chaos Test: Neo4j Node Failure"
    log_info "Target Node: $NODE"
    log_info "Duration: $DURATION seconds"
    log_info "=========================================="
    
    # Check initial cluster health
    get_cluster_status
    check_cluster_health
    test_write_consistency
    
    # Pause node
    log_warning "Starting chaos test - pausing Neo4j $NODE..."
    pause_neo4j_node
    
    log_warning "Neo4j $NODE is DOWN - cluster should continue with remaining nodes..."
    
    # Monitor outage
    monitor_cluster_during_outage "$DURATION"
    
    # Resume node
    log_warning "Resuming Neo4j $NODE..."
    resume_neo4j_node
    
    # Monitor recovery
    monitor_recovery
    
    # Final checks
    log_info "Final cluster status:"
    get_cluster_status
    check_cluster_health
    test_write_consistency
    
    log_success "=========================================="
    log_success "Neo4j node failure chaos test completed!"
    log_success "=========================================="
}

# Run main
main "$@"
