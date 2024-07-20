import { useRef, useState } from "react";
import Button from "../components/Button";
import useCivit, { CivitModel } from "../hooks/useCivit";
import { Lora } from "../App.d";
import { animated, config, useTransition } from "@react-spring/web";
import ScrollArea from "../components/ScrollArea";
import TriggerWord from "./TriggerWord";
import { CopyIcon } from "@radix-ui/react-icons";

type Props = Partial<Lora>;

const LoraDetails = ({ name, metadata }: Props) => {
  const [isLoading, setIsLoading] = useState(false);

  const [responseLora, setResponseLora] = useState<CivitModel>();
  // ({
  //   baseModel: "SDXL 1.0",
  //   baseModelType: "Standard",
  //   createdAt: "2023-08-07T14:51:04.506Z",
  //   description: null,
  //   downloadUrl: "https://civitai.com/api/download/models/135867",
  //   earlyAccessTimeFrame: 0,
  //   files: [
  //     {
  //       downloadUrl: "https://civitai.com/api/download/models/135867",
  //       hashes: {
  //         AutoV1: "29A40D2E",
  //         AutoV2: "0D9BD1B873",
  //         AutoV3: "9C783C8CE46C",
  //         BLAKE3:
  //           "595854A2079ABB9AF0FD84830DDF1142ABFFAA70DEBF51C25C2E73A248CB11CA",
  //         CRC32: "A94E124F",
  //         SHA256:
  //           "0D9BD1B873A7863E128B4672E3E245838858F71469A3CEC58123C16C06F83BD7",
  //       },
  //       id: 99264,
  //       metadata: {
  //         format: "SafeTensor",
  //         fp: null,
  //         size: null,
  //       },
  //       name: "add-detail-xl.safetensors",
  //       pickleScanMessage: "No Pickle imports",
  //       pickleScanResult: "Success",
  //       primary: true,
  //       scannedAt: "2023-08-07T14:55:53.517Z",
  //       sizeKB: 223097.9921875,
  //       type: "Model",
  //       virusScanMessage: null,
  //       virusScanResult: "Success",
  //     },
  //   ],
  //   id: 135867,
  //   images: [
  //     {
  //       availability: "Public",
  //       hash: "UUHK;5WYoJR*~qWCj[j[_Ns:a}of_3s:azof",
  //       height: 1158,
  //       meta: {
  //         '"add-detail-xl': '9c783c8ce46c"',
  //         Model: "dreamshaperXL10_alpha2Xl10",
  //         "Model hash": "82b5f664ae",
  //         Script: "X/Y/Z plot",
  //         Size: "896x1024",
  //         Version: "v1.5.1",
  //         "X Type": "Prompt S/R",
  //         "add-detail-xl": '1>"',
  //         cfgScale: 7,
  //         hashes: {
  //           model: "82b5f664ae",
  //         },
  //         prompt:
  //           "photo, 8k portrait of beautiful cyborg with brown hair, intricate, elegant, highly detailed, majestic, digital photography, art by artgerm and ruan jia and greg rutkowski surreal painting gold butterfly filigree, broken glass, (masterpiece, sidelighting, finely detailed beautiful eyes: 1.2), hdr, realistic, high definition, <lora:add-detail-xl:-1>",
  //         resources: [
  //           {
  //             hash: "82b5f664ae",
  //             name: "dreamshaperXL10_alpha2Xl10",
  //             type: "model",
  //           },
  //         ],
  //         sampler: "DPM++ SDE Karras",
  //         seed: 3308533307,
  //         steps: 20,
  //       },
  //       metadata: {
  //         hash: "UUHK;5WYoJR*~qWCj[j[_Ns:a}of_3s:azof",
  //         height: 1158,
  //         size: 4192036,
  //         width: 2698,
  //       },
  //       nsfwLevel: 1,
  //       type: "image",
  //       url: "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/217179cb-87a0-4e96-8d77-e410f757aba0/width=450/1917130.jpeg",
  //       width: 2698,
  //     },
  //     {
  //       availability: "Public",
  //       hash: "UWDb~Kofa|of?vj[j[kC~WbHj[kC~qoffkof",
  //       height: 1158,
  //       meta: {
  //         '"add-detail-xl': '9c783c8ce46c"',
  //         Model: "dreamshaperXL10_alpha2Xl10",
  //         "Model hash": "82b5f664ae",
  //         Script: "X/Y/Z plot",
  //         Size: "896x1024",
  //         Version: "v1.5.1",
  //         "X Type": "Prompt S/R",
  //         "add-detail-xl": '1>"',
  //         cfgScale: 7,
  //         hashes: {
  //           model: "82b5f664ae",
  //         },
  //         prompt: "city street, photo, night, lights, <lora:add-detail-xl:-1>",
  //         resources: [
  //           {
  //             hash: "82b5f664ae",
  //             name: "dreamshaperXL10_alpha2Xl10",
  //             type: "model",
  //           },
  //         ],
  //         sampler: "DPM++ SDE Karras",
  //         seed: 3407892333,
  //         steps: 20,
  //       },
  //       metadata: {
  //         hash: "UWDb~Kofa|of?vj[j[kC~WbHj[kC~qoffkof",
  //         height: 1158,
  //         size: 3810435,
  //         width: 2698,
  //       },
  //       nsfwLevel: 1,
  //       type: "image",
  //       url: "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/1132c8aa-053e-468b-9f80-32a071f73f57/width=450/1917133.jpeg",
  //       width: 2698,
  //     },
  //     {
  //       availability: "Public",
  //       hash: "UjHBSroJays._4oJazs.?cWDayWXpJa}oLWX",
  //       height: 1158,
  //       meta: {
  //         '"add-detail-xl': '9c783c8ce46c"',
  //         Model: "dreamshaperXL10_alpha2Xl10",
  //         "Model hash": "82b5f664ae",
  //         Script: "X/Y/Z plot",
  //         Size: "896x1024",
  //         Version: "v1.5.1",
  //         "X Type": "Prompt S/R",
  //         "add-detail-xl": '1.5>"',
  //         cfgScale: 7,
  //         hashes: {
  //           model: "82b5f664ae",
  //         },
  //         prompt:
  //           "anime, road, mountains, sunset, village, <lora:add-detail-xl:-1.5>",
  //         resources: [
  //           {
  //             hash: "82b5f664ae",
  //             name: "dreamshaperXL10_alpha2Xl10",
  //             type: "model",
  //           },
  //         ],
  //         sampler: "DPM++ SDE Karras",
  //         seed: 4138801743,
  //         steps: 20,
  //       },
  //       metadata: {
  //         hash: "UjHBSroJays._4oJazs.?cWDayWXpJa}oLWX",
  //         height: 1158,
  //         size: 3386323,
  //         width: 2698,
  //       },
  //       nsfwLevel: 1,
  //       type: "image",
  //       url: "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/270b159f-d91b-424b-8ac6-14857726f1f1/width=450/1917136.jpeg",
  //       width: 2698,
  //     },
  //     {
  //       availability: "Public",
  //       hash: "UgF5]ot7ayt8_Mofjtof?cbHfQfk-=ayj[ay",
  //       height: 1158,
  //       meta: {
  //         '"eduardo-xl': "1be1874242ec",
  //         Model: "dreamshaperXL10_alpha2Xl10",
  //         "Model hash": "82b5f664ae",
  //         Script: "X/Y/Z plot",
  //         Size: "896x1024",
  //         Version: "v1.5.1",
  //         "X Type": "Prompt S/R",
  //         "add-detail-xl": '1>"',
  //         cfgScale: 7,
  //         hashes: {
  //           model: "82b5f664ae",
  //         },
  //         prompt:
  //           "cyberpunk city, <lora:eduardo-xl:0.8>, <lora:add-detail-xl:-1>",
  //         resources: [
  //           {
  //             hash: "82b5f664ae",
  //             name: "dreamshaperXL10_alpha2Xl10",
  //             type: "model",
  //           },
  //         ],
  //         sampler: "DPM++ SDE Karras",
  //         seed: 2161439391,
  //         steps: 20,
  //       },
  //       metadata: {
  //         hash: "UgF5]ot7ayt8_Mofjtof?cbHfQfk-=ayj[ay",
  //         height: 1158,
  //         size: 3989467,
  //         width: 2698,
  //       },
  //       nsfwLevel: 1,
  //       type: "image",
  //       url: "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/f7cef77a-eabb-4d89-9faa-399bef495e32/width=450/1917137.jpeg",
  //       width: 2698,
  //     },
  //     {
  //       availability: "Public",
  //       hash: "UONAYXIUbIs;_Ns:ayof.Aayjsof~Vofofof",
  //       height: 1158,
  //       meta: {
  //         '"add-detail-xl': '9c783c8ce46c"',
  //         Model: "dreamshaperXL10_alpha2Xl10",
  //         "Model hash": "82b5f664ae",
  //         Script: "X/Y/Z plot",
  //         Size: "896x1024",
  //         Version: "v1.5.1",
  //         "X Type": "Prompt S/R",
  //         "add-detail-xl": '1>"',
  //         cfgScale: 7,
  //         hashes: {
  //           model: "82b5f664ae",
  //         },
  //         prompt:
  //           "a very cute tiny mouse standing with a piece of cheese, <lora:add-detail-xl:-1>",
  //         resources: [
  //           {
  //             hash: "82b5f664ae",
  //             name: "dreamshaperXL10_alpha2Xl10",
  //             type: "model",
  //           },
  //         ],
  //         sampler: "DPM++ SDE Karras",
  //         seed: 1138549894,
  //         steps: 20,
  //       },
  //       metadata: {
  //         hash: "UONAYXIUbIs;_Ns:ayof.Aayjsof~Vofofof",
  //         height: 1158,
  //         size: 1777229,
  //         width: 2698,
  //       },
  //       nsfwLevel: 1,
  //       type: "image",
  //       url: "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/4d6138b0-6e54-4331-8326-1b5291fed0d8/width=450/1917142.jpeg",
  //       width: 2698,
  //     },
  //     {
  //       availability: "Public",
  //       hash: "UTE{h0t7e=of_Na#jubH~qofa{oM?vodj@of",
  //       height: 1158,
  //       meta: {
  //         '"add-detail-xl': '9c783c8ce46c"',
  //         Model: "dreamshaperXL10_alpha2Xl10",
  //         "Model hash": "82b5f664ae",
  //         Script: "X/Y/Z plot",
  //         Size: "896x1024",
  //         Version: "v1.5.1",
  //         "X Type": "Prompt S/R",
  //         "add-detail-xl": '1>"',
  //         cfgScale: 7,
  //         hashes: {
  //           model: "82b5f664ae",
  //         },
  //         prompt:
  //           "old man, long beard, smoking pipe, oil painting, sitting in garden, <lora:add-detail-xl:-1>",
  //         resources: [
  //           {
  //             hash: "82b5f664ae",
  //             name: "dreamshaperXL10_alpha2Xl10",
  //             type: "model",
  //           },
  //         ],
  //         sampler: "DPM++ SDE Karras",
  //         seed: 4199339366,
  //         steps: 20,
  //       },
  //       metadata: {
  //         hash: "UTE{h0t7e=of_Na#jubH~qofa{oM?vodj@of",
  //         height: 1158,
  //         size: 5359238,
  //         width: 2698,
  //       },
  //       nsfwLevel: 1,
  //       type: "image",
  //       url: "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/fc49dbba-7f86-4d9d-a8cb-bfc8e483e3af/width=450/1917146.jpeg",
  //       width: 2698,
  //     },
  //     {
  //       availability: "Public",
  //       hash: "UYF#,ho#ofoz~podj[oe_4WXfQbI?vofj[bH",
  //       height: 1158,
  //       meta: {
  //         '"add-detail-xl': '9c783c8ce46c"',
  //         Model: "dreamshaperXL10_alpha2Xl10",
  //         "Model hash": "82b5f664ae",
  //         Script: "X/Y/Z plot",
  //         Size: "896x1024",
  //         Version: "v1.5.1",
  //         "X Type": "Prompt S/R",
  //         "add-detail-xl": '1>"',
  //         cfgScale: 7,
  //         hashes: {
  //           model: "82b5f664ae",
  //         },
  //         prompt:
  //           "(masterpiece:1.1), (highest quality:1.1), (HDR:1.3), (top quality, best quality, official art, beautiful and aesthetic:1.2), woman, extremely detailed, (fractal art:1.1), (colorful:1.1), highest detailed, (zentangle:1.2), (dynamic), (abstract background:1.3), (shiny), (many colors:1.4), solo, coral background, yellow lightning, cinematic lighting, long hair, detailed black eyes, highest quality face, (sky aesthetic), <lora:add-detail-xl:-1>",
  //         resources: [
  //           {
  //             hash: "82b5f664ae",
  //             name: "dreamshaperXL10_alpha2Xl10",
  //             type: "model",
  //           },
  //         ],
  //         sampler: "DPM++ SDE Karras",
  //         seed: 3638304036,
  //         steps: 20,
  //       },
  //       metadata: {
  //         hash: "UYF#,ho#ofoz~podj[oe_4WXfQbI?vofj[bH",
  //         height: 1158,
  //         size: 5450868,
  //         width: 2698,
  //       },
  //       nsfwLevel: 1,
  //       type: "image",
  //       url: "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/f7a46c72-8d6e-41fe-b6e1-3b093039b036/width=450/1917151.jpeg",
  //       width: 2698,
  //     },
  //     {
  //       availability: "Public",
  //       hash: "UnNvrYt7WBt6?wV@j[bHpJkCj[j?%Ms.bIkC",
  //       height: 1158,
  //       meta: {
  //         '"add-detail-xl': '9c783c8ce46c"',
  //         Model: "dreamshaperXL10_alpha2Xl10",
  //         "Model hash": "82b5f664ae",
  //         Script: "X/Y/Z plot",
  //         Size: "896x1024",
  //         Version: "v1.5.1",
  //         "X Type": "Prompt S/R",
  //         "add-detail-xl": '1>"',
  //         cfgScale: 7,
  //         hashes: {
  //           model: "82b5f664ae",
  //         },
  //         prompt:
  //           "cat made of spaghetti, perfect composition, masterpiece, best quality, <lora:add-detail-xl:-1>",
  //         resources: [
  //           {
  //             hash: "82b5f664ae",
  //             name: "dreamshaperXL10_alpha2Xl10",
  //             type: "model",
  //           },
  //         ],
  //         sampler: "DPM++ SDE Karras",
  //         seed: 1330402432,
  //         steps: 20,
  //       },
  //       metadata: {
  //         hash: "UnNvrYt7WBt6?wV@j[bHpJkCj[j?%Ms.bIkC",
  //         height: 1158,
  //         size: 3356481,
  //         width: 2698,
  //       },
  //       nsfwLevel: 1,
  //       type: "image",
  //       url: "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/41d4eb52-3728-4fd1-864b-73f23cfd969b/width=450/1917152.jpeg",
  //       width: 2698,
  //     },
  //     {
  //       availability: "Public",
  //       hash: "UFON2nRjRj={~qM{RjS$?c%2t7R-%gNGWVaK",
  //       height: 1158,
  //       meta: {
  //         '"add-detail-xl': '9c783c8ce46c"',
  //         Model: "dreamshaperXL10_alpha2Xl10",
  //         "Model hash": "82b5f664ae",
  //         Script: "X/Y/Z plot",
  //         Size: "896x1024",
  //         Version: "v1.5.1",
  //         "X Type": "Prompt S/R",
  //         "add-detail-xl": '0>"',
  //         cfgScale: 7,
  //         hashes: {
  //           model: "82b5f664ae",
  //         },
  //         prompt: "dog, low poly, white background, <lora:add-detail-xl:-2>",
  //         resources: [
  //           {
  //             hash: "82b5f664ae",
  //             name: "dreamshaperXL10_alpha2Xl10",
  //             type: "model",
  //           },
  //         ],
  //         sampler: "DPM++ SDE Karras",
  //         seed: 1603824148,
  //         steps: 20,
  //       },
  //       metadata: {
  //         hash: "UFON2nRjRj={~qM{RjS$?c%2t7R-%gNGWVaK",
  //         height: 1158,
  //         size: 1378156,
  //         width: 1797,
  //       },
  //       nsfwLevel: 1,
  //       type: "image",
  //       url: "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/0e537b14-d13c-4053-90f8-4ccc081fdf74/width=450/1917153.jpeg",
  //       width: 1797,
  //     },
  //     {
  //       availability: "Public",
  //       hash: "URIXv?RQkCV@?wRjt7kC~qkCbHWV_3t7R*t7",
  //       height: 1158,
  //       meta: {
  //         '"add-detail-xl': '9c783c8ce46c"',
  //         Model: "dreamshaperXL10_alpha2Xl10",
  //         "Model hash": "82b5f664ae",
  //         Script: "X/Y/Z plot",
  //         Size: "896x1024",
  //         Version: "v1.5.1",
  //         "X Type": "Prompt S/R",
  //         "add-detail-xl": '2>"',
  //         cfgScale: 7,
  //         hashes: {
  //           model: "82b5f664ae",
  //         },
  //         prompt: "anime girl eating ramen, <lora:add-detail-xl:-2>",
  //         resources: [
  //           {
  //             hash: "82b5f664ae",
  //             name: "dreamshaperXL10_alpha2Xl10",
  //             type: "model",
  //           },
  //         ],
  //         sampler: "DPM++ SDE Karras",
  //         seed: 447634022,
  //         steps: 20,
  //       },
  //       metadata: {
  //         hash: "URIXv?RQkCV@?wRjt7kC~qkCbHWV_3t7R*t7",
  //         height: 1158,
  //         size: 2706285,
  //         width: 2698,
  //       },
  //       nsfwLevel: 1,
  //       type: "image",
  //       url: "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/08a14430-af56-40a1-971f-4180f187626d/width=450/1917154.jpeg",
  //       width: 2698,
  //     },
  //   ],
  //   model: {
  //     name: "Detail Tweaker XL",
  //     nsfw: false,
  //     poi: false,
  //     type: "LORA",
  //   },
  //   modelId: 122359,
  //   name: "v1.0",
  //   publishedAt: "2023-08-07T14:55:02.627Z",
  //   stats: {
  //     downloadCount: 87124,
  //     rating: 4.98,
  //     ratingCount: 4079,
  //     thumbsUpCount: 6655,
  //   },
  //   status: "Published",
  //   trainedWords: ["test", "Test2"],
  //   trainingDetails: null,
  //   trainingStatus: null,
  //   updatedAt: "2023-08-07T14:55:02.629Z",
  // });
  const { getModelByHash } = useCivit();
  const [activeImage, setActiveImage] = useState<string>();
  const imagesContRef = useRef<HTMLDivElement>(null);

  // console.log("width", imagesContRef?.current?.getBoundingClientRect().width);
  const processedImages = responseLora?.images
    ?.filter(({ type }) => type === "image")
    ?.map((image, index) => ({
      ...image,
      isActive: image.hash === activeImage,
      // scale: image.hash === activeImage ? 2 : 1,
      index,
      pointerEvents: name
        ? activeImage
          ? image.hash === activeImage
            ? "auto"
            : "none"
          : "auto"
        : "none",
      width: activeImage
        ? image.hash === activeImage
          ? "100%"
          : "33%"
        : "33%",
      height: 200,
      x:
        image.hash === activeImage
          ? 0
          : ((index % 3) *
              (imagesContRef.current?.getBoundingClientRect()?.width ?? 0)) /
            3,
      y:
        image.hash === activeImage
          ? 0
          : (Math.floor(index / 3) *
              (imagesContRef.current?.getBoundingClientRect()?.width ?? 0)) /
            3,
    }));

  const transitions = useTransition(processedImages ?? [], {
    initial: ({ isActive, scale, x, y, width, pointerEvents }) => ({
      isActive,
      // scale,
      // x,
      // y,
      // width: 200,
      x,
      y,
      width,
      height: 200,
      pointerEvents,
      zIndex: 5,
    }),
    enter: ({ x, y, width, pointerEvents }) => ({
      scale: 1,
      opacity: 1,
      x,
      y,
      width,
      height: 200,
      pointerEvents,
      zIndex: 5,
    }),
    leave: {
      scale: 0.7,
      opacity: 0,
    },
    update: ({ x, y, isActive, scale, pointerEvents, width, index }) => ({
      isActive,
      // scale,
      x,
      y,
      width,
      height: isActive ? 600 : 200,
      pointerEvents,
      opacity: activeImage ? (isActive ? 1 : 0) : 1,
      scale: activeImage ? (isActive ? 1 : 0.9) : 1,
    }),
    keys: ({ hash }) => hash,
    // trail: 3,
  });
  return (
    <div className="relative flex content-around gap-5 h-full">
      {/* <ScrollArea> */}
      <div className="flex flex-col flex-1 w-[25%] gap-5">
        <div className="flex flex-col gap-2 items-start">
          Trigger words:
          <div className="flex flex-wrap gap-2">
            {responseLora?.trainedWords?.map((word) => (
              <TriggerWord>{word}</TriggerWord>
            ))}
            {!responseLora?.trainedWords?.length && <div>-</div>}
          </div>
        </div>
        <Button
          onClick={async () => {
            if (metadata?.sshs_model_hash) {
              setIsLoading(true);
              try {
                const resp = await getModelByHash(
                  metadata?.sshs_model_hash.substring(0, 12)
                );
                console.log(resp);
                setResponseLora(resp);
              } catch (_) {
                //
              } finally {
                setIsLoading(false);
              }
            }
          }}
          disabled={isLoading}
        >
          Fetch from Civit
        </Button>
        {/* {lora.metadata.ss_tag_frequency.map((tag) => tag)} */}
        {/* <span>{name}</span> */}
        {/* <span>{metadata?.sshs_model_hash}</span>
        <span>{metadata?.sshs_legacy_hash}</span> */}
      </div>
      <ScrollArea className="flex-[5]">
        <div
          className="relative flex-[5] w-full h-full" //  border border-neutral-700 rounded" //p-5 h-[20vh] "
          /*"grid grid-cols-3 gap-2 "8*/ ref={imagesContRef}
        >
          {transitions((style, image) => (
            <animated.div
              key={image.hash}
              className="absolute bg-contain bg-no-repeat bg-center rounded border border-neutral-700 bg-black/70"
              style={{
                ...style,
                // ...(responseLora && {
                //   backgroundImage: `url(${image.url}}`,
                // }),
              }}
            >
              <img
                className="w-full h-full object-contain"
                src={
                  image.hash === activeImage
                    ? image.url.replace(/width=\d+\//gi, "")
                    : image.url
                }
                onClick={() => {
                  setActiveImage((prev) =>
                    image.hash !== prev ? image.hash : undefined
                  );
                }}
              />
              {image.isActive && image.meta?.prompt && (
                <div className="px-2 py-4 text-left flex place-items-center gap-2">
                  <p className="cursor-auto select-text">
                    {image.meta?.prompt}
                  </p>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(image.meta.prompt);
                    }}
                  >
                    <CopyIcon />
                  </Button>
                </div>
              )}
            </animated.div>
          ))}
        </div>
      </ScrollArea>
      {/* </ScrollArea> */}
    </div>
  );
};

export default LoraDetails;
