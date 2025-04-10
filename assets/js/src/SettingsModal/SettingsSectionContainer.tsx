import { AnimatePresence, motion } from "motion/react";
import { PropsWithChildren } from "react";

const SettingsSectionContainer = ({ children }: PropsWithChildren) => {
  return (
    <AnimatePresence>
      <motion.div
        exit={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="opacity-0 flex flex-col size-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
export default SettingsSectionContainer;
