'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { ExplorerLink } from '../cluster/cluster-ui';
import { WalletButton } from '../solana/solana-provider';
import { AppHero, ellipsify } from '../ui/ui-layout';
import { useCrudProgram } from './crud-data-access';
import { CrudCreate, CrudList } from './crud-ui';

export default function CrudFeature() {
	const { publicKey } = useWallet();
	const { programId } = useCrudProgram();

	return publicKey ? (
		<div>
			<AppHero
				title="Crud"
				subtitle={
					'Create a new account by clicking the "Create" button. The state of a account is stored on-chain and can be manipulated by calling the program\'s methods (create, update, and delete).'
				}
			>
				<p className="mb-6">
					<ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
				</p>
				<CrudCreate />
			</AppHero>
			<CrudList />
		</div>
	) : (
		<div className="max-w-4xl mx-auto">
			<div className="hero py-[64px]">
				<div className="hero-content text-center">
					<WalletButton />
				</div>
			</div>
		</div>
	);
}