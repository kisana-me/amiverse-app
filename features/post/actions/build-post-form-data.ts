import * as ImagePicker from "expo-image-picker";

type DrawingPayload = {
  packed: string;
  name?: string;
  description?: string;
};

type BuildPostFormDataInput = {
  content: string;
  visibility: string;
  mediaFiles: ImagePicker.ImagePickerAsset[];
  drawingData: DrawingPayload | null;
  replyAid?: string;
  quoteAid?: string;
};

function appendMediaToFormData(
  formData: FormData,
  files: ImagePicker.ImagePickerAsset[],
) {
  files.forEach((file, index) => {
    const fileName = file.fileName ?? `media-${Date.now()}-${index}`;
    const mimeType = file.mimeType ?? "application/octet-stream";

    formData.append("post[media_files][]", {
      uri: file.uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  });
}

export function buildPostFormData({
  content,
  visibility,
  mediaFiles,
  drawingData,
  replyAid,
  quoteAid,
}: BuildPostFormDataInput) {
  const formData = new FormData();

  formData.append("post[content]", content);
  formData.append("post[visibility]", visibility);

  if (replyAid) {
    formData.append("post[reply_aid]", replyAid);
  }

  if (quoteAid) {
    formData.append("post[quote_aid]", quoteAid);
  }

  if (drawingData) {
    formData.append("post[drawing_attributes][data]", drawingData.packed);
    formData.append("post[drawing_attributes][name]", drawingData.name || "");
    formData.append(
      "post[drawing_attributes][description]",
      drawingData.description || "",
    );
  }

  appendMediaToFormData(formData, mediaFiles);
  return formData;
}
