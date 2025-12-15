use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod events;
pub mod instructions;

use instructions::*;
use state::DisputeRuling;

declare_id!("7Aeyy6HZa97qQxvChJB3xW9Tp3phD9ZDSEUqoMJSsbui");

#[program]
pub mod solana_program {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        fee_bps: u16,
    ) -> Result<()> {
        initialize_platform::handler(ctx, fee_bps)
    }

    pub fn create_job(
        ctx: Context<CreateJob>,
        job_id: u64, 
        milestone_amounts: Vec<u64>,
        milestone_descriptions: Vec<String>,
    ) -> Result<()> {
        create_job::handler(ctx, job_id, milestone_amounts, milestone_descriptions)
    }

    pub fn create_milestone(
        ctx: Context<CreateMilestone>,
        milestone_id: u8,
        amount: u64,
        description_hash: String,
    ) -> Result<()> {
        create_job::create_milestone_handler(ctx, milestone_id, amount, description_hash)
    }

    pub fn fund_escrow(ctx: Context<FundEscrow>) -> Result<()> {
        fund_escrow::handler(ctx)
    }

    pub fn approve_milestone(ctx: Context<ApproveMilestone>) -> Result<()> {
        approve_milestone::handler(ctx)
    }

    pub fn cancel_job(ctx: Context<CancelJob>) -> Result<()> {
        cancel_job::handler(ctx)
    }

    pub fn open_dispute(ctx: Context<OpenDispute>, milestone_id: u8) -> Result<()> {
        open_dispute::handler(ctx, milestone_id)
    }

    pub fn resolve_dispute(ctx: Context<ResolveDispute>, ruling: DisputeRuling) -> Result<()> {
        resolve_dispute::handler(ctx, ruling)
    }

    pub fn set_platform_fee(ctx: Context<SetPlatformFee>, new_fee_bps: u16) -> Result<()> {
        set_platform_fee::handler(ctx, new_fee_bps)
    }

}