const { NFTStorage, File } = require('nft.storage');
const mime = require('mime');
const fs = require('fs');
const path = require('path');

const baseUri = 'ipfs://';

const NFT_STORAGE_KEY = '';

async function fileFromPath(filePath) {
	const content = await fs.promises.readFile(filePath)
	const type = mime.getType(filePath)
	return new File([content], path.basename(filePath), { type })
}

async function loadManifest(filePath) {
	const content = await fs.promises.readFile(filePath);
	return JSON.parse(content);
}

function ensureFolderStructure() {
	const buildDir = path.resolve(__dirname, '../build');

	if (fs.existsSync(buildDir)) {
		fs.rmSync(buildDir, { recursive: true });
	}

	if (!fs.existsSync(buildDir)) {
		fs.mkdirSync(buildDir);
	}

	if (!fs.existsSync(`${buildDir}/metadata`)) {
		fs.mkdirSync(`${buildDir}/metadata`);
	}
}

async function main() {
	ensureFolderStructure();

	console.log('Shuttle [1.0.0]');
	console.log('---------------------------------');

	const manifest = await loadManifest(path.resolve(__dirname, '../import/manifest.json'));
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
		images.push(await fileFromPath(`./import/images/${tokenId}.png`));
		console.log(`[+] Loaded image ${tokenId}`);
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
		const metadataPath = path.resolve(__dirname, `../build/metadata/${tokenId}`);

		fs.writeFileSync(metadataPath, serializedMetadata);
		console.log(`[+] Saved metadata file for ${tokenId}`);

		metadatas.push(await fileFromPath(metadataPath));
	}

	console.log(`[@] Uploading metadata files...`);

	const metadataCid = await storage.storeDirectory(metadatas);

	console.log(`[=] Uploading metadata files complete | CID : ${metadataCid}`);

	const serializedManifest = JSON.stringify(manifest, null, 2);
	fs.writeFileSync(path.resolve(__dirname, '../import/manifest.json'), serializedManifest);

	console.log('[=] Updated manifest file.');

	console.log('---------------------------------');
	console.log(`[$] Successful Shuttled ${manifest.metadata.length} NFTs`);
	console.log(`[#] Images: ipfs://${imagesCid} | https://ipfs.io/ipfs/${imagesCid}`);
	console.log(`[#] Metadatas: ipfs://${metadataCid} | https://ipfs.io/ipfs/${metadataCid}`);
}

main().catch(err => {
	console.error(err)
	process.exit(1)
});
