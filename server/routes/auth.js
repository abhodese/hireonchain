const { generateChallenge, verifySignature } = require('../controllers/authController');
const express = require('express');
const router = express.Router();

router.post('/challenge', generateChallenge);
router.post('/sign', verifySignature);

module.exports = router;
