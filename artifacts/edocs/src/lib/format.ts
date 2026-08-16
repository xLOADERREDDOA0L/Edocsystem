import { format } from "date-fns";

export function formatDate(dateString: string | undefined | null) {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd MMM yyyy, HH:mm");
  } catch (e) {
    return dateString;
  }
}

export function formatDateOnly(dateString: string | undefined | null) {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd MMM yyyy");
  } catch (e) {
    return dateString;
  }
}