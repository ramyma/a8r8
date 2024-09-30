import {
  MouseEventHandler,
  ReactElement,
  forwardRef,
  useRef,
  useState,
} from "react";
import { animated, config, useSpring } from "@react-spring/web";
import Checkbox, { CheckboxProps } from "./Checkbox";
import { TriangleRightIcon } from "@radix-ui/react-icons";
import Label from "./Label";

type Props = CheckboxProps & {
  defaultExpanded?: boolean;
  label: string;
  showCheckbox?: boolean;
  children: ReactElement;
};

const ExpandCollapseCheckbox = forwardRef<HTMLButtonElement, Props>(
  (
    { defaultExpanded = false, label, showCheckbox = true, children, ...props },
    ref
  ) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [prevValue, setPrevValue] = useState<boolean>();
    const contentRef = useRef<HTMLDivElement>(null);

    if (props.value !== prevValue) {
      setPrevValue(props.value ?? false);
      setExpanded(props.value ?? false);
    }

    const style = useSpring({
      height: expanded
        ? contentRef.current?.getBoundingClientRect().height + "px"
        : "0px",
      config: config.default,
    });

    const toggleExpansion: MouseEventHandler = (event) => {
      event.preventDefault();
      setExpanded((prev) => !prev);
    };

    return (
      <>
        <div className="flex select-none cursor-pointer items-center gap-1.5 transition-colors">
          <div
            className="ml-[-9px] hover:text-neutral-200"
            onClick={toggleExpansion}
          >
            <TriangleRightIcon
              className={`p-0 size-8 transition-transform ${expanded ? "rotate-90" : ""}`}
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
        </div>

        <animated.div style={style} className="overflow-hidden">
          <div className="h-fit" ref={contentRef}>
            {children}
          </div>
        </animated.div>
      </>
    );
  }
);

ExpandCollapseCheckbox.displayName = "ExpandCollapseCheckbox";

export default ExpandCollapseCheckbox;
