"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";

type Row = Record<string, string>;

export default function Module1() {
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const previewRows = useMemo(() => rows.slice(0, 200), [rows]);

  function onFile(file: File) {
    setError("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Row>) => {
        if (results.errors?.length) {
          setError(results.errors[0].message);
          return;
        }
        const data = results.data || [];
        setRows(data);
        setColumns(data.length ? Object.keys(data[0]) : []);
      },
    });
  }

  return (
    <main className="min-h-screen p-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-semibold">Module 1 — Relative Strength</h1>
        <p className="mt-2 text-slate-400">
          Upload an RS snapshot CSV and view the ranked table.
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 p-4">
          <label className="text-sm text-slate-300">Upload CSV</label>
          <input
            className="mt-2 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-100 hover:file:bg-slate-700"
            type="file"
            accept=".csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
          <p className="mt-2 text-xs text-slate-500">
            Tip: start with your rs_snapshot_YYYY-MM-DD_with_groups.csv
          </p>
        </div>

        <div className="mt-6 overflow-auto rounded-xl border border-slate-800">
          {rows.length === 0 ? (
            <div className="p-6 text-slate-400">No data loaded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-black">
                <tr className="border-b border-slate-800">
                  {columns.map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-medium text-slate-200">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-900 hover:bg-slate-950">
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2 text-slate-200">
                        {r[c] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 200 ? (
          <p className="mt-2 text-xs text-slate-500">
            Showing first 200 rows ({rows.length} total).
          </p>
        ) : null}
      </div>
    </main>
  );
}
