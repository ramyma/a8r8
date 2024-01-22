import React, { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Cross2Icon } from "@radix-ui/react-icons";

import useSocket from "./hooks/useSocket";

const NOTIFICATION_TIMEOUT = 10000;

type Notification = {
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

  useEffect(() => {
    const addNotification = (
      notification: Notification
    ): ReturnType<typeof setTimeout> => {
      const timeout = setTimeout(() => {
        handleCloseNotification(notification.id);
      }, NOTIFICATION_TIMEOUT);

      setNotifications((notifications) => [
        ...notifications,
        { ...notification, timeout },
      ]);
      return timeout;
    };
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
  }, [channel, handleCloseNotification]);

  return (
    <ul className="absolute top-6 right-4 flex gap-4 flex-col">
      {notifications.map(({ id, title, body, type }) => (
        <NotificationItem
          key={id}
          id={id}
          onClose={handleCloseNotification}
          title={title}
          body={body}
          type={type}
        />
      ))}
    </ul>
  );
};

type NotificationItemProps = Notification & {
  onClose: (id: Notification["id"]) => void;
};
const NotificationItem = ({
  id,
  onClose,
  title,
  body,
  type,
}: NotificationItemProps) => {
  return (
    // TODO: change bg color according to notification type; add warning
    <li
      className={
        "flex relative backdrop-blur-sm p-4 z-10 w-60 rounded flex-col gap-3 shadow-md shadow-black/30 break-words " +
        (type === "success"
          ? "bg-success/70"
          : type === "warning"
          ? "bg-warning/70"
          : "bg-danger/70 ")
      }
    >
      <span
        className="bg-transparent absolute top-3 right-3 cursor-pointer"
        onClick={() => onClose(id)}
      >
        <Cross2Icon />
      </span>
      {title && <span className="text-shadow shadow-black/60">{title}</span>}
      {body && <span className="text-shadow shadow-black/60">{body}</span>}
    </li>
  );
};

export default Notifications;
