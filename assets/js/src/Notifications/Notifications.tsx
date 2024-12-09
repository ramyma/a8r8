import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Cross2Icon } from "@radix-ui/react-icons";

import useSocket from "../hooks/useSocket";
import { useCustomEventListener } from "react-custom-events";
import { AnimatePresence, motion } from "motion/react";
const NOTIFICATION_TIMEOUT = 10000;

export type Notification = {
  id: string;
  type: "error" | "warning" | "info" | "success";
  title: string;
  body?: string;
  timeout?: ReturnType<typeof setTimeout>;
};

const Notifications = () => {
  const { channel } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleCloseNotification = useCallback((id: Notification["id"]) => {
    setNotifications((notifications) => {
      const notification = notifications.find(
        (notification) => id === notification.id
      );
      clearTimeout(notification?.timeout);
      return notifications.filter((notification) => notification.id !== id);
    });
  }, []);

  const addNotification = useCallback(
    (notification: Notification): ReturnType<typeof setTimeout> => {
      const timeout = setTimeout(() => {
        handleCloseNotification(notification.id);
      }, NOTIFICATION_TIMEOUT);

      setNotifications((notifications) => [
        ...notifications,
        { ...notification, timeout },
      ]);
      return timeout;
    },
    [handleCloseNotification]
  );

  const handleInternalNotification = (notification) => {
    addNotification(notification);
  };

  // handle internal notifications
  useCustomEventListener<Notification>(
    "notification",
    handleInternalNotification
  );

  useEffect(() => {
    if (channel) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const ref = channel?.on(
        "error",
        (error: {
          error: string;
          errors: string;
          detail: string;
          message?: string;
        }) => {
          if (error.error === "OutOfMemoryError") {
            timeout = addNotification({
              id: uuidv4(),
              type: "error",
              title: "Out of memory",
            });
          } else {
            // eslint-disable-next-line no-console
            console.log({ error });
            timeout = addNotification({
              id: uuidv4(),
              type: "error",
              title: "Server error",
              body:
                error.detail || error.errors || error?.message || error.error,
            });
          }
        }
      );
      const messageRef = channel.on(
        "message",
        async (data: {
          message: { title: string; body: string; type: Notification["type"] };
        }) => {
          timeout = addNotification({
            id: uuidv4(),
            type: data?.message?.type,
            title: data?.message?.title,
            body: data.message.body,
          });
        }
      );
      return () => {
        channel?.off("error", ref);
        channel?.off("message", messageRef);
        timeout && clearTimeout(timeout);
      };
    }
  }, [addNotification, channel, handleCloseNotification]);

  return (
    <ul className="absolute top-6 right-4 flex gap-4 flex-col">
      <AnimatePresence mode="popLayout">
        {notifications.map(({ id, title, body, type }) => (
          <motion.li
            key={id}
            layout
            initial={{
              opacity: 0,
              x: 200,
              scale: 1,
            }}
            animate={{
              opacity: 1,
              scale: 1,

              x: 0,
            }}
            exit={{
              opacity: 0,
              x: 200,
              scale: 0.95,
            }}
            transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
            className={
              "flex relative backdrop-blur-sm p-4 z-50 w-60 rounded flex-col gap-3 shadow-md shadow-black/30 break-words " +
              (type === "success"
                ? "bg-success/70"
                : type === "warning"
                  ? "bg-warning/70 text-neutral-900"
                  : "bg-danger/70 ")
            }
          >
            <span
              className="bg-transparent absolute top-3 right-3 cursor-pointer"
              onClick={() => handleCloseNotification(id)}
            >
              <Cross2Icon />
            </span>
            {title && <span>{title}</span>}
            {body && <span>{body}</span>}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
};

export default Notifications;
