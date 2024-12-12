import { findMetadataPda, mplTokenMetadata, verifyCollectionV1 } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { airdropIfRequired, getExplorerLink, getKeypairFromFile } from '@solana-developers/helpers';
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('devnet'));

const user = await getKeypairFromFile();

await airdropIfRequired(connection, user.publicKey, 1 * LAMPORTS_PER_SOL, 0.5 * LAMPORTS_PER_SOL);

console.log('Loaded user: ', user.publicKey.toBase58());

const umi = createUmi(connection.rpcEndpoint);
umi.use(mplTokenMetadata());

const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
umi.use(keypairIdentity(umiUser));

console.log('Set up Umi instance for user');

const collectionAddress = publicKey('GJed1pm14wdGSBJxAGJm4xxghE3VTWpDyr3TeXkxQMUb');
const nftAddress = publicKey('HKc7PgmvrVhQYqho3217qJ9u9WbgjXApYyYYsdoVDYt1');

console.log('Verifying NFT...');

const transaction = await verifyCollectionV1(umi, {
	metadata: findMetadataPda(umi, { mint: nftAddress }),
	collectionMint: collectionAddress,
	authority: umi.identity,
});
await transaction.sendAndConfirm(umi);

console.log(
	`Verified NFT ✅ NFT verified to be from collection ${collectionAddress}. See NFT on Explorer at ${getExplorerLink(
		'address',
		nftAddress,
		'devnet'
	)}`
);
