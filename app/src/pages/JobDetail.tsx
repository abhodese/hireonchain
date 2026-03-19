import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import api from '../utils/api';
import { WalletButton } from '../components/WalletButton';
import { useAppKitAccount } from '@reown/appkit/react';
import { useFreelanceClient } from '../hooks/useFreelanceClient';
import { useWalletSigner } from '../hooks/useWalletSigner';
import {
  fetchPlatformConfig,
  fetchJob,
  PROGRAM_ID,
  DisputeRuling,
  DisputeRulingClientWins,
  DisputeRulingFreelancerWins,
  DisputeRulingNone,
  createDisputeRulingSplit,
  JobStatus,
  MilestoneStatus,
} from '@sdk/index';

interface Proposal {
  _id: string;
  freelancer: {
    _id: string;
    username: string;
    walletAddress: string;
    rating: number;
  };
  proposal: string;
  price: number;
  status: string;
  createdAt: string;
}

interface Milestone {
  amount: string;
  description: string;
}

interface Contract {
  _id: string;
  onChainJobId: number;
  status: string;
  clientWallet: string;
  freelancerWallet: string;
  milestones: {
    milestoneId: number;
    amount: number;
    description: string;
    status: string;
  }[];
  transactions: {
    type: string;
    signature: string;
    timestamp: string;
  }[];
}

interface Job {
  _id: string;
  title: string;
  description: string;
  price: number;
  skills: string[];
  status: string;
  createdAt: string;
  deadline: string | null;
  client: {
    _id: string;
    username: string;
    walletAddress: string;
  };
  assignedTo?: {
    _id: string;
    username: string;
    walletAddress: string;
  };
  proposals: Proposal[];
  onChainJobId?: number;
}

