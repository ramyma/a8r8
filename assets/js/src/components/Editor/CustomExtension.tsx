import escapeStringRegex from "escape-string-regexp";
import {
  ApplySchemaAttributes,
  command,
  CommandFunction,
  DispatchFunction,
  extension,
  ExtensionTag,
  getTextContentFromSlice,
  getTextSelection,
  isElementDomNode,
  KeyBindings,
  NodeExtension,
  NodeExtensionSpec,
  NodeSpecOverride,
  omitExtraAttributes,
  PrimitiveSelection,
  Selection,
} from "@remirror/core";
import { DEFAULT_SUGGESTER, Suggester } from "@remirror/pm/suggest";
import {
  AddExtrasCommandOptions,
  EXTRAS_DATA_ATTRIBUTE,
  ExtrasAttributes,
  ExtrasOptions,
} from "./customExtentionUtils";
import { formatToMaxDecimalPlaces } from "../../utils";
import { Node } from "@remirror/pm/model";
import { NodeSelection } from "prosemirror-state";

// class MyCustomNode extends Node {
//   // ... other methods for the node

//   toText() {
//     return "custom text representation";
//   }
// }
@extension<ExtrasOptions>({
  defaultOptions: {
    disableExtraAttributes: true,
    plainText: false,
    suggestionCharacter: "/",
    fallback: "",
    supportedCharacters: DEFAULT_SUGGESTER.supportedCharacters,
  },
  staticKeys: ["plainText"],
  // handlerKeyOptions: { onClick: { earlyReturnValue: true } },
  // handlerKeys: ['onChange', 'onClick'],

  handlerKeys: ["suggestCommand", "suggestLora", "suggestEmbedding"], //, "onClick"],
})
export class CustomExtension extends NodeExtension<ExtrasOptions> {
  /**
   * The name is dynamically generated based on the passed in type.
   */
  get name() {
    return "extra" as const;
  }

  // ReactComponent: ComponentType<NodeViewComponentProps> = UserCard;

  createTags() {
    return [ExtensionTag.InlineNode];
  }

  // /**
  //  * Track click events passed through to the editor.
  //  */
  // createEventHandlers(): CreateEventHandlers {
  //   return {
  //     clickMark: (event, clickState) => {
  //       const markRange = clickState.getMark(this.type);
  //       console.log("click mark");
  //       if (!markRange) {
  //         return;
  //       }

  //       return this.options.onClick(event, markRange);
  //     },
  //   };
  // }

  /**
   * Injects the baseKeymap into the editor.
   */
  public createKeymap(): KeyBindings {
    return {
      "Ctrl-ArrowUp"({ next, state, tr, dispatch, view }) {
        const selection: Selection = state.selection;
        const node =
          state.selection instanceof NodeSelection
            ? (selection as NodeSelection).node
            : null;

        if (node?.type?.name === "extra") {
          const { value = 0 } = node.attrs ?? {};

          (dispatch as DispatchFunction)(
            tr.setNodeAttribute(
              state.selection.from,
              "value",
              formatToMaxDecimalPlaces(Math.min(3, parseFloat(value) + 0.01), 2)
            )
          );
        } else if (node?.type?.name === "attention") {
          const { value = 0 } = node.attrs ?? {};

          (dispatch as DispatchFunction)(
            tr.setNodeAttribute(
              state.selection.from,
              "value",
              formatToMaxDecimalPlaces(Math.min(3, parseFloat(value) + 0.1), 2)
            )
          );
        } else {
          const { from, to } = getTextSelection(
            state.selection ?? tr.selection,
            tr.doc
          );

          const text = getTextContentFromSlice(state.selection.content());

          if (!text) return true;
          const transaction = tr.replaceSelectionWith(
            Node.fromJSON(state.schema, {
              type: "attention",
              attrs: { value: 1, code: text },
            })
          );
          // dispatch(transaction);
          (dispatch as DispatchFunction)(
            tr.setSelection(
              NodeSelection.create(state.apply(transaction).doc, from)
            )
          );
          return true;
        }
        // next();
        return true;
      },
      "Ctrl-ArrowDown"({ next, state, tr, dispatch }) {
        const selection: Selection = state.selection;
        const node =
          state.selection instanceof NodeSelection
            ? (selection as NodeSelection).node
            : null;
        if (node?.type?.name === "extra") {
          const { value = 0 } = node.attrs ?? {};
          (dispatch as DispatchFunction)(
            tr.setNodeAttribute(
              state.selection.from,
              "value",
              formatToMaxDecimalPlaces(
                Math.max(-3, parseFloat(value) - 0.01),
                2
              )
            )
            // .setSelection({
            //   $head: state.selection.$head,
            //   $anchor: state.selection.$anchor,
            // })
          );
        } else if (node?.type?.name === "attention") {
          const { value = 0 } = node.attrs ?? {};

          (dispatch as DispatchFunction)(
            tr.setNodeAttribute(
              state.selection.from,
              "value",
              formatToMaxDecimalPlaces(Math.max(-3, parseFloat(value) - 0.1), 2)
            )
          );
        } else {
          const { from } = getTextSelection(
            state.selection ?? tr.selection,
            tr.doc
          );

          const text = getTextContentFromSlice(state.selection.content());
          if (!text) return true;

          const transaction = tr.replaceSelectionWith(
            Node.fromJSON(state.schema, {
              type: "attention",
              attrs: {
                value: 1,
                code: text,
              },
            })
          );
          // dispatch(transaction);
          (dispatch as DispatchFunction)(
            tr.setSelection(
              NodeSelection.create(state.apply(transaction).doc, from)
            )
          );
          return true;
        }
        // else {
        //   const { from, to } = getTextSelection(
        //     state.selection ?? tr.selection,
        //     tr.doc
        //   );
        //   dispatch?.(tr.addMark(from, to, AttributesExtension.type.create()));
        // }
        return true;
        // next(); // Runs all lower priority commands

        // return true;
      },
    };
  }

