use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod bonding_curve {
    use super::*;

    // Initialize a new bonding curve for a token
    pub fn initialize_curve(
        ctx: Context<InitializeCurve>,
        virtual_sol_reserves: u64,
        virtual_token_reserves: u64,
        curve_token_supply: u64,
    ) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        curve.mint = ctx.accounts.mint.key();
        curve.authority = ctx.accounts.authority.key();
        curve.virtual_sol_reserves = virtual_sol_reserves;
        curve.virtual_token_reserves = virtual_token_reserves;
        curve.real_sol_reserves = 0;
        curve.real_token_reserves = curve_token_supply;
        curve.tokens_sold = 0;
        curve.is_graduated = false;
        curve.graduation_threshold = 85_000 * 1_000_000_000; // 85k SOL (lamports)
        curve.bump = *ctx.bumps.get("bonding_curve").unwrap();

        msg!("Bonding curve initialized for mint: {}", curve.mint);
        Ok(())
    }

    // Buy tokens with SOL
    pub fn buy(ctx: Context<BuyTokens>, sol_amount: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.is_graduated, BondingCurveError::TokenGraduated);
        require!(sol_amount > 0, BondingCurveError::InvalidAmount);

        // Calculate tokens to receive using bonding curve math
        let tokens_out = calculate_buy_tokens(
            sol_amount,
            curve.virtual_sol_reserves + curve.real_sol_reserves,
            curve.virtual_token_reserves - curve.tokens_sold,
        )?;

        require!(tokens_out <= curve.real_token_reserves, BondingCurveError::InsufficientTokens);

        // Transfer SOL from buyer to curve
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.bonding_curve.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, sol_amount)?;

        // Transfer tokens from curve to buyer
        let seeds = &[
            b"bonding_curve",
            curve.mint.as_ref(),
            &[curve.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.curve_token_account.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.bonding_curve.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, tokens_out)?;

        // Update curve state
        curve.real_sol_reserves += sol_amount;
        curve.real_token_reserves -= tokens_out;
        curve.tokens_sold += tokens_out;

        // Check for graduation
        let total_sol_value = curve.real_sol_reserves + curve.virtual_sol_reserves;
        if total_sol_value >= curve.graduation_threshold {
            curve.is_graduated = true;
            msg!("Token graduated! Total SOL value: {}", total_sol_value);
        }

        msg!("Buy successful: {} lamports -> {} tokens", sol_amount, tokens_out);
        Ok(())
    }

    // Sell tokens for SOL
    pub fn sell(ctx: Context<SellTokens>, token_amount: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.is_graduated, BondingCurveError::TokenGraduated);
        require!(token_amount > 0, BondingCurveError::InvalidAmount);

        // Calculate SOL to receive using bonding curve math
        let sol_out = calculate_sell_sol(
            token_amount,
            curve.virtual_sol_reserves + curve.real_sol_reserves,
            curve.virtual_token_reserves - curve.tokens_sold,
        )?;

        require!(sol_out <= curve.real_sol_reserves, BondingCurveError::InsufficientSol);

        // Transfer tokens from seller to curve
        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.curve_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, token_amount)?;

        // Transfer SOL from curve to seller
        let seeds = &[
            b"bonding_curve",
            curve.mint.as_ref(),
            &[curve.bump],
        ];
        let signer = &[&seeds[..]];

        **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= sol_out;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_out;

        // Update curve state
        curve.real_sol_reserves -= sol_out;
        curve.real_token_reserves += token_amount;
        curve.tokens_sold -= token_amount;

        msg!("Sell successful: {} tokens -> {} lamports", token_amount, sol_out);
        Ok(())
    }

    // Graduate token to external DEX (only authority can call)
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(curve.is_graduated, BondingCurveError::NotGraduated);
        require!(ctx.accounts.authority.key() == curve.authority, BondingCurveError::Unauthorized);

        // In a real implementation, this would:
        // 1. Create a Raydium pool
        // 2. Add remaining tokens and SOL as liquidity
        // 3. Burn the LP tokens or send to a vault

        msg!("Token graduated to external DEX");
        Ok(())
    }
}

// Calculate tokens received for SOL input (constant product formula)
fn calculate_buy_tokens(sol_in: u64, sol_reserves: u64, token_reserves: u64) -> Result<u64> {
    let k = (sol_reserves as u128) * (token_reserves as u128);
    let new_sol_reserves = sol_reserves + sol_in;
    let new_token_reserves = k / (new_sol_reserves as u128);
    let tokens_out = token_reserves - (new_token_reserves as u64);
    
    Ok(tokens_out)
}

// Calculate SOL received for token input (constant product formula)
fn calculate_sell_sol(token_in: u64, sol_reserves: u64, token_reserves: u64) -> Result<u64> {
    let k = (sol_reserves as u128) * (token_reserves as u128);
    let new_token_reserves = token_reserves + token_in;
    let new_sol_reserves = k / (new_token_reserves as u128);
    let sol_out = sol_reserves - (new_sol_reserves as u64);
    
    Ok(sol_out)
}

#[derive(Accounts)]
pub struct InitializeCurve<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + BondingCurve::LEN,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve
    )]
    pub curve_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(
        mut,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = bonding_curve
    )]
    pub curve_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(
        mut,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = bonding_curve
    )]
    pub curve_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = seller
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Graduate<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    pub authority: Signer<'info>,
}

#[account]
pub struct BondingCurve {
    pub mint: Pubkey,                    // Token mint address
    pub authority: Pubkey,               // Authority who can graduate
    pub virtual_sol_reserves: u64,      // Virtual SOL for price calculation
    pub virtual_token_reserves: u64,    // Virtual tokens for price calculation
    pub real_sol_reserves: u64,         // Actual SOL held by curve
    pub real_token_reserves: u64,       // Actual tokens held by curve
    pub tokens_sold: u64,               // Total tokens sold
    pub is_graduated: bool,             // Whether token has graduated
    pub graduation_threshold: u64,      // SOL threshold for graduation
    pub bump: u8,                       // PDA bump
}

impl BondingCurve {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 1;
}

#[error_code]
pub enum BondingCurveError {
    #[msg("Token has already graduated")]
    TokenGraduated,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Insufficient tokens in curve")]
    InsufficientTokens,
    #[msg("Insufficient SOL in curve")]
    InsufficientSol,
    #[msg("Token has not graduated yet")]
    NotGraduated,
    #[msg("Unauthorized")]
    Unauthorized,
}