import {
  AlphaType,
  ColorType,
  Skia,
  type SkImage,
} from "@shopify/react-native-skia";

import {
  DRAWING_BYTES_PER_ROW,
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
} from "../constants";
import { packedToBitmap } from "./packed_codec";

export const createSkImageFromBitmap = (
  bitmap: Uint8Array,
): SkImage | null => {
  const pixels = new Uint8Array(DRAWING_WIDTH * DRAWING_HEIGHT * 4);

  for (let i = 0; i < bitmap.length; i += 1) {
    const color = bitmap[i] ? 255 : 0;
    const offset = i * 4;
    pixels[offset] = color;
    pixels[offset + 1] = color;
    pixels[offset + 2] = color;
    pixels[offset + 3] = 255;
  }

  return Skia.Image.MakeImage(
    {
      width: DRAWING_WIDTH,
      height: DRAWING_HEIGHT,
      alphaType: AlphaType.Unpremul,
      colorType: ColorType.RGBA_8888,
    },
    Skia.Data.fromBytes(pixels),
    DRAWING_BYTES_PER_ROW,
  );
};

export const createSkImageFromPacked = (packed?: string): SkImage | null => {
  const bitmap = packedToBitmap(packed);
  return createSkImageFromBitmap(bitmap);
};
