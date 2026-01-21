/// <reference types="nativewind/types" />

import "react-native-reanimated";
import React from "react";

declare module "react-native-reanimated" {
    interface AnimatedProps<T> {
        className?: string;
        children?: React.ReactNode;
    }
}

