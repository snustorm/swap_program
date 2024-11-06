import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { sendAndConfirmTransaction } from '@solana/web3.js';



export async function createTokenAccount(provider, mint, owner) {

    const tokenAccount =  anchor.web3.Keypair.generate();
    await provider.sendAndConfirmTransaction(
        new anchor.web3.Transaction().add(
            anchor.web3.SystemProgram.createAccount({
                fromPubkey: provider.wallet.publicKey,
                newAccountPubkey: tokenAccount.publicKey,
                space: 165,
                programId: TOKEN_PROGRAM_ID,
                lamports: await provider.connection.getMinimumBalanceForRentExemption(165),
            })
        )
    );
    return tokenAccount.publicKey;
}

export async function createAssociatedTokenAccount(provider, mint, owner) {
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        mint,
        owner
      );
      return tokenAccount.address; 
}

export async function getTokenBalance(provider, tokenAccount) {
    const account = await provider.connection.getParsedAccountInfo(tokenAccount);
    return account.value?.data.parsed?.info?.tokenAmount?.uiAmount;
}