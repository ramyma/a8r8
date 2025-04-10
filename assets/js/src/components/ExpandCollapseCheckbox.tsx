import { MouseEventHandler, ReactElement, forwardRef, useState } from "react";
import { motion } from "motion/react";
import Checkbox, { CheckboxProps } from "./Checkbox";
import { TriangleRightIcon } from "@radix-ui/react-icons";
import Label from "./Label";

export type ExpandCollapseCheckboxProps = CheckboxProps & {
  defaultExpanded?: boolean;
  label: string;
  showCheckbox?: boolean;
  children: ReactElement;
  expandOnChecked?: boolean;
};

const ExpandCollapseCheckbox = forwardRef<
  HTMLButtonElement,
  ExpandCollapseCheckboxProps
>(
  (
    {
      defaultExpanded = false,
      label,
      showCheckbox = true,
      expandOnChecked = true,
      children,
      ...props
    },
    ref
  ) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [prevValue, setPrevValue] = useState<boolean>();

    if (props.value !== prevValue) {
      setPrevValue(props.value ?? false);
      if (expandOnChecked || !props.value) setExpanded(props.value ?? false);
    }

    const toggleExpansion: MouseEventHandler = (event) => {
      event.preventDefault();
      setExpanded((prev) => !prev);
    };

    return (
      <div>
        <motion.div
          animate={{ marginBottom: expanded ? 8 : 0 }}
          className={`group flex select-none items-center gap-1.5 transition-colors ${showCheckbox ? "" : "cursor-pointer"}`}
          onClick={!showCheckbox ? toggleExpansion : undefined}
        >
          <div
            className="relative ml-[-9px] group-hover:text-neutral-300 hover:text-neutral-300 cursor-pointer transition-colors"
            onClick={showCheckbox ? toggleExpansion : undefined}
          >
            <TriangleRightIcon
              className={`p-0 size-7 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </div>
          {showCheckbox ? (
            <Checkbox ref={ref} {...props} fullWidth>
              {label}
            </Checkbox>
          ) : (
            <Label className="Label select-none cursor-pointer group-hover:text-neutral-200 transition-colors">
              {label}
            </Label>
          )}
        </motion.div>

        <motion.div
          className="overflow-hidden origin-top"
          initial={{ height: 0, opacity: 0.6 }}
          animate={{
            // display: expanded ? "block" : "none",
            height: expanded ? "auto" : 0,
            opacity: expanded ? 1 : 0,
            rotateX: expanded ? 0 : -30,
          }}
          transition={{
            type: "spring",
            bounce: 0.3,
            damping: 13,
            mass: 0.45,
          }}
        >
          <div className="h-fit">{children}</div>
        </motion.div>
      </div>
    );
  }
);

ExpandCollapseCheckbox.displayName = "ExpandCollapseCheckbox";

export default ExpandCollapseCheckbox;
