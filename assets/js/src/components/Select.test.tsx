import React from "react";
import { vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { render, screen } from "../testUtils";
import Select, { SelectProps } from "./Select";

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

  test("should show groups", async () => {
    const onChangeMock = vi.fn((value) => value);

    const props: SelectProps = {
      items: [
        { value: "a", label: "a" },
        { value: "b", label: "b" },
        { value: "c", label: "c" },
      ],
      onChange: onChangeMock,
      value: "",
      groups: [
        {
          name: "Flux",
          matcher: (itemName) => /.*flux.*/i.test(itemName),
        },
        {
          name: "Pony",
          matcher: (itemName) => /.*pony.*/i.test(itemName),
        },
        {
          name: "SDXL",
          matcher: (itemName) => /.*(sd)?(\S)*xl.*/i.test(itemName),
        },
      ],
    };
    render(<Select {...props} />);

    await userEvent.click(screen.getByRole("combobox"));

    expect(screen.getByText(/flux/i)).toBeInTheDocument();
  });
});
