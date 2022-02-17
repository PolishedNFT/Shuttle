# Shuttle

---

Steamlines uploading images & metadata to ipfs storage. This is a little wrapper around the https://NFT.storage api. Reading the `manifest.json` file generated from our https://github.com/PolishedNFT/Generative art compiler the images are uploaded to ipfs while also generating metadata files that are also uploaded. Two different ipfs directories are created from this process one containing all the images `ipfs://hash/0.png` and the other having all the metadata `ipfs://hash/0`.

`npm run start -- ../build/`