const proposalSchema = z.object({
  proposalText: z.string().min(1, 'Please enter a proposal description'),
  proposalPrice: z
    .string()
    .min(1, 'Price is required')
    .refine(val => parseFloat(val) > 0, 'Price must be greater than 0'),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAppKitAccount();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');

  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      proposalText: '',
      proposalPrice: '',
    },
  });

  // On-chain contract creation state
  const sdkClient = useFreelanceClient();
  const walletSigner = useWalletSigner();
  const [creatingContract, setCreatingContract] = useState(false);
  const [contractError, setContractError] = useState('');
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([{ amount: '', description: '' }]);

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await api.get(`/api/jobs/${id}`);
        setJob(response.data);

        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          setUserRole(userInfo.role);
          setUserId(userInfo._id);
        }
      } catch (error) {
        console.error('Error fetching job:', error);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchJob();
    }
  }, [id]);

  useEffect(() => {
    const fetchContract = async () => {
      if (!job?._id) return;
      try {
        const response = await api.get(`/api/contracts/by-job/${job._id}`);
        setContract(response.data);
      } catch (error: any) {
        // 404 means no contract exists yet - that's fine
        if (error.response?.status !== 404) {
          console.error('Error fetching contract:', error);
        }
      }
    };

    fetchContract();
  }, [job?._id]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!isConnected || !address || !walletSigner) {
        setWalletBalance(null);
        return;
      }

      setLoadingBalance(true);
      try {
        const balance = await sdkClient.connection.getBalance(walletSigner.publicKey);
        setWalletBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setWalletBalance(null);
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [isConnected, address, walletSigner, sdkClient.connection]);

  useEffect(() => {
    const fetchOnChainStatus = async () => {
      if (!contract || !contract.onChainJobId) return;

      setLoadingOnChainStatus(true);
      try {
        const clientPubkey = new PublicKey(contract.clientWallet);
        const jobState = await fetchJob(
          sdkClient.connection,
          PROGRAM_ID,
          clientPubkey,
          BigInt(contract.onChainJobId)
        );
        if (jobState) {
          setOnChainJobState(jobState.status);
        }
      } catch (error) {
        console.error('Error fetching on-chain job status:', error);
      } finally {
        setLoadingOnChainStatus(false);
      }
    };

    fetchOnChainStatus();
  }, [contract, sdkClient.connection]);

  const onProposalSubmit = async (data: ProposalFormData) => {
    if (!isConnected || !address) {
      setFormError('root', {
        type: 'manual',
        message: 'Please connect your wallet first',
      });
      return;
    }

    setSubmittingProposal(true);

    try {
      await api.post(`/api/jobs/${id}/proposals`, {
        proposal: data.proposalText,
        price: parseFloat(data.proposalPrice),
      });

      setProposalSuccess(true);
      const updatedJob = await api.get(`/api/jobs/${id}`);
      setJob(updatedJob.data);
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      if (error.response && error.response.data) {
        setFormError('root', {
          type: 'manual',
          message: error.response.data.message || 'Failed to submit proposal',
        });
      } else {
        setFormError('root', {
          type: 'manual',
          message: 'Failed to submit proposal',
        });
      }
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    try {
      await api.put(`/api/jobs/${id}/proposals/${proposalId}/accept`);

      const updatedJob = await api.get(`/api/jobs/${id}`);
      setJob(updatedJob.data);
    } catch (error) {
      console.error('Error accepting proposal:', error);
      alert('Failed to accept proposal');
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, { amount: '', description: '' }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: 'amount' | 'description', value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const validateMilestones = (): boolean => {
    for (const m of milestones) {
      if (!m.amount || !m.description) {
        setContractError('All milestones must have amount and description');
        return false;
      }
      if (parseFloat(m.amount) <= 0) {
        setContractError('Milestone amounts must be greater than 0');
        return false;
      }
    }
    return true;
  };

  // On-chain contract creation handler
  const handleCreateOnchainContract = async () => {
    if (!job || !job.assignedTo || !walletSigner) {
      setContractError('Missing job, freelancer assignment, or wallet connection');
      return;
    }

    if (!validateMilestones()) {
      return;
    }

    setCreatingContract(true);
    setContractError('');

    try {
      const {
        data: { onChainJobId },
      } = await api.get('/api/contracts/next-job-id');

      const amounts = milestones.map(m => BigInt(Math.round(parseFloat(m.amount) * 1_000_000_000)));
      const descriptions = milestones.map(m => m.description);

      const result = await sdkClient.createJob(
        walletSigner,
        new PublicKey(job.client.walletAddress),
        new PublicKey(job.assignedTo.walletAddress),
        BigInt(onChainJobId),
        amounts,
        descriptions
      );

      await api.post('/api/contracts/create-onchain', {
        jobId: job._id,
        onChainJobId,
        milestones: milestones.map(m => ({
          amount: parseFloat(m.amount),
          description: m.description,
        })),
        txSignature: result.txId,
      });

      const [updatedJob, contractRes] = await Promise.all([
        api.get(`/api/jobs/${id}`),
        api.get(`/api/contracts/by-job/${job._id}`),
      ]);
      setJob(updatedJob.data);
      setContract(contractRes.data);
    } catch (error: any) {
      console.error('Create on-chain contract error:', error);
      setContractError(error.message || 'Failed to create on-chain contract');
    } finally {
      setCreatingContract(false);
    }
  };

  const parseOnChainError = (error: any): string => {
    const errorMsg = error?.message || '';

    if (errorMsg.includes('JobAlreadyFunded') || errorMsg.includes('already funded')) {
      return 'This escrow has already been funded.';
    }
    if (errorMsg.includes('insufficient funds') || errorMsg.includes('InsufficientFunds')) {
      return 'Insufficient SOL balance to fund this escrow. Please add more SOL to your wallet.';
    }
    if (errorMsg.includes('InvalidJob') || errorMsg.includes('AccountNotInitialized')) {
      return 'The on-chain job account was not found. Please recreate the contract.';
    }
    if (errorMsg.includes('NotAuthorized') || errorMsg.includes('owner')) {
      return 'You are not authorized to fund this escrow. Only the client can fund.';
    }
    if (errorMsg.includes('User rejected') || errorMsg.includes('UserRejected')) {
      return 'Transaction was rejected in wallet.';
    }
    if (errorMsg.includes('blockhash')) {
      return 'Transaction expired. Please try again.';
    }
    if (errorMsg.includes('Simulation failed')) {
      return 'Transaction simulation failed. The escrow may already be funded or there was a program error.';
    }
    if (errorMsg.includes('MilestoneNotSubmitted') || errorMsg.includes('not submitted')) {
      return 'This milestone has not been submitted yet.';
    }
    if (errorMsg.includes('MilestoneAlreadySubmitted') || errorMsg.includes('already submitted')) {
      return 'This milestone has already been submitted.';
    }
    if (errorMsg.includes('MilestoneAlreadyApproved') || errorMsg.includes('already approved')) {
      return 'This milestone has already been approved.';
    }
    if (errorMsg.includes('MilestoneNotApproved') || errorMsg.includes('not approved')) {
      return 'This milestone must be approved before payment can be released.';
    }
    if (errorMsg.includes('JobNotFunded') || errorMsg.includes('not funded')) {
      return 'The escrow must be funded before milestone operations.';
    }
    if (errorMsg.includes('DisputeActive') || errorMsg.includes('dispute active')) {
      return 'Cannot perform this action while a dispute is active.';
    }
    if (errorMsg.includes('Platform not initialized')) {
      return 'Platform not initialized. Contact admin.';
    }

    return errorMsg || 'Transaction failed. Please try again.';
  };

  const handleFundEscrow = async () => {
    if (!contract || !walletSigner) {
      setContractError('Missing contract or wallet connection');
      return;
    }

    setCreatingContract(true);
    setContractError('');

    try {
      const clientPubkey = new PublicKey(contract.clientWallet);
      const result = await sdkClient.fundEscrow(
        walletSigner,
        clientPubkey,
        clientPubkey,
        BigInt(contract.onChainJobId)
      );

      await api.post(`/api/contracts/${contract._id}/transaction`, {
        type: 'fund',
        signature: result.txId,
      });

      const [contractRes] = await Promise.all([
        api.get(`/api/contracts/by-job/${job?._id}`),
        sdkClient.connection.getBalance(walletSigner.publicKey).then(b => {
          setWalletBalance(b / LAMPORTS_PER_SOL);
        }),
      ]);
      setContract(contractRes.data);
    } catch (error: any) {
      console.error('Fund escrow failed:', error);
      setContractError(parseOnChainError(error));
    } finally {
      setCreatingContract(false);
    }
  };

  const [milestoneOperationLoading, setMilestoneOperationLoading] = useState<number | null>(null);
  const [submissionHash, setSubmissionHash] = useState<{ [key: number]: string }>({});
  const [disputeMilestoneId, setDisputeMilestoneId] = useState<number | null>(null);
  const [evidenceHash, setEvidenceHash] = useState<string>('');
  const [resolveRuling, setResolveRuling] = useState<string>('none');

  const [onChainJobState, setOnChainJobState] = useState<JobStatus | null>(null);
  const [loadingOnChainStatus, setLoadingOnChainStatus] = useState(false);

  const handleSubmitMilestone = async (milestoneId: number) => {
    if (!contract || !walletSigner) {
      setContractError('Missing contract or wallet connection');
      return;
    }

    const hash = submissionHash[milestoneId];
    if (!hash || hash.trim() === '') {
      setContractError('Please enter a submission hash (e.g., IPFS CID or work link)');
      return;
    }

    setMilestoneOperationLoading(milestoneId);
    setContractError('');

    try {
      const freelancerPubkey = walletSigner.publicKey;
      const clientPubkey = new PublicKey(contract.clientWallet);

      const result = await sdkClient.submitMilestone(
        walletSigner,
        freelancerPubkey,
        clientPubkey,
        BigInt(contract.onChainJobId),
        milestoneId,
        hash
      );

      await api.post(`/api/contracts/${contract._id}/transaction`, {
        type: 'submit',
        signature: result.txId,
        milestoneId,
      });

      const contractRes = await api.get(`/api/contracts/by-job/${job?._id}`);
      setContract(contractRes.data);

      setSubmissionHash(prev => {
        const updated = { ...prev };
        delete updated[milestoneId];
        return updated;
      });
    } catch (error: any) {
      console.error('Submit milestone failed:', error);
      setContractError(parseOnChainError(error));
    } finally {
      setMilestoneOperationLoading(null);
    }
  };

  const handleApproveMilestone = async (milestoneId: number) => {
    if (!contract || !walletSigner) {
      setContractError('Missing contract or wallet connection');
      return;
    }

    setMilestoneOperationLoading(milestoneId);
    setContractError('');

    try {
      const clientPubkey = new PublicKey(contract.clientWallet);

      const result = await sdkClient.approveMilestone(
        walletSigner,
        clientPubkey,
        clientPubkey,
        BigInt(contract.onChainJobId),
        milestoneId
      );

      await api.post(`/api/contracts/${contract._id}/transaction`, {
        type: 'approve',
        signature: result.txId,
        milestoneId,
      });

      // Refresh contract data
      const contractRes = await api.get(`/api/contracts/by-job/${job?._id}`);
      setContract(contractRes.data);
    } catch (error: any) {
      console.error('Approve milestone failed:', error);
      setContractError(parseOnChainError(error));
    } finally {
      setMilestoneOperationLoading(null);
    }
  };

  const handleReleaseMilestone = async (milestoneId: number) => {
    if (!contract || !walletSigner) {
      setContractError('Missing contract or wallet connection');
      return;
    }

    setMilestoneOperationLoading(milestoneId);
    setContractError('');

    try {
      const platformConfig = await fetchPlatformConfig(sdkClient.connection, PROGRAM_ID);
      if (!platformConfig) {
        throw new Error('Platform not initialized. Contact admin.');
      }

      const clientPubkey = new PublicKey(contract.clientWallet);
      const freelancerPubkey = new PublicKey(contract.freelancerWallet);

      const result = await sdkClient.releaseMilestone(
        walletSigner,
        clientPubkey,
        clientPubkey,
        BigInt(contract.onChainJobId),
        milestoneId,
        freelancerPubkey,
        platformConfig.treasury
      );

      await api.post(`/api/contracts/${contract._id}/transaction`, {
        type: 'release',
        signature: result.txId,
        milestoneId,
      });

      const [contractRes] = await Promise.all([
        api.get(`/api/contracts/by-job/${job?._id}`),
        sdkClient.connection.getBalance(walletSigner.publicKey).then(b => {
          setWalletBalance(b / LAMPORTS_PER_SOL);
        }),
      ]);
      setContract(contractRes.data);
    } catch (error: any) {
      console.error('Release milestone failed:', error);
      setContractError(parseOnChainError(error));
    } finally {
      setMilestoneOperationLoading(null);
    }
  };

  const handleCancelJob = async () => {
    if (!contract || !walletSigner) {
      setContractError('Missing contract or wallet connection');
      return;
    }

    if (
      !window.confirm(
        'Are you sure you want to cancel this job? This will refund any remaining escrow and cannot be undone.'
      )
    ) {
      return;
    }

    setMilestoneOperationLoading(-1);
    setContractError('');

    try {
      const clientPubkey = new PublicKey(contract.clientWallet);

      const result = await sdkClient.cancelJob(
        walletSigner,
        clientPubkey,
        clientPubkey,
        BigInt(contract.onChainJobId)
      );

      await api.post(`/api/contracts/${contract._id}/transaction`, {
        type: 'cancel',
        signature: result.txId,
      });

      if (job) {
        await api.put(`/api/jobs/${job._id}`, { status: 'cancelled' });
      }

      const [updatedJob, contractRes] = await Promise.all([
        api.get(`/api/jobs/${id}`),
        api.get(`/api/contracts/by-job/${job?._id}`),
        sdkClient.connection.getBalance(walletSigner.publicKey).then(b => {
          setWalletBalance(b / LAMPORTS_PER_SOL);
        }),
      ]);

      setJob(updatedJob.data);
      setContract(contractRes.data);
    } catch (error: any) {
      console.error('Cancel job failed:', error);
      setContractError(parseOnChainError(error));
    } finally {
      setMilestoneOperationLoading(null);
    }
  };

  const handleOpenDispute = async (milestoneId: number) => {
    if (!contract || !walletSigner) {
      setContractError('Missing contract or wallet connection');
      return;
    }

    if (
      !window.confirm(
        'Are you sure you want to open a dispute for this milestone? This will pause all milestone operations until resolved.'
      )
    ) {
      return;
    }

    setMilestoneOperationLoading(milestoneId);
    setContractError('');

    try {
      const result = await sdkClient.openDispute(
        walletSigner,
        walletSigner.publicKey,
        new PublicKey(contract.clientWallet),
        BigInt(contract.onChainJobId),
        milestoneId
      );

      await api.post(`/api/contracts/${contract._id}/transaction`, {
        type: 'dispute',
        signature: result.txId,
        milestoneId,
      });

      const contractRes = await api.get(`/api/contracts/by-job/${job?._id}`);
      setContract(contractRes.data);
    } catch (error: any) {
      console.error('Open dispute failed:', error);
      setContractError(parseOnChainError(error));
    } finally {
      setMilestoneOperationLoading(null);
    }
  };

  // 8.2 Submit Dispute Evidence
  const handleSubmitEvidence = async () => {
    if (!contract || !walletSigner) {
      setContractError('Missing contract or wallet connection');
      return;
    }

    if (!evidenceHash || evidenceHash.trim() === '') {
      setContractError('Please enter an evidence hash (e.g., IPFS CID or document link)');
      return;
    }

    setMilestoneOperationLoading(-2);
    setContractError('');

    try {
      const result = await sdkClient.submitDisputeEvidence(
        walletSigner,
        walletSigner.publicKey,
        new PublicKey(contract.clientWallet),
        BigInt(contract.onChainJobId),
        evidenceHash
      );

      await api.post(`/api/contracts/${contract._id}/transaction`, {
        type: 'evidence',
        signature: result.txId,
        evidence: evidenceHash,
      });

      const contractRes = await api.get(`/api/contracts/by-job/${job?._id}`);
      setContract(contractRes.data);
      setEvidenceHash('');
    } catch (error: any) {
      console.error('Submit evidence failed:', error);
      setContractError(parseOnChainError(error));
    } finally {
      setMilestoneOperationLoading(null);
    }
  };

  const handleResolveDispute = async (milestoneId: number) => {
    if (!contract || !walletSigner) {
      setContractError('Missing contract or wallet connection');
      return;
    }

    if (resolveRuling === 'none') {
      setContractError('Please select a ruling');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to resolve this dispute with ruling: ${resolveRuling}? This cannot be undone.`
      )
    ) {
      return;
    }

    setMilestoneOperationLoading(-3);
    setContractError('');

    try {
      // Map ruling string to DisputeRuling type
      let ruling: DisputeRuling;
      switch (resolveRuling) {
        case 'client_wins':
          ruling = DisputeRulingClientWins;
          break;
        case 'freelancer_wins':
          ruling = DisputeRulingFreelancerWins;
          break;
        case 'split':
          ruling = createDisputeRulingSplit(5000, 5000);
          break;
        default:
          ruling = DisputeRulingNone;
      }

      const result = await sdkClient.resolveDispute(
        walletSigner,
        walletSigner.publicKey,
        new PublicKey(contract.clientWallet),
        BigInt(contract.onChainJobId),
        milestoneId,
        ruling,
        new PublicKey(contract.clientWallet),
        new PublicKey(contract.freelancerWallet)
      );

      await api.post(`/api/contracts/${contract._id}/transaction`, {
        type: 'resolve',
        signature: result.txId,
        milestoneId,
        ruling: resolveRuling,
      });

      const [contractRes, updatedJob] = await Promise.all([
        api.get(`/api/contracts/by-job/${job?._id}`),
        api.get(`/api/jobs/${id}`),
      ]);
      setContract(contractRes.data);
      setJob(updatedJob.data);
      setResolveRuling('none');
    } catch (error: any) {
      console.error('Resolve dispute failed:', error);
      setContractError(parseOnChainError(error));
    } finally {
      setMilestoneOperationLoading(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading job details...</div>;
  }

  if (error || !job) {
    return <div className="error-message">{error || 'Job not found'}</div>;
  }

  const isOwner = userId === job.client._id;
  const isAssigned = job.assignedTo && userId === job.assignedTo._id;
  const hasProposed = job.proposals.some(p => p.freelancer._id === userId);

  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);

  return (
    <div className="job-detail-page">
      <div className="job-header">
        <h1>{job.title}</h1>
        <div className="job-status">
          <span className={`status-badge ${job.status}`}>{job.status}</span>
        </div>
      </div>

      <div className="job-container">
        <div className="job-main">
          <div className="job-info">
            <div className="price-section">
              <h2>Budget</h2>
              <p className="job-price">{job.price} SOL</p>
            </div>

            <div className="description-section">
              <h2>Description</h2>
              <p>{job.description}</p>
            </div>

            <div className="skills-section">
              <h2>Skills Required</h2>
              <div className="skills-list">
                {job.skills.map((skill, index) => (
                  <span key={index} className="skill-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {job.deadline && (
              <div className="deadline-section">
                <h2>Deadline</h2>
                <p>{new Date(job.deadline).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {!isConnected && (
            <div className="wallet-connection">
              <p>Connect your wallet to interact with this job</p>
              <WalletButton />
            </div>
          )}

          {/* On-chain contract creation section for assigned jobs */}
          {isConnected && job.status === 'in_progress' && !contract && isOwner && (
            <div className="contract-section">
              <h2>Create On-Chain Contract</h2>
              <p>Define milestones for this job. Each milestone will be paid out when completed.</p>

              <div className="milestones-form">
                <h3>Milestones</h3>
                {milestones.map((milestone, index) => (
                  <div key={index} className="milestone-row">
                    <div className="milestone-number">{index + 1}</div>
                    <div className="milestone-inputs">
                      <input
                        type="number"
                        placeholder="Amount (SOL)"
                        value={milestone.amount}
                        onChange={e => updateMilestone(index, 'amount', e.target.value)}
                        step="0.01"
                        min="0"
                      />
                      <input
                        type="text"
                        placeholder="Description (e.g., Initial design mockups)"
                        value={milestone.description}
                        onChange={e => updateMilestone(index, 'description', e.target.value)}
                      />
                    </div>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(index)}
                        className="remove-milestone-btn"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addMilestone} className="add-milestone-btn">
                  + Add Milestone
                </button>

                <div className="milestone-total">
                  <strong>Total: {totalMilestoneAmount.toFixed(4)} SOL</strong>
                  {totalMilestoneAmount > job.price && (
                    <span className="warning"> (exceeds budget of {job.price} SOL)</span>
                  )}
                </div>
              </div>

              {contractError && <div className="error-message">{contractError}</div>}

              <button
                onClick={handleCreateOnchainContract}
                disabled={creatingContract || totalMilestoneAmount > job.price}
                className="create-contract-btn"
              >
                {creatingContract ? 'Creating Contract...' : 'Create On-Chain Contract'}
              </button>
            </div>
          )}

          {/* Existing contract display */}
          {contract && (
            <div className="contract-info">
              <h2>Contract Information</h2>
              <div className="contract-status">
                <span className={`status-badge ${contract.status}`}>{contract.status}</span>
                <span className="onchain-id">On-Chain Job ID: {contract.onChainJobId}</span>
              </div>

              <h3>Milestones</h3>
              {contractError && <div className="error-message">{contractError}</div>}
              <div className="milestones-list">
                {contract.milestones.map((m, i) => (
                  <div key={i} className={`milestone-item ${m.status}`}>
                    <div className="milestone-header">
                      <span className="milestone-num">Milestone {i + 1}</span>
                      <span className="milestone-amount">
                        {(m.amount / 1_000_000_000).toFixed(4)} SOL
                      </span>
                      <span className={`milestone-status ${m.status}`}>{m.status}</span>
                    </div>
                    <p className="milestone-desc">{m.description}</p>

                    {/* Milestone Action Buttons - Only show when contract is funded */}
                    {contract.status === 'funded' && walletSigner && (
                      <div className="milestone-actions">
                        {/* Freelancer: Submit work for pending milestones */}
                        {isAssigned && m.status === 'pending' && (
                          <div className="submit-milestone-form">
                            <input
                              type="text"
                              placeholder="Submission hash (IPFS CID or link)"
                              value={submissionHash[i] || ''}
                              onChange={e =>
                                setSubmissionHash(prev => ({ ...prev, [i]: e.target.value }))
                              }
                              className="submission-input"
                            />
                            <button
                              onClick={() => handleSubmitMilestone(i)}
                              disabled={milestoneOperationLoading === i}
                              className="milestone-action-btn submit-btn"
                            >
                              {milestoneOperationLoading === i ? 'Submitting...' : 'Submit Work'}
                            </button>
                          </div>
                        )}

                        {/* Client: Approve submitted milestones */}
                        {isOwner && m.status === 'submitted' && (
                          <div className="milestone-btn-group">
                            <button
                              onClick={() => handleApproveMilestone(i)}
                              disabled={milestoneOperationLoading === i}
                              className="milestone-action-btn approve-btn"
                            >
                              {milestoneOperationLoading === i ? 'Approving...' : 'Approve'}
                            </button>
                          </div>
                        )}

                        {/* Client: Release payment for approved milestones */}
                        {isOwner && m.status === 'approved' && (
                          <div className="milestone-btn-group">
                            <button
                              onClick={() => handleReleaseMilestone(i)}
                              disabled={milestoneOperationLoading === i}
                              className="milestone-action-btn release-btn"
                            >
                              {milestoneOperationLoading === i ? 'Releasing...' : 'Release Payment'}
                            </button>
                          </div>
                        )}

                        {/* Status messages for paid milestones */}
                        {m.status === 'paid' && (
                          <div className="milestone-paid-notice">
                            <span className="paid-icon">✓</span> Payment released
                          </div>
                        )}

                        {/* Dispute button - available for both client and freelancer on submitted/approved milestones */}
                        {(m.status === 'submitted' || m.status === 'approved') &&
                          (isOwner || isAssigned) && (
                            <button
                              onClick={() => handleOpenDispute(i)}
                              disabled={milestoneOperationLoading === i}
                              className="milestone-action-btn dispute-btn"
                            >
                              {milestoneOperationLoading === i ? 'Opening...' : 'Open Dispute'}
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Dispute Section - Show when contract is disputed */}
              {contract.status === 'disputed' && walletSigner && (
                <div className="dispute-section">
                  <h3>⚠️ Dispute Active</h3>
                  <p className="dispute-notice">
                    A dispute has been opened. All milestone operations are paused until the dispute
                    is resolved.
                  </p>

                  {/* Evidence Submission - Available to both parties */}
                  <div className="evidence-form">
                    <h4>Submit Evidence</h4>
                    <p>
                      <small>
                        Provide a link to your evidence (e.g., IPFS CID, Google Drive link, etc.)
                      </small>
                    </p>
                    <div className="evidence-input-group">
                      <input
                        type="text"
                        placeholder="Evidence hash or link"
                        value={evidenceHash}
                        onChange={e => setEvidenceHash(e.target.value)}
                        className="evidence-input"
                      />
                      <button
                        onClick={handleSubmitEvidence}
                        disabled={milestoneOperationLoading === -2 || !evidenceHash.trim()}
                        className="evidence-submit-btn"
                      >
                        {milestoneOperationLoading === -2 ? 'Submitting...' : 'Submit Evidence'}
                      </button>
                    </div>
                  </div>

                  {/* Resolve Dispute - Arbitrator Only */}
                  {userRole === 'admin' && (
                    <div className="resolve-dispute-form">
                      <h4>Resolve Dispute (Arbitrator Only)</h4>
                      <div className="ruling-select">
                        <label htmlFor="ruling">Select Ruling:</label>
                        <select
                          id="ruling"
                          value={resolveRuling}
                          onChange={e => setResolveRuling(e.target.value)}
                        >
                          <option value="none">-- Select Ruling --</option>
                          <option value="client_wins">Client Wins (Full Refund)</option>
                          <option value="freelancer_wins">Freelancer Wins (Full Payment)</option>
                          <option value="split">Split (50/50)</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          const disputedMilestone = contract.milestones.find(
                            m => m.status === 'disputed'
                          );
                          if (disputedMilestone) {
                            handleResolveDispute(disputedMilestone.milestoneId);
                          }
                        }}
                        disabled={milestoneOperationLoading === -3 || resolveRuling === 'none'}
                        className="resolve-btn"
                      >
                        {milestoneOperationLoading === -3 ? 'Resolving...' : 'Resolve Dispute'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Cancel Job button for client - only when funded and no approved milestones */}
              {contract.status === 'funded' && isOwner && walletSigner && (
                <div className="cancel-job-section">
                  <button
                    onClick={handleCancelJob}
                    disabled={milestoneOperationLoading === -1}
                    className="cancel-job-btn"
                  >
                    {milestoneOperationLoading === -1 ? 'Cancelling...' : 'Cancel Job & Refund'}
                  </button>
                  <p className="cancel-note">
                    <small>
                      Cancelling will refund any remaining escrow balance to your wallet. This
                      cannot be undone.
                    </small>
                  </p>
                </div>
              )}

              {/* Fund escrow button for client */}
              {contract.status === 'created' && isOwner && (
                <div className="fund-escrow-section">
                  <h3>Fund Escrow</h3>
                  <p>Fund the escrow to enable milestone payments.</p>

                  {/* Show total amount required */}
                  <div className="funding-amount-info">
                    <p>
                      <strong>Total Required:</strong>{' '}
                      {(
                        contract.milestones.reduce((sum, m) => sum + m.amount, 0) / LAMPORTS_PER_SOL
                      ).toFixed(4)}{' '}
                      SOL
                    </p>

                    {/* Show wallet balance */}
                    {loadingBalance ? (
                      <p className="balance-loading">Loading balance...</p>
                    ) : walletBalance !== null ? (
                      <p>
                        <strong>Your Balance:</strong> {walletBalance.toFixed(4)} SOL
                        {walletBalance <
                          contract.milestones.reduce((sum, m) => sum + m.amount, 0) /
                            LAMPORTS_PER_SOL && (
                          <span className="balance-warning"> (Insufficient funds)</span>
                        )}
                      </p>
                    ) : (
                      <p className="balance-error">Unable to load balance</p>
                    )}
                  </div>

                  {/* Wallet not connected */}
                  {!walletSigner && (
                    <div className="warning-message">
                      <p>Please connect your wallet to fund the escrow.</p>
                      <WalletButton />
                    </div>
                  )}

                  {/* Error display */}
                  {contractError && <div className="error-message">{contractError}</div>}

                  {/* Fund button */}
                  {walletSigner && (
                    <button
                      onClick={handleFundEscrow}
                      disabled={
                        creatingContract ||
                        loadingBalance ||
                        (walletBalance !== null &&
                          walletBalance <
                            contract.milestones.reduce((sum, m) => sum + m.amount, 0) /
                              LAMPORTS_PER_SOL)
                      }
                      className="fund-escrow-btn"
                    >
                      {creatingContract ? 'Funding...' : 'Fund Escrow'}
                    </button>
                  )}

                  <p className="funding-note">
                    <small>
                      Note: Funding will transfer the total amount to a secure escrow account on
                      Solana. Funds will be released to the freelancer as milestones are completed.
                    </small>
                  </p>
                </div>
              )}

              {/* Transaction history */}
              {contract.transactions.length > 0 && (
                <div className="transaction-history">
                  <h3>Transaction History</h3>
                  <ul>
                    {contract.transactions.map((tx, i) => (
                      <li key={i}>
                        <span className="tx-type">{tx.type}</span>
                        <a
                          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tx-link"
                        >
                          {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Submit proposal form for freelancers */}
          {isConnected && userRole === 'freelancer' && job.status === 'open' && !hasProposed && (
            <div className="proposal-section">
              <h2>Submit a Proposal</h2>

              {proposalSuccess ? (
                <div className="success-message">
                  Your proposal has been submitted successfully!
                </div>
              ) : (
                <form onSubmit={handleSubmit(onProposalSubmit)} className="proposal-form">
                  <div className="form-group">
                    <label htmlFor="proposalText">Your Proposal</label>
                    <textarea
                      id="proposalText"
                      placeholder="Describe how you can help with this project..."
                      rows={6}
                      {...register('proposalText')}
                    />
                    {errors.proposalText && (
                      <div className="error">{errors.proposalText.message}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="proposalPrice">Your Price (SOL)</label>
                    <input
                      type="number"
                      id="proposalPrice"
                      step="0.01"
                      min="0"
                      {...register('proposalPrice')}
                    />
                    {errors.proposalPrice && (
                      <div className="error">{errors.proposalPrice.message}</div>
                    )}
                  </div>

                  {errors.root && <div className="error-message">{errors.root.message}</div>}

                  <button
                    type="submit"
                    disabled={submittingProposal}
                    className="submit-proposal-btn"
                  >
                    {submittingProposal ? 'Submitting...' : 'Submit Proposal'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="job-sidebar">
          <div className="client-info">
            <h2>About the Client</h2>
            <p className="client-name">{job.client.username}</p>
            <p className="client-wallet">
              <strong>Wallet:</strong> {job.client.walletAddress.slice(0, 6)}...
              {job.client.walletAddress.slice(-6)}
            </p>
          </div>

          {/* Proposals section for job owner */}
          {isOwner && job.proposals.length > 0 && (
            <div className="proposals-section">
              <h2>Proposals ({job.proposals.length})</h2>
              <div className="proposals-list">
                {job.proposals.map(proposal => (
                  <div key={proposal._id} className="proposal-card">
                    <div className="proposal-header">
                      <span className="freelancer-name">{proposal.freelancer.username}</span>
                      <span className="proposal-price">{proposal.price} SOL</span>
                    </div>
                    <p className="proposal-text">{proposal.proposal}</p>
                    <div className="proposal-actions">
                      {job.status === 'open' && proposal.status === 'pending' && (
                        <button
                          onClick={() => handleAcceptProposal(proposal._id)}
                          className="accept-proposal-btn"
                        >
                          Accept Proposal
                        </button>
                      )}
                      {proposal.status !== 'pending' && (
                        <span className={`proposal-status ${proposal.status}`}>
                          {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned freelancer info */}
          {job.assignedTo && (
            <div className="assigned-freelancer">
              <h2>Assigned Freelancer</h2>
              <p className="freelancer-name">{job.assignedTo.username}</p>
              <p className="freelancer-wallet">
                <strong>Wallet:</strong> {job.assignedTo.walletAddress.slice(0, 6)}...
                {job.assignedTo.walletAddress.slice(-6)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