  // createNodeViews() {
  //   return {
  //     myCustomNode: (node, view, getPos) => {
  //       return new MyCustomNode(node, view, getPos);
  //     },
  //   };
  // }

  createNodeSpec(
    extra: ApplySchemaAttributes,
    override: NodeSpecOverride
  ): NodeExtensionSpec {
    return {
      selectable: true,
      draggable: false,
      ...override,
      inline: true,
      // content: "(text+)*",
      atom: true,
      attrs: { ...extra.defaults(), code: {}, value: {} },
      parseDOM: [
        {
          tag: `span[${EXTRAS_DATA_ATTRIBUTE}`,
          getAttrs: (node) => {
            if (!isElementDomNode(node)) {
              return null;
            }

            const code = node.textContent; //getAttribute(extra_DATA_ATTRIBUTE);
            const value = node.getAttribute("data-remirror-value");
            return { ...extra.parse(node), code, value };
          },
        },
        ...(override.parseDOM ?? []),
      ],
      // content: "block*",
      toDOM: (node) => {
        const { code, value } = omitExtraAttributes(
          node.attrs,
          extra
        ) as ExtrasAttributes;

        return [
          "span",
          {
            class:
              // ExtensionextraTheme.extra_WRAPPER +
              " bg-white rounded text-primary p-1",
            // [extra_DATA_ATTRIBUTE]: extra[this.options.identifier],
          },
          `<lora:${code}:${value}>`,
        ];
      },
      // attrs: {
      //   id: { default: null },
      //   code: { default: "" },
      //   value: { default: "" },
      // },

      // // content: "block*",
      // toDOM: (node) => {
      //   const attrs: DOMCompatibleAttributes = {
      //     // "data-user-id": node.attrs.id,
      //     "data-user-name": node.attrs.code,
      //     "data-user-value": node.attrs.value,
      //     "data-user-from": node.attrs.from,
      //   };
      //   return ["span", attrs, 0];
      // },
    };
  }

  /**
   * Insert an extra into the document at the requested location by name
   *
   * The range is optional and if not specified the extra will be inserted
   * at the current selection.
   *
   * @param identifier - the hexcode | unicode | shortcode | emoticon of the extra to insert.
   * @param [options] - the options when inserting the extra.
   */
  @command()
  addLora(
    identifier: string,
    options: AddExtrasCommandOptions = {}
  ): CommandFunction {
    return (props) => {
      const { dispatch, tr } = props;
      const extra = identifier;

      if (!extra) {
        // Nothing to do here since no extra found.
        return false;
      }

      if (!this.options.plainText) {
        return this.store.commands.replaceText.original({
          type: this.type,
          appendText: "",
          attrs: { code: extra, value: 1, from: tr.selection.from },
          selection: options.selection,
        })(props);
      }

      const { from, to } = getTextSelection(
        options.selection ?? tr.selection,
        tr.doc
      );

      dispatch?.(tr.insertText(extra, from, to));

      return true;
    };
  }
  toJSON() {
    return {
      type: this.type,
      content: "vbnvbnv",
      // Custom properties ...
    };
  }

  get text() {
    return "dsfsdfsdfsdfsdf"; //this.editor.view.state.doc.textContent;
  }
  @command()
  addEmbedding(
    identifier: string,
    options: AddExtrasCommandOptions = {}
  ): CommandFunction {
    return (props) => {
      const { dispatch, tr } = props;
      const extra = identifier;

      if (!extra) {
        // Nothing to do here since no extra found.
        return false;
      }

      // if (!this.options.plainText) {
      //   return this.store.commands.replaceText.original({
      //     type: this.type,
      //     appendText: " ",
      //     attrs: { code: extra, value: 1 },
      //     selection: options.selection,
      //   })(props);
      // }

      const { from, to } = getTextSelection(
        options.selection ?? tr.selection,
        tr.doc
      );

      dispatch?.(tr.insertText(extra, from, to));

      return true;
    };
  }

