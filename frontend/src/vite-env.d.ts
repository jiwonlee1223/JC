/// <reference types="vite/client" />

// CSS 모듈 선언
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '@xyflow/react/dist/style.css';
