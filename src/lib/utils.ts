import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Prisma } from "@prisma/client"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function serializeDecimal<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Prisma Decimal
  if (
    typeof obj === "object" &&
    (obj instanceof Prisma.Decimal || 
     (obj as any).constructor?.name === "Decimal" ||
     typeof (obj as any).toNumber === "function")
  ) {
    return (obj as any).toNumber();
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(serializeDecimal);
  }

  // Handle Object
  if (typeof obj === "object") {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeDecimal(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}