  @command()
  addCommand(
    identifier: string,
    options: AddExtrasCommandOptions = {}
  ): CommandFunction {
    return (props) => {
      const { dispatch, tr } = props;
      const extra = identifier;

      if (!extra) {
        // Nothing to do here since no extra found.
        return false;
      }

      // if (!this.options.plainText) {
      //   return this.store.commands.replaceText.original({
      //     type: this.type,
      //     attrs: { code: extra },
      //     selection: options.selection,
      //   })(props);
      // }

      const { from, to } = getTextSelection(
        options.selection ?? tr.selection,
        tr.doc
      );

      dispatch?.(tr.insertText("/" + extra, from, to));

      return true;
    };
  }

  /**
   * Inserts the suggestion character into the current position in the
   * editor in order to activate the suggestion popup.
   */
  @command()
  suggestextra(selection?: PrimitiveSelection): CommandFunction {
    return ({ tr, dispatch }) => {
      const { from, to } = getTextSelection(selection ?? tr.selection, tr.doc);
      const text = this.store.helpers.getTextBetween(from - 1, to, tr.doc);

      if (text.includes(this.options.suggestionCharacter)) {
        return false;
      }

      dispatch?.(tr.insertText(this.options.suggestionCharacter, from, to));

      return true;
    };
  }

  @command()
  suggestCommand(selection?: PrimitiveSelection): CommandFunction {
    return ({ tr, dispatch }) => {
      const { from, to } = getTextSelection(selection ?? tr.selection, tr.doc);
      const text = this.store.helpers.getTextBetween(from - 1, to, tr.doc);

      if (text.includes(this.options.suggestionCharacter)) {
        return false;
      }

      // dispatch?.(tr.insertText(this.options.suggestionCharacter, from, to));

      return true;
    };
  }

  /**
   * extras can be selected via `:` the colon key (by default). This sets the
   * configuration using `prosemirror-suggest`
   */
  createSuggesters(): Suggester[] {
    return [
      {
        disableDecorations: true,
        invalidPrefixCharacters: `${escapeStringRegex("/lora")}|\\w`,
        supportedCharacters: this.options.supportedCharacters,
        char: "/lora",
        name: "loraSuggest",
        suggestTag: "span",
        onChange: (props) => {
          // When the change handler is called call the extension handler
          // `suggestextra` with props that can be used to trigger the extra.
          this.options.suggestLora({
            // moji: this.moji,
            query: props.query.full,
            text: props.text.full,
            range: props.range,
            exit: !!props.exitReason,
            change: !!props.changeReason,
            apply: (code: string) => {
              this.store.commands.addLora(code, { selection: props.range });
            },
          });
        },
      },
      {
        disableDecorations: true,
        invalidPrefixCharacters: `${escapeStringRegex("/embedding")}|\\w`,
        supportedCharacters: this.options.supportedCharacters,
        char: "/embedding",
        name: "embeddingSuggest",
        suggestTag: "span",
        onChange: (props) => {
          // When the change handler is called call the extension handler
          // `suggestextra` with props that can be used to trigger the extra.
          this.options.suggestEmbedding({
            // moji: this.moji,
            query: props.query.full,
            text: props.text.full,
            range: props.range,
            exit: !!props.exitReason,
            change: !!props.changeReason,
            apply: (code: string) => {
              this.store.commands.addEmbedding(code, {
                selection: props.range,
              });
            },
          });
        },
      },
      {
        disableDecorations: true,
        invalidPrefixCharacters: `${escapeStringRegex(
          this.options.suggestionCharacter
        )}|\\w`,
        supportedCharacters: this.options.supportedCharacters,
        char: this.options.suggestionCharacter,
        name: "actionMenu",
        suggestTag: "span",
        onChange: (props) => {
          // When the change handler is called call the extension handler
          // `suggestextra` with props that can be used to trigger the extra.
          this.options.suggestCommand({
            // moji: this.moji,
            query: props.query.full,
            text: props.text.full,
            range: props.range,
            exit: !!props.exitReason,
            change: !!props.changeReason,
            apply: (code: string) => {
              this.store.commands.addCommand(code, { selection: props.range });
            },
          });
        },
      },
    ];
  }
}

// declare global {
//   namespace Remirror {
//     interface AllExtensions {
//       extra: CustomExtension;
//     }
//   }
// }
