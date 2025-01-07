import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as sb from '@switchboard-xyz/on-demand';
import SwitchboardIDL from '../switchboard.json';
import { TokenLottery } from '../target/types/token_lottery';

describe('tokenlottery', () => {
	const provider = anchor.AnchorProvider.env();
	anchor.setProvider(provider);
	const wallet = provider.wallet as anchor.Wallet;

	const program = anchor.workspace.TokenLottery as anchor.Program<TokenLottery>;

	const switchboardProgram = new anchor.Program(SwitchboardIDL as anchor.Idl, provider);
	const rngKp = anchor.web3.Keypair.generate();

	async function buyTicket() {
		const buyTicketIx = await program.methods
			.buyTicket()
			.accounts({
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.instruction();

		const computeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
			units: 300_000,
		});

		const priorityIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
			microLamports: 1,
		});

		const blockhashWithContext = await provider.connection.getLatestBlockhash();

		const buyTicketTx = new anchor.web3.Transaction({
			feePayer: provider.wallet.publicKey,
			blockhash: blockhashWithContext.blockhash,
			lastValidBlockHeight: blockhashWithContext.lastValidBlockHeight,
		})
			.add(buyTicketIx)
			.add(computeIx)
			.add(priorityIx);

		const buyTicketSignature = await anchor.web3.sendAndConfirmTransaction(provider.connection, buyTicketTx, [wallet.payer]);

		console.log('Buy Ticket Signature: ', buyTicketSignature);
	}

	it('should test token lottery', async () => {
		const slot = await provider.connection.getSlot();
		const endSlot = slot + 20;

		const initConfigIx = await program.methods
			.initializeConfig(new anchor.BN(slot), new anchor.BN(endSlot), new anchor.BN(10_000))
			.instruction();

		const blockhashWithContext = await provider.connection.getLatestBlockhash();

		const initConfigTx = new anchor.web3.Transaction({
			feePayer: provider.wallet.publicKey,
			blockhash: blockhashWithContext.blockhash,
			lastValidBlockHeight: blockhashWithContext.lastValidBlockHeight,
		}).add(initConfigIx);

		const initConfigSignature = await anchor.web3.sendAndConfirmTransaction(provider.connection, initConfigTx, [wallet.payer]);

		console.log('Init Config Signature: ', initConfigSignature);

		const initLotteryIx = await program.methods
			.initializeLottery()
			.accounts({
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.instruction();

		const initLotteryTx = new anchor.web3.Transaction().add(initLotteryIx);

		const initLotterySignature = await anchor.web3.sendAndConfirmTransaction(provider.connection, initLotteryTx, [wallet.payer]);

		console.log('Init Lottery Signature: ', initLotterySignature);

		await buyTicket();
		await buyTicket();
		await buyTicket();
		await buyTicket();
		await buyTicket();
		await buyTicket();
		await buyTicket();

		const queue = new anchor.web3.PublicKey('A43DyUGA7s8eXPxqEjJY6EBu1KKbNgfxF8h17VAHn13w');

		const queueAccount = new sb.Queue(switchboardProgram, queue);

		try {
			await queueAccount.loadData();
		} catch (error) {
			console.error(error);
			process.exit(1);
		}

		const [randomness, createRandomnessIx] = await sb.Randomness.create(switchboardProgram, rngKp, queue);

		const createRandomnessTx = await sb.asV0Tx({
			connection: provider.connection,
			ixs: [createRandomnessIx],
			payer: wallet.publicKey,
			signers: [wallet.payer, rngKp],
		});

		const createRandomnessSignature = await provider.connection.sendTransaction(createRandomnessTx);

		console.log('Create Randomness Signature: ', createRandomnessSignature);

		let confirmed = false;

		while (!confirmed) {
			try {
				const confirmedRandomness = await provider.connection.getSignatureStatuses([createRandomnessSignature]);
				const randomnessStatus = confirmedRandomness.value[0];

				if (randomnessStatus?.confirmations != null && randomnessStatus.confirmationStatus === 'confirmed') {
					confirmed = true;
				}
			} catch (error) {
				console.error(error);
			}
		}

		const sbCommitIx = await randomness.commitIx(queue);

		const commitIx = await program.methods
			.commitRandomness()
			.accounts({
				randomnessAccount: randomness.pubkey,
			})
			.instruction();

		const commitComputeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
			units: 100_000,
		});

		const commitPriorityIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
			microLamports: 1,
		});

		const commitBlockhashWithContext = await provider.connection.getLatestBlockhash();

		const commitTx = new anchor.web3.Transaction({
			feePayer: provider.wallet.publicKey,
			blockhash: commitBlockhashWithContext.blockhash,
			lastValidBlockHeight: commitBlockhashWithContext.lastValidBlockHeight,
		})
			.add(commitComputeIx)
			.add(commitPriorityIx)
			.add(sbCommitIx)
			.add(commitIx);

		const commitSignature = await anchor.web3.sendAndConfirmTransaction(provider.connection, commitTx, [wallet.payer]);

		console.log('Commit Signature: ', commitSignature);

		const sbRevealIx = await randomness.revealIx();

		const revealWinnerIx = await program.methods
			.revealWinner()
			.accounts({
				randomnessAccount: randomness.pubkey,
			})
			.instruction();

		const revealBlockhashWithContext = await provider.connection.getLatestBlockhash();

		const revealTx = new anchor.web3.Transaction({
			feePayer: provider.wallet.publicKey,
			blockhash: revealBlockhashWithContext.blockhash,
			lastValidBlockHeight: revealBlockhashWithContext.lastValidBlockHeight,
		})
			.add(sbRevealIx)
			.add(revealWinnerIx);

		let currentSlot = 0;
		while (currentSlot < endSlot) {
			const slot = await provider.connection.getSlot();
			if (slot > currentSlot) {
				currentSlot = slot;
				console.log('Current Slot: ', slot);
			}
		}

		const revealSignature = await anchor.web3.sendAndConfirmTransaction(provider.connection, revealTx, [wallet.payer]);

		console.log('Reveal Signature: ', revealSignature);

		const claimIx = await program.methods
			.claimWinnings()
			.accounts({
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.instruction();

		const claimBlockhashWithContext = await provider.connection.getLatestBlockhash();

		const claimTx = new anchor.web3.Transaction({
			feePayer: provider.wallet.publicKey,
			blockhash: claimBlockhashWithContext.blockhash,
			lastValidBlockHeight: claimBlockhashWithContext.lastValidBlockHeight,
		}).add(claimIx);

		const claimSignature = await anchor.web3.sendAndConfirmTransaction(provider.connection, claimTx, [wallet.payer]);

		console.log('Claim Signature: ', claimSignature);
	}, 60_000);
});
