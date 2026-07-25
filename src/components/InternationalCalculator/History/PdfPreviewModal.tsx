import { PDFViewer } from "@react-pdf/renderer";
import { X } from "lucide-react";
import { iconButton, modalOverlay } from "@/components/shared/ui";
import MyPDFDocument from "../PdfDocument";
import { BasicDetails } from "../types";
import {
  computeDerivedValues,
  margins,
  generateTableData,
  generatePartFData,
  generateTotalRow,
} from "../helpers";

interface Props {
  entry: BasicDetails;
  onClose: () => void;
}

export default function PdfPreviewModal({ entry, onClose }: Props) {
  const calculatedValues = computeDerivedValues(entry);
  const tableData = generateTableData(calculatedValues);
  const partFData = generatePartFData(calculatedValues);
  const totals = generateTotalRow(calculatedValues);

  const dateStr = new Date(entry.createdAt || new Date()).toLocaleDateString();
  return (
    <div className={modalOverlay}>
      <div className="relative h-[90vh] max-h-[90vh] w-full max-w-5xl rounded-xl border border-edge bg-surface shadow-overlay">
        <button className={`absolute top-2 right-2 ${iconButton}`} onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
        <PDFViewer width="100%" height="100%">
          <MyPDFDocument
            basicDetails={entry}
            margins={margins}
            tableData={tableData}
            partFData={partFData}
            totals={totals}
            dateStr={dateStr}
          />
        </PDFViewer>
      </div>
    </div>
  );
}
