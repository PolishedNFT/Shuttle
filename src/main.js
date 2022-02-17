const { NFTStorage, File } = require('nft.storage');
const mime = require('mime');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const baseUri = 'ipfs://';

const NFT_STORAGE_KEY = '';

async function fileFromPath(filePath) {
	const content = await fs.promises.readFile(filePath);
	const type = mime.getType(filePath);
	return new File([content], path.basename(filePath), { type });
}

async function loadManifest(filePath) {
	const content = await fs.promises.readFile(filePath);
	return JSON.parse(content);
}

function getImportDir() {
	const arg = process.argv[2];
	const lastChar = arg[arg.length - 1];

	if (lastChar === '/' && arg.length > 1) {
		return arg.slice(0, arg.length - 1);
	}

	return arg;
}

async function main() {
	console.log('Shuttle [1.0.0]');
	console.log('---------------------------------');

	if (process.argv.length !== 3) {
		console.log('[?] Usage: npm run start /path/to/input/');
		return;
	}

	const startTime = performance.now();

	const importDir = getImportDir();

	if (!fs.existsSync(`${importDir}/metadata`)) {
		fs.mkdirSync(`${importDir}/metadata`);
	}

	const manifest = await loadManifest(`${importDir}/manifest.json`);
	if (!manifest || !manifest.metadata) {
		console.log('[!] Failed to load manifest file');
		return;
	}

	if (manifest.metadata.length <= 0) {
		console.log('[!] No metadata described');
		return;
	}

	console.log('[@] Reading images directory...');

	const images = [];

	for (const { tokenId } of manifest.metadata) {
		images.push(await fileFromPath(`${importDir}/images/${tokenId}.png`));
		console.log(`[+] Selected image ${tokenId}`);
	}

	console.log(`[@] Uploading images...`);

	const storage = new NFTStorage({ token: NFT_STORAGE_KEY });
	const imagesCid = await storage.storeDirectory(images);

	console.log(`[=] Uploading images complete | CID: ${imagesCid}`);

	const metadatas = [];

	for (let i = 0; i < manifest.metadata.length; i++) {
		const { tokenId } = manifest.metadata[i];

		manifest.metadata[i] = {
			image: `${baseUri}${imagesCid}/${tokenId}.png`,
			...manifest.metadata[i],
		};

		const serializedMetadata = JSON.stringify(manifest.metadata[i], null, 2);
		const metadataPath = `${importDir}/metadata/${tokenId}`;

		fs.writeFileSync(metadataPath, serializedMetadata);
		console.log(`[+] Created metadata file for ${tokenId}`);

		metadatas.push(await fileFromPath(metadataPath));
	}

	console.log(`[@] Uploading metadata files...`);

	const metadataCid = await storage.storeDirectory(metadatas);

	console.log(`[=] Uploading metadata files complete | CID : ${metadataCid}`);

	const newManifest = {
		name: manifest.name,
		description: manifest.description,
		total: manifest.total,
		provenanceHash: manifest.provenanceHash,
		baseUri: `${baseUri}${metadataCid}/`,
		metadata: manifest.metadata,
	};

	const serializedManifest = JSON.stringify(newManifest, null, 2);
	fs.writeFileSync(`${importDir}/manifest.json`, serializedManifest);

	console.log('[=] Updated manifest file.');

	const endTime = (Math.abs(performance.now() - startTime) / 1000).toFixed(4);

	console.log('---------------------------------');
	console.log(`[$] Successful Shuttled ${manifest.metadata.length} NFTs in ${endTime}s`);
	console.log(`[#] Image: ${baseUri}${imagesCid} | https://ipfs.io/ipfs/${imagesCid}`);
	console.log(`[#] Metadata: ${manifest.baseUri} | https://ipfs.io/ipfs/${metadataCid}`);
}

main().catch(err => {
	console.error(err)
	process.exit(1)
});
