import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';

const STORAGE_KEY = '@parkrun/barcode';
const FILE_PREFIX = 'parkrun-barcode';

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.heic',
  '.heif',
]);

const MIME_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

function extensionFor(asset) {
  const fromName = Paths.extname(asset.name ?? '').toLowerCase();
  if (IMAGE_EXTENSIONS.has(fromName)) {
    return fromName;
  }
  return MIME_EXTENSIONS[asset.mimeType] ?? '.png';
}

function storedFiles() {
  try {
    return new Directory(Paths.document)
      .list()
      .filter((entry) => entry instanceof File && entry.name.startsWith(FILE_PREFIX));
  } catch {
    return [];
  }
}

function deleteIfExists(file) {
  if (!file.exists) {
    return;
  }
  try {
    file.delete();
  } catch {
    // Best-effort cleanup.
  }
}

function removeStoredFilesExcept(fileName) {
  for (const file of storedFiles()) {
    if (file.name !== fileName) {
      deleteIfExists(file);
    }
  }
}

async function copyPickedFile(sourceUri, destination) {
  try {
    await new File(sourceUri).copy(destination);
    return;
  } catch {
    // If the new FileSystem API rejects the picked URI (for example because
    // Expo Go's sandbox rules block it), retry with the legacy copier, which
    // reads the picker's content:// URI directly.
  }

  deleteIfExists(destination);
  await LegacyFileSystem.copyAsync({
    from: sourceUri,
    to: destination.uri,
  });
}

/**
 * Reads the saved barcode metadata and verifies the image still exists.
 * Returns `{ uri }` or `null` when no barcode has been uploaded.
 */
export async function loadBarcode() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const { fileName } = JSON.parse(raw);
    const file = new File(Paths.document, fileName);

    if (!file.exists) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return { uri: file.uri };
  } catch {
    return null;
  }
}

/**
 * Copies the picked image into the app's document directory so it survives
 * cache cleanup, then records it as the active barcode.
 */
export async function saveBarcode(asset) {
  const fileName = `${FILE_PREFIX}-${Date.now()}${extensionFor(asset)}`;
  const destination = new File(Paths.document, fileName);

  try {
    await copyPickedFile(asset.uri, destination);
  } catch (error) {
    deleteIfExists(destination);
    throw error;
  }

  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fileName, uploadedAt: Date.now() })
    );
  } catch (error) {
    deleteIfExists(destination);
    throw error;
  }

  removeStoredFilesExcept(fileName);

  return { uri: destination.uri };
}

/** Deletes the saved barcode image and its metadata. */
export async function clearBarcode() {
  removeStoredFilesExcept(null);
  await AsyncStorage.removeItem(STORAGE_KEY);
}
