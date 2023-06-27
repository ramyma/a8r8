import type {
  AcceptUndefined,
  FromToProps,
  Handler,
  PrimitiveSelection,
  ProsemirrorAttributes,
  Static,
} from "@remirror/core";
import type { Suggester } from "@remirror/pm/suggest";

export interface ExtrasOptions extends Pick<Suggester, "supportedCharacters"> {
  /**
   * When true, extra will be rendered as plain text instead of atom nodes.
   *
   * This is a static property and can only be set at the creation of the extra
   * extension.
   *
   * @defaultValue false
   */
  plainText?: Static<boolean>;

  /**
   * The character which will activate the suggestion query callback.
   *
   * @defaultValue ':'
   */
  suggestionCharacter?: string;

  /**
   * A handler which will be called when the suggestions are activated.
   */
  suggestCommand?: Handler<ExtrasSuggestHandler>;
  suggestLora?: Handler<ExtrasSuggestHandler>;
  suggestEmbedding?: Handler<ExtrasSuggestHandler>;
}

export interface ExtrasSuggestHandlerProps {
  /**
   * The query value after the activation character.
   */
  query: string;

  /**
   * The full text value of the queried match.
   */
  text: string;

  /**
   * A function that takes the current suggested area and applies the command
   * for the current range.
   */
  apply: ExtrasSuggestHandlerCommand;

  /**
   * The range of the matching suggestion.
   */
  range: FromToProps;

  /**
   * `true` when this change was triggered by an exit. Both `exit` and `change`
   * can be true when jumping between matching suggestion positions in the
   * document.
   */
  exit: boolean;

  /**
   * `true` when the update to the suggestion was caused by a change to the
   * query, or cursor position in the matching position.
   *
   * This can be true while `exit` is true if a change was caused by jumping
   * between matching suggestion positions.
   */
  change: boolean;
}

export type ExtrasSuggestHandler = (props: ExtrasSuggestHandlerProps) => void;

/**
 * The extra command. Pass in the unique identifier which can either be a
 * shortcode, hexcode, extra etc and it find the matching extra for you.
 */
export type ExtrasSuggestHandlerCommand = (extra: string) => void;

export const EXTRAS_DATA_ATTRIBUTE = "data-remirror-extra";

export type ExtrasAttributes = ProsemirrorAttributes<{
  code: string;
}>;

export interface AddExtrasCommandOptions {
  selection?: PrimitiveSelection;
}
