
use anchor_lang::prelude::*;

#[event]
pub struct JobCreated {
    pub job_id: u64,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub total_amount: u64,
    pub milestone_count: u8,
    pub token_mint: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct JobFunded { 
    pub job_id: u64,
    pub amount: u64,
    pub timestamp: i64,
}