// import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
// import { Swap } from "../target/types/swap";
// import { PublicKey } from "@solana/web3.js";
// import {  createTokenAccount, getTokenBalance, createAssociatedTokenAccount} from "./helper";
// import { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
// import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
// import { createMint } from "@solana/spl-token";
// import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

// console.log("test1")

// describe("swap", () => {
  
//   const provider = anchor.AnchorProvider.env();
//   const connection = provider.connection;
//   const wallet = provider.wallet as anchor.Wallet;
//   anchor.setProvider(provider);

//   const program = anchor.workspace.Swap as Program<Swap>;

//   const offerId = new anchor.BN(1);
//   const tokenAOfferdAmount = new anchor.BN(100);
//   const tokenBWantedAmount = new anchor.BN(200);

//   let maker: PublicKey;
//   let tokenMintA: PublicKey;
//   let tokenMintB: PublicKey;
//   let makerTokenAccountA: PublicKey;
//   let vault: PublicKey;

//   before(async () => {
//     maker = provider.wallet.publicKey;
//     console.log("Maker Address: ", maker.toBase58());
//     try {
//         tokenMintA = await createMint(
//             connection,
//             wallet.payer,
//             maker,
//             null,
//             2,
//         );
//         console.log("Token Mint A Address: ", tokenMintA.toBase58());
        
//         tokenMintB = await createMint(
//             connection,
//             wallet.payer,
//             maker, // Consider changing this to a different authority if needed
//             null,
//             2,
//         );
//         console.log("Token Mint B Address: ", tokenMintB.toBase58());
//     } catch (error) {
//         console.error("Error creating mints: ", error);
//     }

//     let makerTokenAccountAAccount = await getOrCreateAssociatedTokenAccount(
//         connection,
//         wallet.payer,
//         tokenMintA,
//         maker, // The owner of the token account
//         false, // Set to false if the account should not be a PDA
//         TOKEN_PROGRAM_ID
//     );

//     makerTokenAccountA = makerTokenAccountAAccount.address;


//     console.log("Maker-Token-A Address: ", makerTokenAccountA.toBase58());
        

    
//   })

//   it("make offer", async () => {


//     const [offerPda, offerBump] = await anchor.web3.PublicKey.findProgramAddressSync(
//         [
//           Buffer.from("offer"),
//           maker.toBuffer(),
//           new anchor.BN(offerId).toArrayLike(Buffer, "le", 8)
//         ],
//         program.programId
//       );

//     let vault = await getAssociatedTokenAddressSync(
//         tokenMintA,
//         offerPda,
//         true, 
//         TOKEN_PROGRAM_ID,   
//     );
//      console.log("Vault Address: ", vault.toBase58());

//       console.log("make transactions");

//       console.log("Maker-Token-A Address: ", makerTokenAccountA.toBase58());
    
//       const tx = await program.methods
//       .makeOffer(offerId, tokenAOfferdAmount, tokenBWantedAmount)
//       .accounts({
//           maker,
//           tokenMintA,
//           makerTokenAccountA: makerTokenAccountA, 
//           tokenMintB,
//           offer: offerPda,  
//           vault,
//           tokenProgram: TOKEN_PROGRAM_ID,
//       })
//       .rpc();
    
//   });
// });
