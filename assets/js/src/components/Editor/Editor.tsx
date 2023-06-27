import React, { forwardRef, useCallback, useEffect } from "react";
import { PlaceholderExtension } from "remirror/extensions";
import { EditorComponent, Remirror, useRemirror } from "@remirror/react";

import "remirror/styles/all.css";
import { CustomExtension } from "./CustomExtension";
import { CustomPopupComponent } from "./CustomPopupContainer";
import { EditorState } from "prosemirror-state";
import { AttentionExtension } from "./AttentionExtension";

// export const Menu = () => {
//   const { addAttention, insertParagraph, focus } = useCommands();

//   return (
//     <button
//       onClick={(e) => {
//         e.preventDefault();
//         // addAttention();
//         // insertParagraph("xcvxcvxcvxcvxcv");
//         focus();
//       }}
//     >
//       Samp
//     </button>
//   );
// };

// const Menu = () => <button onClick={() => alert("TBD")}>B</button>;
// const hooks = [
//   () => {
//     const { getJSON, getText, getStateJSON } = useHelpers();

//     const handleSaveShortcut = useCallback(
//       ({ state }) => {
//         console.log(`Save to backend:`, getJSON(state));
//         console.log("Text: ", editorJsonToText(getJSON(state)));
//         console.log(`Save to backend:`, getText({ state }));
//         console.log(`Save to backend:`, state.doc.toString());
//         console.log(`Save to backend:`, getStateJSON(state));

//         return true; // Prevents any further key handlers from being run.
//       },
//       [getJSON, getStateJSON, getText]
//     );

//     // "Mod" means platform agnostic modifier key - i.e. Ctrl on Windows, or Cmd on MacOS
//     useKeymap("Mod-c", handleSaveShortcut);
//   },
// ];
interface Props {
  onChange: (state: EditorState) => void;
  value: string;
  placeholder?: string;
  autofocus?: boolean;
}
const Editor = forwardRef(
  ({ autofocus = false, placeholder = "", value, onChange }: Props, ref) => {
    const extensions = useCallback(
      () => [
        // new BoldExtension(),
        // new ItalicExtension(),
        // new UnderlineExtension(),
        new CustomExtension(),
        new AttentionExtension(),
        //   new MentionAtomExtension({
        //     // draggable: true,
        //     matchers: [
        //       // {
        //       //   name: "at",
        //       //   char: "@",
        //       //   suggestClassName: "bg-white",
        //       //   matchOffset: 0,
        //       // },
        //       {
        //         name: "lora",
        //         char: "/lora",
        //         suggestClassName: "bg-white",
        //         matchOffset: 0,
        //       },
        //     ],
        //     appendText: " ",
        //     // selectable: true,
        //     // onClick: (e, nodePos) => {
        //     //   console.log(e, nodePos);
        //     // },
        //   }),
        new PlaceholderExtension({ placeholder }),
      ],
      [placeholder]
    );

    const { getContext, manager, state, setState } = useRemirror({
      extensions,
      content: "",
      stringHandler: "html",
      selection: "end",
    });

    // const onChange: RemirrorEventListener<Combined> = useCallback(
    //   ({ getText, createStateFromContent }) => {
    //     const newValue = createStateFromContent(
    //       `${getText()}<ul><li>Surprise!!!</li></ul>`
    //     );
    //   },
    //   []
    // );
    useEffect(() => {
      if (value) {
        if (typeof value === "string") {
          getContext()?.setContent(value);
          onChange(manager.view.state);
        } else setState(value);
      }
    }, [getContext, manager, onChange, setState, state.doc, value]);

    return (
      <div className="remirror-theme">
        <Remirror
          manager={manager}
          initialContent={state}
          // onChange={onChange}
          // hooks={hooks}
          autoFocus={autofocus}
          onChange={(params) => {
            onChange(params?.state);
          }}
          classNames={[
            "border border-neutral-700 !shadow-none text-base bg-neutral-800/80",
          ]}
        >
          {/* <OnChangeJSON
            onChange={(json) => {
              console.log({ json }, getContext().view);
            }}
          /> */}

          <EditorComponent />
          {/* <Menu /> */}
          <CustomPopupComponent />
          {/* <MentionSuggestor loras={loras} /> */}
          {/* <Menu /> */}
        </Remirror>
      </div>
    );
  }
);
Editor.displayName = "Editor";
// const MentionSuggestor: React.FC = ({ loras }: { loras: Lora[] }) => {
//   const [options, setOptions] = useState<MentionAtomNodeAttributes[]>([]);
//   const { state, getMenuProps, getItemProps, indexIsHovered, indexIsSelected } =
//     useMention({
//       items: options,
//     });
//   useSuggest({});
//   useEffect(() => {
//     if (!state) {
//       return;
//     }

//     const searchTerm = state.query.full.toLowerCase();

//     const filteredOptions =
//       state.name === "lora" && loras
//         ? loras
//             .filter((lora) => lora.name.toLowerCase().includes(searchTerm))
//             .map((lora) => ({ id: lora.name, label: lora.name }))
//             // ALL_USERS.filter((user) =>
//             //   user.label.toLowerCase().includes(searchTerm)
//             // )
//             .sort()
//             .slice(0, 5)
//         : ALL_USERS.filter((user) =>
//             user.label.toLowerCase().includes(searchTerm)
//           )
//             .sort()
//             .slice(0, 5);

//     setOptions(filteredOptions);
//   }, [loras, state]);

//   const enabled = Boolean(state);

//   return (
//     <FloatingWrapper
//       positioner="cursor"
//       enabled={enabled}
//       placement="bottom-start"
//       renderOutsideEditor
//     >
//       <div
//         {...getMenuProps()}
//         className="overflow-visible flex flex-col gap-2 text-white rounded  mt-4 bg-black w-full "
//       >
//         {enabled &&
//           options.map((user, index) => {
//             const isHighlighted = indexIsSelected(index);
//             const isHovered = indexIsHovered(index);

//             return (
//               <div
//                 key={user.id}
//                 // className={cx(
//                 //   "suggestion",
//                 //   isHighlighted && "highlighted",
//                 //   isHovered && "hovered"
//                 // )}
//                 className={`p-2 ${
//                   isHovered || isHighlighted ? "bg-white text-black" : ""
//                 }`}
//                 {...getItemProps({
//                   item: user,
//                   index,
//                 })}
//               >
//                 {user.label}
//               </div>
//             );
//           })}
//       </div>
//     </FloatingWrapper>
//   );
// };

export default Editor;

// import React, { Fragment } from "react";

// type Props = {};
// type Item = {
//   text: string;
//   type: "text" | "lora" | "embedding";
//   //   color: string;
// };
// const items: Item[] = [
//   { text: "this is just a test ", type: "text" },
//   { text: "add_detail", type: "lora" },
//   { text: " right", type: "text" },
// ];

// const Editor = (props: Props) => {
//   return (
//     <div className="flex border rounded p-2" role="textbox" aria-multiline>
//       <p>
//         {items.map((item, index) => (
//           <Item key={index} {...item} />
//         ))}
//       </p>
//     </div>
//   );
// };

// const Item = ({ text, type }: Item) => {
//   if (type === "text") return <Fragment>{text}</Fragment>;
//   if (type === "lora")
//     return (
//       <span className="hover:text-red-300">
//         {"<"}lora:{text}:1{">"}
//       </span>
//     );
// };

// export default Editor;
