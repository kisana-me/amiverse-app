import {
  Canvas,
  FilterMode,
  Image as SkiaImage,
  MipmapMode,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { DRAWING_HEIGHT, DRAWING_WIDTH } from "../constants";
import { createSkImageFromPacked } from "../lib/skia_image";
import { DrawingViewerProps } from "../types";

export default function DrawingViewer({
  packed,
  style,
}: DrawingViewerProps) {
  const skImage = useMemo(() => createSkImageFromPacked(packed), [packed]);

  return (
    <View style={style}>
      {skImage ? (
        <Canvas style={styles.canvas}>
          <SkiaImage
            image={skImage}
            x={0}
            y={0}
            width={DRAWING_WIDTH}
            height={DRAWING_HEIGHT}
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
