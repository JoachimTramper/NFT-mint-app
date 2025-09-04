import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Umi + Candy Machine
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { publicKey, isSome, generateSigner } from "@metaplex-foundation/umi";
import {
  mplCandyMachine,
  fetchCandyMachine,
  fetchCandyGuard,
  mintV2,
} from "@metaplex-foundation/mpl-candy-machine";

import nfts from "../data/nfts.json";

const CANDY_MACHINE = import.meta.env.VITE_CANDY_MACHINE;
const COLLECTION_MINT = import.meta.env.VITE_COLLECTION_MINT;

export default function SelectMint() {
  const wallet = useWallet();

  const [price, setPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [msg, setMsg] = useState("");
  const [mintingIndex, setMintingIndex] = useState<number | null>(null);

  // Umi instance (RPC = devnet) + candy machine plugin + wallet identity
  const umi = useMemo(() => {
    const u = createUmi(clusterApiUrl("devnet")).use(mplCandyMachine());
    if (wallet) u.use(walletAdapterIdentity(wallet));
    return u;
  }, [wallet]);

  // Price from Candy Guard (default guard → solPayment)
  useEffect(() => {
    (async () => {
      if (!wallet.connected) {
        setPrice(null);
        return;
      }
      setLoadingPrice(true);
      try {
        const cm = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE)); // mintAuthority = guard
        const guard = await fetchCandyGuard(umi, cm.mintAuthority);

        const solPay = guard.guards?.solPayment; // Option<SolPayment>
        if (solPay && isSome(solPay)) {
          const lamportsBp = solPay.value.lamports.basisPoints;
          const lamports =
            typeof lamportsBp === "bigint"
              ? Number(lamportsBp)
              : Number(lamportsBp);
          setPrice(lamports / LAMPORTS_PER_SOL); // e.g. 10000000 / 1e9 = 0.01
        } else {
          setPrice(null);
        }
      } catch (e) {
        console.error(e);
        setPrice(null);
      } finally {
        setLoadingPrice(false);
      }
    })();
  }, [umi, wallet.connected]);

  const handleMint = async (index: number) => {
    if (!wallet.publicKey) {
      setMsg("Please connect your wallet first.");
      return;
    }
    setMintingIndex(index);
    setMsg("");

    try {
      // 1) Create a new mint for the NFT
      const nftMint = generateSigner(umi);

      // 2) Collection Update Authority = wallet that owns the collection
      const collectionUpdateAuthority = publicKey(wallet.publicKey.toBase58());

      // 3) Minting (only solPayment guard → no extra mintArgs needed)
      const result = await mintV2(umi, {
        candyMachine: publicKey(CANDY_MACHINE),
        collectionMint: publicKey(COLLECTION_MINT),
        collectionUpdateAuthority,
        nftMint,
        // mintArgs: {} // add if you later use guards with args
      }).sendAndConfirm(umi);

      setMsg(`✅ Mint success. Tx: ${result.signature}`);
    } catch (e) {
      console.error(e);
      setMsg(
        "❌ Mint failed. Check your balance and guard requirements, then try again."
      );
    } finally {
      setMintingIndex(null);
    }
  };

  if (!wallet.connected)
    return <p>🔌 Please connect your wallet to mint an NFT.</p>;

  return (
    <div>
      <h2>Select an NFT to Mint</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {Object.entries(nfts)
          .filter(([key]) => key !== "-1")
          .map(([key, nft]: any, index) => (
            <div
              key={key}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: "1rem",
                width: 200,
              }}
            >
              <img
                src={nft.image_link}
                alt={nft.name}
                style={{ width: "100%" }}
              />
              <p style={{ margin: "0.5rem 0" }}>{nft.name}</p>

              <p style={{ margin: "0.25rem 0 0.5rem" }}>
                {loadingPrice ? (
                  "Loading price..."
                ) : price != null ? (
                  <>
                    Price: <strong>{price.toFixed(2)} SOL</strong>
                  </>
                ) : (
                  "Price: —"
                )}
              </p>

              <button
                onClick={() => handleMint(index)}
                disabled={mintingIndex !== null}
                style={{ width: "100%" }}
              >
                {mintingIndex === index ? "Minting..." : "Mint"}
              </button>
            </div>
          ))}
      </div>

      {msg && <p style={{ marginTop: "1rem" }}>{msg}</p>}
    </div>
  );
}
