import TradingCalendarPage from "@/frontend/pages/calendar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Calendar | Trade OS",
  description: "Visual overview of your daily trading performance with monthly and annual summaries.",
};

export default function CalendarPage() {
  return <TradingCalendarPage />;
}
