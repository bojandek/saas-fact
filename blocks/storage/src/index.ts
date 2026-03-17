import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Configuration options for the S3/R2 Storage client.
 */
export interface StorageConfig {
  /** The AWS region or R2 endpoint. */
  region: string;
  /** The S3/R2 bucket name. */
  bucketName: string;
  /** AWS Access Key ID or R2 Access Key ID. */
  accessKeyId: string;
  /** AWS Secret Access Key or R2 Secret Access Key. */
  secretAccessKey: string;
  /** Optional: Custom endpoint for S3 compatible storage like Cloudflare R2. */
  endpoint?: string;
}

/**
 * Represents a file to be uploaded.
 */
export interface UploadFile {
  /** The name of the file, including its path within the bucket (e.g., 'folder/subfolder/my-file.txt'). */
  fileName: string;
  /** The content type of the file (e.g., 'image/jpeg', 'application/pdf'). */
  contentType: string;
  /** The size of the file in bytes. */
  contentLength: number;
}

/**
 * Manages file operations (upload, download, delete) for S3-compatible storage like AWS S3 or Cloudflare R2,
 * primarily using presigned URLs for secure client-side access.
 */
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  /**
   * Creates an instance of StorageService.
   * @param config - The configuration object for the storage service.
   */
  constructor(config: StorageConfig) {
    this.bucketName = config.bucketName;
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.endpoint ? true : false, // Required for some S3-compatible services like MinIO or R2
    });
  }

  /**
   * Generates a presigned URL for uploading a file to the specified path in the bucket.
   * The client can then use this URL to directly upload the file without exposing AWS credentials.
   * @param file - Details of the file to be uploaded.
   * @param expiresIn - The number of seconds the presigned URL will be valid for. Defaults to 3600 seconds (1 hour).
   * @returns A promise that resolves to the presigned URL string.
   * @throws Error if the URL generation fails.
   */
  public async getPresignedUploadUrl(file: UploadFile, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: file.fileName,
      ContentType: file.contentType,
      ContentLength: file.contentLength,
    });
    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error("Error generating presigned upload URL:", error);
      throw new Error("Failed to generate presigned upload URL.");
    }
  }

  /**
   * Generates a presigned URL for downloading a file from the specified path in the bucket.
   * The client can then use this URL to directly download the file.
   * @param fileName - The name of the file to be downloaded, including its path within the bucket.
   * @param expiresIn - The number of seconds the presigned URL will be valid for. Defaults to 3600 seconds (1 hour).
   * @returns A promise that resolves to the presigned URL string.
   * @throws Error if the URL generation fails.
   */
  public async getPresignedDownloadUrl(fileName: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
    });
    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error("Error generating presigned download URL:", error);
      throw new Error("Failed to generate presigned download URL.");
    }
  }

  /**
   * Generates a presigned URL for deleting a file from the specified path in the bucket.
   * The client can then use this URL to directly delete the file.
   * @param fileName - The name of the file to be deleted, including its path within the bucket.
   * @param expiresIn - The number of seconds the presigned URL will be valid for. Defaults to 3600 seconds (1 hour).
   * @returns A promise that resolves to the presigned URL string.
   * @throws Error if the URL generation fails.
   */
  public async getPresignedDeleteUrl(fileName: string, expiresIn: number = 3600): Promise<string> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
    });
    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error("Error generating presigned delete URL:", error);
      throw new Error("Failed to generate presigned delete URL.");
    }
  }
}
