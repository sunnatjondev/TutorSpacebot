#!/usr/bin/env node

/**
 * TutorSpace Motion-Ad E2E Test Runner
 * Executes Tiers 1 through 4 test suites with zero external build dependencies.
 *
 * Usage:
 *   node tests/run-all.mjs             # Run all tiers (1-4)
 *   node tests/run-all.mjs --tier=1    # Run only Tier 1
 *   node tests/run-all.mjs --tier=2    # Run only Tier 2
 *   node tests/run-all.mjs --tier=3    # Run only Tier 3
 *   node tests/run-all.mjs --tier=4    # Run only Tier 4
 *   node tests/run-all.mjs --filter=S6 # Run tests matching pattern
 *   node tests/run-all.mjs --json      # Output machine-readable JSON
 *   node tests/run-all.mjs --baseline  # Run and record baseline (exit 0)
 */

import { runner } from './helpers/test-framework.mjs';

// ─── Import Tier 1 Suites (15 Features × 5 Tests = 75 Tests) ───
import './tier1-features/t1-01-tokens-typography.test.mjs';
import './tier1-features/t1-02-theme-shadows.test.mjs';
import './tier1-features/t1-03-s1-s4-brand-problems.test.mjs';
import './tier1-features/t1-04-s5-groups.test.mjs';
import './tier1-features/t1-05-s6-attendance.test.mjs';
import './tier1-features/t1-06-s7-finance.test.mjs';
import './tier1-features/t1-07-s8-parent.test.mjs';
import './tier1-features/t1-08-s9-schedule.test.mjs';
import './tier1-features/t1-09-s10-outro.test.mjs';
import './tier1-features/t1-10-bg-audio.test.mjs';
import './tier1-features/t1-11-sound-effects.test.mjs';
import './tier1-features/t1-12-gsap-transitions.test.mjs';
import './tier1-features/t1-13-micro-interactions.test.mjs';
import './tier1-features/t1-14-timeline-pacing.test.mjs';
import './tier1-features/t1-15-obs-zerobuild.test.mjs';

// ─── Import Tier 2 Suites (15 Features × 5 Tests = 75 Tests) ───
import './tier2-boundaries/t2-01-tokens-boundaries.test.mjs';
import './tier2-boundaries/t2-02-theme-boundaries.test.mjs';
import './tier2-boundaries/t2-03-s1-s4-boundaries.test.mjs';
import './tier2-boundaries/t2-04-s5-groups-boundaries.test.mjs';
import './tier2-boundaries/t2-05-s6-attendance-boundaries.test.mjs';
import './tier2-boundaries/t2-06-s7-finance-boundaries.test.mjs';
import './tier2-boundaries/t2-07-s8-parent-boundaries.test.mjs';
import './tier2-boundaries/t2-08-s9-schedule-boundaries.test.mjs';
import './tier2-boundaries/t2-09-s10-outro-boundaries.test.mjs';
import './tier2-boundaries/t2-10-bg-audio-boundaries.test.mjs';
import './tier2-boundaries/t2-11-sfx-boundaries.test.mjs';
import './tier2-boundaries/t2-12-gsap-boundaries.test.mjs';
import './tier2-boundaries/t2-13-micro-interactions-boundaries.test.mjs';
import './tier2-boundaries/t2-14-timeline-pacing-boundaries.test.mjs';
import './tier2-boundaries/t2-15-obs-boundaries.test.mjs';

// ─── Import Tier 3 Suite (16 Tests) ───
import './tier3-combinations/tier3-pairwise.test.mjs';

// ─── Import Tier 4 Suite (5 Scenarios) ───
import './tier4-scenarios/tier4-scenarios.test.mjs';

async function main() {
  const args = process.argv.slice(2);
  let tier = null;
  let filter = null;
  let jsonOutput = false;
  let baselineMode = false;

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      tier = arg.split('=')[1];
    } else if (arg.startsWith('--filter=')) {
      filter = arg.split('=')[1];
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (arg === '--baseline') {
      baselineMode = true;
    }
  }

  if (!jsonOutput) {
    console.log('\n======================================================================');
    console.log('🎬 TUTORSPACE MOTION-AD E2E TEST SUITE (TIERS 1 - 4)');
    console.log('======================================================================\n');
  }

  const startTime = Date.now();
  const summary = await runner.run({ tier, filter, silent: jsonOutput });
  const totalDuration = Date.now() - startTime;

  // Breakdown by Tier
  const tierStats = {
    'Tier 1': { total: 0, passed: 0, failed: 0 },
    'Tier 2': { total: 0, passed: 0, failed: 0 },
    'Tier 3': { total: 0, passed: 0, failed: 0 },
    'Tier 4': { total: 0, passed: 0, failed: 0 },
  };

  for (const res of summary.results) {
    for (const tKey of Object.keys(tierStats)) {
      if (res.suiteName.includes(tKey)) {
        tierStats[tKey].total++;
        if (res.pass) tierStats[tKey].passed++;
        else tierStats[tKey].failed++;
      }
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({
      totalDuration,
      summary,
      tierStats,
    }, null, 2));
    process.exit(summary.failed > 0 && !baselineMode ? 1 : 0);
    return;
  }

  console.log('\n======================================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('======================================================================');
  console.log(`⏱️  Total Duration : ${totalDuration} ms`);
  console.log(`📋 Total Tests    : ${summary.total}`);
  console.log(`✅ Passed         : \x1b[32m${summary.passed}\x1b[0m`);
  console.log(`❌ Failed         : ${summary.failed > 0 ? '\x1b[31m' + summary.failed + '\x1b[0m' : '0'}`);
  console.log('----------------------------------------------------------------------');
  console.log('Tier Breakdown:');
  for (const [tKey, stats] of Object.entries(tierStats)) {
    const status = stats.failed === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[33mINCOMPLETE / ESCALATE\x1b[0m';
    console.log(`  • ${tKey.padEnd(8)}: ${String(stats.passed).padStart(3)} / ${String(stats.total).padEnd(3)} passed [${status}]`);
  }
  console.log('======================================================================\n');

  if (summary.failed > 0) {
    console.log('⚠️  DEFECTS / IMPLEMENTATION GAPS DISCOVERED FOR ESCALATION:');
    console.log('----------------------------------------------------------------------');
    summary.failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.suiteName}] ${f.testName}`);
      console.log(`     Reason: \x1b[31m${f.error}\x1b[0m\n`);
    });
    console.log('----------------------------------------------------------------------');
    console.log('💡 Note: Expected implementation gaps in audio (M1) or server.mjs will pass');
    console.log('   once Milestone 1 (Authentic Audio & Tokens) lands in the codebase.\n');
  }

  if (baselineMode) {
    console.log('📌 Baseline established successfully. Exiting 0.\n');
    process.exit(0);
  } else {
    process.exit(summary.failed > 0 ? 1 : 0);
  }
}

main().catch(err => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
