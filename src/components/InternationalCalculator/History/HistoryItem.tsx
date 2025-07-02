import React from "react";
import { BasicDetails } from "../types";

interface Props {
  entry: BasicDetails;
  onClick: () => void;
}

export default function HistoryItem({ entry, onClick }: Props) {
  return (
    <div
      className="p-4 rounded-md shadow-sm bg-gray-100 dark:bg-gray-800 cursor-pointer border"
      onClick={onClick}
    >
      <div className="font-medium">{entry.customerName}</div>
      <div className="text-sm">
        {entry.originCity} - {entry.destinationCity} ·{" "}
        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ""}
      </div>
    </div>
  );
}
