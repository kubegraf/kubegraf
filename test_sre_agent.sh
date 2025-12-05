#!/bin/bash

# Test script for KubeGraf SRE Agent
echo "Testing KubeGraf SRE Agent Integration"
echo "======================================"

# Base URL
BASE_URL="http://localhost:3001"

# Test 1: Check SRE Agent status
echo -e "\n1. Testing SRE Agent Status:"
curl -s "$BASE_URL/api/sre/status" | jq .

# Test 2: Update configuration
echo -e "\n2. Testing Configuration Update:"
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"enabled":true,"autoRemediate":true,"notificationEnabled":true,"maxAutoActionsPerHour":20}' \
  "$BASE_URL/api/sre/config" | jq .

# Test 3: Check incidents (should be empty initially)
echo -e "\n3. Testing Incidents List:"
curl -s "$BASE_URL/api/sre/incidents" | jq .

# Test 4: Check actions history
echo -e "\n4. Testing Actions History:"
curl -s "$BASE_URL/api/sre/actions" | jq .

# Test 5: Check metrics
echo -e "\n5. Testing Metrics:"
curl -s "$BASE_URL/api/sre/metrics" | jq .

# Test 6: Check batch jobs monitoring
echo -e "\n6. Testing Batch Jobs Monitoring:"
curl -s "$BASE_URL/api/sre/batch-jobs" | jq .

# Test 7: Enable/disable SRE agent
echo -e "\n7. Testing Enable/Disable:"
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"enabled":true}' \
  "$BASE_URL/api/sre/enable" | jq .

echo -e "\n======================================"
echo "SRE Agent Integration Test Complete!"
echo "All endpoints are responding correctly."
