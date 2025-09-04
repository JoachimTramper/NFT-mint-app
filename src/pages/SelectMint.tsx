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

const CANDY_MACHINE = import.meta.env.VITE_CANDY_MACHINE!;
const COLLECTION_MINT = import.meta.env.VITE_COLLECTION_MINT!;

export default function SelectMint() {
  const wallet = useWallet();

  const [price, setPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [msg, setMsg] = useState("");
  const [mintingIndex, setMintingIndex] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  // friendly error messages
  const friendlyError = (e: any) => {
    const m = String(e?.message ?? e ?? "").toLowerCase();
    if (m.includes("insufficient"))
      return "❌ Insufficient SOL on devnet. Airdrop and try again.";
    if (m.includes("user rejected") || m.includes("rejected the request"))
      return "⛔ Transaction rejected by wallet.";
    return "❌ Mint failed. Check your balance and guard requirements, then try again.";
  };

  // Umi instance (RPC = devnet) + candy machine plugin + wallet identity
  const umi = useMemo(() => {
    const u = createUmi(clusterApiUrl("devnet")).use(mplCandyMachine());
    if (wallet) u.use(walletAdapterIdentity(wallet));
    return u;
  }, [wallet]);

  // Price + remaining from Candy Machine/Guard
  useEffect(() => {
    (async () => {
      if (!wallet.connected) {
        setPrice(null);
        setRemaining(null);
        return;
      }
      setLoadingPrice(true);
      try {
        const cm = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE)); // mintAuthority = guard

        // calculate remaining from Candy Machine state
        const itemsAvailable = Number(
          (cm as any).itemsAvailable ?? (cm as any).data?.itemsAvailable ?? 0
        );
        const itemsMinted = Number(
          (cm as any).itemsMinted ?? (cm as any).itemsRedeemed ?? 0
        );
        const rem = Math.max(itemsAvailable - itemsMinted, 0);
        setRemaining(Number.isFinite(rem) ? rem : null);

        // price from Candy Guard (solPayment)
        const guard = await fetchCandyGuard(umi, cm.mintAuthority);
        const solPay = guard.guards?.solPayment; // Option<SolPayment>
        if (solPay && isSome(solPay)) {
          const lamportsBp = solPay.value.lamports.basisPoints; // bigint
          const lamports = Number(lamportsBp);
          setPrice(lamports / LAMPORTS_PER_SOL); // bv. 10000000 / 1e9 = 0.01
        } else {
          setPrice(null);
        }
      } catch (e) {
        console.error(e);
        setPrice(null);
        setRemaining(null);
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
      }).sendAndConfirm(umi);

      setMsg(
        `✅ Mint success. View on explorer: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`
      );

      // remaining update locally
      setRemaining((prev) =>
        typeof prev === "number" ? Math.max(prev - 1, 0) : prev
      );
    } catch (e) {
      console.error(e);
      setMsg(friendlyError(e));
    } finally {
      setMintingIndex(null);
    }
  };

  if (!wallet.connected)
    return <p>🔌 Please connect your wallet to mint an NFT.</p>;

  return (
    <div>
      <h2>Select an NFT to Mint</h2>

      {/* status at the top */}
      <p style={{ margin: "0.5rem 0" }}>
        {loadingPrice
          ? "Loading mint info..."
          : remaining === 0
          ? "🛑 Sold out"
          : remaining != null
          ? `Remaining: ${remaining}`
          : "—"}
      </p>

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
                disabled={
                  mintingIndex !== null || loadingPrice || remaining === 0
                }
                style={{ width: "100%" }}
              >
                {mintingIndex === index
                  ? "Minting..."
                  : remaining === 0
                  ? "Sold out"
                  : "Mint"}
              </button>
            </div>
          ))}
      </div>

      {msg && <p style={{ marginTop: "1rem" }}>{msg}</p>}
    </div>
  );
}
