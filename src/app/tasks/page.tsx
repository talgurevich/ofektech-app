import { redirect } from "next/navigation";

export default function TasksRedirect() {
  redirect("/workbook?sheet=tasks");
}
