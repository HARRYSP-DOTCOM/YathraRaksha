/**
 * YatraRaksha Image Compression & Optimization Module
 * Compresses images before upload/storage to reduce bandwidth and storage.
 */

const ImageCompressor = {
  MAX_WIDTH: 1200,
  MAX_HEIGHT: 900,
  QUALITY: 0.85,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB

  /**
   * Compress image file
   */
  async compress(file, options = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          try {
            const canvas = this.resizeImage(img, options);
            const compressedBlob = this.canvasToBlob(canvas);

            compressedBlob.then((blob) => {
              const originalSize = file.size;
              const compressedSize = blob.size;
              const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

              console.log(
                `📸 Image Compression: ${(originalSize / 1024).toFixed(2)}KB → ${(compressedSize / 1024).toFixed(2)}KB (${ratio}% reduction)`
              );

              resolve({
                blob: blob,
                dataUrl: canvas.toDataURL("image/jpeg", this.QUALITY),
                originalSize,
                compressedSize,
                compressionRatio: parseFloat(ratio),
                type: "image/jpeg"
              });
            });
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          reject(new Error("Failed to load image"));
        };

        img.src = event.target.result;
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsDataURL(file);
    });
  },

  /**
   * Resize image canvas
   */
  resizeImage(img, options = {}) {
    const canvas = document.createElement("canvas");
    let width = img.naturalWidth;
    let height = img.naturalHeight;

    const maxWidth = options.maxWidth || this.MAX_WIDTH;
    const maxHeight = options.maxHeight || this.MAX_HEIGHT;

    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    return canvas;
  },

  /**
   * Convert canvas to blob
   */
  canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        this.QUALITY
      );
    });
  },

  /**
   * Batch compress multiple images
   */
  async compressMultiple(files) {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.compress(file);
        results.push(result);
      } catch (error) {
        console.error(`Failed to compress ${file.name}:`, error);
      }
    }

    return results;
  },

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  },

  /**
   * Validate file before compression
   */
  isValidImage(file) {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!validTypes.includes(file.type)) {
      return { valid: false, error: "Invalid image format" };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large: ${this.formatFileSize(file.size)} (max ${this.formatFileSize(this.MAX_FILE_SIZE)})`
      };
    }

    return { valid: true };
  }
};

window.ImageCompressor = ImageCompressor;
