import React from "react";
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
  type SvgProps,
} from "react-native-svg";

type AnyurIconProps = SvgProps & {
  size?: number;
};

export default function AnyurIcon({ size = 20, ...props }: AnyurIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      {...props}
    >
      <Rect x="4" y="18" width="30" height="30" rx="15" fill="white" />
      <Rect
        x="7.00018"
        y="20.9999"
        width="24"
        height="24"
        rx="12"
        fill="url(#paint0_linear_anyur)"
      />
      <Rect x="35" y="2" width="30" height="30" rx="15" fill="white" />
      <Rect
        x="38.0002"
        y="4.99994"
        width="24"
        height="24"
        rx="12"
        fill="url(#paint1_linear_anyur)"
      />
      <Rect x="4" y="52" width="30" height="30" rx="15" fill="white" />
      <Rect
        x="7.00012"
        y="54.9999"
        width="24"
        height="24"
        rx="12"
        fill="url(#paint2_linear_anyur)"
      />
      <Rect x="35" y="35" width="30" height="30" rx="15" fill="white" />
      <Rect
        x="38.0001"
        y="37.9999"
        width="24"
        height="24"
        rx="12"
        fill="url(#paint3_linear_anyur)"
      />
      <Rect x="66" y="52" width="30" height="30" rx="15" fill="white" />
      <Rect
        x="69.0001"
        y="54.9999"
        width="24"
        height="24"
        rx="12"
        fill="url(#paint4_linear_anyur)"
      />
      <Rect x="35" y="68" width="30" height="30" rx="15" fill="white" />
      <Rect
        x="38.0001"
        y="71"
        width="24"
        height="24"
        rx="12"
        fill="url(#paint5_linear_anyur)"
      />
      <Rect x="66" y="18" width="30" height="30" rx="15" fill="white" />
      <Rect
        x="69.0001"
        y="20.9999"
        width="24"
        height="24"
        rx="12"
        fill="url(#paint6_linear_anyur)"
      />

      <Defs>
        <LinearGradient
          id="paint0_linear_anyur"
          x1="19.0002"
          y1="20.9999"
          x2="19.0002"
          y2="44.9999"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#FFC267" />
          <Stop offset="1" stopColor="#FFA41B" />
        </LinearGradient>
        <LinearGradient
          id="paint1_linear_anyur"
          x1="50.0002"
          y1="4.99994"
          x2="50.0002"
          y2="28.9999"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#FF9496" />
          <Stop offset="1" stopColor="#FF1B1F" />
        </LinearGradient>
        <LinearGradient
          id="paint2_linear_anyur"
          x1="19.0001"
          y1="54.9999"
          x2="19.0001"
          y2="78.9999"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#B9FFB8" />
          <Stop offset="1" stopColor="#1FFF1B" />
        </LinearGradient>
        <LinearGradient
          id="paint3_linear_anyur"
          x1="50.0001"
          y1="37.9999"
          x2="50.0001"
          y2="61.9999"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#A1A1A1" />
          <Stop offset="1" stopColor="#000000" />
        </LinearGradient>
        <LinearGradient
          id="paint4_linear_anyur"
          x1="81.0001"
          y1="54.9999"
          x2="81.0001"
          y2="78.9999"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#7D99FF" />
          <Stop offset="1" stopColor="#1B4CFF" />
        </LinearGradient>
        <LinearGradient
          id="paint5_linear_anyur"
          x1="50.0001"
          y1="71"
          x2="50.0001"
          y2="95"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#9FF5FF" />
          <Stop offset="1" stopColor="#1BE8FF" />
        </LinearGradient>
        <LinearGradient
          id="paint6_linear_anyur"
          x1="81.0001"
          y1="20.9999"
          x2="81.0001"
          y2="44.9999"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#FFA3F7" />
          <Stop offset="1" stopColor="#FF1BEC" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}
