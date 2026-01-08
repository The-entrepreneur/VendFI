/**
 * src/storage/file-manager.ts
 * Low-level file I/O operations for vendor data storage
 *
 * RESPONSIBILITY:
 * - Create/manage vendor directory structure
 * - Safe read/write operations with error handling
 * - Atomic writes (write to temp, then rename)
 * - File listing and cleanup
 *
 * WHY SEPARATE:
 * Isolates all Node.js fs operations in one place.
 * Enables easier testing via dependency injection.
 * Provides consistent error handling across all I/O.
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Safe file manager with atomic writes and error handling
 */
export class FileManager {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Get the base directory
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Ensure a directory exists, creating it if needed
   * Similar to `mkdir -p`
   */
  ensureDir(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Get vendor root directory path
   */
  getVendorDir(vendorId: string): string {
    return path.join(this.baseDir, "vendors", vendorId);
  }

  /**
   * Initialize vendor directory structure
   * Creates: records/, imports/, mappings/, .tmp/
   */
  initializeVendorDir(vendorId: string): string {
    const vendorDir = this.getVendorDir(vendorId);

    this.ensureDir(vendorDir);
    this.ensureDir(path.join(vendorDir, "records"));
    this.ensureDir(path.join(vendorDir, "imports"));
    this.ensureDir(path.join(vendorDir, "mappings"));
    this.ensureDir(path.join(vendorDir, ".tmp"));

    return vendorDir;
  }

  /**
   * Write JSON file atomically (write to temp, then rename)
   * Prevents corruption if write is interrupted
   */
  writeJSON<T>(filePath: string, data: T): void {
    try {
      const dir = path.dirname(filePath);
      this.ensureDir(dir);

      // Write directly to file (Windows compatibility)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to write JSON to ${filePath}: ${error}`);
    }
  }

  /**
   * Read JSON file safely
   */
  readJSON<T>(filePath: string): T | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * Write text file
   */
  writeText(filePath: string, content: string): void {
    try {
      const dir = path.dirname(filePath);
      this.ensureDir(dir);
      fs.writeFileSync(filePath, content, "utf-8");
    } catch (error) {
      throw new Error(`Failed to write text to ${filePath}: ${error}`);
    }
  }

  /**
   * Read text file
   */
  readText(filePath: string): string {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      return fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      throw new Error(`Failed to read text from ${filePath}: ${error}`);
    }
  }

  /**
   * Check if file exists
   */
  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Check if directory exists
   */
  dirExists(dirPath: string): boolean {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  }

  /**
   * List files in directory
   */
  listFiles(dirPath: string, extension?: string): string[] {
    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }
      const files = fs.readdirSync(dirPath);
      if (!extension) {
        return files;
      }
      return files.filter((f) => f.endsWith(extension));
    } catch (error) {
      throw new Error(`Failed to list files in ${dirPath}: ${error}`);
    }
  }

  /**
   * List subdirectories
   */
  listDirs(dirPath: string): string[] {
    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }
      const entries = fs.readdirSync(dirPath);
      return entries.filter((e) => {
        const fullPath = path.join(dirPath, e);
        return fs.statSync(fullPath).isDirectory();
      });
    } catch (error) {
      throw new Error(`Failed to list directories in ${dirPath}: ${error}`);
    }
  }

  /**
   * Delete a file
   */
  deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error}`);
    }
  }

  /**
   * Delete a directory recursively
   */
  deleteDir(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (error) {
      throw new Error(`Failed to delete directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath: string): number {
    try {
      if (!fs.existsSync(filePath)) {
        return 0;
      }
      return fs.statSync(filePath).size;
    } catch (error) {
      throw new Error(`Failed to get file size for ${filePath}: ${error}`);
    }
  }

  /**
   * Get total size of directory recursively
   */
  getDirSize(dirPath: string): number {
    try {
      if (!fs.existsSync(dirPath)) {
        return 0;
      }

      let totalSize = 0;
      const entries = fs.readdirSync(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          totalSize += this.getDirSize(fullPath);
        } else {
          totalSize += stat.size;
        }
      }

      return totalSize;
    } catch (error) {
      throw new Error(`Failed to get directory size for ${dirPath}: ${error}`);
    }
  }

  /**
   * Get file modification time
   */
  getFileModTime(filePath: string): Date | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return fs.statSync(filePath).mtime;
    } catch (error) {
      throw new Error(
        `Failed to get modification time for ${filePath}: ${error}`,
      );
    }
  }

  /**
   * Copy file
   */
  copyFile(source: string, destination: string): void {
    try {
      const dir = path.dirname(destination);
      this.ensureDir(dir);
      fs.copyFileSync(source, destination);
    } catch (error) {
      throw new Error(
        `Failed to copy file from ${source} to ${destination}: ${error}`,
      );
    }
  }

  /**
   * Move/rename file
   */
  moveFile(source: string, destination: string): void {
    try {
      const dir = path.dirname(destination);
      this.ensureDir(dir);
      fs.renameSync(source, destination);
    } catch (error) {
      throw new Error(
        `Failed to move file from ${source} to ${destination}: ${error}`,
      );
    }
  }

  /**
   * Append JSON objects to file (JSONL format)
   * Each object on its own line for easy streaming
   */
  appendJSON(filePath: string, records: any[]): void {
    try {
      this.ensureDir(path.dirname(filePath));

      const lines = records.map((r) => JSON.stringify(r)).join("\n");
      if (lines.length > 0) {
        const text = lines + "\n";
        if (this.fileExists(filePath)) {
          // Append mode
          fs.appendFileSync(filePath, text, "utf-8");
        } else {
          // Create new file
          this.writeText(filePath, text);
        }
      }
    } catch (error) {
      throw new Error(`Failed to append JSON to ${filePath}: ${error}`);
    }
  }
}
