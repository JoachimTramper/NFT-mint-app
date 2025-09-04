# Solana Umi Candy Machine NFT Mint (React + Vite)

[![Last commit](https://img.shields.io/github/last-commit/JoachimTramper/NFT-mint-app)](#)

Minimal devnet mint dApp using **Umi + @metaplex-foundation/mpl-candy-machine (v3)**.
Reads price from **Candy Guard (solPayment)** and mints NFTs via a simple React UI.

> No backend required. Built with Vite + React + TypeScript.

---

## Features

- **Mint NFTs** via Umi `mintV2` (Candy Machine v3)
- Read **Candy Guard** price (`solPayment.value.lamports.basisPoints`)
- Per-card price + **remaining / sold-out** (button disabled when sold out)
- **Explorer link** after successful mint
- Simple navbar + routing (root redirects to `/select-mint`)
- Config via `.env` (RPC / Candy Machine / Collection)

> Uses **devnet**. Make sure your wallet has devnet SOL (airdrop) before minting.

---

## Quick start

**macOS/Linux**

```bash
npm i
cp .env.devnet .env
npm run dev
```

**Windows**

```bash
npm i
Copy-Item .env.devnet .env
npm run dev
```
