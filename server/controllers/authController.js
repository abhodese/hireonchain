const crypto = require('crypto');
const nacl = require('tweetnacl');
const bs58 = require('bs58').default;
const Challenge = require('../models/Challenge');

// @desc    Generate authentication challenge
// @route   POST /api/auth/challenge
// @access  Public
const generateChallenge = async (req, res) => {
  const { publicKey } = req.body;

  if (!publicKey) {
    return res.status(400).json({ error: 'Public key is required' });
  }

  try {
    // Generate random nonce
    const nonce = crypto.randomBytes(32).toString('hex');

    // Create or update challenge for this wallet
    const challenge = await Challenge.findOneAndUpdate(
      { publicKey },
      {
        publicKey,
        nonce,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({
      message: `Please authenticate your wallet: ${nonce}`,
      nonce: challenge.nonce,
      publicKey: challenge.publicKey,
    });
  } catch (error) {
    console.error('Challenge generation error:', error);
    return res.status(500).json({ error: 'Failed to generate challenge' });
  }
};

// @desc    Verify wallet signature
// @route   POST /api/auth/sign
// @access  Public
const verifySignature = async (req, res) => {
  const { publicKey, signature, nonce } = req.body;

  if (!publicKey || !signature || !nonce) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Find challenge for this wallet
    const challenge = await Challenge.findOne({ publicKey });

    if (!challenge) {
      return res.status(404).json({ error: 'No challenge found for this wallet' });
    }

    // Check if nonce matches
    if (challenge.nonce !== nonce) {
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }

    // Reconstruct the message that was signed
    const message = `Please authenticate your wallet: ${nonce}`;
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);

    // Verify signature
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Delete used challenge
    await Challenge.deleteOne({ publicKey });

    // TODO: Create user session or issue JWT token here

    return res.json({
      success: true,
      publicKey,
      message: 'Wallet verified successfully',
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
};

module.exports = {
  generateChallenge,
  verifySignature,
};
