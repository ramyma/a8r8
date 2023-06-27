import React from "react";
import { vi } from "vitest";
import { render, screen } from "../testUtils";
import Select from "./Select";

describe("Test Select", () => {
  test.skip("choose first item when value is not defined", () => {
    const onChangeMock = vi.fn((value) => value);
    render(<Select items={["a", "b", "c"]} onChange={onChangeMock} value="" />);
    expect(onChangeMock).toBeCalledWith("a");
    expect(screen.queryByText("a")).toBeInTheDocument();
  });

  test("choose first item when value is not defined", async () => {
    const onChangeMock = vi.fn((value) => value);
    const props = {
      items: [
        { value: "a", label: "a" },
        { value: "b", label: "b" },
        { value: "c", label: "c" },
      ],
      onChange: onChangeMock,
      value: "",
    };
    const { rerender } = render(<Select {...props} />);
    expect(onChangeMock).toBeCalledWith("a");

    rerender(<Select {...props} value="a" />);

    const label = screen.queryByText("a");

    expect(label).toBeInTheDocument();
  });
});
