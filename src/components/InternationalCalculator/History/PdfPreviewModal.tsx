import { PDFViewer } from "@react-pdf/renderer";
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-[80vw] h-[90vh] relative">
        <button className="absolute top-2 right-2" onClick={onClose}>
          ✕
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
