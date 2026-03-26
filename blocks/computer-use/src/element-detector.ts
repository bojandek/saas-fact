// @ts-nocheck
import pino from "pino";
import { nanoid } from "nanoid";
import { UIElement, UIElementSchema } from "./types";

/**
 * UI Element Detector - Detects clickable and interactive elements on screen
 */
export class ElementDetector {
  private logger: pino.Logger;
  private ocrData: Map<string, unknown> = new Map();

  constructor(logger: pino.Logger) {
    this.logger = logger;
  }

  /**
   * Detect elements from a web page via Playwright
   */
  async detectElementsFromPage(page: any): Promise<UIElement[]> {
    const elements: UIElement[] = [];

    try {
      // Get all interactive elements
      const elementData = await page.evaluate(() => {
        const elements = [];
        const selectors = [
          "button",
          "a",
          "input",
          "textarea",
          "select",
          "[role='button']",
          "[role='link']",
          "[role='menuitem']",
          "[onclick]",
        ];

        for (const selector of selectors) {
          const nodeList = document.querySelectorAll(selector);
          for (let i = 0; i < nodeList.length; i++) {
            const el = nodeList[i] as HTMLElement;
            const rect = el.getBoundingClientRect();

            // Only include visible elements
            if (rect.width > 0 && rect.height > 0) {
              elements.push({
                tagName: el.tagName.toLowerCase(),
                type: this.getElementType(el),
                text: (el as any).textContent?.substring(0, 100) || "",
                label: (el as any).label || (el as any).ariaLabel || "",
                value: (el as any).value || "",
                placeholder: (el as any).placeholder || "",
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                isClickable: this.isClickable(el),
                isVisible: this.isVisible(el),
                ariaLabel: el.getAttribute("aria-label") || "",
                attributes: this.extractAttributes(el),
              });
            }
          }
        }

        return elements;
      });

      // Convert to UIElement format
      for (const data of elementData) {
        const element: UIElement = {
          elementId: `elem-${nanoid(12)}`,
          type: this.mapElementType(data.type),
          label: data.label || data.text || undefined,
          text: data.text ? data.text.substring(0, 100) : undefined,
          coordinates: {
            x: data.x,
            y: data.y,
            width: data.width,
            height: data.height,
          },
          isClickable: data.isClickable,
          isVisible: data.isVisible,
          attributes: data.attributes,
          ariaLabel: data.ariaLabel || undefined,
          placeholder: data.placeholder || undefined,
          value: data.value || undefined,
          confidence: 0.95, // High confidence for page-based detection
        };

        elements.push(UIElementSchema.parse(element));
      }

      this.logger.debug(
        { elementCount: elements.length },
        "Elements detected from page"
      );

      return elements;
    } catch (error) {
      this.logger.error({ error }, "Failed to detect elements from page");
      throw error;
    }
  }

  /**
   * Detect elements from screenshot using OCR data
   */
  async detectElementsFromScreenshot(
    ocrBlocks: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>
  ): Promise<UIElement[]> {
    const elements: UIElement[] = [];

    try {
      // Create button-like elements from text blocks
      const buttonKeywords = [
        "button",
        "click",
        "submit",
        "cancel",
        "continue",
        "next",
        "back",
        "save",
        "delete",
        "download",
        "upload",
      ];

      for (const block of ocrBlocks) {
        const text = block.text.toLowerCase();
        const isButton = buttonKeywords.some((keyword) =>
          text.includes(keyword)
        );

        if (isButton || text.length < 50) {
          const elem: UIElement = {
            elementId: `elem-${nanoid(12)}`,
            type: isButton ? "button" : "text",
            text: block.text.substring(0, 100),
            coordinates: {
              x: Math.floor(block.bbox.x0),
              y: Math.floor(block.bbox.y0),
              width: Math.floor(block.bbox.x1 - block.bbox.x0),
              height: Math.floor(block.bbox.y1 - block.bbox.y0),
            },
            isClickable: isButton,
            isVisible: true,
            confidence: block.confidence,
          };

          elements.push(UIElementSchema.parse(elem));
        }
      }

      this.logger.debug(
        { elementCount: elements.length },
        "Elements detected from screenshot"
      );

      return elements;
    } catch (error) {
      this.logger.error({ error }, "Failed to detect elements from screenshot");
      throw error;
    }
  }

  /**
   * Find element by text content
   */
  async findElementByText(
    elements: UIElement[],
    searchText: string,
    partialMatch: boolean = true
  ): Promise<UIElement | undefined> {
    const normalizedSearch = searchText.toLowerCase().trim();

    return elements.find((elem) => {
      if (!elem.text) return false;

      const normalizedText = elem.text.toLowerCase();

      return partialMatch
        ? normalizedText.includes(normalizedSearch)
        : normalizedText === normalizedSearch;
    });
  }

  /**
   * Find clickable element at coordinates
   */
  async findElementAtCoordinates(
    elements: UIElement[],
    x: number,
    y: number
  ): Promise<UIElement | undefined> {
    return elements.find((elem) => {
      const { x: elemX, y: elemY, width, height } = elem.coordinates;
      return x >= elemX && x <= elemX + width && y >= elemY && y <= elemY + height;
    });
  }

  /**
   * Find closest element to coordinates
   */
  async findClosestElement(
    elements: UIElement[],
    x: number,
    y: number,
    maxDistance: number = 100
  ): Promise<UIElement | undefined> {
    let closestElement: UIElement | undefined;
    let minDistance = maxDistance;

    for (const elem of elements) {
      if (!elem.isClickable) continue;

      const { x: elemX, y: elemY, width, height } = elem.coordinates;
      const centerX = elemX + width / 2;
      const centerY = elemY + height / 2;

      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

      if (distance < minDistance) {
        minDistance = distance;
        closestElement = elem;
      }
    }

    return closestElement;
  }

