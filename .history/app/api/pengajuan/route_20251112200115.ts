export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }
    
    const formData = await req.formData();
    const externalFormData = new FormData();
    const fileUrls = [];

    // --- LANGKAH 1: UPLOAD FILE LAMPIRAN SAJA (MENGABAIKAN TTD) ---
    let fileIndex = 0;
    const uploadPromises = [];

    while (true) {
        const file = formData.get(`file${fileIndex}`);
        const customFileName = formData.get(`fileUrl${fileIndex}`) as string; // Ambil nama file custom
        
        if (file instanceof File) {
            // Kirim nama file custom ke fungsi uploadFile
            uploadPromises.push(uploadFile(file, token, customFileName, 'pengajuans'));
            fileIndex++;
        } else {
            break;
        }
    }
    
    // Menjalankan semua proses upload
    const results = await Promise.all(uploadPromises);
    results.forEach(url => fileUrls.push(url));
    
    // Cek apakah ada file lampiran yang berhasil diunggah
    if (fileUrls.length > 0) {
        // Mengirim URL file sebagai string JSON
        externalFormData.append('file', JSON.stringify(fileUrls)); 
    } else if (fileIndex > 0) {
        // Jika ada file yang dipilih tapi gagal diunggah
         throw new Error("Proses upload file lampiran gagal total.");
    }

    // --- LANGKAH 2: MEMBUAT PAYLOAD DATA UNTUK API PENGAJUAN ---
    
    // Mapping field form biasa
    const standardFields = [
      { clientKey: "hal", externalName: "hal_id" }, 
      { clientKey: "kepada", externalName: "kepada" }, 
      { clientKey: "satker", externalName: "satker" }, 
      { clientKey: "kodeBarang", externalName: "kode_barang" }, 
      { clientKey: "keterangan", externalName: "keterangan" }, 
      { clientKey: "keterangan", externalName: "catatan" }, 
      { clientKey: "pelapor", externalName: "pelapor" }, 
      { clientKey: "nppPelapor", externalName: "nppPelapor" }, 
      { clientKey: "mengetahui", externalName: "mengetahui" }, 
      { clientKey: "nppMengetahui", externalName: "nppMengetahui" },
    ];
    
    for (const field of standardFields) {
      const value = formData.get(field.clientKey);
      if (value) {
          externalFormData.append(field.externalName, String(value));
      }
    }
    
    // Panggil API eksternal Pengajuan
    const res = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: externalFormData,
      cache: "no-store",
    });

    const rawText = await res.text();
    console.log(`[POST PENGAJUAN] Status ${res.status}`);

    let json;
    try {
        json = JSON.parse(rawText);
    } catch (e) {
        console.error("[POST PENGAJUAN] Gagal parse JSON. Respon adalah HTML/teks.");
        return NextResponse.json(
            { success: false, message: "API eksternal mengembalikan HTML/format tak dikenal. Cek terminal untuk detail Ngrok.", raw: rawText.slice(0, 500) },
            { status: 500 }
        );
    }
    
    if (!res.ok) {
        return NextResponse.json(
            { success: false, message: json?.message || `Gagal pengajuan (Status ${res.status}): Error API eksternal` },
            { status: res.status }
        );
    }

    return NextResponse.json({
      success: true,
      message: json?.message || "Pengajuan berhasil dikirim!",
      data: json,
    });
  } catch (error) {
    console.error("Error API /pengajuan:", error);
    return NextResponse.json(
      { success: false, message: String(error) },
      { status: 500 }
    );
  }
}