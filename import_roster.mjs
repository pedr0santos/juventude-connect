import mysql from 'mysql2/promise';
import XLSX from 'xlsx';
import fs from 'node:fs';

const workbook = XLSX.readFile('/home/ubuntu/upload/Cadastrojovens(1).xlsx', { cellDates: true });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = sheet_to_json(sheet);
const discipulatorNames = JSON.parse(fs.readFileSync('/home/ubuntu/cross_reference.json', 'utf8')).discipulators;
const cross = JSON.parse(fs.readFileSync('/home/ubuntu/cross_reference.json', 'utf8')).records;
const matchByLine = new Map(cross.map(row => [row.line, row]));

function sheet_to_json(sheet) {
  const matrix = sheet['!ref'] ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) : [];
  return matrix.slice(1).filter(row => row[1]);
}
function dateIso(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
}
function phone(value) {
  if (typeof value === 'number') return String(Math.trunc(value));
  return String(value || '').replace(/\D/g, '');
}
function normalized(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
await connection.beginTransaction();
try {
  const [existingYouth] = await connection.query('SELECT COUNT(*) AS count FROM youths');
  if (Number(existingYouth[0].count) > 0) throw new Error('A tabela youths já possui registros; importação cancelada para evitar duplicidade.');

  const discipulatorIds = new Map();
  for (const name of discipulatorNames) {
    const [result] = await connection.query('INSERT INTO discipulators (name, whatsapp, status, notes) VALUES (?, ?, ?, ?)', [name, '', 'active', 'Importado da lista de discipuladores.']);
    discipulatorIds.set(normalized(name), result.insertId);
    const base = normalized(name.split('(')[0]);
    discipulatorIds.set(base, result.insertId);
    for (const nickname of (name.match(/\(([^)]+)\)/)?.[1] || '').split(/\s+ou\s+|,|\//)) if (nickname.trim()) discipulatorIds.set(normalized(nickname), result.insertId);
  }

  let linked = 0;
  let unassigned = 0;
  let withoutWhatsapp = 0;
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const sourceLine = index + 2;
    const crossRow = matchByLine.get(sourceLine);
    const match = crossRow?.confidence === 'matched' ? crossRow.matches?.[0] : null;
    const discipulatorId = match ? discipulatorIds.get(normalized(match)) : null;
    const whatsapp = phone(row[8]);
    if (!whatsapp) withoutWhatsapp++;
    if (discipulatorId) linked++; else unassigned++;
    const [result] = await connection.query('INSERT INTO youths (name, birthDate, whatsapp, address, photoUrl, notes, discipulatorId, discipleshipStartDate, relationshipStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [String(row[1]).trim(), dateIso(row[3]), whatsapp, String(row[6] || '').trim() || null, String(row[7] || '').trim() || null, `Resposta de acompanhamento: ${String(row[5] || '').trim()}`, discipulatorId || null, new Date().toISOString().slice(0, 10), 'active']);
    if (discipulatorId) await connection.query('INSERT INTO discipleship_history (youthId, discipulatorId, startedAt, endedAt) VALUES (?, ?, ?, NULL)', [result.insertId, discipulatorId, new Date().toISOString().slice(0, 10)]);
  }
  await connection.commit();
  console.log(JSON.stringify({ imported: rows.length, linked, unassigned, withoutWhatsapp, discipulators: discipulatorNames.length }, null, 2));
} catch (error) {
  await connection.rollback();
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await connection.end();
}
