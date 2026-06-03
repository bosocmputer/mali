import { prisma } from "@/lib/db";
import { toUser } from "@/lib/dbMappers";
import { generateTemporaryPassword, normalizeEmail } from "@/lib/userManagement";
import type { Role, User } from "@/types";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

export class DuplicateUserEmailError extends Error {
  constructor() {
    super("User email already exists");
    this.name = "DuplicateUserEmailError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

type CreateUserInput = {
  name: string;
  email: string;
  role: Role;
  password?: string;
};

type UpdateUserInput = {
  name?: string;
  role?: Role;
  isActive?: boolean;
};

function isPrismaDuplicateError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function getUserByEmailForAuth(
  email: string
): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  return user ? toUser(user, { includePassword: true }) : null;
}

export async function getUserByIdForAuth(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  return user ? toUser(user, { includePassword: true }) : null;
}

export async function getUserByIdFromDb(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  return user ? toUser(user) : null;
}

export async function getAllUsersFromDb(): Promise<User[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });
  return users.map((user) => toUser(user));
}

export async function getStaffUsersFromDb(): Promise<User[]> {
  const users = await prisma.user.findMany({
    where: { role: "STAFF", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return users.map((user) => toUser(user));
}

export async function createUserInDb(
  input: CreateUserInput
): Promise<{ user: User; temporaryPassword: string }> {
  const temporaryPassword = input.password ?? generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

  try {
    const user = await prisma.user.create({
      data: {
        id: `user_${randomUUID()}`,
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        password: hashedPassword,
        role: input.role,
        isActive: true,
      },
    });

    return { user: toUser(user), temporaryPassword };
  } catch (error) {
    if (isPrismaDuplicateError(error)) {
      throw new DuplicateUserEmailError();
    }
    throw error;
  }
}

export async function updateUserInDb(
  id: string,
  input: UpdateUserInput
): Promise<User | null> {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    return toUser(user);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return null;
    }
    throw error;
  }
}

export async function resetUserPasswordInDb(
  id: string,
  password?: string
): Promise<{ temporaryPassword: string }> {
  const temporaryPassword = password ?? generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

  try {
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
    return { temporaryPassword };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new UserNotFoundError();
    }
    throw error;
  }
}

export async function updateUserNameInDb(
  id: string,
  name: string
): Promise<User | null> {
  const user = await prisma.user.update({
    where: { id },
    data: { name },
  });
  return toUser(user);
}

export async function updateUserPasswordInDb(
  id: string,
  hashedPassword: string
): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });
}

export async function updateUserLineUserIdInDb(
  id: string,
  lineUserId: string
): Promise<User> {
  const user = await prisma.user.update({
    where: { id },
    data: { lineUserId },
  });
  return toUser(user);
}
