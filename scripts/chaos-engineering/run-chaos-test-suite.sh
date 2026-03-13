#!/bin/bash

###############################################################################
# Run Complete Chaos Engineering Test Suite
#
# Executes all defined chaos tests sequentially and generates report
#
# Usage: ./run-chaos-test-suite.sh [--skip-db] [--skip-redis] [--skip-neo4j] [--skip-network]
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
SKIP_DB=0
SKIP_REDIS=0
SKIP_NEO4J=0
SKIP_NETWORK=0

for arg in "$@"; do
    case $arg in
        --skip-db) SKIP_DB=1 ;;
        --skip-redis) SKIP_REDIS=1 ;;
        --skip-neo4j) SKIP_NEO4J=1 ;;
        --skip-network) SKIP_NETWORK=1 ;;
    esac
done

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

# Create report file
REPORT_FILE="$PROJECT_ROOT/chaos-test-report-$(date +%Y%m%d_%H%M%S).txt"
touch "$REPORT_FILE"

report() {
    echo "$1" | tee -a "$REPORT_FILE"
}

# Run test and capture result
run_test() {
    local test_name=$1
    local test_script=$2
    local skip_flag=$3
    
    if [ $skip_flag -eq 1 ]; then
        log_warning "Skipping $test_name"
        report "SKIPPED: $test_name"
        return 0
    fi
    
    log_info "=========================================="
    log_info "Running: $test_name"
    log_info "=========================================="
    
    report ""
    report "=========================================="
    report "TEST: $test_name"
    report "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    report "=========================================="
    
    if bash "$test_script" 2>&1 | tee -a "$REPORT_FILE"; then
        log_success "$test_name PASSED"
        report "STATUS: PASSED"
        return 0
    else
        log_error "$test_name FAILED"
        report "STATUS: FAILED"
        return 1
    fi
}

# Health check
health_check() {
    log_info "Performing pre-test health check..."
    
    report ""
    report "=========================================="
    report "PRE-TEST HEALTH CHECK"
    report "=========================================="
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found"
        report "ERROR: Docker not installed"
        return 1
    fi
    
    # Check services
    local services_up=$(docker-compose -f "$PROJECT_ROOT/docker-compose.ha.yml" ps -q | wc -l)
    log_info "Services running: $services_up"
    report "Services running: $services_up"
    
    if [ "$services_up" -lt 6 ]; then
        log_error "Not all services are running. Start with: docker-compose -f docker-compose.ha.yml up -d"
        report "ERROR: Insufficient services running"
        return 1
    fi
    
    log_success "Health check passed"
    report "STATUS: HEALTHY"
    return 0
}

# Generate summary
generate_summary() {
    local passed=$1
    local failed=$2
    local skipped=$3
    local total=$((passed + failed + skipped))
    
    report ""
    report "=========================================="
    report "TEST SUMMARY"
    report "=========================================="
    report "Total Tests: $total"
    report "Passed: $passed"
    report "Failed: $failed"
    report "Skipped: $skipped"
    report "Success Rate: $(echo "scale=1; $passed * 100 / ($passed + $failed)" | bc)%"
    report "Report File: $REPORT_FILE"
    report "=========================================="
}

# Main execution
main() {
    local passed=0
    local failed=0
    local skipped=0
    
    report "=========================================="
    report "CHAOS ENGINEERING TEST SUITE"
    report "Start Time: $(date '+%Y-%m-%d %H:%M:%S')"
    report "=========================================="
    
    log_info "=========================================="
    log_info "CHAOS ENGINEERING TEST SUITE"
    log_info "=========================================="
    
    # Pre-test health check
    if ! health_check; then
        report ""
        report "ERROR: Pre-test health check failed"
        log_error "Pre-test health check failed"
        exit 1
    fi
    
    # Test 1: PostgreSQL Primary Failure
    if [ $SKIP_DB -eq 0 ]; then
        if run_test "PostgreSQL Primary Failure" \
            "$SCRIPT_DIR/kill-primary-db.sh" \
            0; then
            ((passed++))
        else
            ((failed++))
        fi
        sleep 30
        bash "$SCRIPT_DIR/restore-all.sh" > /dev/null 2>&1
        sleep 30
    else
        ((skipped++))
    fi
    
    # Test 2: Redis Master Failure
    if [ $SKIP_REDIS -eq 0 ]; then
        if run_test "Redis Master Failure" \
            "$SCRIPT_DIR/kill-redis-master.sh" \
            0; then
            ((passed++))
        else
            ((failed++))
        fi
        sleep 30
        bash "$SCRIPT_DIR/restore-all.sh" > /dev/null 2>&1
        sleep 30
    else
        ((skipped++))
    fi
    
    # Test 3: Neo4j Node Failure
    if [ $SKIP_NEO4J -eq 0 ]; then
        if run_test "Neo4j Core Node Failure" \
            "$SCRIPT_DIR/kill-neo4j-node.sh --duration=30 --node=core-2" \
            0; then
            ((passed++))
        else
            ((failed++))
        fi
        sleep 30
        bash "$SCRIPT_DIR/restore-all.sh" > /dev/null 2>&1
        sleep 30
    else
        ((skipped++))
    fi
    
    # Test 4: Network Partition - PostgreSQL
    if [ $SKIP_NETWORK -eq 0 ]; then
        if run_test "Network Partition - PostgreSQL Replica" \
            "$SCRIPT_DIR/network-partition.sh --duration=30 --partition=replica" \
            0; then
            ((passed++))
        else
            ((failed++))
        fi
        sleep 30
        bash "$SCRIPT_DIR/restore-all.sh" > /dev/null 2>&1
        sleep 30
    else
        ((skipped++))
    fi
    
    # Test 5: Network Partition - Redis
    if [ $SKIP_NETWORK -eq 0 ]; then
        if run_test "Network Partition - Redis Replica" \
            "$SCRIPT_DIR/network-partition.sh --duration=30 --partition=sentinel" \
            0; then
            ((passed++))
        else
            ((failed++))
        fi
        sleep 30
        bash "$SCRIPT_DIR/restore-all.sh" > /dev/null 2>&1
        sleep 30
    else
        ((skipped++))
    fi
    
    # Test 6: Network Partition - Neo4j
    if [ $SKIP_NEO4J -eq 0 ]; then
        if run_test "Network Partition - Neo4j Core Node" \
            "$SCRIPT_DIR/network-partition.sh --duration=30 --partition=neo4j" \
            0; then
            ((passed++))
        else
            ((failed++))
        fi
        sleep 30
        bash "$SCRIPT_DIR/restore-all.sh" > /dev/null 2>&1
        sleep 30
    else
        ((skipped++))
    fi
    
    # Final restore
    log_info "Performing final restore..."
    bash "$SCRIPT_DIR/restore-all.sh" > /dev/null 2>&1
    
    # Generate report
    generate_summary "$passed" "$failed" "$skipped"
    
    log_info "=========================================="
    if [ $failed -eq 0 ]; then
        log_success "ALL CHAOS TESTS PASSED!"
    else
        log_error "$failed test(s) failed"
    fi
    log_info "=========================================="
    
    echo ""
    log_info "Full report saved to: $REPORT_FILE"
    
    exit $failed
}

# Run main
main "$@"
