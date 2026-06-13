import crypto from 'crypto';
import { Readable } from 'stream';
import { google } from 'googleapis';
import environments from '../config/environments.js';
import { DriveUploadError, DriveReadError } from '../utils/errors.js';

let driveClient = null;
let isConfigured = false;

/**
 * Sanitize a filename for safe use as a Drive file name.
 * Strips path separators, limits to 100 chars, replaces non-alphanumeric (except dots/hyphens) with dashes.
 * @param {string} name - Original file name
 * @returns {string} Sanitized name suitable for Drive
 */
function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') return 'unnamed';
  return name
    .replace(/[/\\]/g, '-')                  // Remove path separators
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')       // Keep alphanumeric, dots, hyphens, underscores
    .replace(/-+/g, '-')                       // Collapse consecutive dashes
    .substring(0, 100)                          // Limit length
    || 'unnamed';
}

/**
 * Initialize Google Drive client with OAuth refresh token.
 * Uses google.auth.OAuth2 with client ID, client secret, and refresh token.
 * In production, missing credentials throw; in dev, they log a warning.
 */
export function initDrive() {
  const { folderId, oauthClientId, oauthClientSecret, oauthRefreshToken } = environments.googleDrive;

  if (!oauthClientId || !oauthClientSecret || !oauthRefreshToken || !folderId) {
    if (environments.esProduccion) {
      throw new Error(
        'Google Drive OAuth credentials not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN, and GOOGLE_DRIVE_FOLDER_ID environment variables.'
      );
    }
    console.warn('[DRIVE] Skipping Drive init — OAuth credentials not configured.');
    isConfigured = false;
    driveClient = null;
    return;
  }

  try {
    const oauth2Client = new google.auth.OAuth2(oauthClientId, oauthClientSecret);
    oauth2Client.setCredentials({ refresh_token: oauthRefreshToken });
    driveClient = google.drive({ version: 'v3', auth: oauth2Client });
    isConfigured = true;
    console.log('[DRIVE] Google Drive service initialized successfully (OAuth).');
  } catch (err) {
    if (environments.esProduccion) {
      throw new Error(`Failed to initialize Google Drive: ${err.message}`);
    }
    console.warn(`[DRIVE] Failed to initialize Drive service: ${err.message}`);
    isConfigured = false;
    driveClient = null;
  }
}

// Initialize on module load
initDrive();

/**
 * Upload a file buffer to Google Drive.
 * Uses a sanitized internal filename while preserving originalName in the return value.
 * @param {Buffer} buffer - File content
 * @param {string} originalName - Original file name (stored in DB as nombre_original)
 * @param {string} mimeType - MIME type of the file
 * @param {object} [options={}] - Optional settings (like custom folderId)
 * @returns {Promise<{driveFileId: string, webViewLink: string|null, internalName: string}>}
 * @throws {DriveUploadError} On any upload failure
 */
export async function uploadFile(buffer, originalName, mimeType, options = {}) {
  if (!isConfigured || !driveClient) {
    throw new DriveUploadError('Google Drive service is not configured. Cannot upload files.');
  }

  const folderId = options.folderId || environments.googleDrive.productosFolderId || environments.googleDrive.folderId;
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  const safeName = sanitizeFileName(originalName);
  const internalName = `${timestamp}-${uuid}-${safeName}`;

  try {
    // googleapis Drive files.create expects media.body to be a readable stream
    // or string. Multer memoryStorage provides a Buffer which is neither,
    // causing "part.body.pipe is not a function" at runtime.
    // Convert Buffer to a readable stream before passing to the Drive API.
    const mediaBody = Buffer.isBuffer(buffer) ? Readable.from(buffer) : buffer;

    const response = await driveClient.files.create({
      requestBody: {
        name: internalName,
        mimeType,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: mediaBody,
      },
      fields: 'id, webViewLink',
    });

    const driveFileId = response.data.id;
    const webViewLink = response.data.webViewLink || null;

    return { driveFileId, webViewLink, internalName };
  } catch (err) {
    // All Drive API errors map to DriveUploadError
    throw new DriveUploadError(`Failed to upload file to Google Drive: ${err.message}`);
  }
}

/**
 * Download a file stream from Google Drive.
 * @param {string} driveFileId - File ID in Google Drive
 * @returns {Promise<Readable>} Readable stream of the file content
 * @throws {DriveReadError} On any read/download failure
 */
export async function downloadFile(driveFileId) {
  if (!isConfigured || !driveClient) {
    throw new DriveReadError('Google Drive service is not configured. Cannot download files.');
  }

  try {
    const response = await driveClient.files.get(
      { fileId: driveFileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return response.data;
  } catch (err) {
    throw new DriveReadError(`Failed to download file from Google Drive: ${err.message}`);
  }
}

/**
 * Check whether the Drive service is ready for uploads.
 * @returns {boolean}
 */
export function isDriveReady() {
  return isConfigured;
}

/**
 * Testability hook: save the current internal state of the Drive service.
 * Only available when NODE_ENV !== 'production'.
 * @returns {{ driveClient: object|null, isConfigured: boolean }}
 */
export function _getDriveStateForTest() {
  return { driveClient, isConfigured };
}

/**
 * Testability hook: restore or reset the internal state of the Drive service.
 * Only available when NODE_ENV !== 'production'.
 * @param {{ driveClient?: object|null, isConfigured?: boolean }} state - State to restore (defaults to null/false)
 */
export function _resetDriveForTest(state = {}) {
  driveClient = state.driveClient ?? null;
  isConfigured = state.isConfigured ?? false;
}

/**
 * @deprecated Use _getDriveStateForTest/_resetDriveForTest instead for safe save/restore.
 * Kept for backward compatibility with existing tests.
 */
export function _setDriveClientForTest(client, configured) {
  driveClient = client;
  isConfigured = !!configured;
}

export default { uploadFile, downloadFile, isDriveReady, _setDriveClientForTest, _getDriveStateForTest, _resetDriveForTest };
