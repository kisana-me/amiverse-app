import * as ImagePicker from "expo-image-picker";

const DEFAULT_MAX_MEDIA_FILES = 8;

type PickMediaOptions = {
  existingFiles: ImagePicker.ImagePickerAsset[];
  maxFiles?: number;
  onLimitReached?: () => void;
};

export async function pickMedia({
  existingFiles,
  maxFiles = DEFAULT_MAX_MEDIA_FILES,
  onLimitReached,
}: PickMediaOptions) {
  const remaining = maxFiles - existingFiles.length;

  if (remaining <= 0) {
    onLimitReached?.();
    return existingFiles;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 1,
  });

  if (result.canceled) {
    return existingFiles;
  }

  const selected = result.assets ?? [];
  return [...existingFiles, ...selected].slice(0, maxFiles);
}
