import { useEffect, useRef, useState } from "react";
import "./App.css";

/* Types for global vars from /public/scripts */
interface Inscription {
  data: string;
  mediaType: string;
  metaDataTemplate: null;
  toAddress: string;
}
interface Lock {
  address: string;
  block: number;
  satoshisToLock: number;
}
interface Payer {
  walletAddress: string;
}
declare const lockscribeTx: (
  inscription: Inscription,
  lock: Lock,
  payer: Payer
) => string;
declare const broadcast: any;
declare const setupWallet: any;
declare const restoreWallet: any;
declare const backupWallet: any;
declare const getWalletBalance: any;
declare const getBlock: any;
declare const unlockCoins: any;

export default function App() {
  const [connecting, setConnecting] = useState(false);
  const [connectedWalletAddress, setConnectedWalletAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [tipMin, setTipMin] = useState<number>()
  const [unlocking, setUnlocking] = useState(false)
  const fileUploadRef = useRef<HTMLInputElement>(null);
  async function handleRestoreWallet() {
    if (fileUploadRef.current) {
      fileUploadRef.current.click();
    }
  }
  async function handleNewWallet() {
    setConnecting(true);
    try {
      await setupWallet();
      const addr = localStorage.getItem("walletAddress");
      if (typeof addr !== "string") {
        throw new Error("Error connecting wallet");
      }
      setConnectedWalletAddress(addr);
    } catch (e) {
      alert(e);
    }
    setConnecting(false);
  }
  async function handleDisconnect() {
    try {
      // eslint-disable-next-line no-restricted-globals
      const hasBackup = confirm("have you backed up your keys?");
      if (hasBackup) {
        localStorage.clear();
        setConnectedWalletAddress("");
      }
    } catch (e) {
      alert(e);
    }
  }
  useEffect(() => {
    const addr = localStorage.getItem("walletAddress");
    if (typeof addr === "string") {
      setConnectedWalletAddress(addr);
      handleRefreshBalance();
    }
  }, [connectedWalletAddress]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bsvAmt = Number(formData.get("bsv"));
    setStatus("submitting");
    try {
      const bsv = await handleRefreshBalance();
      console.log('bsvAmt', bsvAmt)
      if (bsv < bsvAmt) {
        throw new Error("Insufficient balance");
      }
      const block = Number(formData.get("block"));
      if (!block) throw new Error("Invalid block.");
      const tip = await getBlock()
      if (block <= tip) {
        throw new Error("Only future blocks are valid.")
      }
      const ordAddress = localStorage.getItem("ownerAddress");
      const bsvAddress = localStorage.getItem("walletAddress");
      if (!ordAddress || !bsvAddress)
        throw new Error("Error getting addresses.");
      const inscription: Inscription = {
        data: `${block}.lockmap`,
        mediaType: "text/plain",
        metaDataTemplate: null,
        toAddress: ordAddress,
      };
      console.log('inscription', inscription)
      const lock: Lock = {
        address: bsvAddress,
        block,
        satoshisToLock: parseInt((bsvAmt * 100_000_000).toString(), 10),
      };
      console.log('lock', lock)
      const payer: Payer = {
        walletAddress: bsvAddress,
      };
      console.log('payer', payer)
      const rawTx = await lockscribeTx(inscription, lock, payer);
      const result = await broadcast(rawTx);
      console.log('broadcast result', JSON.stringify(result))
      alert("successfully broadcasted");
    } catch (e) {
      console.error(e);
      alert(e);
    } finally {
      setStatus("idle");
    }
  };

  async function handleRefreshBalance() {
    const sats = await getWalletBalance();
    const bsv = sats / 100_000_000;
    setBalance(bsv);
    return bsv;
  }

  useEffect(() => {
    const getTipMin = async () => {
      const t = await getBlock()
      setTipMin(t)
    }
    getTipMin()
    const interval = setInterval(getTipMin, 30_000)
    return () => clearInterval(interval)
  }, [])

  const handleUnlock: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setUnlocking(true)
    try {
      const formData = new FormData(e.currentTarget);
      const txid = String(formData.get("txid"))
      const walletAddress = localStorage.getItem("walletAddress")
      const walletKey = localStorage.getItem("walletKey")
      const rawTx = await unlockCoins(walletKey, walletAddress, txid)
      const unlockResult = await broadcast(rawTx)
      alert(unlockResult)
    } catch (e) {
      console.error(e)
      alert(e);
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: "2px" }}>
        Lockmap Minter
        <div style={{ display: "inline-block", marginLeft: "12px" }}>
          <a href="https://github.com/remjx/lockmap-minter">
            <img
              src="/github.png"
              alt="source code"
              height={32}
              width={32}
            />
          </a>
        </div>
      </h1>
      <div style={{ marginBottom: "16px" }}>
        Follow{" "}
        <a
          href="https://x.com/lockinalswallet"
          target="_blank"
          rel="noreferrer"
        >
          @lockinalswallet
        </a>
      </div>

      {!connectedWalletAddress ? (
        <>
          <button
            disabled={connecting}
            onClick={handleNewWallet}
            style={{ marginRight: "8px" }}
          >
            new shua wallet
          </button>
          <button disabled={connecting} onClick={handleRestoreWallet}>
            restore shua wallet
          </button>
          <input
            ref={fileUploadRef}
            type="file"
            id="uploadFile"
            accept=".json"
            hidden
            onChange={(e: any) => {
              const files = e.target.files;
              const file = files[0];
              const reader = new FileReader();
              setConnecting(true);
              reader.onload = (e) => {
                try {
                  const json = JSON.parse(e?.target?.result as string);
                  restoreWallet(json.ordPk, json.payPk);
                  setConnectedWalletAddress(
                    String(localStorage.getItem("walletAddress"))
                  );
                } catch (e) {
                  console.log(e);
                  alert(e);
                  setConnectedWalletAddress("");
                  throw new Error("Error restoring wallet.");
                }
              };
              setConnecting(false);
              reader.readAsText(file);
            }}
          />
        </>
      ) : (
        <>
          <div>
            connected wallet address:{" "}
            <a
              href={`https://whatsonchain.com/address/${connectedWalletAddress}`}
              target="_blank"
              rel="noreferrer"
            >
              {connectedWalletAddress}
            </a>
          </div>
          <div style={{ marginBottom: "8px" }}>
            balance: {balance} BSV{" "}
            <button onClick={handleRefreshBalance}>refresh balance</button>
          </div>
          <button
            disabled={connecting}
            onClick={handleDisconnect}
            style={{ marginRight: "8px" }}
          >
            disconnect wallet
          </button>
          <button disabled={connecting} onClick={backupWallet}>
            back up wallet
          </button>
          <br />
          <br />
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ color: "gray", marginTop: "12px" }}>lock:</div>
              <div>
                <label>bitcoins to lock: </label>
                <input name="bsv" type="number" value={0.01} />
              </div>
              <div>
                current block height: {tipMin}
              </div>
              <div>
                <label>lockmap #: </label>
                <input
                  name="block"
                  type="number"
                  min={tipMin}
                  disabled={status === "submitting"}
                />
              </div>
            </div>
            <div style={{ color: "red", marginTop: "12px" }}>
              warning: use this experimental tool at your own risk.
              <br />
            </div>
            <div>
                to check if a lockmap has been claimed, search <a href={`https://hodlnet.sh`} target="_blank" rel="noreferrer">hodlnet.sh</a> for [blocknumber].lockmap
                a valid mint tx looks like <a href="/example.png" target="_blank">this</a>
                <br />
            </div>
            <br />
            <button disabled={status === "submitting"}>
              {status === "submitting" ? "submitting" : "submit"}
            </button>
          </form>
          <br />
          <div>
            Once minted, lockmaps are immediately tradeable as 1SatOrdinals. Import your SHUAllet keys into a 1Sat-compatible wallet/marketplace.
          </div>
          <br />
          <div>unlock:</div>
          <form onSubmit={handleUnlock}>
              <input placeholder="txid" name="txid" type="text" disabled={unlocking}/>
            <button type="submit" disabled={unlocking}>unlock</button>
          </form>
          <br/>
        </>
      )}
    </div>
  );
}
