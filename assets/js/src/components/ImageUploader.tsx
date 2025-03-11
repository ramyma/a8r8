import { ClipboardIcon } from "@radix-ui/react-icons";
import React, {
  ChangeEvent,
  DragEventHandler,
  MouseEventHandler,
  MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";

interface Props {
  image?: string;
  onChange: (image: string) => void;
  title?: string;
  multiple?: boolean;
}
const ImageUploader = ({ image, title, multiple = false, onChange }: Props) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef: MutableRefObject<HTMLInputElement> =
    useRef<HTMLInputElement>() as MutableRefObject<HTMLInputElement>;

  const handleDragStart: DragEventHandler = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragEnd: DragEventHandler = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop: DragEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer) {
      const files = e.dataTransfer.files;

      for (let i = 0, file; (file = files[i]); i++) {
        if (file.type.match(/image.*/)) {
          const reader = new FileReader();

          reader.onload = async (e) => {
            if (e.target) {
              const dataUrl = e.target.result;

              if (typeof dataUrl === "string") {
                onChange(dataUrl);
                // handleAddImage({ imageDataUrl: dataUrl, pngInfo });
              }
            }
          };

          reader.readAsDataURL(file);
        }
      }
    }
    // TODO: handle drop and call onChange
  };

  // useEffect(() => {
  //   document.addEventListener("dragover", handleDragStart);
  //   // dragOverlay.addEventListener("dragleave", handleDragEnd);
  //   // dragOverlay.addEventListener("drop", handleDragEnd);
  //   return () => {
  //     document.removeEventListener("dragover", handleDragStart);
  //     //   dragOverlay.removeEventListener("dragleave", handleDragEnd);
  //     //   dragOverlay.removeEventListener("drop", handleDragEnd);
  //   };
  // }, []);

  useEffect(() => {
    inputRef.current.value = "";
  }, [image]);
  const handleClick = () => {
    inputRef.current.click();
  };

  const convertBase64 = (file): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        typeof fileReader.result === "string"
          ? resolve(fileReader.result)
          : reject(new Error("File reader result is not a string"));
      };
      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  };
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await convertBase64(file);
      onChange(base64);
    }
  };

  const handlePaste: MouseEventHandler = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const readerOnload = async function (event) {
      if (event.target) {
        const dataUrl = event.target.result;
        if (typeof dataUrl === "string") {
          onChange(dataUrl);
        }
      }
    };

    const clipboardContents = await navigator.clipboard.read();

    for (const item of clipboardContents) {
      if (!item.types.includes("image/png")) {
        return;
      }
      const blob = await item.getType("image/png");
      const reader = new FileReader();

      reader.onload = readerOnload;

      if (blob) {
        reader.readAsDataURL(blob);
      }
    }
  };

  return (
    <div>
      <div
        style={{ ...(image && { backgroundImage: `url(${image}` }) }}
        className={`relative border border-neutral-700 bg-neutral-800/80 hover:border-neutral-100 rounded  bg-clip-content bg-contain bg-no-repeat bg-center sm:h-28 2xl:h-56 hover:cursor-pointer transition-all duration-250 ${
          isDragging
            ? "outline-primary outline-dashed outline-2 outline-offset-2"
            : ""
        }`}
        onDragOver={handleDragStart}
        onDragLeave={handleDragEnd}
        onDrop={handleDrop}
        onClick={handleClick}
        title={title}
      >
        <input
          type="file"
          className="hidden"
          ref={inputRef}
          onChange={handleImageChange}
          multiple={multiple}
        />

        <div
          className="absolute bg-neutral-900/80 backdrop-blur-xs border border-neutral-700 hover:border-neutral-200 bottom-2 right-2 px-[10px] text-white shrink-0 grow-0 basis-auto h-[35px] rounded-xs inline-flex text-[13px] leading-none items-center justify-center outline-hidden hover:bg-violet10 focus:relative focus:shadow-[0_0_0_2px] focus:shadow-violet7 transition-[border]"
          style={{ marginLeft: "auto" }}
          onClick={handlePaste}
          aria-label="Paste"
          title="Paste"
        >
          <ClipboardIcon />
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
