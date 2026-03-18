const Contract = require('../models/Contract');
const Job = require('../models/Job');
const { getNextSequence } = require('../utils/counter');
const { verifyTransaction } = require('../utils/solana');

const CLIENT_ONLY_TYPES = ['fund', 'approve', 'release', 'cancel'];

const FREELANCER_ONLY_TYPES = ['submit'];

const ON_CHAIN_TYPES = ['fund', 'submit', 'approve', 'release', 'cancel', 'dispute', 'resolve'];

// @desc    Create a new contract
// @route   POST /api/contracts
// @access  Private
const createContract = async (req, res) => {
  try {
    const { jobId, contractAddress, escrowAccount } = req.body;
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const contract = new Contract({
      jobId,
      clientId: req.user._id,
      freelancerId: job.freelancer,
      amount: job.budget,
      contractAddress,
      escrowAccount,
      status: 'pending',
    });

    await contract.save();
    res.status(201).json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all contracts
// @route   GET /api/contracts
// @access  Private
const getContracts = async (req, res) => {
  try {
    const contracts = await Contract.find({
      $or: [{ clientId: req.user._id }, { freelancerId: req.user._id }],
    })
      .populate('jobId')
      .populate('clientId', 'name email')
      .populate('freelancerId', 'name email');
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get contract by ID
// @route   GET /api/contracts/:id
// @access  Private
const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('jobId')
      .populate('clientId', 'name email')
      .populate('freelancerId', 'name email');

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update contract status
// @route   PUT /api/contracts/:id/status
// @access  Private
const updateContractStatus = async (req, res) => {
  try {
    const { status, transactionSignature, releaseTransaction } = req.body;
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Only allow status updates by the client or freelancer
    if (
      contract.clientId.toString() !== req.user._id.toString() &&
      contract.freelancerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    contract.status = status;
    if (transactionSignature) {
      contract.transactionSignature = transactionSignature;
    }
    if (releaseTransaction) {
      contract.releaseTransaction = releaseTransaction;
    }

    await contract.save();
    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get contracts by job
// @route   GET /api/contracts/job/:jobId
// @access  Private
const getContractsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Only allow client or assigned freelancer to view the contracts
    if (
      job.client.toString() !== req.user._id.toString() &&
      job.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const contracts = await Contract.find({ job: jobId })
      .populate('client', 'username email walletAddress')
      .populate('freelancer', 'username email walletAddress')
      .sort({ createdAt: -1 });

    res.json(contracts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Dispute a contract
// @route   POST /api/contracts/:id/dispute
// @access  Private
const disputeContract = async (req, res) => {
  try {
    const { disputeReason } = req.body;
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Only allow disputes by the client or freelancer
    if (
      contract.clientId.toString() !== req.user._id.toString() &&
      contract.freelancerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    contract.status = 'disputed';
    contract.disputeReason = disputeReason;
    await contract.save();

    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get next on-chain job ID
// @route   GET /api/contracts/next-job-id
// @access  Private
const getNextJobId = async (req, res) => {
  try {
    const nextId = await getNextSequence('onchain_job_id');
    res.json({ onChainJobId: nextId });
  } catch (error) {
    console.error('Get next job ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create on-chain contract after successful blockchain transaction
// @route   POST /api/contracts/create-onchain
// @access  Private
const createOnchainContract = async (req, res) => {
  try {
    const { jobId, milestones, txSignature, onChainJobId } = req.body;

    if (onChainJobId === undefined || onChainJobId === null) {
      return res.status(400).json({ message: 'onChainJobId is required' });
    }

    const job = await Job.findById(jobId)
      .populate('client', 'walletAddress')
      .populate('assignedTo', 'walletAddress');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!job.assignedTo) {
      return res.status(400).json({ message: 'No freelancer assigned' });
    }

    const totalAmount = milestones.reduce(
      (sum, m) => sum + parseFloat(m.amount) * 1_000_000_000,
      0
    );

    const contract = await Contract.create({
      jobId: job._id,
      clientId: job.client._id,
      freelancerId: job.assignedTo._id,
      onChainJobId,
      clientWallet: job.client.walletAddress,
      freelancerWallet: job.assignedTo.walletAddress,
      totalAmount,
      status: 'created',
      milestones: milestones.map((m, i) => ({
        milestoneId: i,
        amount: parseFloat(m.amount) * 1_000_000_000,
        description: m.description,
        status: 'pending',
      })),
      transactions: [{ type: 'create', signature: txSignature }],
    });

    job.onChainJobId = onChainJobId;
    await job.save();

    res.status(201).json({ contract, onChainJobId });
  } catch (error) {
    console.error('Create on-chain contract error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Record a transaction and update contract/milestone status
// @route   POST /api/contracts/:id/transaction
// @access  Private
const recordTransaction = async (req, res) => {
  try {
    const { type, signature, milestoneId } = req.body;
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    const isClient = contract.clientId.toString() === req.user._id.toString();
    const isFreelancer = contract.freelancerId.toString() === req.user._id.toString();

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (CLIENT_ONLY_TYPES.includes(type) && !isClient) {
      return res.status(403).json({ message: 'Only the client can perform this action' });
    }

    if (FREELANCER_ONLY_TYPES.includes(type) && !isFreelancer) {
      return res.status(403).json({ message: 'Only the freelancer can perform this action' });
    }

    if (ON_CHAIN_TYPES.includes(type)) {
      if (!signature) {
        return res.status(400).json({ message: 'Transaction signature is required' });
      }

      const verification = await verifyTransaction(signature);

      if (!verification.valid) {
        console.error('Transaction verification failed:', verification.error);
        return res.status(400).json({
          message: 'Transaction verification failed',
          error: verification.error,
        });
      }

      const existingTx = contract.transactions.find(tx => tx.signature === signature);
      if (existingTx) {
        return res.status(400).json({ message: 'Transaction already recorded' });
      }
    }

    contract.transactions.push({ type, signature, milestoneId });

    const contractStatusMap = {
      fund: 'funded',
      cancel: 'cancelled',
      dispute: 'disputed',
    };
    if (contractStatusMap[type]) {
      contract.status = contractStatusMap[type];
    }

    if (milestoneId !== undefined && contract.milestones[milestoneId]) {
      const milestoneStatusMap = {
        submit: 'submitted',
        approve: 'approved',
        release: 'paid',
      };
      if (milestoneStatusMap[type]) {
        contract.milestones[milestoneId].status = milestoneStatusMap[type];
      }
    }

    if (type === 'release') {
      const allPaid = contract.milestones.every(m => m.status === 'paid');
      if (allPaid) {
        contract.status = 'completed';
      }
    }

    await contract.save();
    res.json(contract);
  } catch (error) {
    console.error('Record transaction error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get contract by job ID
// @route   GET /api/contracts/by-job/:jobId
// @access  Private
const getContractByJob = async (req, res) => {
  try {
    const contract = await Contract.findOne({ jobId: req.params.jobId })
      .populate('clientId', 'username walletAddress')
      .populate('freelancerId', 'username walletAddress');

    if (!contract) {
      return res.status(404).json({ message: 'No contract for this job' });
    }

    // Verify authorization
    if (
      contract.clientId._id.toString() !== req.user._id.toString() &&
      contract.freelancerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(contract);
  } catch (error) {
    console.error('Get contract by job error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createContract,
  getContracts,
  getContractById,
  updateContractStatus,
  getContractsByJob,
  disputeContract,
  getNextJobId,
  createOnchainContract,
  recordTransaction,
  getContractByJob,
};
