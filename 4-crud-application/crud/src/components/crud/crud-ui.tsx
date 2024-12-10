'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useState } from 'react';
import { useCrudProgram, useCrudProgramAccount } from './crud-data-access';

export function CrudCreate() {
	const [title, setTitle] = useState('');
	const [message, setMessage] = useState('');
	const { createEntry } = useCrudProgram();
	const { publicKey } = useWallet();

	const isValid = title.trim() !== '' && message.trim() !== '' && title.trim().length <= 32 && message.trim().length <= 1000;

	const handleSubmit = () => {
		if (publicKey && isValid) {
			createEntry.mutateAsync({ title: title.trim(), message: message.trim(), owner: publicKey });
		}
	};

	if (!publicKey) {
		return <div className="alert alert-warning">Please connect your wallet to create an entry.</div>;
	}

	return (
		<div className="card card-body">
			<div className="form-control">
				<label className="label">
					<span className="label-text">Title</span>
				</label>
				<input
					type="text"
					placeholder="Title"
					className="input input-bordered w-full max-w-xs"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
				/>
			</div>
			<div className="form-control">
				<label className="label">
					<span className="label-text">Message</span>
				</label>
				<textarea
					placeholder="Message"
					className="textarea textarea-bordered w-full max-w-xs"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
				/>
			</div>
			<button className="btn btn-xs lg:btn-md btn-primary" onClick={handleSubmit} disabled={createEntry.isPending || !isValid}>
				{createEntry.isPending ? 'Creating...' : 'Create'}
			</button>
		</div>
	);
}

export function CrudList() {
	const { accounts, getProgramAccount } = useCrudProgram();

	if (getProgramAccount.isLoading) {
		return <span className="loading loading-spinner loading-lg"></span>;
	}
	if (!getProgramAccount.data?.value) {
		return (
			<div className="alert alert-info flex justify-center">
				<span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
			</div>
		);
	}
	return (
		<div className={'space-y-6'}>
			{accounts.isLoading ? (
				<span className="loading loading-spinner loading-lg"></span>
			) : accounts.data?.length ? (
				<div className="grid md:grid-cols-2 gap-4">
					{accounts.data?.map((account) => (
						<CrudCard key={account.publicKey.toString()} account={account.publicKey} />
					))}
				</div>
			) : (
				<div className="text-center">
					<h2 className={'text-2xl'}>No accounts</h2>
					No accounts found. Create one above to get started.
				</div>
			)}
		</div>
	);
}

function CrudCard({ account }: { account: PublicKey }) {
	const { accountQuery, updateEntry, deleteEntry } = useCrudProgramAccount({ account });
	const { publicKey } = useWallet();

	const [message, setMessage] = useState('');
	const title = accountQuery.data?.title;

	const isValid = message.trim() !== '' && message.trim().length <= 1000;

	const handleSubmit = () => {
		if (publicKey && isValid && title) {
			updateEntry.mutateAsync({ title: title.trim(), message: message.trim() });
		}
	};

	if (!publicKey) {
		return <div className="alert alert-warning">Please connect your wallet to create an entry.</div>;
	}

	return accountQuery.isLoading ? (
		<span className="loading loading-spinner loading-lg"></span>
	) : (
		<div className="card card-bordered border-base-300 border-4 text-neutral-content">
			<div className="form-control">
				<div className="card-body items-center text-center">
					<div className="space-y-6" />
					<h2 className="card-title justify-center text-3xl cursor-pointer" onClick={() => accountQuery.refetch()}>
						{accountQuery.data?.title}
					</h2>
					<p>{accountQuery.data?.message}</p>
					<div className="card-actions justify-around">
						<textarea
							className="textarea textarea-bordered w-full max-w-xs"
							value={message}
							placeholder="Message"
							onChange={(e) => setMessage(e.target.value)}
						></textarea>
						<button className="btn btn-xs lg:btn-md" disabled={updateEntry.isPending || !isValid} onClick={handleSubmit}>
							Update Journal Entry
						</button>
						<button
							className="btn btn-xs lg:btn-md btn-error"
							disabled={deleteEntry.isPending}
							onClick={() => {
								const title = accountQuery.data?.title;
								if (title) {
									return deleteEntry.mutate(title);
								}
							}}
						>
							Delete
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
