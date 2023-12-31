import { useContext, useEffect } from "react";
import RefsContext from "../context/RefsContext";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  ControlnetDetection,
  ControlnetLayer,
  setDetectionImage,
} from "../state/controlnetSlice";
import {
  selectActiveLayer,
  selectIsMaskLayerVisible,
} from "../state/layersSlice";
import useData, { FetchPolicy } from "./useData";
import useSocket from "./useSocket";
import { selectSelectionBox } from "../state/selectionBoxSlice";

type Props = {
  // selectedModel: Model["sha256"];
  fetchPolicy?: FetchPolicy;
};

type ConrolnetModuleSlider = {
  name: string;
  min: number;
  max: number;
  value: number;
};

type ControlnetModule = {
  name: string;
  sliders: ConrolnetModuleSlider[];
};

const useControlnet = ({ fetchPolicy }: Props = {}) => {
  const { channel, sendMessage } = useSocket();
  const activeLayerName = useAppSelector(selectActiveLayer);
  const isMaskLayerVisible = useAppSelector(selectIsMaskLayerVisible);
  const selectionBox = useAppSelector(selectSelectionBox);

  const dispatch = useAppDispatch();
  const {
    selectionBoxRef,
    selectionBoxLayerRef,
    maskLayerRef,
    controlnetLayerRef,
    stageRef,
    overlayLayerRef,
  } = useContext(RefsContext);

  const { fetchData: fetchControlnetModels, data: controlnet_models } = useData<
    string[]
  >({
    name: "controlnet_models",
    fetchPolicy,
  });

  const { fetchData: fetchControlnetModules, data: controlnet_preprocessors } =
    useData<ControlnetModule[]>({
      name: "controlnet_preprocessors",
      fetchPolicy,
    });

  const controlnetDetect = async ({
    module,
    layerId,
    processor_res,
    threshold_a,
    threshold_b,
    pixel_perfect,
    resize_mode,
    imageDataUrl,
  }: ControlnetDetection & {
    layerId: ControlnetLayer["id"];
    imageDataUrl?: string;
  }) => {
    imageDataUrl ??= await getImageDataUrl();
    if (module === "none") return;
    sendMessage("controlnet_detect", {
      layer_id: layerId,
      controlnet_module: module,
      controlnet_input_images: [imageDataUrl],
      controlnet_processor_res: pixel_perfect
        ? Math.min(selectionBox.width, selectionBox.height)
        : processor_res,
      controlnet_threshold_a: threshold_a,
      controlnet_threshold_b: threshold_b,
      controlnet_pixel_perfect: pixel_perfect,
      controlnet_resize_mode: resize_mode,
    });
  };

  useEffect(() => {
    if (channel) {
      const ref = channel.on("controlnet_detection", ({ images, layerId }) => {
        // const controlnetLayerIndex =
        //   +activeLayerName.replace(/[a-z]+/i, "") - 1;

        if (selectionBoxRef?.current) {
          dispatch(
            setDetectionImage({
              image: images[0],
              layerId,
              //FIXME: fit detection image according to received dimensions and fill method
              // or delegate to renderer
              position: selectionBoxRef.current.getPosition(),
              dimensions: selectionBoxRef.current.size(),
            })
          );
        }
      });

      return () => {
        channel?.off("controlnet_detection", ref);
      };
    }
  }, [activeLayerName, channel, dispatch, selectionBoxRef]);

  const getImageDataUrl = async () => {
    const stage = stageRef?.current;
    const maskLayer = maskLayerRef?.current;
    const controlnetLayer = controlnetLayerRef?.current;

    const selectionBox = selectionBoxRef?.current;
    const selectionBoxLayer = selectionBoxLayerRef?.current;
    const overlayLayer = overlayLayerRef?.current;

    const oldStageScale = stage?.scale();
    stage?.scale({ x: 1, y: 1 });

    selectionBoxLayer?.visible(false);
    overlayLayer?.visible(false);
    controlnetLayer?.visible(false);
    maskLayer?.visible(false);
    if (selectionBox) {
      const initImageDataUrl = await stage?.toDataURL({
        x: selectionBox.getAbsolutePosition().x, //stagContainer.clientWidth / 2 - 512 / 2,
        y: selectionBox.getAbsolutePosition().y,
        width: selectionBox.width(),
        height: selectionBox.height(),
        // imageSmoothingEnabled: false,
      });
      selectionBoxLayer?.visible(true);
      overlayLayer?.visible(true);
      controlnetLayer?.visible(true);

      maskLayer?.visible(isMaskLayerVisible);

      stage?.scale(oldStageScale);
      return initImageDataUrl;
    }
    return "";
  };

  // const setModel = async (modelSha256: ""]) => {
  //   const selectedModel = models?.find(({ sha256 }) => modelSha256 === sha256);
  //   if (selectedModel) {
  //     sendMessage("set_model", selectedModel.title);
  //     //TODO: handle failure
  //     dispatch(setSelectedModel(selectedModel.sha256));
  //   }
  // };

  // useEffect(() => {
  //   const ref = channel?.on(
  //     "is_model_loading",
  //     ({ is_model_loading }: { is_model_loading: boolean }) => {
  //       setIsModelLoading(is_model_loading);
  //     }
  //   );
  //   return () => {
  //     channel?.off("is_model_loading", ref);
  //   };
  // }, [channel]);

  return {
    controlnet_models,
    controlnet_preprocessors,
    fetchControlnetModels,
    fetchControlnetModules,
    controlnetDetect,
  };
};

export default useControlnet;
