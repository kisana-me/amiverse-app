import {
  Canvas,
  FilterMode,
  MipmapMode,
  Image as SkiaImage,
  useImage,
} from "@shopify/react-native-skia";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { createSkImageFromPacked } from "../lib/skia_image";
import { DrawingViewerProps } from "../types";

export default function DrawingViewer({
  packed,
  uri,
  style,
}: DrawingViewerProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const uriImage = useImage(uri ?? null);
  const packedImage = useMemo(() => createSkImageFromPacked(packed), [packed]);
  const skImage = uriImage ?? packedImage;

  const hasSize = size.width > 0 && size.height > 0;

  return (
    <View
      style={style}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((prev) => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
      }}
    >
      {skImage && hasSize ? (
        <Canvas style={styles.canvas}>
          <SkiaImage
            image={skImage}
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            fit="contain"
            sampling={{
              filter: FilterMode.Nearest,
              mipmap: MipmapMode.None,
            }}
          />
        </Canvas>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
});
