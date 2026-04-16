const express = require('express');
const router = express.Router();
const { simpleTransactionVerify } = require('../services/solanaVerificationService');
const rateLimit = require('express-rate-limit');

// Rate limit for verification endpoint
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification requests, please try again later.' },
});

async function handleTransactionVerification(req, res) {
  try {
    const { signature, expectedWallet } = req.body;

    // Validate inputs
    if (!signature) {
      return res.status(400).json({
        verified: false,
        error: 'Transaction signature is required',
      });
    }

    if (!expectedWallet) {
      return res.status(400).json({
        verified: false,
        error: 'Expected wallet address is required',
      });
    }

    // Perform verification
    const result = await simpleTransactionVerify(signature, expectedWallet);

    // Return appropriate HTTP status based on verification result
    const statusCode = result.verified ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (err) {
    console.error('Verification endpoint error:', err);
    res.status(500).json({
      verified: false,
      error: 'Internal server error during verification',
    });
  }
}

/**
 * Supports both:
 *   POST /api/verify/tx
 *   POST /api/verify-tx
 */
router.post('/tx', verifyLimiter, handleTransactionVerification);
router.post('/', verifyLimiter, handleTransactionVerification);

module.exports = {
  router,
  handleTransactionVerification,
};
