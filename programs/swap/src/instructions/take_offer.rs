use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{TokenInterface, Mint, TokenAccount, TransferChecked, transfer_checked, CloseAccount, close_account};

use crate::Offer;

use super::transfer_tokens;


#[derive(Accounts)]
pub struct TakeOffer<'info> {

    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,

    pub token_mint_a: InterfaceAccount<'info, Mint>,
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    //用于从valut提取a token
    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_a,
        associated_token::authority = taker,
        associated_token::token_program = token_program,
    )]
    pub taker_token_account_a: Box<InterfaceAccount<'info, TokenAccount>>,
    //用于直接将token发送到maker
    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_b,
        associated_token::authority = taker,
        associated_token::token_program = token_program,
    )]
    pub taker_token_account_b: Box<InterfaceAccount<'info, TokenAccount>>,


    //用于接受taker的b token， taker付钱给taker创了一个token account
    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_b,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_token_account_b: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        close = maker,
        has_one = maker,
        has_one = token_mint_a,
        has_one = token_mint_b,
        seeds = [b"offer", maker.key().as_ref(), offer.id.to_le_bytes().as_ref()],
        bump = offer.bump
    )]
    pub offer: Account<'info, Offer>,

    //vault只存token-a，token-b是直接从maker转给taker
    //maker和taker都没有vault的控制权，只有Offer PDA有vault的控制权
    //意思是账号自己来授权转账
    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,

}





pub fn send_wanted_tokens_to_maker(ctx: &Context<TakeOffer>) -> Result<()> {

    transfer_tokens(
        &ctx.accounts.taker_token_account_b,
        &ctx.accounts.maker_token_account_b,
        &ctx.accounts.offer.token_b_wanted_amount,
        &ctx.accounts.token_mint_b,
        &ctx.accounts.taker,
        &ctx.accounts.token_program,
    )
}
pub fn withdraw_anc_close_vault(ctx: Context<TakeOffer>) -> Result<()> {

    let seeds = &[
        b"offer",
        ctx.accounts.maker.to_account_info().key.as_ref(),
        &ctx.accounts.offer.id.to_le_bytes()[..],
        &[ctx.accounts.offer.bump],
    ];

    let signer_seeds = [&seeds[..]];

    let accounts = TransferChecked {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.taker_token_account_a.to_account_info(),
        mint: ctx.accounts.token_mint_a.to_account_info(),
        authority: ctx.accounts.offer.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(), 
        accounts, 
        &signer_seeds);

    transfer_checked(cpi_context, 
        ctx.accounts.vault.amount, 
        ctx.accounts.token_mint_a.decimals);

    let accounts = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.taker.to_account_info(),
        authority: ctx.accounts.offer.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(), 
        accounts, 
        &signer_seeds);

    close_account(cpi_context)

}