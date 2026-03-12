/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, Download, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProcessedFile {
  name: string;
  data: Uint8Array;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError(null);
        setProcessedFile(null);
      } else {
        setError('Please upload a valid Excel file (.xlsx or .xls)');
      }
    }
  };

  const processExcel = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });

          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

            for (let R = range.s.r; R <= range.e.r; ++R) {
              for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = worksheet[cellAddress];

                if (!cell) continue;

                // Check if it's a date or a string that looks like a date
                if (cell.t === 'd' || (cell.t === 's' && cell.v && typeof cell.v === 'string' && cell.v.includes('/'))) {
                  let dateStr = '';
                  
                  if (cell.t === 'd') {
                    // It's a native date cell
                    const d = cell.v as Date;
                    // Format as YYYY-MM-DD or similar, then replace / with -
                    // Actually, if it's a date object, we can format it directly
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    dateStr = `${day}-${month}-${year}`;
                  } else {
                    // It's a string containing /
                    dateStr = String(cell.v).replace(/\//g, '-');
                  }

                  // Update cell to text type with the new value
                  cell.t = 's';
                  cell.v = dateStr;
                  cell.w = dateStr; // formatted text
                }
              }
            }
          });

          const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          setProcessedFile({
            name: `processed_${file.name}`,
            data: new Uint8Array(out)
          });
          setIsProcessing(false);
        } catch (err) {
          console.error(err);
          setError('Error processing Excel file. The file might be corrupted or in an unsupported format.');
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      setError('Failed to read file.');
      setIsProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!processedFile) return;

    const blob = new Blob([processedFile.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = processedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setProcessedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-[#1a1a1a] flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white rounded-[24px] shadow-sm border border-black/5 p-8"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Excel Date Formatter</h1>
            <p className="text-sm text-gray-500">Convert dates to text and replace / with -</p>
          </div>
        </div>

        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
                setFile(droppedFile);
                setError(null);
              } else {
                setError('Please upload a valid Excel file (.xlsx or .xls)');
              }
            }}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group"
          >
            <Upload className="text-gray-400 group-hover:text-emerald-500 mb-4 transition-colors" size={40} />
            <p className="text-lg font-medium text-gray-700">Click or drag Excel file here</p>
            <p className="text-sm text-gray-400 mt-1">Supports .xlsx and .xls</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".xlsx, .xls" 
              className="hidden" 
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <FileText className="text-emerald-600" size={20} />
                <span className="font-medium truncate max-w-[240px]">{file.name}</span>
              </div>
              <button 
                onClick={reset}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {!processedFile ? (
              <button
                onClick={processExcel}
                disabled={isProcessing}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Process File</>
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-4 rounded-xl font-medium">
                  <CheckCircle2 size={20} />
                  File processed successfully!
                </div>
                <button
                  onClick={downloadFile}
                  className="w-full py-4 bg-[#1a1a1a] hover:bg-black text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download size={20} />
                  Download Processed File
                </button>
                <button
                  onClick={reset}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                >
                  Process another file
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <footer className="mt-8 text-gray-400 text-sm">
        Built with precision for Excel data processing
      </footer>
    </div>
  );
}
