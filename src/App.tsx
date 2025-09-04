import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import "@solana/wallet-adapter-react-ui/styles.css";
import RandomMint from "./pages/RandomMint";
import SelectMint from "./pages/SelectMint";
import { useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";

export default function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const endpoint = import.meta.env.VITE_SOLANA_RPC || clusterApiUrl("devnet");

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Router>
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "12px 16px",
                borderBottom: "1px solid #eee",
              }}
            >
              <nav style={{ display: "flex", gap: 12 }}>
                <Link to="/random-mint" style={{ textDecoration: "none" }}>
                  🎲 Random Mint
                </Link>
                <Link to="/select-mint" style={{ textDecoration: "none" }}>
                  🖼️ Select Mint
                </Link>
              </nav>
              <WalletMultiButton />
            </header>
            <main style={{ padding: "16px" }}>
              <Routes>
                {/* Redirect root to Select Mint (no separate home body anymore) */}
                <Route
                  path="/"
                  element={<Navigate to="/select-mint" replace />}
                />
                <Route path="/random-mint" element={<RandomMint />} />
                <Route path="/select-mint" element={<SelectMint />} />
                {/* Fallback to Select Mint */}
                <Route
                  path="*"
                  element={<Navigate to="/select-mint" replace />}
                />
              </Routes>
            </main>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
