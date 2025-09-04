import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";
import RandomMint from "./pages/RandomMint";
import SelectMint from "./pages/SelectMint";
import { useMemo } from "react";

export default function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={clusterApiUrl("devnet")}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Router>
            <div style={{ padding: "2rem" }}>
              <h1>NFT Mint App</h1>
              <WalletMultiButton />
              <nav style={{ marginTop: "1rem" }}>
                <Link to="/random-mint" style={{ marginRight: "1rem" }}>
                  🎲 Random Mint
                </Link>
                <Link to="/select-mint">🖼️ Select NFT to Mint</Link>
              </nav>
              <Routes>
                <Route path="/random-mint" element={<RandomMint />} />
                <Route path="/select-mint" element={<SelectMint />} />
              </Routes>
            </div>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
