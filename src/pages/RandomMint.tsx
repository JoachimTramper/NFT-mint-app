import { useEffect, useMemo, useState } from "react";
import { clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

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

const CANDY_MACHINE = import.meta.env.VITE_CANDY_MACHINE!;
const COLLECTION_MINT = import.meta.env.VITE_COLLECTION_MINT!;

export default function RandomMint() {
  const wallet = useWallet();

  const [isMinting, setIsMinting] = useState(false);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Friendly error messages
  const friendlyError = (e: any) => {
    const msg = String(e?.message ?? e ?? "").toLowerCase();
    if (msg.includes("insufficient"))
      return "❌ Insufficient SOL on devnet. Please airdrop and try again.";
    if (msg.includes("user rejected") || msg.includes("rejected the request"))
      return "⛔ Transaction rejected by wallet.";
    return "❌ Mint failed. Check your balance and guard requirements, then try again.";
  };

  // Umi instance (RPC = devnet) + candy machine plugin + wallet identity
  const umi = useMemo(() => {
    const u = createUmi(clusterApiUrl("devnet")).use(mplCandyMachine());
    if (wallet?.connected) u.use(walletAdapterIdentity(wallet));
    return u;
  }, [wallet?.connected, wallet]);

  const fetchCandyMachineData = async () => {
    if (!wallet.connected) return;
    setLoading(true);
    setMessage("");
    try {
      // 1) Retrieve Candy Machine
      const cm = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE));

      // Determine remaining (robust for different field names)
      const itemsAvailable = Number(
        (cm as any).itemsAvailable ?? (cm as any).data?.itemsAvailable ?? 0
      );
      const itemsMinted = Number(
        (cm as any).itemsMinted ?? (cm as any).itemsRedeemed ?? 0
      );
      const rem = Math.max(itemsAvailable - itemsMinted, 0);
      setRemaining(Number.isFinite(rem) ? rem : null);

      // 2) Candy Guard + price (solPayment Option)
      const guard = await fetchCandyGuard(umi, cm.mintAuthority);
      const solPay = guard.guards?.solPayment; // Option<SolPayment>
      if (solPay && isSome(solPay)) {
        // Umi: lamports is Amount → .basisPoints (bigint)
        const lamportsBp = solPay.value.lamports.basisPoints;
        const lamports = Number(lamportsBp);
        setPrice(lamports / LAMPORTS_PER_SOL); // 10000000 / 1e9 = 0.01
      } else {
        setPrice(null);
      }
    } catch (e) {
      console.error("Failed to fetch candy machine:", e);
      setMessage("Candy Machine not found.");
      setRemaining(null);
      setPrice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wallet.connected) {
      fetchCandyMachineData();
    } else {
      setRemaining(null);
      setPrice(null);
      setMessage("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.connected]);

  const handleMint = async () => {
    if (!wallet.publicKey) {
      setMessage("Please connect your wallet first.");
      return;
    }
    setIsMinting(true);
    setMessage("");

    try {
      const nftMint = generateSigner(umi);
      const collectionUpdateAuthority = publicKey(wallet.publicKey.toBase58());

      const result = await mintV2(umi, {
        candyMachine: publicKey(CANDY_MACHINE),
        collectionMint: publicKey(COLLECTION_MINT),
        collectionUpdateAuthority,
        nftMint,
        // mintArgs: {}  // not needed for just a solPayment
      }).sendAndConfirm(umi);

      setMessage(
        `✅ Mint success. View on explorer: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`
      );
      // Update local counter
      setRemaining((prev) =>
        typeof prev === "number" ? Math.max(prev - 1, 0) : prev
      );
    } catch (err: any) {
      console.error(err);
      setMessage(friendlyError(err));
    } finally {
      setIsMinting(false);
    }
  };

  if (!wallet.connected) {
    return <p>🔌 Please connect your wallet to mint an NFT.</p>;
  }

  return (
    <div>
      <p>
        {loading
          ? "Loading mint info..."
          : remaining === 0
          ? "🛑 Sold out"
          : `Remaining NFTs: ${remaining ?? "—"}`}
      </p>

      <p>
        Mint Price:{" "}
        {loading ? (
          "Loading..."
        ) : price != null ? (
          <strong>{price.toFixed(2)} SOL</strong>
        ) : (
          "—"
        )}
      </p>

      {/* Optional: extra sold-out label near button */}
      {remaining === 0 && !loading && (
        <p style={{ color: "#c00", margin: "0.25rem 0" }}>🛑 Sold out</p>
      )}

      <button
        onClick={handleMint}
        disabled={isMinting || loading || remaining === 0}
      >
        {isMinting ? "Minting..." : remaining === 0 ? "Sold out" : "Mint NFT"}
      </button>

      {message && <p style={{ marginTop: "0.75rem" }}>{message}</p>}
    </div>
  );
}
