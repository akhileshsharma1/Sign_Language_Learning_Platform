"use client";

import React, { forwardRef } from "react";
import dynamic from "next/dynamic";

// Import styles in your main component or global CSS
// import "react-quill/dist/quill.bubble.css";

// Create a dynamic import with a wrapper component to handle the ref properly
const ReactQuillBase = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill");
    // Return a wrapper component that handles the ref properly
    return ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
  },
  { 
    ssr: false,
    loading: () => <div className="h-20 w-full bg-slate-200 animate-pulse" />
  }
);

interface QuillProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  theme?: "snow" | "bubble";
  modules?: any;
  formats?: string[];
  placeholder?: string;
  className?: string;
}

// Create a wrapper component with forwardRef
export const QuillEditor = forwardRef<any, QuillProps>(
  ({ onChange, value, theme = "snow", readOnly = false, ...props }, ref) => {
    return (
      <ReactQuillBase
        forwardedRef={ref}
        theme={theme}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        {...props}
      />
    );
  }
);

QuillEditor.displayName = "QuillEditor";