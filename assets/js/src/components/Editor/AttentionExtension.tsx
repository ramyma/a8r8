import {
  ApplySchemaAttributes,
  command,
  CommandFunction,
  DispatchFunction,
  ExtensionTag,
  getTextSelection,
  isElementDomNode,
  NodeExtension,
  NodeExtensionSpec,
  NodeSpecOverride,
  omitExtraAttributes,
} from "@remirror/core";
import {
  AddExtrasCommandOptions,
  ExtrasAttributes,
  ExtrasOptions,
} from "./customExtentionUtils";
import { Node } from "@remirror/pm/model";

export class AttentionExtension extends NodeExtension<ExtrasOptions> {
  /**
   * The name is dynamically generated based on the passed in type.
   */
  get name() {
    return "attention" as const;
  }

  createTags() {
    return [ExtensionTag.InlineNode];
  }

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
      // content: "block*",
      // content: "inline*",

      atom: true,
      attrs: { ...extra.defaults(), code: {}, value: {} },
      parseDOM: [
        {
          tag: `span[data-attention]`,
          getAttrs: (node) => {
            if (!isElementDomNode(node)) {
              return null;
            }

            const code = node.textContent;
            const value = node.getAttribute("data-attention]");
            return { ...extra.parse(node), code, value };
          },
        },
        ...(override.parseDOM ?? []),
      ],

      toDOM: (node) => {
        const { code, value } = omitExtraAttributes(
          node.attrs,
          extra
        ) as ExtrasAttributes;

        return [
          "span",
          {
            class: "bg-neutral-600 rounded-xs text-white p-1",
          },
          `(${code}:${value})`,
        ];
      },
    };
  }

  @command()
  addAttention(
    identifier: string,
    options: AddExtrasCommandOptions = {}
  ): CommandFunction {
    return (props) => {
      const { dispatch, tr, state } = props;
      const { from, to } = getTextSelection(
        options.selection ?? tr.selection,
        tr.doc
      );
      (dispatch as DispatchFunction)(
        tr.replaceSelectionWith(
          Node.fromJSON(state.schema, {
            type: "attention",
            attrs: { value: 1, code: "tst" },
          })
        )
      );
      return true;
    };
  }
}
