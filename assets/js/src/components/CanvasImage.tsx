import React from "react";
import { NodeConfig } from "konva/lib/Node";
import { ImageConfig } from "konva/lib/shapes/Image";
import { Image } from "react-konva";
import useImage from "use-image";

type Props = {
  src: string;
  listening?: boolean;
} & Omit<ImageConfig, "image"> &
  NodeConfig;

const CanvasImage = ({ src, listening = false, ...rest }: Props) => {
  const [image] = useImage(src);
  return <Image image={image} listening={listening} {...rest} />;
};

export default CanvasImage;
