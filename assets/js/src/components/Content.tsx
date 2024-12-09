import { PropsWithChildren, useEffect, useState } from "react";

type Props = PropsWithChildren;

const Content = ({ children }: Props) => {
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    setShowContent(true);
  }, []);

  return showContent ? children : null;
};

export default Content;
