use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds")]
    InsufficientFunds,

    #[msg("Requested amount exceeds borrowable amount")]
    OverBorrowableAmount,

    #[msg("The amount exceeds repayable amount")]
    OverRepay,

    #[msg("Not under collateralized, cannot be liquidated")]
    NotUnderCollateralized,
}
