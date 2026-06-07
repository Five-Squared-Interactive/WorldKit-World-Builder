// CSS Modules
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Three.js addons
declare module 'three/addons/controls/TransformControls.js' {
  export { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
}
