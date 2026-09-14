#!/usr/bin/env node

/**
 * RePXL Automated Stress & Load Testing Harness
 * 
 * Usage:
 *   node scripts/stress-test.mjs [options]
 * 
 * Options:
 *   --target <url>        Base URL to test (default: http://localhost:3000)
 *   --concurrency <n>     Number of concurrent virtual workers (default: 20)
 *   --requests <n>        Total requests per scenario (default: 100)
 *   --scenario <name>     Specific scenario (all, health, catalog) (default: all)
 */

import { performance } from 'node:perf_hooks';

// Parse command-line flags
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return defaultValue;
}

const TARGET_URL = (getArg('--target', process.env.STRESS_TARGET_URL || 'http://localhost:3000')).replace(/\/+$/, '');
const CONCURRENCY = parseInt(getArg('--concurrency', '20'), 10);
const TOTAL_REQUESTS = parseInt(getArg('--requests', '100'), 10);
const SCENARIO = getArg('--scenario', 'all');

console.log(`\n========================================================`);
console.log(`🚀 RePXL High-Load Stress Testing Harness`);
console.log(`========================================================`);
console.log(`Target URL:   ${TARGET_URL}`);
console.log(`Concurrency:  ${CONCURRENCY} workers`);
console.log(`Requests:     ${TOTAL_REQUESTS} per suite`);
console.log(`Scenario:     ${SCENARIO}`);
console.log(`========================================================\n`);

function calculatePercentile(latencies, percentile) {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runWorkerPool(taskFn, totalTasks, concurrency) {
  let completed = 0;
  let inFlight = 0;
  let taskIndex = 0;
  const results = [];

  return new Promise((resolve) => {
    function launchNext() {
      while (inFlight < concurrency && taskIndex < totalTasks) {
        const currentIdx = taskIndex++;
        inFlight++;

        taskFn(currentIdx)
          .then((res) => {
            results.push(res);
          })
          .catch((err) => {
            results.push({
              status: 0,
              latency: 0,
              error: err.message || 'Network error',
            });
          })
          .finally(() => {
            inFlight--;
            completed++;
            if (completed === totalTasks) {
              resolve(results);
            } else {
              launchNext();
            }
          });
      }
    }
    launchNext();
  });
}

function printReport(title, results, durationMs) {
  const latencies = results.map((r) => r.latency).filter((l) => l > 0);
  const statusCounts = {};
  let totalErrors = 0;

  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    if (r.status === 0 || r.status >= 500) {
      totalErrors++;
    }
  }

  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  const p50 = calculatePercentile(latencies, 50);
  const p90 = calculatePercentile(latencies, 90);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);

  const durationSec = durationMs / 1000;
  const reqPerSec = durationSec > 0 ? (results.length / durationSec).toFixed(1) : 'N/A';
  const successRate = (((results.length - totalErrors) / results.length) * 100).toFixed(1);

  console.log(`--- ${title} ---`);
  console.log(`Completed:    ${results.length} requests in ${durationSec.toFixed(2)}s`);
  console.log(`Throughput:   ${reqPerSec} req/sec`);
  console.log(`Success Rate: ${successRate}% (${results.length - totalErrors}/${results.length})`);
  console.log(`Status Codes: ${JSON.stringify(statusCounts)}`);
  console.log(`Latencies:`);
  console.log(`  Min:  ${minLatency.toFixed(1)} ms`);
  console.log(`  Avg:  ${avgLatency.toFixed(1)} ms`);
  console.log(`  P50:  ${p50.toFixed(1)} ms`);
  console.log(`  P90:  ${p90.toFixed(1)} ms`);
  console.log(`  P95:  ${p95.toFixed(1)} ms`);
  console.log(`  P99:  ${p99.toFixed(1)} ms`);
  console.log(`  Max:  ${maxLatency.toFixed(1)} ms`);

  const passed = totalErrors === 0;
  console.log(`Outcome:      ${passed ? '✅ PASS (0 server errors)' : '❌ FAIL (Server errors detected)'}\n`);
  return passed;
}

async function stressEndpoint(path, method = 'GET', body = null) {
  const start = performance.now();
  try {
    const res = await fetch(`${TARGET_URL}${path}`, {
      method,
      headers: {
        'Accept': 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const latency = performance.now() - start;
    return { status: res.status, latency };
  } catch (err) {
    const latency = performance.now() - start;
    return { status: 0, latency, error: err.message };
  }
}

async function run() {
  let allPassed = true;

  // 1. Health check probe
  if (SCENARIO === 'all' || SCENARIO === 'health') {
    console.log(`[1/3] Running Health & DB Probe Stress Test...`);
    const start = performance.now();
    const results = await runWorkerPool(
      () => stressEndpoint('/api/health'),
      TOTAL_REQUESTS,
      CONCURRENCY
    );
    const duration = performance.now() - start;
    const passed = printReport('Health Check Probe (/api/health)', results, duration);
    if (!passed) allPassed = false;
  }

  // 2. High-concurrency catalog read
  if (SCENARIO === 'all' || SCENARIO === 'catalog') {
    console.log(`[2/3] Running High-Concurrency Catalog Browsing...`);
    const catalogEndpoints = [
      '/api/products?limit=12',
      '/api/banners',
      '/api/cms/homepage',
      '/api/products?brand=sony',
    ];
    const start = performance.now();
    const results = await runWorkerPool(
      (idx) => {
        const path = catalogEndpoints[idx % catalogEndpoints.length];
        return stressEndpoint(path);
      },
      TOTAL_REQUESTS,
      CONCURRENCY
    );
    const duration = performance.now() - start;
    const passed = printReport('Catalog Read Stress Test', results, duration);
    if (!passed) allPassed = false;
  }

  // 3. Search & Filter Load
  if (SCENARIO === 'all' || SCENARIO === 'search') {
    console.log(`[3/3] Running High-Concurrency Search & Filter Stress Test...`);
    const searchQueries = [
      '/api/products?search=canon&condition=MINT',
      '/api/products?minPrice=5000&maxPrice=30000',
      '/api/products?sortBy=price&sortOrder=asc',
      '/api/products?search=cybershot',
    ];
    const start = performance.now();
    const results = await runWorkerPool(
      (idx) => {
        const path = searchQueries[idx % searchQueries.length];
        return stressEndpoint(path);
      },
      TOTAL_REQUESTS,
      CONCURRENCY
    );
    const duration = performance.now() - start;
    const passed = printReport('Search & Filter Stress Test', results, duration);
    if (!passed) allPassed = false;
  }

  console.log(`========================================================`);
  if (allPassed) {
    console.log(`🎉 ALL STRESS TEST SCENARIOS PASSED WITH 0 SERVER ERRORS`);
  } else {
    console.log(`⚠️ ONE OR MORE SCENARIOS HAD UNEXPECTED FAILURES OR TIMEOUTS`);
  }
  console.log(`========================================================\n`);

  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal stress test error:', err);
  process.exit(1);
});

