import { Votingdapp } from '@/../anchor/target/types/votingdapp';
import { BN, Program } from '@coral-xyz/anchor';
import { ActionGetResponse, ActionPostRequest, ACTIONS_CORS_HEADERS, createPostResponse } from '@solana/actions';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

const IDL = require('@/../anchor/target/idl/votingdapp.json');

export const OPTIONS = GET;

export async function GET(_: Request) {
	const actionMetadata: ActionGetResponse = {
		icon: 'https://cdn-icons-png.flaticon.com/512/735/735874.png',
		title: 'Vote for your favorite type of peanut butter!',
		description: 'Vote between Crunchy and Smooth peanut butter.',
		label: 'Vote',
		links: {
			actions: [
				{
					label: 'Vote for Crunchy',
					href: '/api/vote?candidate=Crunchy',
					type: 'transaction',
				},
				{
					label: 'Vote for Smooth',
					href: '/api/vote?candidate=Smooth',
					type: 'transaction',
				},
			],
		},
	};

	return Response.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: Request) {
	const url = new URL(request.url);
	const candidate = url.searchParams.get('candidate');

	if (!candidate || (candidate !== 'Crunchy' && candidate !== 'Smooth')) {
		return new Response('Invalid candidate', { status: 400, headers: ACTIONS_CORS_HEADERS });
	}

	const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
	const program: Program<Votingdapp> = new Program(IDL, { connection });

	const body: ActionPostRequest = await request.json();
	let voter;

	try {
		voter = new PublicKey(body.account);
	} catch (err) {
		return new Response('Invalid account', { status: 400, headers: ACTIONS_CORS_HEADERS });
	}

	const instruction = await program.methods
		.vote(new BN(1), candidate)
		.accounts({
			signer: voter,
		})
		.instruction();

	const blockhash = await connection.getLatestBlockhash();

	const transaction = new Transaction({
		feePayer: voter,
		blockhash: blockhash.blockhash,
		lastValidBlockHeight: blockhash.lastValidBlockHeight,
	}).add(instruction);

	console.log(transaction);

	const response = await createPostResponse({
		fields: {
			type: 'transaction',
			transaction,
		},
	});

	return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
}
