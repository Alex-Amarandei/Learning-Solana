import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system';
import { Tokenvesting } from '@project/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BankrunProvider } from 'anchor-bankrun';
import { BanksClient, Clock, ProgramTestContext, startAnchor } from 'solana-bankrun';
import { createMint, mintTo } from 'spl-token-bankrun';

import { BN, Program, setProvider, web3 } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import IDL from '../target/idl/tokenvesting.json';

describe('Vesting Smart Contract Test', () => {
	const companyName = 'companyName';

	let beneficiary: Keypair;
	let context: ProgramTestContext;
	let provider: BankrunProvider;
	let program: Program<Tokenvesting>;
	let banksClient: BanksClient;
	let employer: Keypair;
	let mint: PublicKey;
	let beneficiaryProvider: BankrunProvider;
	let programTwo: Program<Tokenvesting>;
	let vestingAccount: PublicKey;
	let treasuryTokenAccount: PublicKey;
	let employeeAccount: PublicKey;

	beforeAll(async () => {
		beneficiary = new web3.Keypair();

		context = await startAnchor(
			'',
			[
				{
					name: 'tokenvesting',
					programId: new PublicKey(IDL.address),
				},
			],
			[
				{
					address: beneficiary.publicKey,
					info: {
						lamports: 1_000_000_000,
						data: Buffer.alloc(0),
						owner: SYSTEM_PROGRAM_ID,
						executable: false,
					},
				},
			]
		);

		provider = new BankrunProvider(context);
		setProvider(provider);

		program = new Program<Tokenvesting>(IDL as Tokenvesting, provider);

		banksClient = context.banksClient;

		employer = provider.wallet.payer;

		// @ts-expect-error - Type error in spl-token-bankrun dependency
		mint = await createMint(banksClient, employer, employer.publicKey, null, 2);

		beneficiaryProvider = new BankrunProvider(context);
		beneficiaryProvider.wallet = new NodeWallet(beneficiary);

		programTwo = new Program<Tokenvesting>(IDL as Tokenvesting, beneficiaryProvider);

		[vestingAccount] = PublicKey.findProgramAddressSync([Buffer.from(companyName)], program.programId);

		[treasuryTokenAccount] = PublicKey.findProgramAddressSync(
			[Buffer.from('vesting_treasury'), Buffer.from(companyName)],
			program.programId
		);

		[employeeAccount] = PublicKey.findProgramAddressSync(
			[Buffer.from('employee_vesting'), beneficiary.publicKey.toBuffer(), vestingAccount.toBuffer()],
			program.programId
		);
	});

	it('should create a vesting account', async () => {
		const tx = await program.methods
			.createVestingAccount(companyName)
			.accounts({
				signer: employer.publicKey,
				mint,
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.rpc({ commitment: 'confirmed' });

		const vestingAccountData = await program.account.vestingAccount.fetch(vestingAccount, 'confirmed');

		console.log('Vesting Account Data: ', vestingAccountData);
		console.log('Create Vesting Account: ', tx);
	});

	it('should fund the treasury token account', async () => {
		const amount = 10_000 * 10 ** 9;

		const mintTx = await mintTo(
			// @ts-expect-error - Type error in spl-token-bankrun dependency
			banksClient,
			employer,
			mint,
			treasuryTokenAccount,
			employer,
			amount
		);

		console.log('Mint to Treasury Token Account: ', mintTx);
	});

	it('should create an employee token vesting account', async () => {
		const tx2 = await program.methods
			.createEmployeeAccount(new BN(0), new BN(100), new BN(0), new BN(100))
			.accounts({
				beneficiary: beneficiary.publicKey,
				vestingAccount,
			})
			.rpc({ commitment: 'confirmed', skipPreflight: true });

		console.log('Create Employee Account: ', tx2);
		console.log('Employee Account: ', employeeAccount.toBase58());
	});

	it("should claim the employee's vested tokens", async () => {
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const currentClock = await banksClient.getClock();

		context.setClock(
			new Clock(
				currentClock.slot,
				currentClock.epochStartTimestamp,
				currentClock.epoch,
				currentClock.leaderScheduleEpoch,
				BigInt(1000)
			)
		);

		const tx3 = await programTwo.methods
			.claimTokens(companyName)
			.accounts({
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.rpc({ commitment: 'confirmed' });

		console.log('Claim Tokens: ', tx3);
	});
});
