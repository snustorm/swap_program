import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN, type Program} from "@coral-xyz/anchor";
import {randomBytes} from "node:crypto";
import { Swap } from "../target/types/swap";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert } from "chai";

import {
    confirmTransaction,
    createAccountsMintsAndTokenAccounts,
    makeKeypairs
} from "@solana-developers/helpers";


const TOKEN_PROGRAM: typeof TOKEN_2022_PROGRAM_ID | typeof TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;

const SECONDS = 100;

const ANCHOR_SLOW_TEST_THRESHOLD = 40 * SECONDS;

console.log("test 2");

const getRandomBigNumber = (size = 8) => {
    return new BN(randomBytes(size));
}

describe("swap", () => {
  
    const provider = anchor.AnchorProvider.env();
    const connection = provider.connection;
    const wallet = provider.wallet as anchor.Wallet;
    anchor.setProvider(provider);

    const user = (provider.wallet as anchor.Wallet).payer;
    const payer = user;
    
    const program = anchor.workspace.Swap as Program<Swap>;

    //Record is a utility type that creates an object type with specified key-value types. 
    const accounts: Record<string, PublicKey> = {
        tokenProgram: TOKEN_PROGRAM,
    };

    let alice: Keypair;
    let bob: Keypair;
    let tokenMintA: Keypair;
    let tokenMintB: Keypair;

    [alice, bob, tokenMintA, tokenMintB] = makeKeypairs(4);

    const tokenAOfferedAmount = new BN(1_000_000);
    const tokenBWantedAmount = new BN(1_000_000);

    before(
        "Creates Alice and Bob accounts, 2 token mints, and associated token accounts for both tokens for both users",
        async () => {
            const usersMintAndTokenAccounts = 
                await createAccountsMintsAndTokenAccounts(
                    [
                        //Alice's token balance
                        [
                           
                            1_000_000_000,
                            0,
                        ],
                        //Bob's token balance
                        [   
                            0,
                            1_000_000_000,
                        ],
                    ],
                    1 * LAMPORTS_PER_SOL,
                    connection,
                    payer,
                )

            const users = usersMintAndTokenAccounts.users;
            alice = users[0];
            bob = users[1];

            const mints = usersMintAndTokenAccounts.mints;
            tokenMintA = mints[0];
            tokenMintB = mints[1];

            const tokenAccounts = usersMintAndTokenAccounts.tokenAccounts;

            const aliceTokenAccountA = tokenAccounts[0][0];
            const aliceTokenAccountB = tokenAccounts[0][1];

            const bobTokenAccountA = tokenAccounts[1][0];
            const bobTokenAccountB = tokenAccounts[1][1];
                
            accounts.maker = alice.publicKey;
            accounts.taker = bob.publicKey;
            accounts.tokenMintA = tokenMintA.publicKey;
            accounts.makerTokenAccountA = aliceTokenAccountA;
            accounts.takerTokenAccountA = bobTokenAccountA;
            accounts.tokenMintB = tokenMintB.publicKey;
            accounts.makerTokenAccountB = aliceTokenAccountB;
            accounts.takerTokenAccountB = bobTokenAccountB;

        }
    );

    it("Puts the tokens Alice offers into the vault when Alice makes an offer",
        async () => {
            //Pick a random ID for the offer we'll make

            const offerId = getRandomBigNumber();

            const offer = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("offer"),
                    accounts.maker.toBuffer(),
                    offerId.toArrayLike(Buffer, "le", 8),
                ],
                program.programId
            )[0];

            const vault = getAssociatedTokenAddressSync(
                accounts.tokenMintA,
                offer,
                true,
                TOKEN_PROGRAM,
            )

            accounts.offer = offer;
            accounts.vault = vault;

            console.log("Accounts: ");
            console.log(accounts);

            //方式一，传参之传所有的参数，通过...操作符直接将对象的参数导出
            // const transactionSignature = await program.methods
            //     .makeOffer(offerId, tokenAOfferedAmount, tokenBWantedAmount)
            //     .accounts({...accounts})
            //     .signers([alice])
            //     .rpc();

            //方式二，传参之传所有的参数，包括makerTokenAccountB，anchor 会自动
            // 忽略不需要的参数
            // const transactionSignature = await program.methods
            //     .makeOffer(offerId, tokenAOfferedAmount, tokenBWantedAmount)
            //     .accounts({
            //         maker: accounts.maker,
            //         taker: accounts.taker,
            //         tokenMintA: accounts.tokenMintA,
            //         makerTokenAccountA: accounts.makerTokenAccountA,
            //         takerTokenAccountA: accounts.takerTokenAccountA,
            //         tokenMintB: accounts.tokenMintB,
            //         makerTokenAccountB: accounts.makerTokenAccountB,
            //         takerTokenAccountB: accounts.takerTokenAccountB,
            //         offer: accounts.offer,
            //         vault: accounts.vault,
            //         tokenProgram: accounts.tokenProgram,
            //     })
            //     .signers([alice])
            //     .rpc();

            //方式三，传参之传需要的(最原始的方法)
            const transactionSignature = await program.methods
            .makeOffer(offerId, tokenAOfferedAmount, tokenBWantedAmount)
            .accounts({
                maker: accounts.maker,
                tokenMintA: accounts.tokenMintA,
                makerTokenAccountA: accounts.makerTokenAccountA,
                tokenMintB: accounts.tokenMintB,
                offer: accounts.offer,
                vault: accounts.vault,
                tokenProgram: accounts.tokenProgram,
            })
            .signers([alice])
            .rpc();

            await confirmTransaction(connection, transactionSignature);
        }
    )

    it("Puts the tokens from the vault into Bob's account, and gives Alice Bob's tokens, when Bob takes an offer", async () => {
        const transactionSignature = await program.methods
          .takeOffer()
          .accounts({ ...accounts })
          .signers([bob])
          .rpc();
    
        await confirmTransaction(connection, transactionSignature);
    
        // Check the offered tokens are now in Bob's account
        // (note: there is no before balance as Bob didn't have any offered tokens before the transaction)
        const bobTokenAccountBalanceAfterResponse =
          await connection.getTokenAccountBalance(accounts.takerTokenAccountA);
        const bobTokenAccountBalanceAfter = new BN(
          bobTokenAccountBalanceAfterResponse.value.amount
        );
        assert(bobTokenAccountBalanceAfter.eq(tokenAOfferedAmount));
    
        // Check the wanted tokens are now in Alice's account
        // (note: there is no before balance as Alice didn't have any wanted tokens before the transaction)
        const aliceTokenAccountBalanceAfterResponse =
          await connection.getTokenAccountBalance(accounts.makerTokenAccountB);
        const aliceTokenAccountBalanceAfter = new BN(
          aliceTokenAccountBalanceAfterResponse.value.amount
        );
        assert(aliceTokenAccountBalanceAfter.eq(tokenBWantedAmount));
      }).slow(ANCHOR_SLOW_TEST_THRESHOLD);
})