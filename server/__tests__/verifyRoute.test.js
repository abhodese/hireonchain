const assert = require('assert');
const routeModulePath = require.resolve('../routes/verify');
const serviceModulePath = require.resolve('../services/solanaVerificationService');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

function createRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

async function runWithMock(mockImpl, body) {
  delete require.cache[routeModulePath];
  delete require.cache[serviceModulePath];
  require.cache[serviceModulePath] = {
    id: serviceModulePath,
    filename: serviceModulePath,
    loaded: true,
    exports: {
      simpleTransactionVerify: mockImpl,
    },
  };

  const { handleTransactionVerification } = require('../routes/verify');
  const req = { body };
  const res = createRes();

  await handleTransactionVerification(req, res);

  delete require.cache[routeModulePath];
  delete require.cache[serviceModulePath];

  return res;
}

async function withMockedConsoleError(fn) {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = originalConsoleError;
  }
}

async function main() {
  console.log('\n── Verify Route Handler ──');

  await test('returns 400 when signature is missing', async () => {
    const res = await runWithMock(async () => {
      throw new Error('service should not be called');
    }, { expectedWallet: 'wallet-1' });

    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.payload, {
      verified: false,
      error: 'Transaction signature is required',
    });
  });

  await test('returns 400 when expected wallet is missing', async () => {
    const res = await runWithMock(async () => {
      throw new Error('service should not be called');
    }, { signature: 'sig-1' });

    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.payload, {
      verified: false,
      error: 'Expected wallet address is required',
    });
  });

  await test('returns 200 when verification succeeds', async () => {
    const serviceResult = {
      verified: true,
      transaction: {
        signature: 'sig-123',
        status: 'success',
        slot: 99,
        blockTime: 123,
        involvedWallet: 'wallet-1',
      },
    };

    const res = await runWithMock(async (signature, expectedWallet) => {
      assert.strictEqual(signature, 'sig-123');
      assert.strictEqual(expectedWallet, 'wallet-1');
      return serviceResult;
    }, { signature: 'sig-123', expectedWallet: 'wallet-1' });

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.payload, serviceResult);
  });

  await test('returns 400 when verification fails cleanly', async () => {
    const res = await runWithMock(async () => ({
      verified: false,
      error: 'Transaction not found on-chain',
    }), { signature: 'sig-404', expectedWallet: 'wallet-2' });

    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.payload, {
      verified: false,
      error: 'Transaction not found on-chain',
    });
  });

  await test('returns 500 when the service throws unexpectedly', async () => {
    const res = await withMockedConsoleError(() => runWithMock(async () => {
      throw new Error('boom');
    }, { signature: 'sig-500', expectedWallet: 'wallet-3' }));

    assert.strictEqual(res.statusCode, 500);
    assert.deepStrictEqual(res.payload, {
      verified: false,
      error: 'Internal server error during verification',
    });
  });

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