  /**
   * Group elements by type
   */
  groupElementsByType(elements: UIElement[]): Record<string, UIElement[]> {
    const grouped: Record<string, UIElement[]> = {};

    for (const elem of elements) {
      if (!grouped[elem.type]) {
        grouped[elem.type] = [];
      }
      grouped[elem.type].push(elem);
    }

    return grouped;
  }

  /**
   * Filter clickable elements
   */
  getClickableElements(elements: UIElement[]): UIElement[] {
    return elements.filter((elem) => elem.isClickable && elem.isVisible);
  }

  /**
   * Filter visible elements
   */
  getVisibleElements(elements: UIElement[]): UIElement[] {
    return elements.filter((elem) => elem.isVisible);
  }

  /**
   * Get elements by confidence threshold
   */
  getElementsByConfidence(
    elements: UIElement[],
    threshold: number = 0.7
  ): UIElement[] {
    return elements.filter((elem) => elem.confidence >= threshold);
  }

  /**
   * Detect form fields
   */
  getFormFields(elements: UIElement[]): UIElement[] {
    return elements.filter((elem) =>
      ["input", "textarea", "select"].includes(elem.type)
    );
  }

  /**
   * Detect buttons
   */
  getButtons(elements: UIElement[]): UIElement[] {
    return elements.filter((elem) => elem.type === "button");
  }

  /**
   * Detect links
   */
  getLinks(elements: UIElement[]): UIElement[] {
    return elements.filter((elem) => elem.type === "link");
  }

  /**
   * Generate element descriptor for AI
   */
  generateElementDescriptor(elem: UIElement): string {
    const parts: string[] = [];

    if (elem.text) parts.push(`"${elem.text}"`);
    if (elem.label) parts.push(`label: "${elem.label}"`);
    if (elem.placeholder) parts.push(`placeholder: "${elem.placeholder}"`);
    if (elem.ariaLabel) parts.push(`aria: "${elem.ariaLabel}"`);

    parts.push(`type: ${elem.type}`);
    parts.push(
      `position: (${elem.coordinates.x}, ${elem.coordinates.y})`
    );

    return `${elem.type} [${parts.join(", ")}]`;
  }

  /**
   * Generate clickable element summary
   */
  generateClickableSummary(elements: UIElement[]): string {
    const clickable = this.getClickableElements(elements);
    const lines: string[] = [];

    for (let i = 0; i < clickable.length; i++) {
      const elem = clickable[i];
      lines.push(`[${i}] ${this.generateElementDescriptor(elem)}`);
    }

    return lines.join("\n");
  }

  /**
   * Map element type
   */
  private mapElementType(
    tagName: string
  ):
    | "button"
    | "input"
    | "text"
    | "link"
    | "image"
    | "menu"
    | "modal"
    | "list"
    | "icon"
    | "canvas"
    | "unknown" {
    const typeMap: Record<string, any> = {
      button: "button",
      a: "link",
      input: "input",
      textarea: "input",
      select: "input",
      img: "image",
      menu: "menu",
      modal: "modal",
      ul: "list",
      ol: "list",
      li: "list",
      svg: "icon",
      canvas: "canvas",
    };

    return typeMap[tagName] || "unknown";
  }

  /**
   * Get element type
   */
  private getElementType(el: HTMLElement): string {
    if (el instanceof HTMLButtonElement) return "button";
    if (el instanceof HTMLAnchorElement) return "link";
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      return "input";
    }
    if (el instanceof HTMLImageElement) return "image";
    return el.tagName.toLowerCase();
  }

  /**
   * Check if element is clickable
   */
  private isClickable(el: HTMLElement): boolean {
    const clickableRoles = [
      "button",
      "link",
      "menuitem",
      "tab",
    ];
    const role = el.getAttribute("role");
    const hasClick = (el as any).onclick !== null;

    return (
      ["button", "a", "input", "select"].includes(el.tagName.toLowerCase()) ||
      (role ? clickableRoles.includes(role) : false) ||
      hasClick
    );
  }

  /**
   * Check if element is visible
   */
  private isVisible(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  }

  /**
   * Extract attributes
   */
  private extractAttributes(el: HTMLElement): Record<string, string> {
    const attrs: Record<string, string> = {};

    for (const attr of el.attributes) {
      if (
        !["style", "class", "id", "data-"].some((prefix) =>
          attr.name.startsWith(prefix)
        )
      ) {
        attrs[attr.name] = attr.value;
      }
    }

    return attrs;
  }

  /**
   * Detect modal dialogs
   */
  detectModals(elements: UIElement[]): UIElement[] {
    return elements.filter(
      (elem) => elem.type === "modal" || elem.ariaLabel?.includes("dialog")
    );
  }

  /**
   * Get modal content
   */
  getModalContent(modal: UIElement, allElements: UIElement[]): UIElement[] {
    // Find elements that are children of this modal
    return allElements.filter((elem) => {
      const { x, y, width, height } = elem.coordinates;
      const { x: modalX, y: modalY, width: modalW, height: modalH } =
        modal.coordinates;

      return (
        x >= modalX &&
        x + width <= modalX + modalW &&
        y >= modalY &&
        y + height <= modalY + modalH
      );
    });
  }
}
