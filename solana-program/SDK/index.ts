/**
 * Freelance Marketplace SDK
 *
 * This SDK provides TypeScript/JavaScript bindings for the 
 * Freelance Marketplace Solana program.
 *
 * Usage:
 * ```typescript
 * import { FreelanceClient, PROGRAM_ID } from "./SDK";
 *
 * const client = new FreelanceClient(connection, PROGRAM_ID);
 * await client.createJob(payer, clientPubkey, freelancerPubkey, jobId, amounts, descriptions);
 * ```
 */

// =============== Program ID ===============

import { PublicKey } from "@solana/web3.js";

/**
 * The deployed program ID for the Freelance Marketplace
 */
export const PROGRAM_ID = new PublicKey("Hzmfuj1scfA4UWNsKu82MopCsrvUEBGfeAtB79xYfXzK");

/**
 * @deprecated Use PROGRAM_ID instead
 */
export const ESCROW_PROGRAM_ID = PROGRAM_ID;


// =============== Core Client ===============

export { FreelanceClient } from "./client";

/**
 * @deprecated Use FreelanceClient instead
 */
export { EscrowClient } from "./client";


// =============== Instructions ===============

export {
  // Platform instructions
  ixInitializePlatform,
  ixSetPlatformFee,
  ixWithdrawPlatformFees,

  // Job instructions
  ixCreateJob,
  ixCreateMilestone,
  ixFundEscrow,
  ixCancelJob,

  // Milestone instructions
  ixSubmitMilestone,
  ixApproveMilestone,
  ixReleaseMilestone,

  // Dispute instructions
  ixOpenDispute,
  ixSubmitDisputeEvidence,
  ixResolveDispute,
} from "./instructions";


// =============== PDA Derivation ===============

export {
  // New marketplace PDAs
  derivePlatformConfigPda,
  deriveJobPda,
  deriveMilestonePda,
  deriveDisputePda,
  deriveUserStatsPda,
  deriveVaultPda,

  // Legacy (deprecated)
  deriveEscrowPda,
  deriveEscrowTokenAta,
  deriveInitializerTokenAta,
  deriveFreelancerTokenAta,
} from "./pdas";


// =============== Types & Errors ===============

export {
  // Enums
  JobStatus,
  MilestoneStatus,
  DisputeStatus,

  // Dispute ruling
  DisputeRuling,
  DisputeRulingNone,
  DisputeRulingClientWins,
  DisputeRulingFreelancerWins,
  createDisputeRulingSplit,

  // Account types
  PlatformConfigState,
  JobState,
  MilestoneState,
  DisputeState,
  UserStatsState,

  // Instruction arguments
  InitializePlatformArgs,
  CreateJobArgs,
  CreateMilestoneArgs,
  SubmitMilestoneArgs,
  OpenDisputeArgs,
  SubmitDisputeEvidenceArgs,
  ResolveDisputeArgs,
  SetPlatformFeeArgs,
  WithdrawPlatformFeesArgs,

  // Errors
  FreelanceErrorCode,
  FreelanceClientError,

  // Wallet & transaction types
  WalletSigner,
  TransactionStatus,
  OnTransactionStatus,
  FreelanceTxResult,
  FreelanceClientConfig,

  // Legacy types (deprecated)
  EscrowInstruction,
  EscrowAccountState,
  EscrowErrorCode,
  EscrowClientError,
  EscrowTxResult,
  EscrowClientConfig,
} from "./types";


// =============== Utilities ===============

export {
  // Account decoders
  decodePlatformConfig,
  decodeJob,
  decodeMilestone,
  decodeDispute,

  // Fetch helpers
  fetchPlatformConfig,
  fetchJob,
  fetchMilestone,
  fetchDispute,

  // Utility functions
  lamportsToSol,
  solToLamports,
  calculateFee,
  calculateFreelancerPayment,
  formatJobStatus,
  formatMilestoneStatus,
  formatDisputeStatus,

  // Legacy utilities (deprecated)
  fetchEscrowByPda,
  fetchEscrowByParties,
  lamportsToSolDeprecated,
  solToLamportsDeprecated,
} from "./utils";


// =============== Default Export ===============

import { FreelanceClient } from "./client";

export default {
  FreelanceClient,
  PROGRAM_ID,
};
