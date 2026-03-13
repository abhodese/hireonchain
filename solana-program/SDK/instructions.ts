import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as borsh from "@coral-xyz/borsh";

import {
  InitializePlatformArgs,
  CreateJobArgs,
  CreateMilestoneArgs,
  SubmitMilestoneArgs,
  OpenDisputeArgs,
  SubmitDisputeEvidenceArgs,
  ResolveDisputeArgs,
  SetPlatformFeeArgs,
  WithdrawPlatformFeesArgs,
  DisputeRuling,
} from "./types";

import {
  derivePlatformConfigPda,
  deriveJobPda,
  deriveMilestonePda,
  deriveDisputePda,
  deriveVaultPda,
} from "./pdas";

// Program ID - should match the deployed program
export const PROGRAM_ID = new PublicKey("BLs4UVLaq12mE1yGcuyud5LHWWQqyjJmCFQH2fmbXB9s");

// =============== Borsh Schemas for Instruction Data ===============

// InitializePlatform: fee_bps (u16)
const InitializePlatformSchema = borsh.struct([
  borsh.u16("feeBps"),
]);

// CreateJob: job_id (u64), milestone_amounts (Vec<u64>), milestone_descriptions (Vec<String>)
const CreateJobSchema = borsh.struct([
  borsh.u64("jobId"),
  borsh.vec(borsh.u64(), "milestoneAmounts"),
  borsh.vec(borsh.str(), "milestoneDescriptions"),
]);

// CreateMilestone: milestone_id (u8), amount (u64), description_hash (String)
const CreateMilestoneSchema = borsh.struct([
  borsh.u8("milestoneId"),
  borsh.u64("amount"),
  borsh.str("descriptionHash"),
]);

// SubmitMilestone: submission_hash (String)
const SubmitMilestoneSchema = borsh.struct([
  borsh.str("submissionHash"),
]);

// OpenDispute: milestone_id (u8)
const OpenDisputeSchema = borsh.struct([
  borsh.u8("milestoneId"),
]);

// SubmitDisputeEvidence: evidence_hash (String)
const SubmitDisputeEvidenceSchema = borsh.struct([
  borsh.str("evidenceHash"),
]);

// ResolveDispute: ruling (enum)
const ResolveDisputeSchema = borsh.struct([
  borsh.str("ruling"), // "None", "ClientWins", "FreelancerWins", "Split:clientBps,freelancerBps"
]);

// SetPlatformFee: new_fee_bps (u16)
const SetPlatformFeeSchema = borsh.struct([
  borsh.u16("newFeeBps"),
]);

// WithdrawPlatformFees: amount (u64)
const WithdrawPlatformFeesSchema = borsh.struct([
  borsh.u64("amount"),
]);

// =============== Helper Functions ===============

function encode<T>(schema: borsh.StructType<T>, data: T): Buffer {
  const buffer = Buffer.alloc(1000);
  const len = schema.encode(data, buffer);
  return buffer.slice(0, len);
}

function encodeDiscriminator(discriminator: string): Buffer {
  // For Anchor, we prepend the discriminator as a prefix
  // The discriminator is the first 8 bytes of SHA256("global:<instruction_name>")
  // But for simplicity, we'll use a different approach: prepend instruction index
  // In Anchor 0.30+, the discriminator is calculated automatically
  // For manual encoding, we'll use a simple prefix approach
  return Buffer.from([0]); // Placeholder - Anchor handles this automatically
}

// =============== Instruction Builders ===============

/**
 * Initialize Platform
 * 
 * Accounts:
 * - admin (signer, mutable)
 * - platform_config (PDA, mutable)
 * - treasury (unchecked)
 * - arbitrator (unchecked)
 * - system_program
 */
