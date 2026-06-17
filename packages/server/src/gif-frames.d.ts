declare module 'gif-frames' {
  type GifFrameResult = {
    frameIndex: number;
    frameInfo: { delay?: number };
    getImage: () => NodeJS.ReadableStream;
  };
  function gifFrames(options: {
    url: Buffer;
    frames: 'all' | number | string;
    outputType?: string;
    cumulative?: boolean;
  }): Promise<GifFrameResult[]>;
  export default gifFrames;
}
