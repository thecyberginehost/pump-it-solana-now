import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BondingCurve } from "./target/types/bonding_curve";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createMint,
  mintTo,
} from "@solana/spl-token";

// Configuration
const VIRTUAL_SOL_RESERVES = 30 * LAMPORTS_PER_SOL; // 30 SOL
const VIRTUAL_TOKEN_RESERVES = 1_073_000_000 * 1_000_000; // 1.073B tokens (with 6 decimals)
const CURVE_TOKEN_SUPPLY = 800_000_000 * 1_000_000; // 800M tokens (with 6 decimals)

export class BondingCurveClient {
  private program: Program<BondingCurve>;
  private provider: anchor.AnchorProvider;

  constructor(provider: anchor.AnchorProvider, programId: PublicKey) {
    this.provider = provider;
    this.program = new Program<BondingCurve>(
      require("./target/idl/bonding_curve.json"),
      programId,
      provider
    );
  }

  // Initialize a new bonding curve for a token
  async initializeCurve(
    mint: PublicKey,
    authority: Keypair
  ): Promise<{ bondingCurve: PublicKey; signature: string }> {
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), mint.toBuffer()],
      this.program.programId
    );

    const curveTokenAccount = await getAssociatedTokenAddress(
      mint,
      bondingCurve,
      true // allowOwnerOffCurve
    );

    const tx = await this.program.methods
      .initializeCurve(
        new anchor.BN(VIRTUAL_SOL_RESERVES),
        new anchor.BN(VIRTUAL_TOKEN_RESERVES),
        new anchor.BN(CURVE_TOKEN_SUPPLY)
      )
      .accounts({
        bondingCurve,
        mint,
        curveTokenAccount,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    return { bondingCurve, signature: tx };
  }

  // Buy tokens with SOL
  async buyTokens(
    mint: PublicKey,
    buyer: Keypair,
    solAmount: number
  ): Promise<string> {
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), mint.toBuffer()],
      this.program.programId
    );

    const curveTokenAccount = await getAssociatedTokenAddress(
      mint,
      bondingCurve,
      true
    );

    const buyerTokenAccount = await getAssociatedTokenAddress(
      mint,
      buyer.publicKey
    );

    const tx = await this.program.methods
      .buy(new anchor.BN(solAmount * LAMPORTS_PER_SOL))
      .accounts({
        bondingCurve,
        curveTokenAccount,
        buyerTokenAccount,
        buyer: buyer.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([buyer])
      .rpc();

    return tx;
  }

  // Sell tokens for SOL
  async sellTokens(
    mint: PublicKey,
    seller: Keypair,
    tokenAmount: number
  ): Promise<string> {
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), mint.toBuffer()],
      this.program.programId
    );

    const curveTokenAccount = await getAssociatedTokenAddress(
      mint,
      bondingCurve,
      true
    );

    const sellerTokenAccount = await getAssociatedTokenAddress(
      mint,
      seller.publicKey
    );

    const tx = await this.program.methods
      .sell(new anchor.BN(tokenAmount * 1_000_000)) // Assuming 6 decimals
      .accounts({
        bondingCurve,
        curveTokenAccount,
        sellerTokenAccount,
        seller: seller.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();

    return tx;
  }

  // Get bonding curve state
  async getBondingCurve(mint: PublicKey) {
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), mint.toBuffer()],
      this.program.programId
    );

    return await this.program.account.bondingCurve.fetch(bondingCurve);
  }

  // Calculate buy preview
  calculateBuy(solIn: number, solReserves: number, tokenReserves: number): number {
    const k = solReserves * tokenReserves;
    const newSolReserves = solReserves + solIn;
    const newTokenReserves = k / newSolReserves;
    return tokenReserves - newTokenReserves;
  }

  // Calculate sell preview
  calculateSell(tokenIn: number, solReserves: number, tokenReserves: number): number {
    const k = solReserves * tokenReserves;
    const newTokenReserves = tokenReserves + tokenIn;
    const newSolReserves = k / newTokenReserves;
    return solReserves - newSolReserves;
  }
}

// Example usage
export async function example() {
  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Program ID (you'll need to deploy and get the actual program ID)
  const programId = new PublicKey("11111111111111111111111111111111");
  
  const client = new BondingCurveClient(provider, programId);

  // Create a new token mint
  const mint = await createMint(
    provider.connection,
    provider.wallet.payer,
    provider.wallet.publicKey,
    provider.wallet.publicKey,
    6 // 6 decimals
  );

  // Initialize bonding curve
  const { bondingCurve, signature } = await client.initializeCurve(
    mint,
    provider.wallet.payer
  );
  
  console.log("Bonding curve initialized:", bondingCurve.toBase58());
  console.log("Transaction signature:", signature);

  // Mint tokens to the curve
  const curveTokenAccount = await getAssociatedTokenAddress(
    mint,
    bondingCurve,
    true
  );
  
  await mintTo(
    provider.connection,
    provider.wallet.payer,
    mint,
    curveTokenAccount,
    provider.wallet.publicKey,
    CURVE_TOKEN_SUPPLY
  );

  // Buy tokens
  const buyTx = await client.buyTokens(mint, provider.wallet.payer, 1); // Buy with 1 SOL
  console.log("Buy transaction:", buyTx);

  // Get curve state
  const curveState = await client.getBondingCurve(mint);
  console.log("Curve state:", curveState);
}