export function ixInitializePlatform(
  admin: PublicKey,
  treasury: PublicKey,
  arbitrator: PublicKey,
  feeBps: number,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: platformConfigPda } = derivePlatformConfigPda(programId);

  const data = encode(InitializePlatformSchema, { feeBps });

  const keys = [
    { pubkey: admin, isSigner: true, isWritable: true },
    { pubkey: platformConfigPda, isSigner: false, isWritable: true },
    { pubkey: treasury, isSigner: false, isWritable: false },
    { pubkey: arbitrator, isSigner: false, isWritable: false },
    { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // system_program
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Create Job
 * 
 * Accounts:
 * - client (signer, mutable)
 * - freelancer (unchecked)
 * - job (PDA, mutable)
 * - vault (PDA)
 * - token_mint (unchecked)
 * - system_program
 */
export function ixCreateJob(
  client: PublicKey,
  freelancer: PublicKey,
  jobId: bigint,
  milestoneAmounts: bigint[],
  milestoneDescriptions: string[],
  tokenMint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: jobPda } = deriveJobPda(programId, client, jobId);
  const { pda: vaultPda } = deriveVaultPda(programId, jobPda);

  const data = encode(CreateJobSchema, {
    jobId,
    milestoneAmounts,
    milestoneDescriptions,
  });

  const keys = [
    { pubkey: client, isSigner: true, isWritable: true },
    { pubkey: freelancer, isSigner: false, isWritable: false },
    { pubkey: jobPda, isSigner: false, isWritable: true },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: tokenMint, isSigner: false, isWritable: false },
    { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // system_program
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Create Milestone
 * 
 * Accounts:
 * - client (signer, mutable)
 * - job (mutable, constraint: job.client == client)
 * - milestone (PDA, mutable)
 * - system_program
 */
export function ixCreateMilestone(
  client: PublicKey,
  jobClient: PublicKey,
  jobId: bigint,
  milestoneId: number,
  amount: bigint,
  descriptionHash: string,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: jobPda } = deriveJobPda(programId, jobClient, jobId);
  const { pda: milestonePda } = deriveMilestonePda(programId, jobPda, milestoneId);

  const data = encode(CreateMilestoneSchema, {
    milestoneId,
    amount,
    descriptionHash,
  });

  const keys = [
    { pubkey: client, isSigner: true, isWritable: true },
    { pubkey: jobPda, isSigner: false, isWritable: true },
    { pubkey: milestonePda, isSigner: false, isWritable: true },
    { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // system_program
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Fund Escrow
 * 
 * Accounts:
 * - client (signer, mutable)
 * - job (mutable)
 * - vault (PDA, mutable)
 * - system_program
 */
export function ixFundEscrow(
  client: PublicKey,
  jobClient: PublicKey,
  jobId: bigint,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: jobPda } = deriveJobPda(programId, jobClient, jobId);
  const { pda: vaultPda } = deriveVaultPda(programId, jobPda);

  // FundEscrow doesn't have explicit data, just discriminant
  const data = Buffer.from([2]); // Discriminator index

  const keys = [
    { pubkey: client, isSigner: true, isWritable: true },
    { pubkey: jobPda, isSigner: false, isWritable: true },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // system_program
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Submit Milestone
 * 
 * Accounts:
 * - freelancer (signer)
 * - job (mutable)
 * - milestone (mutable)
 */
export function ixSubmitMilestone(
  freelancer: PublicKey,
  jobClient: PublicKey,
  jobId: bigint,
  milestoneId: number,
  submissionHash: string,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: jobPda } = deriveJobPda(programId, jobClient, jobId);
  const { pda: milestonePda } = deriveMilestonePda(programId, jobPda, milestoneId);

  const data = encode(SubmitMilestoneSchema, { submissionHash });

  const keys = [
    { pubkey: freelancer, isSigner: true, isWritable: false },
    { pubkey: jobPda, isSigner: false, isWritable: true },
    { pubkey: milestonePda, isSigner: false, isWritable: true },
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Approve Milestone
 * 
 * Accounts:
 * - client (signer)
 * - job (mutable)
 * - milestone (mutable)
 */
export function ixApproveMilestone(
  client: PublicKey,
  jobClient: PublicKey,
  jobId: bigint,
  milestoneId: number,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: jobPda } = deriveJobPda(programId, jobClient, jobId);
  const { pda: milestonePda } = deriveMilestonePda(programId, jobPda, milestoneId);

  // ApproveMilestone doesn't have explicit data
  const data = Buffer.from([5]); // Discriminator index

  const keys = [
    { pubkey: client, isSigner: true, isWritable: false },
    { pubkey: jobPda, isSigner: false, isWritable: true },
    { pubkey: milestonePda, isSigner: false, isWritable: true },
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Release Milestone
 * 
 * Accounts:
 * - client (signer)
 * - platform_config (mutable)
 * - job (mutable)
 * - milestone (mutable)
 * - vault (PDA, mutable)
 * - freelancer (unchecked, mutable)
 * - treasury (unchecked, mutable)
 * - system_program
 */
export function ixReleaseMilestone(
  client: PublicKey,
  jobClient: PublicKey,
  jobId: bigint,
  milestoneId: number,
  freelancer: PublicKey,
  treasury: PublicKey,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: jobPda } = deriveJobPda(programId, jobClient, jobId);
  const { pda: milestonePda } = deriveMilestonePda(programId, jobPda, milestoneId);
  const { pda: vaultPda } = deriveVaultPda(programId, jobPda);
  const { pda: platformConfigPda } = derivePlatformConfigPda(programId);

  // ReleaseMilestone doesn't have explicit data
  const data = Buffer.from([6]); // Discriminator index

  const keys = [
    { pubkey: client, isSigner: true, isWritable: false },
    { pubkey: platformConfigPda, isSigner: false, isWritable: true },
    { pubkey: jobPda, isSigner: false, isWritable: true },
    { pubkey: milestonePda, isSigner: false, isWritable: true },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: freelancer, isSigner: false, isWritable: true },
    { pubkey: treasury, isSigner: false, isWritable: true },
    { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // system_program
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Cancel Job
 * 
 * Accounts:
 * - client (signer, mutable)
 * - job (mutable)
 * - vault (PDA, mutable)
 * - system_program
 */
export function ixCancelJob(
  client: PublicKey,
  jobClient: PublicKey,
  jobId: bigint,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: jobPda } = deriveJobPda(programId, jobClient, jobId);
  const { pda: vaultPda } = deriveVaultPda(programId, jobPda);

  // CancelJob doesn't have explicit data
  const data = Buffer.from([7]); // Discriminator index

  const keys = [
    { pubkey: client, isSigner: true, isWritable: true },
    { pubkey: jobPda, isSigner: false, isWritable: true },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // system_program
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Open Dispute
 * 
 * Accounts:
 * - opener (signer, mutable)
 * - platform_config
 * - job (mutable)
 * - dispute (PDA, mutable)
 * - system_program
 */
export function ixOpenDispute(
  opener: PublicKey,
  jobClient: PublicKey,
  jobId: bigint,
  milestoneId: number,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: jobPda } = deriveJobPda(programId, jobClient, jobId);
  const { pda: disputePda } = deriveDisputePda(programId, jobPda);
  const { pda: platformConfigPda } = derivePlatformConfigPda(programId);

  const data = encode(OpenDisputeSchema, { milestoneId });

  const keys = [
    { pubkey: opener, isSigner: true, isWritable: true },
    { pubkey: platformConfigPda, isSigner: false, isWritable: false },
    { pubkey: jobPda, isSigner: false, isWritable: true },
    { pubkey: disputePda, isSigner: false, isWritable: true },
    { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // system_program
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Submit Dispute Evidence
 * 
 * Accounts:
 * - submitter (signer)
 * - job
 * - dispute (mutable)
 */
export function ixSubmitDisputeEvidence(
  submitter: PublicKey,
  jobClient: PublicKey,
  jobId: bigint,
  evidenceHash: string,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: jobPda } = deriveJobPda(programId, jobClient, jobId);
  const { pda: disputePda } = deriveDisputePda(programId, jobPda);

  const data = encode(SubmitDisputeEvidenceSchema, { evidenceHash });

  const keys = [
    { pubkey: submitter, isSigner: true, isWritable: false },
    { pubkey: jobPda, isSigner: false, isWritable: false },
    { pubkey: disputePda, isSigner: false, isWritable: true },
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Resolve Dispute
 * 
 * Accounts:
 * - arbitrator (signer)
 * - platform_config
 * - job (mutable)
 * - dispute (mutable)
 * - milestone (mutable)
 * - vault (PDA, mutable)
 * - client (unchecked, mutable)
 * - freelancer (unchecked, mutable)
 * - system_program
 */
export function ixResolveDispute(
  arbitrator: PublicKey,
  jobClient: PublicKey,
  jobId: bigint,
  milestoneId: number,
  ruling: DisputeRuling,
  client: PublicKey,
  freelancer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: jobPda } = deriveJobPda(programId, jobClient, jobId);
  const { pda: milestonePda } = deriveMilestonePda(programId, jobPda, milestoneId);
  const { pda: disputePda } = deriveDisputePda(programId, jobPda);
  const { pda: vaultPda } = deriveVaultPda(programId, jobPda);
  const { pda: platformConfigPda } = derivePlatformConfigPda(programId);

  // Encode ruling as string
  let rulingStr: string;
  if (ruling.__kind === "None") {
    rulingStr = "None";
  } else if (ruling.__kind === "ClientWins") {
    rulingStr = "ClientWins";
  } else if (ruling.__kind === "FreelancerWins") {
    rulingStr = "FreelancerWins";
  } else if (ruling.__kind === "Split") {
    rulingStr = `Split(${ruling.clientBps},${ruling.freelancerBps})`;
  } else {
    rulingStr = "None";
  }

  const data = encode(ResolveDisputeSchema, { ruling: rulingStr });

  const keys = [
    { pubkey: arbitrator, isSigner: true, isWritable: false },
    { pubkey: platformConfigPda, isSigner: false, isWritable: false },
    { pubkey: jobPda, isSigner: false, isWritable: true },
    { pubkey: disputePda, isSigner: false, isWritable: true },
    { pubkey: milestonePda, isSigner: false, isWritable: true },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: client, isSigner: false, isWritable: true },
    { pubkey: freelancer, isSigner: false, isWritable: true },
    { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // system_program
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Set Platform Fee
 * 
 * Accounts:
 * - admin (signer)
 * - platform_config (mutable)
 */
export function ixSetPlatformFee(
  admin: PublicKey,
  newFeeBps: number,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: platformConfigPda } = derivePlatformConfigPda(programId);

  const data = encode(SetPlatformFeeSchema, { newFeeBps });

  const keys = [
    { pubkey: admin, isSigner: true, isWritable: false },
    { pubkey: platformConfigPda, isSigner: false, isWritable: true },
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Withdraw Platform Fees
 * 
 * Accounts:
 * - admin (signer)
 * - platform_config
 * - treasury (unchecked, mutable)
 * - recipient (unchecked, mutable)
 * - system_program
 */
export function ixWithdrawPlatformFees(
  admin: PublicKey,
  amount: bigint,
  recipient: PublicKey,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const { pda: platformConfigPda } = derivePlatformConfigPda(programId);
  // Treasury is derived from platform_config - we'll need to fetch it
  const treasury = PublicKey.default; // This should be derived from platform_config

  const data = encode(WithdrawPlatformFeesSchema, { amount });

  const keys = [
    { pubkey: admin, isSigner: true, isWritable: false },
    { pubkey: platformConfigPda, isSigner: false, isWritable: false },
    { pubkey: treasury, isSigner: false, isWritable: true },
    { pubkey: recipient, isSigner: false, isWritable: true },
    { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // system_program
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

// =============== DEPRECATED ESCROW INSTRUCTIONS ===============
// These are kept for backward compatibility but should not be used

export function ixInitializeSol(
  programId: PublicKey,
  initializer: PublicKey,
  freelancer: PublicKey,
  amount: bigint
): TransactionInstruction {
  throw new Error("Deprecated: Use ixCreateJob for marketplace");
}

export function ixInitializeSolWithDeadline(
  programId: PublicKey,
  initializer: PublicKey,
  freelancer: PublicKey,
  amount: bigint,
  deadlineUnixTimestamp: bigint
): TransactionInstruction {
  throw new Error("Deprecated: Use ixCreateJob for marketplace");
}

export function ixInitializeToken(
  programId: PublicKey,
  initializer: PublicKey,
  freelancer: PublicKey,
  tokenMint: PublicKey,
  initTokenAta: PublicKey,
  amount: bigint
): TransactionInstruction {
  throw new Error("Deprecated: Use ixCreateJob for marketplace");
}

export function ixInitializeTokenWithDeadline(
  programId: PublicKey,
  initializer: PublicKey,
  freelancer: PublicKey,
  tokenMint: PublicKey,
  initTokenAta: PublicKey,
  amount: bigint,
  deadlineUnixTimestamp: bigint
): TransactionInstruction {
  throw new Error("Deprecated: Use ixCreateJob for marketplace");
}

export function ixAccept(
  programId: PublicKey,
  freelancer: PublicKey,
  initializer: PublicKey
): TransactionInstruction {
  throw new Error("Deprecated: Not used in marketplace");
}

export function ixReleaseSol(
  programId: PublicKey,
  initializer: PublicKey,
  freelancer: PublicKey
): TransactionInstruction {
  throw new Error("Deprecated: Use ixReleaseMilestone for marketplace");
}

export function ixReleaseToken(
  programId: PublicKey,
  initializer: PublicKey,
  freelancer: PublicKey,
  tokenMint: PublicKey,
  freelancerTokenAta: PublicKey
): TransactionInstruction {
  throw new Error("Deprecated: Use ixReleaseMilestone for marketplace");
}

export function ixCancel(
  programId: PublicKey,
  initializer: PublicKey,
  freelancer: PublicKey,
  maybeTokenMint?: PublicKey,
  maybeInitializerTokenAta?: PublicKey
): TransactionInstruction {
  throw new Error("Deprecated: Use ixCancelJob for marketplace");
}
