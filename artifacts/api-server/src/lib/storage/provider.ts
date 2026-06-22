import type { File } from "@google-cloud/storage";
import {
  ObjectStorageService,
  objectStorageClient,
} from "../objectStorage";
import type { ObjectAclPolicy } from "../objectAcl";

/**
 * Abstract storage provider.
 *
 * The rest of the app depends ONLY on this interface, never on a concrete
 * backend. The default implementation ({@link ReplitGcsProvider}) is backed by
 * Replit App Storage (Google Cloud Storage) via the Replit sidecar. To switch
 * to AWS S3, Cloudflare R2 or self-hosted MinIO, implement this same interface
 * (all three speak the S3 API, so a single `S3CompatProvider` using
 * `@aws-sdk/client-s3` covers them) and select it in {@link getStorageProvider}
 * via the `STORAGE_PROVIDER` env var. No call sites need to change.
 */
export interface StorageProvider {
  readonly name: string;

  /**
   * Issue a presigned upload URL plus the stable object path the bytes will
   * live at. The client PUTs bytes directly to `uploadURL`; the backend never
   * proxies file bytes.
   */
  requestUpload(): Promise<{ uploadURL: string; objectPath: string }>;

  /**
   * Upload bytes generated on the server (e.g. a rendered certificate PDF) and
   * return the stable object path. Used for content the backend produces itself
   * rather than receiving from a client.
   */
  uploadBuffer(buffer: Buffer, contentType: string): Promise<string>;

  /** Resolve an object path (`/objects/...`) to a backend file handle. */
  getFile(objectPath: string): Promise<File>;

  /** Stream an object as a web `Response` with correct content headers. */
  streamObject(objectPath: string, cacheTtlSec?: number): Promise<Response>;

  /** Apply an ACL policy (owner + public/private visibility) to an object. */
  setAcl(objectPath: string, policy: ObjectAclPolicy): Promise<string>;

  /** Permanently delete the bytes for an object path. */
  deleteObject(objectPath: string): Promise<void>;

  /** Whether a user may read a given object given its ACL policy. */
  canRead(objectPath: string, userId?: string): Promise<boolean>;
}

class ReplitGcsProvider implements StorageProvider {
  readonly name = "replit-gcs";
  private svc = new ObjectStorageService();

  async requestUpload(): Promise<{ uploadURL: string; objectPath: string }> {
    const uploadURL = await this.svc.getObjectEntityUploadURL();
    const objectPath = this.svc.normalizeObjectEntityPath(uploadURL);
    return { uploadURL, objectPath };
  }

  async uploadBuffer(buffer: Buffer, contentType: string): Promise<string> {
    const uploadURL = await this.svc.getObjectEntityUploadURL();
    const put = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: new Uint8Array(buffer),
    });
    if (!put.ok) {
      throw new Error(
        `uploadBuffer failed: ${put.status} ${put.statusText}`,
      );
    }
    return this.svc.normalizeObjectEntityPath(uploadURL);
  }

  async getFile(objectPath: string): Promise<File> {
    return this.svc.getObjectEntityFile(objectPath);
  }

  async streamObject(
    objectPath: string,
    cacheTtlSec = 3600,
  ): Promise<Response> {
    const file = await this.svc.getObjectEntityFile(objectPath);
    return this.svc.downloadObject(file, cacheTtlSec);
  }

  async setAcl(
    objectPath: string,
    policy: ObjectAclPolicy,
  ): Promise<string> {
    return this.svc.trySetObjectEntityAclPolicy(objectPath, policy);
  }

  async deleteObject(objectPath: string): Promise<void> {
    const file = await this.svc.getObjectEntityFile(objectPath);
    await file.delete({ ignoreNotFound: true });
  }

  async canRead(objectPath: string, userId?: string): Promise<boolean> {
    const file = await this.svc.getObjectEntityFile(objectPath);
    return this.svc.canAccessObjectEntity({ userId, objectFile: file });
  }
}

let provider: StorageProvider | null = null;

/**
 * Returns the active storage provider singleton. Selection is driven by the
 * `STORAGE_PROVIDER` env var so the backend can be swapped without code
 * changes. Defaults to Replit App Storage (GCS).
 */
export function getStorageProvider(): StorageProvider {
  if (provider) return provider;
  const kind = (process.env.STORAGE_PROVIDER || "replit-gcs").toLowerCase();
  switch (kind) {
    // case "s3":
    // case "r2":
    // case "minio":
    //   provider = new S3CompatProvider(); // implement with @aws-sdk/client-s3
    //   break;
    case "replit-gcs":
    default:
      provider = new ReplitGcsProvider();
      break;
  }
  return provider;
}

export { objectStorageClient };
