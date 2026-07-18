/**
 * ZokaWalletEngine — canonical interface.
 *
 * NOTE: This interface defines the surface that any Zoka wallet engine must
 * expose. The definitive implementation MUST come from the official Zoka
 * Rust core compiled to WebAssembly (see WasmZokaWalletEngine).
 *
 * DO NOT implement cryptography, address encoding, derivation paths,
 * transaction serialization, nullifier calculation, ZK proofs, or any
 * consensus-relevant logic in TypeScript. Those must be provided by the
 * canonical Zoka WASM bundle.
 *
 * MockZokaWalletEngine (see MockZokaWalletEngine.ts) exists only to develop
 * the UI. It must never be used with real funds and must be visibly labeled
 * "Development mode — cryptographic engine not connected." in the UI.
 */

export interface Mnemonic {
  /** Space-separated words. Length and wordlist are Zoka-defined. */
  readonly phrase: string;
  /** Number of words. Populated by the engine, not assumed by the UI. */
  readonly wordCount: number;
}

export interface ZokaAddress {
  /** Canonical string form (Zoka-defined prefix + encoding). */
  readonly value: string;
  /** Optional subaddress index, only if Zoka supports it. */
  readonly index?: number;
}

/** Opaque key material — never expose bytes to the UI layer. */
export interface OpaqueKey {
  readonly __opaque: "zoka-opaque-key";
}

export interface DerivedWallet {
  readonly primaryAddress: ZokaAddress;
  /** Public scan key — safe to keep in memory. */
  readonly publicScanKey: string;
  /** Public spend key — safe to keep in memory. */
  readonly publicSpendKey: string;
  /** Opaque handle referring to secret keys held inside the engine. */
  readonly secretHandle: OpaqueKey;
}

export interface ScanWalletParams {
  readonly secretHandle: OpaqueKey;
  readonly fromHeight: number;
  readonly toHeight: number;
  readonly onProgress?: (height: number) => void;
}

export interface DetectedOutput {
  readonly txId: string;
  readonly blockHeight: number;
  readonly amount: string; // atomic units as string
  readonly nullifier: string;
  readonly spent: boolean;
}

export interface ScanWalletResult {
  readonly detectedOutputs: readonly DetectedOutput[];
  readonly lastScannedHeight: number;
  readonly balanceAvailable: string;
  readonly balancePending: string;
}

export interface BuildTransactionParams {
  readonly secretHandle: OpaqueKey;
  readonly recipient: ZokaAddress;
  readonly amount: string;
  readonly feePreference?: "low" | "normal" | "high";
}

export interface UnsignedZokaTransaction {
  readonly __brand: "UnsignedZokaTransaction";
  readonly fee: string;
  readonly total: string;
  readonly summary: {
    readonly recipient: string;
    readonly amount: string;
    readonly changeAddress?: string;
  };
}

export interface ProvedZokaTransaction {
  readonly __brand: "ProvedZokaTransaction";
}

export interface SignedZokaTransaction {
  readonly __brand: "SignedZokaTransaction";
  /** Serialized bytes ready for RPC broadcast. */
  readonly raw: string;
  readonly txId: string;
}

export interface BroadcastResult {
  readonly txId: string;
  readonly acceptedAt: number;
}

export interface ZokaWalletEngine {
  /** Identifier used by the UI to warn about non-production engines. */
  readonly kind: "mock" | "wasm";

  generateWallet(): Promise<Mnemonic>;
  validateMnemonic(mnemonic: string): Promise<boolean>;
  restoreWallet(mnemonic: string): Promise<DerivedWallet>;
  deriveWallet(mnemonic: string): Promise<DerivedWallet>;

  scanWallet(params: ScanWalletParams): Promise<ScanWalletResult>;

  buildTransaction(params: BuildTransactionParams): Promise<UnsignedZokaTransaction>;
  proveTransaction(tx: UnsignedZokaTransaction): Promise<ProvedZokaTransaction>;
  signTransaction(tx: ProvedZokaTransaction): Promise<SignedZokaTransaction>;

  /** Validates a Zoka address using canonical rules. */
  validateAddress(address: string): Promise<boolean>;

  /** Wipes any sensitive material held by the engine. */
  destroySensitiveState(): void;
}
