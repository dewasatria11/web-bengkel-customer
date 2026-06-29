/**
 * Fungsi untuk mengubah QRIS Statis menjadi QRIS Dinamis
 * dengan menambahkan/mengubah nominal (Tag 54) dan menghitung ulang CRC.
 * Dibuat 100% aman (crash-proof) dengan fallback.
 */

export function generateDynamicQRIS(qrisString, nominal) {
  const fallbackStr = `QRIS-BENGKEL-NOMINAL-${nominal || 0}`;

  if (!qrisString || typeof qrisString !== 'string' || qrisString.trim() === '') {
    return fallbackStr;
  }

  const cleanQris = qrisString.trim();

  if (!nominal || isNaN(nominal) || nominal <= 0) {
    return cleanQris;
  }

  try {
    let str = cleanQris;
    
    // 1. Ubah Point of Initiation Method dari statis (11) ke dinamis (12) jika ada
    if (str.includes('010211')) {
      str = str.replace('010211', '010212');
    }

    // 2. Cari tag 6304 (CRC) di akhir string
    const crcIndex = str.lastIndexOf('6304');
    if (crcIndex === -1) {
      // Jika bukan format QRIS standar EMVCo, kembalikan string asli
      return cleanQris;
    }
    const baseStr = str.substring(0, crcIndex);

    // 3. Parsing string dengan format TLV (Tag-Length-Value)
    let i = 0;
    const parsedTags = {};
    const tagOrder = [];
    
    while (i < baseStr.length) {
      const tag = baseStr.substring(i, i + 2);
      const lenStr = baseStr.substring(i + 2, i + 4);
      const len = parseInt(lenStr, 10);
      
      if (isNaN(len) || len < 0 || i + 4 + len > baseStr.length) {
        // Format corrupt/invalid, batalkan parsing & return string asli
        return cleanQris;
      }

      const val = baseStr.substring(i + 4, i + 4 + len);
      
      parsedTags[tag] = val;
      tagOrder.push(tag);
      
      i += 4 + len;
    }

    // 4. Tambahkan atau ganti Tag 54 (Transaction Amount)
    const nominalStr = Math.round(nominal).toString();
    parsedTags['54'] = nominalStr;
    if (!tagOrder.includes('54')) {
      const insertIndex = tagOrder.findIndex(t => t > '54');
      if (insertIndex !== -1) {
        tagOrder.splice(insertIndex, 0, '54');
      } else {
        tagOrder.push('54');
      }
    }

    // 5. Rakit kembali string QRIS
    let newBaseStr = '';
    for (const tag of tagOrder) {
      const val = parsedTags[tag] || '';
      const lStr = val.length.toString().padStart(2, '0');
      newBaseStr += `${tag}${lStr}${val}`;
    }

    // 6. Tambahkan header Tag 6304 untuk menghitung CRC
    newBaseStr += '6304';

    // 7. Hitung dan tambahkan CRC16
    const crc = calculateCRC16(newBaseStr);
    
    return newBaseStr + crc;
  } catch (error) {
    console.error("Gagal generate QRIS dinamis, mengembalikan string asli:", error);
    return cleanQris || fallbackStr;
  }
}

/**
 * Fungsi menghitung CRC16 (CCITT-FALSE) standar EMVCo
 */
function calculateCRC16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}