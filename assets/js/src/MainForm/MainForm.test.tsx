import React from "react";
import { beforeAll, expect, vi } from "vitest";
import { render, screen, act } from "../testUtils";
import MainForm from "./MainForm";
// import "@testing-library/jest-dom";
import { initialState, setIsConnected, updateStats } from "../state/statsSlice";

describe("Test MainForm", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {
        // do nothing
      }
      unobserve() {
        // do nothing
      }
      disconnect() {
        // do nothing
      }
    };
  });
  // afterAll(() => {
  //   vi.clearAllMocks();
  // });
  test("should hide generation button and show interrupt when generating", async () => {
    const { store } = render(<MainForm />, {
      preloadedState: {
        stats: {
          ...initialState,
          isConnected: true,
          isGenerating: true,
        },
      },
    });

    expect(screen.queryByText(/generate/i)).not.toBeInTheDocument();
    expect(screen.getByText(/interrupt/i)).toBeInTheDocument();

    act(() => store.dispatch(updateStats({ isGenerating: false })));

    expect(screen.getByText(/generate/i)).toBeInTheDocument();
    expect(screen.queryByText(/interrupt/i)).not.toBeInTheDocument();
  });

  test("should hide disable generation button when disconnected", async () => {
    const { store } = render(<MainForm />, {
      preloadedState: {
        stats: {
          ...initialState,
          isConnected: true,
        },
      },
    });

    expect(screen.queryByText(/generate/i)).toBeEnabled();

    act(() => store.dispatch(setIsConnected(false)));

    expect(screen.getByText(/generate/i)).toBeDisabled();
  });
});
