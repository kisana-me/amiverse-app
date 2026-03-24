import { StyleProp, ViewStyle } from "react-native";

export type PackedDrawingData = {
  packed?: string;
};

export type DrawingDraft = {
  packed: string;
  name: string;
  description: string;
  previewPngBase64?: string;
};

export type DrawingEditorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (draft: DrawingDraft) => void;
  initialData?: string;
  initialName?: string;
  initialDescription?: string;
};

export type DrawingViewerProps = {
  packed?: string;
  style?: StyleProp<ViewStyle>;
};

export type ViewerProps = DrawingViewerProps;
export type PackedDrawingPreviewProps = DrawingViewerProps;
