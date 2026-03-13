import pino from "pino";
import { nanoid } from "nanoid";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import { Screenshot, OCRResult, ScreenshotSchema, OCRResultSchema } from "./types";

/**
 * Screenshot Engine - Captures and processes screenshots with OCR
 */
export class ScreenshotEngine {
  private logger: pino.Logger;
  private ocrWorker: Tesseract.Worker | null = null;
  private isInitialized = false;

  constructor(logger: pino.Logger) {
    this.logger = logger;
  }

  /**
   * Initialize OCR worker
   */
  async initialize(): Promise<void> {
    try {
      this.logger.debug("Initializing OCR worker");
      this.ocrWorker = await Tesseract.createWorker({
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            this.logger.debug(
              { progress: m.progress },
              "OCR progress"
            );
          }
        },
      });

      await this.ocrWorker.loadLanguage("eng");
      await this.ocrWorker.initialize("eng");

      this.isInitialized = true;
      this.logger.info("OCR worker initialized");
    } catch (error) {
      this.logger.error({ error }, "Failed to initialize OCR");
      throw error;
    }
  }

  /**
   * Terminate OCR worker
   */
  async terminate(): Promise<void> {
    if (this.ocrWorker) {
      try {
        await this.ocrWorker.terminate();
        this.isInitialized = false;
        this.logger.debug("OCR worker terminated");
      } catch (error) {
        this.logger.warn({ error }, "Error terminating OCR worker");
      }
    }
  }

  /**
   * Process screenshot for OCR
   */
  async processScreenshot(
    imageBuffer: Buffer,
    applicationName?: string
  ): Promise<Screenshot> {
    if (!this.isInitialized) {
      throw new Error("Screenshot engine not initialized");
    }

    const screenshotId = `screenshot-${nanoid(12)}`;
    const timestamp = new Date();

    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Perform OCR
      const ocrResult = await this.performOCR(imageBuffer);

      // Create screenshot object
      const screenshot: Screenshot = {
        screenshotId,
        timestamp,
        imageBuffer,
        width,
        height,
        applicationName,
        ocrText: ocrResult.rawText,
        detectedElements: [], // Will be populated by element detector
        metadata: {
          ocr: {
            confidence: ocrResult.confidence,
            language: ocrResult.detectedLanguage,
            processingTime: ocrResult.processingTime,
          },
        },
      };

      // Validate
      const validated = ScreenshotSchema.parse(screenshot);

      this.logger.debug(
        {
          screenshotId,
          size: `${width}x${height}`,
          ocrConfidence: ocrResult.confidence.toFixed(2),
        },
        "Screenshot processed"
      );

      return validated;
    } catch (error) {
      this.logger.error(
        { error, screenshotId },
        "Failed to process screenshot"
      );
      throw error;
    }
  }

  /**
   * Perform OCR on image
   */
  private async performOCR(imageBuffer: Buffer): Promise<OCRResult> {
    if (!this.ocrWorker) {
      throw new Error("OCR worker not initialized");
    }

    const screenshotId = `screenshot-${nanoid(12)}`;
    const startTime = Date.now();

    try {
      // Convert buffer to base64 for Tesseract
      const base64Image = imageBuffer.toString("base64");
      const imageUrl = `data:image/png;base64,${base64Image}`;

      // Recognize text
      const result = await this.ocrWorker.recognize(imageUrl);

      const processingTime = Date.now() - startTime;
      const confidence = result.data.confidence / 100;

      // Extract blocks with confidence
      const blocks = result.data.words
        .filter((word) => word.confidence > 0)
        .reduce(
          (
            acc: Array<{
              text: string;
              confidence: number;
              bbox: { x0: number; y0: number; x1: number; y1: number };
            }>,
            word
          ) => {
            const lastBlock = acc[acc.length - 1];

            if (
              lastBlock &&
              lastBlock.bbox.y0 === word.bbox.y0 &&
              lastBlock.bbox.x1 + 5 > word.bbox.x0 // Close proximity
            ) {
              // Same line, merge
              lastBlock.text += " " + word.text;
              lastBlock.bbox.x1 = word.bbox.x1;
              lastBlock.confidence =
                (lastBlock.confidence + word.confidence / 100) / 2;
            } else {
              // New block
              acc.push({
                text: word.text,
                confidence: word.confidence / 100,
                bbox: {
                  x0: word.bbox.x0,
                  y0: word.bbox.y0,
                  x1: word.bbox.x1,
                  y1: word.bbox.y1,
                },
              });
            }

            return acc;
          },
          []
        );

      // Detect language
      const detectedLanguage = result.data.psm ? "eng" : undefined;

      const ocrResult: OCRResult = {
        screenshotId,
        rawText: result.data.text,
        confidence,
        blocks,
        detectedLanguage,
        processingTime,
      };

      // Validate
      const validated = OCRResultSchema.parse(ocrResult);

      this.logger.debug(
        {
          processingTime,
          confidence: confidence.toFixed(2),
          blockCount: blocks.length,
        },
        "OCR completed"
      );

      return validated;
    } catch (error) {
      this.logger.error({ error }, "OCR failed");
      throw error;
    }
  }

  /**
   * Compare two screenshots for differences
   */
  async compareScreenshots(
    before: Buffer,
    after: Buffer
  ): Promise<{
    diffPercentage: number;
    hasSignificantChanges: boolean;
  }> {
    try {
      const beforeMetadata = await sharp(before).metadata();
      const afterMetadata = await sharp(after).metadata();

      // Simple comparison: resize both to same size and compare
      const size = 256;
      const resizedBefore = await sharp(before)
        .resize(size, size)
        .toBuffer();
      const resizedAfter = await sharp(after).resize(size, size).toBuffer();

      // Calculate difference (simplified)
      let diffPixels = 0;
      const totalPixels = size * size;

      for (let i = 0; i < resizedBefore.length; i++) {
        if (resizedBefore[i] !== resizedAfter[i]) {
          diffPixels++;
        }
      }

      const diffPercentage = (diffPixels / totalPixels) * 100;
      const hasSignificantChanges = diffPercentage > 10; // 10% threshold

      this.logger.debug(
        { diffPercentage: diffPercentage.toFixed(2), hasSignificantChanges },
        "Screenshots compared"
      );

      return { diffPercentage, hasSignificantChanges };
    } catch (error) {
      this.logger.error({ error }, "Screenshot comparison failed");
      throw error;
    }
  }

  /**
   * Crop screenshot to region
   */
  async cropScreenshot(
    imageBuffer: Buffer,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer> {
    try {
      const cropped = await sharp(imageBuffer)
        .extract({
          left: Math.floor(x),
          top: Math.floor(y),
          width: Math.floor(width),
          height: Math.floor(height),
        })
        .toBuffer();

      this.logger.debug(
        { region: `${x},${y},${width},${height}` },
        "Screenshot cropped"
      );

      return cropped;
    } catch (error) {
      this.logger.error({ error }, "Screenshot crop failed");
      throw error;
    }
  }

  /**
   * Highlight regions on screenshot
   */
  async highlightRegions(
    imageBuffer: Buffer,
    regions: Array<{ x: number; y: number; width: number; height: number }>
  ): Promise<Buffer> {
    try {
      let image = sharp(imageBuffer);

      for (const region of regions) {
        const svgOverlay = `
          <svg width="${region.width}" height="${region.height}">
            <rect x="0" y="0" width="${region.width}" height="${region.height}" 
                  fill="none" stroke="red" stroke-width="2"/>
          </svg>
        `;

        image = image.composite([
          {
            input: Buffer.from(svgOverlay),
            left: Math.floor(region.x),
            top: Math.floor(region.y),
          },
        ]);
      }

      const highlighted = await image.toBuffer();

      this.logger.debug(
        { regionCount: regions.length },
        "Regions highlighted"
      );

      return highlighted;
    } catch (error) {
      this.logger.error({ error }, "Region highlighting failed");
      throw error;
    }
  }

  /**
   * Get screenshot hash for deduplication
   */
  async getScreenshotHash(imageBuffer: Buffer): Promise<string> {
    try {
      const crypto = await import("crypto");
      const hash = crypto
        .createHash("sha256")
        .update(imageBuffer)
        .digest("hex");

      return hash;
    } catch (error) {
      this.logger.error({ error }, "Hash calculation failed");
      throw error;
    }
  }

  /**
   * Optimize screenshot for storage
   */
  async optimizeScreenshot(
    imageBuffer: Buffer,
    quality: number = 80
  ): Promise<Buffer> {
    try {
      const optimized = await sharp(imageBuffer)
        .jpeg({ quality, progressive: true })
        .toBuffer();

      const originalSize = imageBuffer.length;
      const optimizedSize = optimized.length;
      const reduction =
        ((originalSize - optimizedSize) / originalSize) * 100;

      this.logger.debug(
        {
          originalSize,
          optimizedSize,
          reduction: reduction.toFixed(1) + "%",
        },
        "Screenshot optimized"
      );

      return optimized;
    } catch (error) {
      this.logger.error({ error }, "Screenshot optimization failed");
      throw error;
    }
  }
}
