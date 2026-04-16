/**
 * Test script for /api/verify-tx endpoint
 * 
 * This tests the simple transaction verification endpoint with real Devnet transactions.
 * 
 * Usage:
 *   node server/testVerifyTx.js
 * 
 * Configuration:
 *   - Requires SOLANA_RPC_URL to be set (defaults to Devnet)
 *   - Requires SOLANA_NETWORK to be 'devnet' or SOLANA_RPC_URL to point to Devnet
 */

require('dotenv').config();
const { simpleTransactionVerify } = require('./services/solanaVerificationService');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test 1: Missing signature should fail
 */
async function testMissingSignature() {
  log('\n=== Test 1: Missing Signature ===', 'blue');
  const result = await simpleTransactionVerify(null, '11111111111111111111111111111111');
  
  if (!result.verified && result.error.includes('signature')) {
    log('✓ PASS: Correctly rejected missing signature', 'green');
  } else {
    log('✗ FAIL: Should reject missing signature', 'red');
  }
}

/**
 * Test 2: Missing wallet address should fail
 */
async function testMissingWallet() {
  log('\n=== Test 2: Missing Wallet Address ===', 'blue');
  const result = await simpleTransactionVerify('11111111111111111111111111111111111111111111111111', null);
  
  if (!result.verified && result.error.includes('wallet')) {
    log('✓ PASS: Correctly rejected missing wallet', 'green');
  } else {
    log('✗ FAIL: Should reject missing wallet', 'red');
  }
}

/**
 * Test 3: Invalid signature should fail gracefully
 */
async function testInvalidSignature() {
  log('\n=== Test 3: Invalid Signature ===', 'blue');
  const result = await simpleTransactionVerify('invalidSignature', 'TokenkegQfeZyiNwAJsyFbPVwwQQfiopxZKTqdP1t');
  
  if (!result.verified && result.error) {
    log('✓ PASS: Correctly rejected invalid signature', 'green');
    log(`  Error: ${result.error}`, 'yellow');
  } else {
    log('✗ FAIL: Should reject invalid signature', 'red');
  }
}

/**
 * Test 4: Real transaction test (requires valid Devnet tx)
 * 
 * NOTE: This test requires a real transaction signature from Devnet.
 * The transaction must have succeeded and involved the specified wallet.
 * 
 * To get a valid transaction:
 *   1. Create a transaction on Devnet with your wallet
 *   2. Replace the signature and wallet address below
 */
async function testRealTransaction() {
  log('\n=== Test 4: Real Transaction (Demo) ===', 'blue');
  log('NOTE: This test requires a real Devnet transaction signature.', 'yellow');
  log('To run this test:', 'yellow');
  log('  1. Execute a real transaction on Devnet', 'yellow');
  log('  2. Replace the signature and wallet in this test script', 'yellow');
  
  // Example (these are fake - won\'t work)
  const exampleSignature = 'EXAMPLE_TRANSACTION_SIGNATURE_HERE';
  const exampleWallet = 'EXAMPLE_WALLET_ADDRESS_HERE';
  
  log(`\nExample test structure:`, 'blue');
  log(`  const result = await simpleTransactionVerify(`, 'blue');
  log(`    '${exampleSignature}',`, 'blue');
  log(`    '${exampleWallet}'`, 'blue');
  log(`  );`, 'blue');
}

/**
 * Test HTTP endpoint
 */
async function testHttpEndpoint() {
  log('\n=== Test 5: HTTP Endpoint ===', 'blue');
  log('To test the HTTP endpoint:', 'yellow');
  log('', 'blue');
  log('  curl -X POST http://localhost:5000/api/verify-tx \\', 'blue');
  log('    -H "Content-Type: application/json" \\', 'blue');
  log('    -d "{', 'blue');
  log('      \\"signature\\": \\"YOUR_TRANSACTION_SIGNATURE\\",', 'blue');
  log('      \\"expectedWallet\\": \\"YOUR_WALLET_ADDRESS\\"', 'blue');
  log('    }"', 'blue');
  log('', 'yellow');
  log('Example response (success):', 'yellow');
  log('{', 'blue');
  log('  "verified": true,', 'blue');
  log('  "transaction": {', 'blue');
  log('    "signature": "...",', 'blue');
  log('    "status": "success",', 'blue');
  log('    "slot": 123456,', 'blue');
  log('    "blockTime": 1234567890,', 'blue');
  log('    "involvedWallet": "..."', 'blue');
  log('  }', 'blue');
  log('}', 'blue');
}

/**
 * Run all tests
 */
async function runAllTests() {
  log('\n╔══════════════════════════════════════════════════╗', 'blue');
  log('║   Solana Devnet Transaction Verification Tests    ║', 'blue');
  log('╚══════════════════════════════════════════════════╝', 'blue');
  
  log(`\nNetwork: ${process.env.SOLANA_NETWORK || 'devnet'}`, 'yellow');
  log(`RPC URL: ${process.env.SOLANA_RPC_URL || 'default Devnet'}`, 'yellow');
  
  try {
    await testMissingSignature();
    await testMissingWallet();
    await testInvalidSignature();
    await testRealTransaction();
    await testHttpEndpoint();
    
    log('\n╔══════════════════════════════════════════════════╗', 'blue');
    log('║                    Tests Complete                 ║', 'blue');
    log('╚══════════════════════════════════════════════════╝', 'blue');
  } catch (err) {
    log(`\nFatal error: ${err.message}`, 'red');
    process.exit(1);
  }
}

// Run tests
runAllTests();
