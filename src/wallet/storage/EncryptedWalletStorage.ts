/**
 * EncryptedWalletStorage — interface for locally-encrypted wallet containers.
 *
 * The KDF (Argon2id? scrypt?) and container format MUST be defined by the
 * Zoka team before implementation. Do not choose here.
 *
 * Requirements when implemented:
 *  - Web Crypto API only (SubtleCrypto).
 *  - Authenticated encryption (AES-GCM or equivalent).
 *  - Random salt + IV per container.
 *  - Never store the password anywhere.
 *  - Container payload must be opaque bytes — no JSON of plaintext keys.
 */

export interface EncryptedContainer {
  readonly version: number;
  readonly kdf: string;
  readonly kdfParams: Record<string, unknown>;
  readonly cipher: string;
  readonly saltB64: string;
  readonly ivB64: string;
  readonly ciphertextB64: string;
}

export interface WalletStorageMode {
  readonly mode: "ephemeral" | "device";
}

export interface EncryptedWalletStorage {
  save(container: EncryptedContainer): Promise<void>;
  load(): Promise<EncryptedContainer | null>;
  clear(): Promise<void>;
  encrypt(plaintext: Uint8Array, password: string): Promise<EncryptedContainer>;
  decrypt(container: EncryptedContainer, password: string): Promise<Uint8Array>;
}

const STORAGE_KEY = "zoka.wallet.container.v0";

/**
 * Placeholder implementation — DO NOT ship. Real KDF parameters must be
 * approved by the Zoka team.
 */
export class PlaceholderWalletStorage implements EncryptedWalletStorage {
  async save(container: EncryptedContainer): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(container));
  }

  async load(): Promise<EncryptedContainer | null> {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EncryptedContainer) : null;
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }

  async encrypt(_plaintext: Uint8Array, _password: string): Promise<EncryptedContainer> {
    throw new Error(
      "PlaceholderWalletStorage.encrypt: KDF parameters not defined yet. " +
        "Waiting on official Zoka specification.",
    );
  }

  async decrypt(_container: EncryptedContainer, _password: string): Promise<Uint8Array> {
    throw new Error(
      "PlaceholderWalletStorage.decrypt: KDF parameters not defined yet.",
    );
  }
}
