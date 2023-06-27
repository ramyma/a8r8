import { useCallback } from "react";
import ExifReader from "exifreader";
import { extractPngInfo } from "../utils";

function getBinaryData(dataUrl) {
  const binaryData = atob(dataUrl.split(",")[1]);
  const length = binaryData.length;
  const binaryArray = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    binaryArray[i] = binaryData.charCodeAt(i);
  }
  return binaryArray.buffer;
}

export const getPngInfo = async (dataUrl) => {
  return await ExifReader.load(getBinaryData(dataUrl))?.parameters?.value;
};

const usePngInfo = () => {
  // const { sendMessageAndReceive } = useSocket();
  // const isConnected = useAppSelector(selectIsConnected);

  const processPngInfo = useCallback(async (dataUrl: string) => {
    // if (isConnected) {
    //   const data = await sendMessageAndReceive<any>("get_png_info", dataUrl);
    //   return extractPngInfo(data);
    // }
    const generationParams = await getPngInfo(dataUrl);

    if (generationParams) return extractPngInfo({ info: generationParams });

    return;
  }, []);

  return { processPngInfo };
};

export default usePngInfo;
