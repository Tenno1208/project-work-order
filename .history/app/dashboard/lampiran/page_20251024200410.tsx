"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LampiranPengajuan() {
  const [form, setForm] = useState({
    kepada: "",
    satker: "",
    kodeBarang: "",
    uraian: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-[800px] mx-auto bg-white border border-gray-300 rounded-lg p-6 shadow-md text-gray-800">
        <h1 className="text-center font-bold text-lg mb-4">
          LAMPIRAN PENGAJUAN PERBAIKAN
        </h1>

        <p className="text-sm mb-2">
          PERUMDA AIR MINUM TIRTA MOEDAL <br />
          KOTA SEMARANG
        </p>

        <div className="text-sm text-right mb-4">Semarang, {new Date().toLocaleDateString()}</div>

        <div className="mb-3">
          <label className="font-semibold text-sm">Kepada Yth:</label>
          <select
            name="kepada"
            value={form.kepada}
            onChange={handleChange}
            className="block w-full border border-gray-300 rounded-md p-2 mt-1"
          >
            <option value="">-- Pilih Tujuan --</option>
            <option value="Ka.Sub Bid PTI">Ka.Sub Bid PTI</option>
            <option value="Ka.Sub Bid Keuangan">Ka.Sub Bid Keuangan</option>
            <option value="Ka.Sub Bag Umum">Ka.Sub Bag Umum</option>
            <option value="Kasatker Wilayah Barat">Kasatker Wilayah Barat</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="font-semibold text-sm">Satker :</label>
          <select
            name="satker"
            value={form.satker}
            onChange={handleChange}
            className="block w-full border border-gray-300 rounded-md p-2 mt-1"
          >
            <option value="">-- Pilih Satker --</option>
            <option value="Sub Bag Umum">Sub Bag Umum</option>
            <option value="Bidang Teknik">Bidang Teknik</option>
            <option value="Bidang Administrasi">Bidang Administrasi</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="font-semibold text-sm">Kode Barang :</label>
          <table className="w-full border border-gray-400 mt-1">
            <tbody>
              <tr>
                <td>
                  <input
                    type="text"
                    name="kodeBarang"
                    value={form.kodeBarang}
                    onChange={handleChange}
                    placeholder="Masukkan kode barang"
                    className="w-full p-2 border-none focus:outline-none"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <textarea
            name="uraian"
            value={form.uraian}
            onChange={handleChange}
            placeholder="Tuliskan uraian kerusakan atau perbaikan di sini..."
            className="w-full border border-gray-400 rounded-md p-3 h-32 focus:outline-none"
          />
        </div>

        <div className="text-center text-sm mt-8">
          <p>Demikian laporan kami untuk menjadi periksa dan mohon untuk perbaikan.</p>

          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <p className="font-semibold mb-8">Mengetahui<br />Ka.Bag</p>
              <p>NIP: ____________</p>
            </div>
            <div>
              <p className="font-semibold mb-8">Pelapor</p>
              <p>NIP: ____________</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button className="bg-blue-600 text-white hover:bg-blue-700">Cetak</Button>
        </div>
      </div>
    </div>
  );
}
