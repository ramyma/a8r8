import { emitCustomEvent } from "react-custom-events";
import { Notification } from "./Notifications";
import { v4 as uuid4 } from "uuid";

export const showNotification = (notification: Omit<Notification, "id">) => {
  emitCustomEvent("notification", {
    ...notification,
    id: uuid4(),
  });
};
