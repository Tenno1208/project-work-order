"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

export default function SPKPage() {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    const printWindow = window.open("", "_blank", "width=900,height=600");

    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Preview SPK PDAM</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; color: #000; }
              h2, h3 { text-align: center; margin-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 8px; font-size: 14px; }
              .no-border td { border: none; }
              .footer { margin-top: 50px; display: flex; justify-content: space-between; }
              .ttd { text-align: center; width: 40%; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Surat Perintah Kerja (SPK)</h1>
        <Button
          onClick={handlePrint}
          className="bg-bl
