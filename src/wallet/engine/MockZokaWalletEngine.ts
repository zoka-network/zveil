/**
 * MockZokaWalletEngine — UI development only.
 *
 * ⚠️  This engine performs NO real cryptography. It exists solely to let the
 * wallet UI be built and tested before the official Zoka Rust/WASM bundle is
 * wired in. The UI MUST display "Development mode — cryptographic engine not
 * connected." whenever this engine is active.
 *
 * Every method here is a placeholder that returns deterministic mock data.
 * Replace with WasmZokaWalletEngine before shipping.
 */

import type {
  BroadcastResult,
  BuildTransactionParams,
  DerivedWallet,
  Mnemonic,
  OpaqueKey,
  ProvedZokaTransaction,
  ScanWalletParams,
  ScanWalletResult,
  SignedZokaTransaction,
  UnsignedZokaTransaction,
  ZokaWalletEngine,
} from "./ZokaWalletEngine";

const MOCK_WORDS = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
  "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
  "acoustic", "acquire", "across", "action", "actor", "actress", "actual", "adapt",
];

function randomWords(count: number): string {
  const out: string[] = [];
  const bytes = new Uint8Array(count);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < count; i++) {
    out.push(MOCK_WORDS[bytes[i] % MOCK_WORDS.length]);
  }
  return out.join(" ");
}

const opaqueSymbol = Symbol("mock-opaque-key");

function makeOpaqueHandle(): OpaqueKey {
  return { __opaque: "zoka-opaque-key", [opaqueSymbol]: crypto.randomUUID() } as OpaqueKey;
}

function fakeHex(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class MockZokaWalletEngine implements ZokaWalletEngine {
  readonly kind = "mock" as const;

  async generateWallet(): Promise<Mnemonic> {
    // Zoka's real wordlist and word count are unknown here. 12 is a placeholder.
    const phrase = randomWords(12);
    return { phrase, wordCount: 12 };
  }

  async validateMnemonic(mnemonic: string): Promise<boolean> {
    const words = mnemonic.trim().split(/\s+/);
    // Placeholder: accept 12 or 24 words from the mock wordlist.
    if (words.length !== 12 && words.length !== 24) return false;
    return words.every((w) => MOCK_WORDS.includes(w.toLowerCase()));
  }

  async restoreWallet(mnemonic: string): Promise<DerivedWallet> {
    return this.deriveWallet(mnemonic);
  }

  async deriveWallet(_mnemonic: string): Promise<DerivedWallet> {
    // Placeholder address — NOT a real Zoka address.
    return {
      primaryAddress: {
        value: `zoka1mock${fakeHex(28)}`,
        index: 0,
      },
      publicScanKey: fakeHex(32),
      publicSpendKey: fakeHex(32),
      secretHandle: makeOpaqueHandle(),
    };
  }

  async scanWallet(params: ScanWalletParams): Promise<ScanWalletResult> {
    // Simulate progressive scan
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 60));
      params.onProgress?.(
        params.fromHeight + Math.floor(((params.toHeight - params.fromHeight) * i) / steps),
      );
    }
    return {
      detectedOutputs: [],
      lastScannedHeight: params.toHeight,
      balanceAvailable: "0",
      balancePending: "0",
    };
  }

  async buildTransaction(params: BuildTransactionParams): Promise<UnsignedZokaTransaction> {
    const fee = params.feePreference === "high" ? "2000" : params.feePreference === "low" ? "500" : "1000";
    return {
      __brand: "UnsignedZokaTransaction",
      fee,
      total: (BigInt(params.amount) + BigInt(fee)).toString(),
      summary: {
        recipient: params.recipient.value,
        amount: params.amount,
      },
    };
  }

  async proveTransaction(_tx: UnsignedZokaTransaction): Promise<ProvedZokaTransaction> {
    await new Promise((r) => setTimeout(r, 300));
    return { __brand: "ProvedZokaTransaction" };
  }

  async signTransaction(_tx: ProvedZokaTransaction): Promise<SignedZokaTransaction> {
    return {
      __brand: "SignedZokaTransaction",
      raw: fakeHex(128),
      txId: fakeHex(32),
    };
  }

  async validateAddress(address: string): Promise<boolean> {
    // Placeholder: real validation requires the Zoka canonical decoder.
    return /^zoka1[a-z0-9]{20,}$/.test(address);
  }

  destroySensitiveState(): void {
    // No real secret material held. WASM engine must actually zero-out memory.
  }
}

/**
 * Not implemented yet. Wire the official Zoka WASM bundle here.
 *
 * Expected steps once the Rust crate is available:
 *   1. Compile with wasm-pack --target web --release
 *   2. Place the .wasm binary in public/wasm/zoka_core_bg.wasm
 *   3. Place the glue (zoka_core.js + zoka_core_bg.js) under src/wasm/
 *   4. Implement this class delegating every method to the canonical exports.
 */
export class WasmZokaWalletEngine implements ZokaWalletEngine {
  readonly kind = "wasm" as const;

  private notReady(method: string): never {
    throw new Error(
      `WasmZokaWalletEngine.${method}: official Zoka WASM bundle is not integrated yet. ` +
        `See docs/WASM_INTEGRATION.md.`,
    );
  }

  generateWallet(): Promise<Mnemonic> { return this.notReady("generateWallet"); }
  validateMnemonic(): Promise<boolean> { return this.notReady("validateMnemonic"); }
  restoreWallet(): Promise<DerivedWallet> { return this.notReady("restoreWallet"); }
  deriveWallet(): Promise<DerivedWallet> { return this.notReady("deriveWallet"); }
  scanWallet(): Promise<ScanWalletResult> { return this.notReady("scanWallet"); }
  buildTransaction(): Promise<UnsignedZokaTransaction> { return this.notReady("buildTransaction"); }
  proveTransaction(): Promise<ProvedZokaTransaction> { return this.notReady("proveTransaction"); }
  signTransaction(): Promise<SignedZokaTransaction> { return this.notReady("signTransaction"); }
  validateAddress(): Promise<boolean> { return this.notReady("validateAddress"); }
  destroySensitiveState(): void { /* no-op until integrated */ }
}

// Re-export the type for convenience.
export type { BroadcastResult };
