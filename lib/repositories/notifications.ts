import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { toTask } from "@/lib/dbMappers";
import type { NotificationLog, NotificationType, Task } from "@/types";

const notificationTaskInclude = {
  client: {
    include: {
      taxTypes: {
        orderBy: { id: "asc" as const },
      },
    },
  },
  taxType: true,
  assignedUser: true,
};

export type NotificationWithDetails = NotificationLog & {
  task: Task | null;
  user: { name: string } | null;
};

export async function getNotificationsFromDb(input: {
  isSupervisor: boolean;
  userId: string;
}): Promise<NotificationWithDetails[]> {
  const notifications = await prisma.notificationLog.findMany({
    where: input.isSupervisor ? {} : { userId: input.userId },
    include: {
      task: {
        include: notificationTaskInclude,
      },
      user: {
        select: { name: true },
      },
    },
    orderBy: { sentAt: "desc" },
  });

  return notifications.map((notification) => ({
    id: notification.id,
    taskId: notification.taskId,
    userId: notification.userId,
    type: notification.type as NotificationType,
    sentAt: notification.sentAt.toISOString(),
    task: notification.task ? toTask(notification.task) : null,
    user: notification.user,
  }));
}

export async function createNotificationInDb(input: {
  taskId: string;
  userId: string;
  type: NotificationType;
}): Promise<NotificationLog> {
  const notification = await prisma.notificationLog.create({
    data: {
      id: randomUUID(),
      taskId: input.taskId,
      userId: input.userId,
      type: input.type,
    },
  });

  return {
    id: notification.id,
    taskId: notification.taskId,
    userId: notification.userId,
    type: notification.type as NotificationType,
    sentAt: notification.sentAt.toISOString(),
  };
}
