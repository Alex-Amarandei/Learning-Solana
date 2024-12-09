import { BN, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { BankrunProvider, startAnchor } from 'anchor-bankrun';
import { Votingdapp } from '../target/types/votingdapp';

const IDL = require('../target/idl/votingdapp.json');
const votingAddress = new PublicKey('7FFmoG7uCfKqeepEE8CGb8ac4FafuMKGnmmnRAurHQLh');

describe('Voting', () => {
	let context;
	let provider;
	let votingProgram: Program<Votingdapp>;
	// setProvider(AnchorProvider.env());
	// let votingProgram = workspace.Votingdapp as Program<Votingdapp>;

	beforeAll(async () => {
		context = await startAnchor(
			'',
			[
				{
					name: 'votingDapp',
					programId: votingAddress,
				},
			],
			[]
		);
		provider = new BankrunProvider(context);
		votingProgram = new Program<Votingdapp>(IDL, provider);
	});

	it('Initialize Poll', async () => {
		await votingProgram.methods
			.initializePoll(new BN(1), 'What is your favorite type of peanut butter?', new BN(1733740995), new BN(1833740995))
			.rpc();

		const [pollAddress] = PublicKey.findProgramAddressSync([new BN(1).toArrayLike(Buffer, 'le', 8)], votingAddress);

		const poll = await votingProgram.account.poll.fetch(pollAddress);

		console.log(poll);

		expect(poll.pollId.toNumber()).toEqual(1);
		expect(poll.description).toEqual('What is your favorite type of peanut butter?');
		expect(poll.pollStart.toNumber()).toBeLessThan(poll.pollEnd.toNumber());
		expect(poll.pollStart.toNumber()).toEqual(1733740995);
		expect(poll.pollEnd.toNumber()).toEqual(1833740995);
	});

	it('Initialize Candidate', async () => {
		await votingProgram.methods.initializeCandidate(new BN(1), 'Smooth').rpc();
		await votingProgram.methods.initializeCandidate(new BN(1), 'Crunchy').rpc();

		const [smoothCandidate] = PublicKey.findProgramAddressSync(
			[new BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from('Smooth')],
			votingAddress
		);
		const [crunchyCandidate] = PublicKey.findProgramAddressSync(
			[new BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from('Crunchy')],
			votingAddress
		);

		const smooth = await votingProgram.account.candidate.fetch(smoothCandidate);
		const crunchy = await votingProgram.account.candidate.fetch(crunchyCandidate);

		console.log(smooth, crunchy);

		expect(smooth.candidateName).toEqual('Smooth');
		expect(crunchy.candidateName).toEqual('Crunchy');

		expect(smooth.candidateVotes.toNumber()).toEqual(0);
		expect(smooth.candidateVotes.toNumber()).toEqual(0);

		const [pollAddress] = PublicKey.findProgramAddressSync([new BN(1).toArrayLike(Buffer, 'le', 8)], votingAddress);
		const poll = await votingProgram.account.poll.fetch(pollAddress);

		console.log(poll);

		expect(poll.candidateAmount.toNumber()).toEqual(2);
	});

	it('Vote', async () => {
		await votingProgram.methods.vote(new BN(1), 'Smooth').rpc();

		const [smoothCandidate] = PublicKey.findProgramAddressSync(
			[new BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from('Smooth')],
			votingAddress
		);

		const smooth = await votingProgram.account.candidate.fetch(smoothCandidate);

		console.log(smooth);

		expect(smooth.candidateVotes.toNumber()).toEqual(1);
	});
});
